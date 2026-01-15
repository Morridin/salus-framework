use dioxus::prelude::*;

fn main() {
    dioxus::launch(App);
}

#[component]
fn App() -> Element {
    let mut external_content = use_signal(|| "".to_string());

    let get_external_content = move |_| async move {
        let address = "127.0.0.1:8081";
        let resource = "/hello-world";

        let response = match reqwest::get(format!("https://{}{}", address, resource)).await {
            Ok(response) => response
                .text()
                .await
                .unwrap_or_else(|error| error.to_string()),
            Err(error) => error.to_string(),
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
