use dioxus::prelude::*;

const BROKER_SCRIPT: &str = concat!(
    include_str!("message_broker.js"),
    r#"
const cleanup = startSalusMessageBroker(window, document);
try {
    await dioxus.recv();
} finally {
    cleanup();
}
"#
);

/// Routes messages between local dynamic plug-ins.
///
/// Plug-ins use the shared `salus-sdk.js` file rather than talking to this
/// component directly. The broker derives the sender from the source iframe so
/// plug-ins cannot spoof their identity in the message payload.
#[component]
pub fn MessageBroker() -> Element {
    let eval = use_hook(|| document::eval(BROKER_SCRIPT));

    use_drop(move || {
        // Signal the evaluated script to remove its global listener.
        let _ = eval.send(());
    });

    rsx! {}
}
