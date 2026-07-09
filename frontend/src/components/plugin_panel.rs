use crate::components::Panel;
use crate::components::buttons::AddButton;
use models::{plugin, BackendRequestError, Message, Position};
use dioxus::prelude::*;

#[component]
pub fn PluginPanel(
    #[props(default)] panel_name: String,
    #[props(default = false)] headless: bool,
    position: Position,
    #[props(default)] min_size: i32,
    #[props(default = true)] required: bool,
    #[props(default)] external_plugin: ReadSignal<Option<plugin::Manifest>>,
    children: Element,
) -> Element {
    // Signals
    let active_plugin = use_signal(|| None);
    let mut external_message = use_signal(|| String::new());
    let mut message_data = use_signal(|| None);
    let mut message_received = use_signal(|| false);
    let plugin = use_memo(move || {
        if external_plugin().is_some() {
            external_plugin()
        } else {
            active_plugin()
        }
    });

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
                let plugin: plugin::Manifest = match plugin() {
                    Some(plugin) => plugin,
                    None => continue,
                };

                let message = match Message::new(data.as_str()) {
                    Ok(message) => message,
                    Err(_) => continue, // TODO: Implement Error Handling!
                };

                // Get origin, check actual UUID in it and leave if not matching
				// The first split is an artifact of the asset loading construction: 
				// The plugins folder's name is accessible by its name with a hash 
				// appended after a dash. As the plugins folder is the first part 
				// of the of the resource path of the plugin file URL, it is included 
				// that way. Tbf, this approach doesn't make much sense, isn't 
				// documented, blocks extensibility and generates a bunch of other 
				// problems. 
				// TODO: include this into the future work and the results section
				// TODO: mention this in the user guide
				
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

    use_resource(move || async move {
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
                &*message
            );
            document::eval(&message);
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
                position: position.clone(),
                min_size,
                panel_name,
                required,
                AddButton {
                    position,
                    opened_plugin: active_plugin,
                },
                { children }
            },
        }
    }
}

async fn make_backend_request(
    plugin: &plugin::Manifest,
    message_data: &Message,
) -> Result<String, BackendRequestError> {
    let uuid = plugin.uuid();

    let address = web_sys::window()
        .ok_or(BackendRequestError::NoAddress)?
        .location().origin().map_err(|_| BackendRequestError::NoAddress)?;
    // For elegant error handling, use serde_wasm_bindgen::from_value::<String>()

    // Retrieve token
    static TOKEN: Asset = asset!("../../token");
    let bytes = dioxus::asset_resolver::read_asset_bytes(&TOKEN).await?;
    let token = String::from_utf8(bytes)?;

    Ok(message_data
        .get_request(&address, uuid)
        .await?
        .bearer_auth(token)
        .send()
        .await?
        .text()
        .await?)
}
