(() => {
    "use strict";

    if (window.salus) return;

    const MESSAGE_TYPE = "salus:plugin-message";
    const PROTOCOL_VERSION = 1;
    const CHANNEL_NAME = "salus:plugin-messages:v1";
    const handlers = new Set();
    const pluginId = window.frameElement?.dataset?.salusPluginId;
    const channel = new window.BroadcastChannel(CHANNEL_NAME);

    function deliver(message) {
        if (
            !message ||
            typeof message !== "object" ||
            message.type !== MESSAGE_TYPE ||
            message.version !== PROTOCOL_VERSION ||
            message.targetPluginId !== pluginId ||
            typeof message.sourcePluginId !== "string" ||
            message.sourcePluginId.length === 0 ||
            !Object.prototype.hasOwnProperty.call(message, "payload")
        ) {
            return;
        }

        const receivedMessage = Object.freeze({
            sourcePluginId: message.sourcePluginId,
            payload: message.payload,
        });

        for (const handler of handlers) {
            try {
                handler(receivedMessage);
            } catch (error) {
                console.error("Salus message handler failed", error);
            }
        }
    }

    function send(targetPluginId, payload) {
        if (typeof targetPluginId !== "string" || targetPluginId.length === 0) {
            throw new TypeError("targetPluginId must be a non-empty string");
        }
        if (payload === undefined) {
            throw new TypeError("payload must be JSON-compatible");
        }
        if (typeof pluginId !== "string" || pluginId.length === 0) {
            throw new Error("Salus SDK must run inside a mounted local plugin");
        }

        let normalizedPayload;
        try {
            const serializedPayload = JSON.stringify(payload);
            if (serializedPayload === undefined) {
                throw new TypeError();
            }

            normalizedPayload = JSON.parse(serializedPayload);
        } catch (_) {
            throw new TypeError("payload must be JSON-compatible");
        }

        const message = {
            type: MESSAGE_TYPE,
            version: PROTOCOL_VERSION,
            sourcePluginId: pluginId,
            targetPluginId,
            payload: normalizedPayload,
        };

        channel.postMessage(message);

        // BroadcastChannel does not deliver a message back to the channel object
        // that sent it, so handle messages addressed to this same instance here.
        if (targetPluginId === pluginId) deliver(message);
    }

    function onMessage(handler) {
        if (typeof handler !== "function") {
            throw new TypeError("handler must be a function");
        }

        handlers.add(handler);
        return () => handlers.delete(handler);
    }

    channel.addEventListener("message", event => deliver(event.data));

    Object.defineProperty(window, "salus", {
        value: Object.freeze({send, onMessage}),
        writable: false,
        configurable: false,
    });
})();
