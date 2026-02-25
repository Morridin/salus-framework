use crate::components::Panel;
use crate::models::{BackendRequestError, Message, PluginManifest};
use dioxus::fullstack::reqwest::Response;
use dioxus::fullstack::reqwest::header::ACCEPT;
use dioxus::prelude::*;
use std::error::Error;
use wasm_bindgen::prelude::*;
use web_sys::{MessageEvent, window};

#[component]
pub fn PluginPanel(
    #[props(default)] class: String,
    #[props(default)] panel_name: String,
    #[props(default = false)] headless: bool,
    position: String,
    #[props(default)] plugin_manifests: ReadSignal<Vec<PluginManifest>>,
    children: Element,
) -> Element {
    // Signals
    let mut plugin = use_signal(|| None);
    let mut external_message = use_signal(|| String::new());
    let mut message_data = use_signal(|| None);
    let mut message_received = use_signal(|| false);

    let plugin_prototype = plugin_manifests
        .iter()
        .filter(|p| p.panels()[0] == position)
        .last();

    match plugin_prototype {
        Some(p) => plugin.set(Some(p.clone())),
        None => plugin.set(None),
    }

    // Handlers for Plugin-MPI
    use_effect(move || {
        let mut eval = document::eval(
            r#"
            const handler = event => {
                dioxus.send(event.data);
            };
            window.addEventListener("message", handler);

            return () => window.removeEventListener("message", handler);
        "#,
        );
        spawn(async move {
            while let Ok(data) = eval.recv::<String>().await {
                let plugin = match plugin() {
                    Some(plugin) => plugin,
                    None => continue,
                };

                let message = match Message::create(data.as_str()) {
                    Ok(message) => message,
                    Err(error) => continue, // TODO: Implement Error Handling!
                };

                // Get origin, check actual UUID in it and leave if not matching
                match message.origin().split_once("plugins-") {
                    Some((_, origin)) => match origin.split("/").skip(1).next() {
                        Some(uuid) => {
                            if uuid != plugin.uuid() {
                                continue;
                            }
                        }
                        None => continue,
                    },
                    None => continue,
                }

                message_data.set(Some(message));
            }
        });
    });

    let backend_request = use_resource(move || async move {
        let plugin = plugin.read();
        let message = message_data.read();

        if !*message_received.peek() && plugin.is_some() && message.is_some() {

            message_received.set(true);

            let plugin = plugin.as_ref().unwrap();
            let message = message.as_ref().unwrap();

            if let Ok(r) = make_backend_request(plugin, message).await {
                external_message.set(String::from(r));
            }
        }
    });

    use_effect(move || {
        let message = external_message.read();

        if let Some(plugin) = plugin.read().as_ref()
            && !message.is_empty()
        {
            let message = format!(
                r#"document.getElementById("{}").contentWindow.postMessage({}, "*");"#,
                plugin.uuid(),
                serde_json::to_string(&*message).unwrap_or("null".to_string())
            );
            let eval = document::eval(&message);
            message_received.set(false);
        }
    });

    static PLUGIN_FOLDER: Asset = asset!("/plugins/");

    if let Some(plugin) = &plugin() {
        let local_url = format!("{}/{}/{}", PLUGIN_FOLDER, plugin.uuid(), plugin.source());
        rsx! {
            Panel {
                class,
                headless,
                panel_name: plugin,
                match plugin.kind() {
                    "static" => rsx! {
                        iframe {
                            src: local_url,
                            "sandbox": "allow-downloads allow-forms allow-popups allow-same-origin",
                        },
                    },
                    "dynamic" => rsx!{
                        iframe {
                            id: plugin.uuid(),
                            src: local_url,
                        },
                    },
                    "extern" => rsx!{
                        iframe {
                            id: plugin.uuid(),
                            src: plugin.source(),
                        },
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

async fn make_backend_request(
    plugin: &PluginManifest,
    message_data: &Message,
) -> Result<String, BackendRequestError> {
    let uuid = plugin.uuid();

    let address = "127.0.0.1:8081";

    // Retrieve token
    static TOKEN: Asset = asset!("../../token");
    let bytes = dioxus::asset_resolver::read_asset_bytes(&TOKEN).await?;
    let token = String::from_utf8(bytes)?;

    Ok(message_data
        .get_request(address, uuid)
        .await?
        .bearer_auth(token)
        .send()
        .await?
        .text()
        .await?)
}
