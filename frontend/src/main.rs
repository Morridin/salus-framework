use crate::components::{panel::Panel, plugin_list::PluginList};
use dioxus::prelude::*;
use serde_json::json;
use std::io::Write;
use std::{fs, io};

mod components;
mod server;

fn main() {
    dioxus::launch(App);
}

#[component]
fn App() -> Element {
    rsx! {
        document::Stylesheet {
            href: asset!("www-root/assets/main.css"),
        },
        Panel {
            class: "side-panel",
            panel_name: "Left Panel",
            Panel {
                class: "bottom-panel"
            },
            PluginList {},
        },
        div {
            class: "central-pane",
            Panel {
                headless: true,
                class: "main-panel",
                iframe {
                    src: format!("{}/index.html", asset!("plugins/fadc"))
                }
            },
            Panel {
                class: "bottom-panel",
                panel_name: "Bottom Panel",
                "Bottom panel",
            },
        },
        Panel {
            class: "side-panel",
            panel_name: "Right Panel",
            "Right panel",
        },
    }
}
