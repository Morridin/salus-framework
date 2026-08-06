const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const sdkSource = fs.readFileSync(
    path.join(__dirname, "../plugins/salus-sdk.js"),
    "utf8",
);

function loadSdk() {
    const sentMessages = [];
    const listeners = new Map();
    const parent = {
        postMessage(message, origin) {
            sentMessages.push({message, origin});
        },
    };
    const window = {
        parent,
        location: {origin: "https://salus.test"},
        addEventListener(type, handler) {
            listeners.set(type, handler);
        },
    };

    vm.runInNewContext(sdkSource, {console, window});

    return {
        salus: window.salus,
        sentMessages,
        deliver(data, {origin = window.location.origin, source = parent} = {}) {
            listeners.get("message")({data, origin, source});
        },
    };
}

test("send posts a serialized message to the Salus parent", () => {
    const {salus, sentMessages} = loadSdk();

    salus.send("a11e", {text: "Hello"});

    assert.equal(sentMessages.length, 1);
    assert.equal(sentMessages[0].origin, "https://salus.test");
    assert.deepEqual(JSON.parse(sentMessages[0].message), {
        type: "salus:plugin-message",
        version: 1,
        targetPluginId: "a11e",
        payload: {text: "Hello"},
    });
});

test("onMessage receives trusted messages and can unsubscribe", () => {
    const sdk = loadSdk();
    const received = [];
    const unsubscribe = sdk.salus.onMessage(message => received.push(message));
    const message = JSON.stringify({
        type: "salus:plugin-message",
        version: 1,
        sourcePluginId: "c97f",
        payload: {text: "Hello"},
    });

    sdk.deliver(message);
    sdk.deliver(message, {origin: "https://untrusted.test"});
    unsubscribe();
    sdk.deliver(message);

    assert.equal(received.length, 1);
    assert.equal(received[0].sourcePluginId, "c97f");
    assert.equal(received[0].payload.text, "Hello");
});

test("public methods reject invalid arguments", () => {
    const {salus} = loadSdk();

    assert.throws(() => salus.send("", {}), {
        name: "TypeError",
        message: /targetPluginId/,
    });
    assert.throws(() => salus.send("a11e", undefined), {
        name: "TypeError",
        message: /JSON-compatible/,
    });
    assert.throws(() => salus.onMessage("not a function"), {
        name: "TypeError",
        message: /handler/,
    });
});
