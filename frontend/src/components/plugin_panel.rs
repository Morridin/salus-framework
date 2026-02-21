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
    let mut iframe = use_signal(|| None);
    let mut external_message = use_signal(|| String::new());

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
        let window = window().expect("No global `window` exists!");

        if !plugin().is_some() {
            return;
        }

        let closure = Closure::wrap(Box::new(move |event: MessageEvent| {
            let Some(data) = event.data().as_string() else {
                return;
            };

            let message_data = match Message::create(data.as_str()) {
                Ok(message) => message,
                Err(error) => return, // TODO: Implement Error Handling!
            };

            // Get origin, check actual UUID in it and leave if not matching
            match message_data.origin().split_once("plugins-") {
                Some((_, origin)) => match origin.split_once("/") {
                    Some((_, origin)) => {
                        if origin != plugin().unwrap().uuid() {
                            return;
                        }
                    }
                    None => return,
                },
                None => return,
            }

            spawn(async move {
                if let Ok(r) = make_backend_request(&plugin().unwrap(), &message_data).await {
                    external_message.set(String::from(r));
                }
            });
        }) as Box<dyn FnMut(MessageEvent)>);

        window
            .add_event_listener_with_callback("message", closure.as_ref().unchecked_ref())
            .unwrap();

        closure.forget();
    });

    use_effect(move || {
        let message = external_message();
        if let Some(plugin) = plugin() && !message.is_empty() {
            let eval = document::eval(&format!(r#"document.getElementById({}).contentWindow.postMessage({});"#, plugin.uuid(), message));
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
                p {"{external_message}"},
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
        .header(ACCEPT, "text/plain")
        .bearer_auth(token)
        .send()
        .await?
        .text()
        .await?)
}
