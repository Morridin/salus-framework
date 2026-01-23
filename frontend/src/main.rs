use dioxus::logger::tracing;
use dioxus::prelude::*;
use reqwest::header::{HeaderMap, ACCEPT, AUTHORIZATION, CONTENT_TYPE};
use reqwest::Version;

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
            .await {
            Ok(response) => response
                .text()
                .await
                .unwrap_or_else(|error| error.to_string()),
            Err(error) => format!("Fehler: {}", error.to_string()),
        };

        external_content.set(response);
    };

    rsx! {
        h1 { "It works!" },
        p { "Hello there!" },
        button { onclick: get_external_content, "Load external content" },
        p { "{external_content}" }
    }
}
