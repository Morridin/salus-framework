use dioxus::html::completions::CompleteWithBraces::style;
use dioxus::logger::tracing;
use dioxus::prelude::*;
use reqwest::Version;
use reqwest::header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE, HeaderMap};
use crate::components::panel::Panel;

mod components;
fn main() {
    dioxus::launch(App);
}

#[component]
fn App() -> Element {
    let mut external_content = use_signal(|| "".to_string());

    let get_external_content = move |_| async move {
        let address = "127.0.0.1:8081";
        let resource = "/hello-world";

        static TOKEN: Asset = asset!("../token");
        let bytes = dioxus::asset_resolver::read_asset_bytes(&TOKEN)
            .await
            .unwrap();
        let token = String::from_utf8(bytes).unwrap();

        let response = match reqwest::Client::new()
            .get(format!("https://{}{}", address, resource))
            .header(ACCEPT, "text/plain")
            .bearer_auth(token)
            .send()
            .await
        {
            Ok(response) => response
                .text()
                .await
                .unwrap_or_else(|error| error.to_string()),
            Err(error) => format!("Fehler: {}", error.to_string()),
        };

        external_content.set(response);
    };

    rsx! {
        document::Stylesheet {
            href: asset!("www-root/assets/main.css"),
        },
        Panel {
            class: "side-panel",
            panel_name: "Left Panel",
            Panel {
                class: "bottom-panel"
            }
        },
        div {
            class: "central-pane",
            Panel {
                headless: true,
                class: "main-panel",
                h1 { "It works!" },
                p { "Hello there!" },
                button { onclick: get_external_content, "Load external content" },
                p { {external_content} },
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
