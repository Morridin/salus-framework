use crate::components::{panel::Panel, plugin_list::PluginList};
use dioxus::prelude::*;
use serde_json::json;
use std::io::Write;
use std::{fs, io};
use wasm_bindgen::prelude::*;
use web_sys::{MessageEvent, window};

mod components;
mod server;

fn main() {
    dioxus::launch(App);
}

#[component]
fn App() -> Element {
    let mut message_origin = use_signal(|| String::from("No message received yet."));
    let mut external_message = use_signal(|| String::from("No message received yet."));
    let mut plugin = use_signal(|| String::new());

    use_effect(move || {
        let window = web_sys::window().expect("no global `window` exists");

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

    rsx! {
        document::Stylesheet {
            href: asset!("/www-root/assets/main.css"),
        },
        Panel {
            class: "side-panel",
            panel_name: "Left Panel",
            PluginList {
                plugin
            },
        },
        div {
            class: "central-pane",
            Panel {
                headless: true,
                class: "main-panel",
                iframe {
                    src: plugin,
                    //"sandbox": "allow-downloads allow-forms allow-popups allow-same-origin"
                }
            },
            Panel {
                class: "bottom-panel",
                panel_name: "Bottom Panel",
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
        Panel {
            class: "side-panel",
            panel_name: "Right Panel",
            "Right panel",
        },
    }
}
