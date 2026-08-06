use dioxus::prelude::*;

/// Routes messages between local dynamic plug-ins.
///
/// Plug-ins use the shared `salus-sdk.js` file rather than talking to this
/// component directly. The broker derives the sender from the source iframe so
/// plug-ins cannot spoof their identity in the message payload.
#[component]
pub fn MessageBroker() -> Element {
    use_effect(|| {
        let mut eval = document::eval(
            r#"
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
                if (event.origin !== window.location.origin) return;

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
                    document.querySelectorAll("iframe[data-salus-plugin-id]")
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
                            window.location.origin
                        );
                    }
                }
            };

            window.addEventListener("message", handler);
            return () => window.removeEventListener("message", handler);
        "#,
        );

        // Keep the evaluated script alive for as long as this component is mounted.
        spawn(async move { while eval.recv::<()>().await.is_ok() {} });
    });

    rsx! {}
}
