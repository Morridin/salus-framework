use crate::components::Panel;
use crate::models::{BackendRequestError, Message, PluginManifest, Position};
use crate::server;
use dioxus::fullstack::reqwest::Response;
use dioxus::fullstack::reqwest::header::ACCEPT;
use dioxus::html::geometry::ClientPoint;
use dioxus::prelude::*;
use dioxus_free_icons::Icon;
use dioxus_free_icons::icons::ld_icons::LdPlus;
use std::error::Error;
use uuid::Uuid;
use wasm_bindgen::prelude::*;
use web_sys::{MessageEvent, window};

#[component]
pub fn PluginPanel(
    #[props(default)] panel_name: String,
    #[props(default = false)] headless: bool,
    position: Position,
    #[props(default)] min_size: i32,
    #[props(default = true)] required: bool,
    children: Element,
) -> Element {
    // Signals
    let mut plugin = use_signal(|| None);
    let mut external_message = use_signal(|| String::new());
    let mut message_data = use_signal(|| None);
    let mut message_received = use_signal(|| false);

    // Legacy Plugin Handling
    let plugin_manifests: Signal<Vec<PluginManifest>> = use_context();

    let plugin_prototype = plugin_manifests()
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
    // END: Plugin MPI Handlers

    static PLUGIN_FOLDER: Asset = asset!("/plugins/");

    if let Some(plugin) = &plugin() {
        let local_url = format!("{}/{}/{}", PLUGIN_FOLDER, plugin.uuid(), plugin.source());
        rsx! {
            Panel {
                headless,
                position,
                min_size,
                required,
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
                headless,
                position,
                min_size,
                panel_name,
                required,
                button {
                    class: "icon-btn",
                    onclick: move |_| async move { on_plugin_open().await },
                    Icon {
                        icon: LdPlus,
                    }
                },
                {children}
            },
        }
    }
}

async fn on_plugin_open() {
    let available_plugins: Result<Vec<String>> = match server::plugins().await {
        Ok(json) => serde_json::from_str::<Vec<String>>(&json).into(),
        Err(error) => Err(error),
    };
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

#[component]
fn ContextMenu(
    life_line: Signal<Option<ClientPoint>>,
    options: Result<Vec<String>>,
    selection: Signal<Option<String>>,
) -> Element {
    if life_line().is_none() {
        return rsx! {};
    }

    let position = life_line.unwrap();

    rsx! {
        match options {
            Ok(options) => {
                rsx! {
                    ul {
                        class: "context-menu",
                        left: "{position.x}px",
                        top: "{position.y}px",
                        for plugin_id in options {
                            li {
                                class: "context-menu-entry",
                                onclick: {
                                    let plugin_id = plugin_id.clone();
                                    move |_| {
                                        life_line.set(None);
                                        selection.set(Some(plugin_id));
                                    }
                                },
                                "{plugin_id}",
                            },
                        }
                    },
                }
            },
            Err(error) => rsx! {
                div {
                    class: "context-menu plugin-error",
                    left: "{position.x}px",
                    top: "{position.y}px",
                    onclick: move |_| life_line.set(None),
                    "{error}"
                }
            },
        },
        div {
            class: "backdrop",
            onclick: move |_| life_line.set(None),
            oncontextmenu: move |event| {
                event.prevent_default();
                life_line.set(Some(event.client_coordinates()));
            }
        }
    }
}
