(() => {
    "use strict";

    if (window.salus) return;

    const MESSAGE_TYPE = "salus:plugin-message";
    const PROTOCOL_VERSION = 1;
    const handlers = new Set();

    function parseMessage(data) {
        if (typeof data !== "string") return null;

        try {
            return JSON.parse(data);
        } catch (_) {
            return null;
        }
    }

    function send(targetPluginId, payload) {
        if (typeof targetPluginId !== "string" || targetPluginId.length === 0) {
            throw new TypeError("targetPluginId must be a non-empty string");
        }
        if (payload === undefined) {
            throw new TypeError("payload must be JSON-compatible");
        }

        let message;
        try {
            const serializedPayload = JSON.stringify(payload);
            if (serializedPayload === undefined) {
                throw new TypeError();
            }

            message = JSON.stringify({
                type: MESSAGE_TYPE,
                version: PROTOCOL_VERSION,
                targetPluginId,
                payload: JSON.parse(serializedPayload),
            });
        } catch (_) {
            throw new TypeError("payload must be JSON-compatible");
        }

        window.parent.postMessage(message, window.location.origin);
    }

    function onMessage(handler) {
        if (typeof handler !== "function") {
            throw new TypeError("handler must be a function");
        }

        handlers.add(handler);
        return () => handlers.delete(handler);
    }

    window.addEventListener("message", event => {
        if (event.source !== window.parent) return;
        if (event.origin !== window.location.origin) return;

        const message = parseMessage(event.data);
        if (
            message?.type !== MESSAGE_TYPE ||
            message.version !== PROTOCOL_VERSION ||
            typeof message.sourcePluginId !== "string" ||
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
    });

    Object.defineProperty(window, "salus", {
        value: Object.freeze({send, onMessage}),
        writable: false,
        configurable: false,
    });
})();
