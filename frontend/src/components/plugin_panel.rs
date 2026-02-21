use dioxus::core_macro::component;
use dioxus::prelude::{Asset, Signal, WritableExt};
use dioxus::core::Element;
use dioxus::hooks::{use_effect, use_signal};
use web_sys::{window, MessageEvent};
use wasm_bindgen::closure::Closure;
use wasm_bindgen::JsCast;
use crate::models::PluginManifest;

#[component]
pub fn PluginPanel(
    #[props(default)] class: String,
    #[props(default)] panel_name: String,
    #[props(default = false)] headless: bool,
    position: String,
    #[props(default)] plugin_manifests: Signal<Vec<PluginManifest>>,
    children: Element,
) -> Element {
    // Handlers for Plugin-MPI
    let mut message_origin = use_signal(|| String::from("No message received yet."));
    let mut external_message = use_signal(|| String::from("No message received yet."));
    use_effect(move || {
        let window = window().expect("No global `window` exists!");

        let closure = Closure::wrap(Box::new(move |event: MessageEvent| {
            let origin = event.origin();
            message_origin.set(origin);

            if let Some(data) = event.data().as_string() {
                external_message.set(format!("Message: {data}"));
            }
        }) as Box<dyn FnMut(MessageEvent)>);

        window
            .add_event_listener_with_callback("message", closure.as_ref().unchecked_ref())
            .unwrap();

        closure.forget();
    });

    let plugin_manifests = plugin_manifests();
    let plugin = plugin_manifests
        .iter()
        .rev()
        .filter(|p| p.panels()[0] == position)
        .next();

    static PLUGIN_FOLDER: Asset = asset!("/plugins/");

    if let Some(plugin) = plugin {
        rsx! {
            Panel {
                class,
                headless,
                panel_name: plugin,

                match plugin.kind() {
                    "static" => rsx! {
                        iframe {
                            src: format!("{}/{}/{}", PLUGIN_FOLDER, plugin.uuid(), plugin.source()),
                            "sandbox": "allow-downloads allow-forms allow-popups allow-same-origin",
                        },
                    },
                    "dynamic" => rsx!{
                        iframe { src: format!("{}/{}/{}", PLUGIN_FOLDER, plugin.uuid(), plugin.source()), },
                    },
                    "extern" => rsx!{
                        iframe { src: plugin.source(), },
                    },
                    known_other @ ("rust" | "component") => rsx!{
                        div {
                            class: "plugin-error",
                            h1 { "Error loading plugin!" },
                            p { code { "{known_other}" }, " type plugins are not yet supported!" },
                        },
                    },
                    other => rsx!{
                        div {
                            class: "plugin-error",
                            h1 { "Error loading plugin!" },
                            p { "Plugin type ", code { "{other}" }, " is unknown and not supported" },
                        },
                    },
                },
            },
        }
    } else {
        rsx! {
            Panel {
                class,
                headless,
                panel_name,
                {children}
            },
        }
    }
}