const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const brokerSource = fs.readFileSync(
    path.join(__dirname, "../src/components/message_broker.js"),
    "utf8",
);

function createPluginFrame(pluginId) {
    const sentMessages = [];

    return {
        dataset: {salusPluginId: pluginId},
        contentWindow: {
            postMessage(message, origin) {
                sentMessages.push({message, origin});
            },
        },
        sentMessages,
    };
}

function loadBroker(pluginFrames) {
    const listeners = new Map();
    const window = {
        location: {origin: "https://salus.test"},
        addEventListener(type, handler) {
            listeners.set(type, handler);
        },
        removeEventListener(type, handler) {
            if (listeners.get(type) === handler) listeners.delete(type);
        },
    };
    const document = {
        querySelectorAll(selector) {
            assert.equal(selector, "iframe[data-salus-plugin-id]");
            return pluginFrames;
        },
    };
    const cleanup = vm.runInNewContext(
        `${brokerSource}\nstartSalusMessageBroker(window, document)`,
        {document, window},
    );

    return {
        cleanup,
        deliver(data, {origin = window.location.origin, source} = {}) {
            listeners.get("message")?.({data, origin, source});
        },
    };
}

function outgoingMessage(targetPluginId, payload) {
    return JSON.stringify({
        type: "salus:plugin-message",
        version: 1,
        targetPluginId,
        payload,
    });
}

test("routes a message to every mounted target with trusted sender identity", () => {
    const sender = createPluginFrame("sender");
    const firstTarget = createPluginFrame("receiver");
    const secondTarget = createPluginFrame("receiver");
    const broker = loadBroker([sender, firstTarget, secondTarget]);

    broker.deliver(outgoingMessage("receiver", {text: "Hello"}), {
        source: sender.contentWindow,
    });

    for (const target of [firstTarget, secondTarget]) {
        assert.equal(target.sentMessages.length, 1);
        assert.equal(target.sentMessages[0].origin, "https://salus.test");
        assert.deepEqual(JSON.parse(target.sentMessages[0].message), {
            type: "salus:plugin-message",
            version: 1,
            sourcePluginId: "sender",
            targetPluginId: "receiver",
            payload: {text: "Hello"},
        });
    }
});

test("ignores untrusted origins, unknown senders, and missing targets", () => {
    const sender = createPluginFrame("sender");
    const target = createPluginFrame("receiver");
    const broker = loadBroker([sender, target]);
    const message = outgoingMessage("receiver", {text: "Hello"});

    broker.deliver(message, {
        origin: "https://untrusted.test",
        source: sender.contentWindow,
    });
    broker.deliver(message, {source: {}});
    broker.deliver(outgoingMessage("missing", {}), {
        source: sender.contentWindow,
    });

    assert.equal(target.sentMessages.length, 0);
});

test("removes its global listener during cleanup", () => {
    const sender = createPluginFrame("sender");
    const target = createPluginFrame("receiver");
    const broker = loadBroker([sender, target]);

    broker.cleanup();
    broker.deliver(outgoingMessage("receiver", {}), {
        source: sender.contentWindow,
    });

    assert.equal(target.sentMessages.length, 0);
});
