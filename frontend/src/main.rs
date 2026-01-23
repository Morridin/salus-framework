use crate::components::sheet::{
    Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetSide, SheetTitle,
};
use dioxus::html::completions::CompleteWithBraces::style;
use dioxus::logger::tracing;
use dioxus::prelude::*;
use reqwest::Version;
use reqwest::header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE, HeaderMap};

mod components;
fn main() {
    dioxus::launch(App);
}

#[component]
fn App() -> Element {
    let mut closed_l = use_signal(|| "");
    let mut closed_b = use_signal(|| "");
    let mut closed_r = use_signal(|| "");
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
        div {
            class: "side-panel panel {closed_l}",
            div {
                class: "panel-header",
                b {
                    "Left Panel",
                },
                button {
                    class: "close-btn",
                    onclick: move |_| closed_l.set("closed"),
                    "X"
                },
            },
            div {
                class: "panel-body",
                "Left panel",
            },
        },
        div {
            class: "central-pane",
            div {
                class: "main-panel panel",
                div {
                    class: "panel-body",
                    h1 { "It works!" },
                    p { "Hello there!" },
                    button { onclick: get_external_content, "Load external content" },
                    p { "{external_content}" },
                },
            },
            div {
                class: "bottom-panel panel {closed_b}",
                div {
                    class: "panel-header",
                    b {
                        "Bottom Panel",
                    },
                    button {
                        class: "close-btn",
                        onclick: move |_| closed_b.set("closed"),
                        "X"
                    },
                },
                div {
                    class: "panel-body",
                    "Bottom panel",
                },
            },
        },
        div {
            class: "side-panel panel {closed_r}",
            div {
                class: "panel-header",
                b {
                    "Right Panel",
                },
                button {
                    class: "close-btn",
                    onclick: move |_| closed_r.set("closed"),
                    "X"
                },
            },
            div {
                class: "panel-body",
                "Right panel",
            },
        },

    }
}
