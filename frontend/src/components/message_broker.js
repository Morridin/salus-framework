function startSalusMessageBroker(browserWindow, browserDocument) {
    const MESSAGE_TYPE = "salus:plugin-message";
    const PROTOCOL_VERSION = 1;

    const parseMessage = data => {
        if (typeof data !== "string") return null;

        try {
            return JSON.parse(data);
        } catch (_) {
            return null;
        }
    };

    const handler = event => {
        if (event.origin !== browserWindow.location.origin) return;

        const message = parseMessage(event.data);
        if (
            message?.type !== MESSAGE_TYPE ||
            message.version !== PROTOCOL_VERSION ||
            typeof message.targetPluginId !== "string" ||
            message.targetPluginId.length === 0 ||
            !Object.prototype.hasOwnProperty.call(message, "payload")
        ) {
            return;
        }

        const pluginFrames = Array.from(
            browserDocument.querySelectorAll("iframe[data-salus-plugin-id]")
        );
        const sourceFrame = pluginFrames.find(
            frame => frame.contentWindow === event.source
        );
        if (!sourceFrame) return;

        const sourcePluginId = sourceFrame.dataset.salusPluginId;
        const delivery = JSON.stringify({
            type: MESSAGE_TYPE,
            version: PROTOCOL_VERSION,
            sourcePluginId,
            targetPluginId: message.targetPluginId,
            payload: message.payload,
        });

        for (const targetFrame of pluginFrames) {
            if (targetFrame.dataset.salusPluginId === message.targetPluginId) {
                targetFrame.contentWindow?.postMessage(
                    delivery,
                    browserWindow.location.origin
                );
            }
        }
    };

    browserWindow.addEventListener("message", handler);
    return () => browserWindow.removeEventListener("message", handler);
}
