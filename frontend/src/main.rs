use crate::components::{
    panel::{Panel, PluginPanel},
    plugin_list::{PluginList, PluginManifest},
};
use dioxus::prelude::*;
use wasm_bindgen::prelude::*;
use web_sys::{MessageEvent, window};

mod components;
mod server;

fn main() {
    #[cfg(feature = "web")]
    dioxus::launch(App);

    #[cfg(feature = "server")]
    dioxus::serve(|| async move {
        let router = dioxus::server::router(App);

        Ok(router)
    })
}
#[component]
fn App() -> Element {
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

    // Required for plugin handling
    let mut plugin_manifests: Signal<Vec<PluginManifest>> = use_signal(|| vec![]);

    rsx! {
        document::Stylesheet {
            href: asset!("/www-root/assets/main.css"),
        },
        Panel {
            class: "side-panel",
            panel_name: "Left Panel",
            PluginList {
                plugin_manifests
            },
        },
        div {
            class: "central-pane",
            PluginPanel {
                headless: true,
                class: "main-panel",
                position: "center",
                plugin_manifests,
                div {
                    h1 { "Welcome to Salus!", },
                    p { "To start, please select a plugin on the left panel!", },
                },
            },
            PluginPanel {
                class: "bottom-panel",
                panel_name: "Bottom Panel",
                position: "bottom",
                plugin_manifests,
                h2 { "Received messages" },
                table {
                    tr {
                        th { "Message origins" },
                        th { "Message contents" },
                    },
                    tr {
                        td { "{message_origin}" },
                        td { "{external_message}" },
                    }
                }
            },
        },
        PluginPanel {
            class: "side-panel",
            panel_name: "Right Panel",
            position: "right",
            plugin_manifests,
            "Right panel",
        },
    }
}
