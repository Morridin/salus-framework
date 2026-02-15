use crate::server::list_plugins;
use dioxus::prelude::*;
use serde_json::{Value, json};

//noinspection RsCompileErrorMacro
#[component]
pub fn PluginList() -> Element {
    rsx! {
        h2 { "Available Plug-ins" },
        {
            let plugin_list = use_resource(move || async move {
                if let Err(e) = list_plugins().await {
                     return vec![format!("Error writing plugins list!\n\n{}\n", e)];
                };

                match dioxus::asset_resolver::read_asset_bytes(asset!("plugins/plugin-list.json")).await {
                    Ok(bytes) => {
                        let content = String::from_utf8_lossy(&bytes);
                        serde_json::from_str::<Vec<String>>(&content).unwrap_or_else(|_| vec![String::from("Error parsing plug-in list!")])
                    },
                    Err(e) => vec![format!("Error loading plug-ins!\n\n{}\n", e)]
                }
            });

            let plugin_list = plugin_list.read();

            match &*plugin_list {
                Some(plugin_list) => rsx! {
                    ul {
                        for name in plugin_list {
                            li { "{name}" }
                        }
                    }
                },
                None => rsx! {
                    p { "Plug-ins still loading ..."}
                }
            }
        }
    }
}
