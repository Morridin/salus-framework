use super::protocol::{matching_target_indices, parse_outgoing_message};
use js_sys::Object;
use std::rc::Rc;
use wasm_bindgen::{JsCast, JsValue, closure::Closure};
use web_sys::{Document, HtmlIFrameElement, MessageEvent, Window};

const PLUGIN_FRAME_SELECTOR: &str = "iframe[data-salus-plugin-id]";
const PLUGIN_ID_ATTRIBUTE: &str = "data-salus-plugin-id";

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
        let _ = self
            .window
            .remove_event_listener_with_callback("message", self.handler.as_ref().unchecked_ref());
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
        delivery.target_plugin_id(),
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
