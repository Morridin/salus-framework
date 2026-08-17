const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const sdkSource = fs.readFileSync(
    path.join(__dirname, "../plugins/salus-sdk.js"),
    "utf8",
);

function createBroadcastEnvironment() {
    const channels = new Map();
    const sentMessages = [];

    class FakeBroadcastChannel {
        constructor(name) {
            this.name = name;
            this.listeners = new Set();

            const peers = channels.get(name) ?? new Set();
            peers.add(this);
            channels.set(name, peers);
        }

        addEventListener(type, listener) {
            if (type === "message") this.listeners.add(listener);
        }

        postMessage(message) {
            const serialized = JSON.stringify(message);
            sentMessages.push(JSON.parse(serialized));

            for (const peer of channels.get(this.name) ?? []) {
                if (peer === this) continue;

                const data = JSON.parse(serialized);
                for (const listener of peer.listeners) listener({data});
            }
        }

        close() {
            channels.get(this.name)?.delete(this);
        }
    }

    return {BroadcastChannel: FakeBroadcastChannel, sentMessages};
}

function loadSdk({sourcePluginId, environment = createBroadcastEnvironment()} = {}) {
    const window = {
        BroadcastChannel: environment.BroadcastChannel,
        frameElement: sourcePluginId ? {
            dataset: {salusPluginId: sourcePluginId},
        } : undefined,
    };

    vm.runInNewContext(sdkSource, {console, window});

    return {salus: window.salus, environment};
}

test("send publishes a targeted message through BroadcastChannel", () => {
    const sdk = loadSdk({sourcePluginId: "5e61"});

    sdk.salus.send("a11e", {tool: "rectangle"});

    assert.deepEqual(sdk.environment.sentMessages, [{
        type: "salus:plugin-message",
        version: 1,
        sourcePluginId: "5e61",
        targetPluginId: "a11e",
        payload: {tool: "rectangle"},
    }]);
});

test("only the targeted plugin receives a message", () => {
    const environment = createBroadcastEnvironment();
    const receiver = loadSdk({sourcePluginId: "a11e", environment});
    const other = loadSdk({sourcePluginId: "b0b0", environment});
    const sender = loadSdk({sourcePluginId: "5e61", environment});
    const received = [];
    const receivedByOther = [];

    receiver.salus.onMessage(message => received.push(message));
    other.salus.onMessage(message => receivedByOther.push(message));
    sender.salus.send("a11e", {imageId: "scan-42"});

    assert.equal(received.length, 1);
    assert.equal(received[0].sourcePluginId, "5e61");
    assert.equal(received[0].payload.imageId, "scan-42");
    assert.equal(receivedByOther.length, 0);
});

test("every mounted instance of the target plugin receives the message", () => {
    const environment = createBroadcastEnvironment();
    const firstReceiver = loadSdk({sourcePluginId: "a11e", environment});
    const secondReceiver = loadSdk({sourcePluginId: "a11e", environment});
    const sender = loadSdk({sourcePluginId: "5e61", environment});
    const firstMessages = [];
    const secondMessages = [];

    firstReceiver.salus.onMessage(message => firstMessages.push(message));
    secondReceiver.salus.onMessage(message => secondMessages.push(message));
    sender.salus.send("a11e", {tool: "circle"});

    assert.equal(firstMessages.length, 1);
    assert.equal(secondMessages.length, 1);
});

test("a plugin can send a message to itself", () => {
    const sdk = loadSdk({sourcePluginId: "a11e"});
    const received = [];

    sdk.salus.onMessage(message => received.push(message));
    sdk.salus.send("a11e", {refresh: true});

    assert.equal(received.length, 1);
    assert.equal(received[0].sourcePluginId, "a11e");
    assert.equal(received[0].payload.refresh, true);
});

test("onMessage can unsubscribe", () => {
    const environment = createBroadcastEnvironment();
    const receiver = loadSdk({sourcePluginId: "a11e", environment});
    const sender = loadSdk({sourcePluginId: "5e61", environment});
    const received = [];
    const unsubscribe = receiver.salus.onMessage(message => received.push(message));

    sender.salus.send("a11e", {sequence: 1});
    unsubscribe();
    sender.salus.send("a11e", {sequence: 2});

    assert.equal(received.length, 1);
    assert.equal(received[0].payload.sequence, 1);
});

test("malformed channel messages are ignored", () => {
    const environment = createBroadcastEnvironment();
    const receiver = loadSdk({sourcePluginId: "a11e", environment});
    const rawChannel = new environment.BroadcastChannel("salus:plugin-messages:v1");
    const received = [];

    receiver.salus.onMessage(message => received.push(message));
    rawChannel.postMessage({
        type: "other",
        version: 1,
        sourcePluginId: "5e61",
        targetPluginId: "a11e",
        payload: {},
    });
    rawChannel.postMessage({
        type: "salus:plugin-message",
        version: 2,
        sourcePluginId: "5e61",
        targetPluginId: "a11e",
        payload: {},
    });
    rawChannel.postMessage({
        type: "salus:plugin-message",
        version: 1,
        sourcePluginId: "",
        targetPluginId: "a11e",
        payload: {},
    });

    assert.equal(received.length, 0);
});

test("public methods reject invalid arguments and missing plugin identity", () => {
    const {salus} = loadSdk({sourcePluginId: "5e61"});

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

    const unmounted = loadSdk();
    assert.throws(() => unmounted.salus.send("a11e", {}), {
        message: /mounted local plugin/,
    });
});
