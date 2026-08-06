use dioxus::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value;

const MESSAGE_TYPE: &str = "salus:plugin-message";
const PROTOCOL_VERSION: u8 = 1;
#[cfg(feature = "web")]
const PLUGIN_FRAME_SELECTOR: &str = "iframe[data-salus-plugin-id]";
#[cfg(feature = "web")]
const PLUGIN_ID_ATTRIBUTE: &str = "data-salus-plugin-id";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OutgoingPluginMessage {
    #[serde(rename = "type")]
    message_type: String,
    version: u8,
    target_plugin_id: String,
    payload: Value,
}

#[derive(Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct DeliveredPluginMessage {
    #[serde(rename = "type")]
    message_type: &'static str,
    version: u8,
    source_plugin_id: String,
    target_plugin_id: String,
    payload: Value,
}

impl OutgoingPluginMessage {
    fn into_delivery(self, source_plugin_id: &str) -> DeliveredPluginMessage {
        DeliveredPluginMessage {
            message_type: MESSAGE_TYPE,
            version: PROTOCOL_VERSION,
            source_plugin_id: source_plugin_id.to_string(),
            target_plugin_id: self.target_plugin_id,
            payload: self.payload,
        }
    }
}

fn parse_outgoing_message(data: &str) -> Option<OutgoingPluginMessage> {
    let message = serde_json::from_str::<OutgoingPluginMessage>(data).ok()?;

    if message.message_type != MESSAGE_TYPE
        || message.version != PROTOCOL_VERSION
        || message.target_plugin_id.is_empty()
    {
        return None;
    }

    Some(message)
}

fn matching_target_indices<'a>(
    plugin_ids: impl IntoIterator<Item = &'a str>,
    target_plugin_id: &str,
) -> Vec<usize> {
    plugin_ids
        .into_iter()
        .enumerate()
        .filter_map(|(index, plugin_id)| (plugin_id == target_plugin_id).then_some(index))
        .collect()
}

#[cfg(feature = "web")]
mod browser {
    use super::*;
    use js_sys::Object;
    use std::rc::Rc;
    use wasm_bindgen::{JsCast, JsValue, closure::Closure};
    use web_sys::{Document, HtmlIFrameElement, MessageEvent, Window};

    struct MountedPluginFrame {
        plugin_id: String,
        window: Window,
    }

    pub(super) struct BrowserMessageBroker {
        window: Window,
        handler: Closure<dyn FnMut(MessageEvent)>,
    }

    impl BrowserMessageBroker {
        pub(super) fn install() -> Option<Rc<Self>> {
            let window = web_sys::window()?;
            let document = window.document()?;
            let origin = window.location().origin().ok()?;
            let handler = Closure::new(move |event: MessageEvent| {
                let _ = route_message(&document, &origin, event);
            });

            window
                .add_event_listener_with_callback("message", handler.as_ref().unchecked_ref())
                .ok()?;

            Some(Rc::new(Self { window, handler }))
        }

        pub(super) fn remove_listener(&self) {
            let _ = self.window.remove_event_listener_with_callback(
                "message",
                self.handler.as_ref().unchecked_ref(),
            );
        }
    }

    fn route_message(document: &Document, origin: &str, event: MessageEvent) -> Option<()> {
        if event.origin() != origin {
            return None;
        }

        let data = event.data().as_string()?;
        let message = parse_outgoing_message(&data)?;
        let source = event.source()?;
        let plugin_frames = mounted_plugin_frames(document);
        let source_frame = plugin_frames
            .iter()
            .find(|frame| Object::is(source.as_ref(), frame.window.as_ref()))?;
        let delivery = message.into_delivery(&source_frame.plugin_id);
        let serialized_delivery = serde_json::to_string(&delivery).ok()?;
        let target_indices = matching_target_indices(
            plugin_frames.iter().map(|frame| frame.plugin_id.as_str()),
            &delivery.target_plugin_id,
        );

        for index in target_indices {
            let _ = plugin_frames[index]
                .window
                .post_message(&JsValue::from_str(&serialized_delivery), origin);
        }

        Some(())
    }

    fn mounted_plugin_frames(document: &Document) -> Vec<MountedPluginFrame> {
        let Ok(nodes) = document.query_selector_all(PLUGIN_FRAME_SELECTOR) else {
            return Vec::new();
        };

        (0..nodes.length())
            .filter_map(|index| {
                let iframe = nodes.item(index)?.dyn_into::<HtmlIFrameElement>().ok()?;
                let plugin_id = iframe.get_attribute(PLUGIN_ID_ATTRIBUTE)?;
                let window = iframe.content_window()?;

                Some(MountedPluginFrame { plugin_id, window })
            })
            .collect()
    }
}

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

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn valid_message_uses_the_trusted_sender_identity() {
        let message = parse_outgoing_message(
            r#"{
                "type": "salus:plugin-message",
                "version": 1,
                "sourcePluginId": "spoofed",
                "targetPluginId": "receiver",
                "payload": {"text": "Hello"}
            }"#,
        )
        .expect("message should be valid");

        let delivery = message.into_delivery("trusted-sender");

        assert_eq!(
            delivery,
            DeliveredPluginMessage {
                message_type: MESSAGE_TYPE,
                version: PROTOCOL_VERSION,
                source_plugin_id: "trusted-sender".to_string(),
                target_plugin_id: "receiver".to_string(),
                payload: json!({"text": "Hello"}),
            }
        );
        assert_eq!(
            serde_json::to_value(delivery).expect("delivery should serialize"),
            json!({
                "type": "salus:plugin-message",
                "version": 1,
                "sourcePluginId": "trusted-sender",
                "targetPluginId": "receiver",
                "payload": {"text": "Hello"},
            })
        );
    }

    #[test]
    fn invalid_messages_are_rejected() {
        let invalid_messages = [
            "not json",
            r#"{"type":"other","version":1,"targetPluginId":"receiver","payload":{}}"#,
            r#"{"type":"salus:plugin-message","version":2,"targetPluginId":"receiver","payload":{}}"#,
            r#"{"type":"salus:plugin-message","version":1,"targetPluginId":"","payload":{}}"#,
            r#"{"type":"salus:plugin-message","version":1,"targetPluginId":"receiver"}"#,
            r#"{"type":"salus:plugin-message","version":1,"targetPluginId":12,"payload":{}}"#,
        ];

        for message in invalid_messages {
            assert!(parse_outgoing_message(message).is_none(), "{message}");
        }
    }

    #[test]
    fn every_matching_target_instance_is_selected() {
        let plugin_ids = ["sender", "receiver", "other", "receiver"];

        assert_eq!(matching_target_indices(plugin_ids, "receiver"), vec![1, 3]);
        assert!(matching_target_indices(plugin_ids, "missing").is_empty());
    }
}
