use crate::models::PluginManifest;
use dioxus::prelude::*;
use dioxus_free_icons::{Icon, icons::vsc_icons::VscClose};
use wasm_bindgen::prelude::*;
use web_sys::{MessageEvent, window};

/// The highest-level units the main page is built of.
#[component]
pub fn Panel(
    #[props(default)] class: String,
    #[props(default)] panel_name: String,
    #[props(default = false)] headless: bool,
    children: Element,
) -> Element {
    let mut closed = use_signal(|| "");

    rsx! {
        div {
            class: format!("panel {} {}", class, closed),
            if !headless {
                div {
                    class: "panel-header",
                    span { { panel_name }, },
                    button {
                        class: "close-btn",
                        onclick: move |_| closed.set("closed"),
                        Icon {
                            width: 24,
                            height: 24,
                            fill: "black",
                            icon: VscClose,
                        },
                    },
                },
            },
            div {
                class: "panel-body",
                {children},
            },
        },
    }
}

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
