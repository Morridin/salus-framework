use dioxus::prelude::*;

#[cfg(feature = "web")]
mod browser;
mod protocol;

/// Routes messages between local dynamic plug-ins.
///
/// Plug-ins use the shared `salus-sdk.js` file rather than talking to this
/// component directly. The broker derives the sender from the source iframe so
/// plug-ins cannot spoof their identity in the message payload.
#[component]
pub fn MessageBroker() -> Element {
    #[cfg(feature = "web")]
    let broker = use_hook(browser::BrowserMessageBroker::install);
    #[cfg(feature = "web")]
    use_drop(move || {
        if let Some(broker) = broker {
            broker.remove_listener();
        }
    });

    rsx! {}
}
