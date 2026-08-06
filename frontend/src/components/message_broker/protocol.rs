use serde::{Deserialize, Serialize};
use serde_json::Value;

const MESSAGE_TYPE: &str = "salus:plugin-message";
const PROTOCOL_VERSION: u8 = 1;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct OutgoingPluginMessage {
    #[serde(rename = "type")]
    message_type: String,
    version: u8,
    target_plugin_id: String,
    payload: Value,
}

#[derive(Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct DeliveredPluginMessage {
    #[serde(rename = "type")]
    message_type: &'static str,
    version: u8,
    source_plugin_id: String,
    target_plugin_id: String,
    payload: Value,
}

impl OutgoingPluginMessage {
    pub(super) fn into_delivery(self, source_plugin_id: &str) -> DeliveredPluginMessage {
        DeliveredPluginMessage {
            message_type: MESSAGE_TYPE,
            version: PROTOCOL_VERSION,
            source_plugin_id: source_plugin_id.to_string(),
            target_plugin_id: self.target_plugin_id,
            payload: self.payload,
        }
    }
}

#[cfg(feature = "web")]
impl DeliveredPluginMessage {
    pub(super) fn target_plugin_id(&self) -> &str {
        &self.target_plugin_id
    }
}

pub(super) fn parse_outgoing_message(data: &str) -> Option<OutgoingPluginMessage> {
    let message = serde_json::from_str::<OutgoingPluginMessage>(data).ok()?;

    if message.message_type != MESSAGE_TYPE
        || message.version != PROTOCOL_VERSION
        || message.target_plugin_id.is_empty()
    {
        return None;
    }

    Some(message)
}

pub(super) fn matching_target_indices<'a>(
    plugin_ids: impl IntoIterator<Item = &'a str>,
    target_plugin_id: &str,
) -> Vec<usize> {
    plugin_ids
        .into_iter()
        .enumerate()
        .filter_map(|(index, plugin_id)| (plugin_id == target_plugin_id).then_some(index))
        .collect()
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
