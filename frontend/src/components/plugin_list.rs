use crate::server::list_plugins;
use dioxus::asset_resolver::AssetResolveError;
use dioxus::prelude::*;
use serde::{Deserialize, Serialize};

#[component]
pub fn PluginList(plugin: Signal<String>) -> Element {
    rsx! {
        h2 { "Available Plug-ins" },
        {
            let plugin_list = use_resource(move || async move {
                if let Err(e) = list_plugins().await {
                     return vec![format!("Error writing plug-ins list!\n\n{}\n", e)];
                };

                static LIST_ASSET: Asset = asset!("/plugins/plugin-list.json");

                match dioxus::asset_resolver::read_asset_bytes(&LIST_ASSET).await {
                    Ok(bytes) => serde_json::from_slice(&bytes).unwrap_or_else(|e| vec![format!("Error parsing plug-in list!\n\n{}\n", e)]),
                    Err(e) => vec![format!("Error loading plug-ins!\n\n{}\n", e)]
                }
            });

            let plugin_list = plugin_list.read();

            match &*plugin_list {
                Some(plugin_list) => rsx! {
                    ul {
                        for name in plugin_list {
                            li {
                                PluginListEntry {
                                    uuid: name,
                                    plugin,
                                }
                            }
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

#[component]
fn PluginListEntry(uuid: String, plugin: Signal<String>) -> Element {
    static PLUGINS_FOLDER: Asset = asset!("/plugins");
    let path_prototype = format!("{}/{}", PLUGINS_FOLDER, uuid);
    let manifest = format!("{}/plugin.json", path_prototype);
    let uuid_for_resource = uuid.clone();

    let plugin_data = use_resource(move || {
        let manifest = manifest.clone();
        let uuid = uuid_for_resource.clone();
        async move {
            match dioxus::asset_resolver::read_asset_bytes(manifest).await {
                Ok(bytes) => serde_json::from_slice(&bytes).unwrap_or_else(|e| PluginManifest {
                    name: String::new(),
                    kind: String::new(),
                    source: String::new(),
                    dependencies: vec![],
                    panels: vec![],
                    error: Some(format!(
                        "Error parsing plug-in manifest for {}!\n\n{}\n",
                        uuid, e
                    )),
                }),

                Err(e) => PluginManifest {
                    name: String::new(),
                    kind: String::new(),
                    source: String::new(),
                    dependencies: vec![],
                    panels: vec![],
                    error: Some(format!(
                        "Error loading plug-in manifest for {}!\n\n{}\n",
                        uuid, e
                    )),
                },
            }
        }
    });

    match &*(plugin_data.read()) {
        Some(data) => {
            if let Some(error) = &data.error {
                rsx! { "Error: {error}" }
            } else {
                let source_file = data.source.clone();
                rsx! {
                    span {
                        onclick: move |_| plugin.set(format!("{}/{}", path_prototype, source_file)),
                        "{&data.name}",
                    },
                }
            }
        },
        None => rsx! { "Loading plug-in manifest {uuid}" },
    }
}

#[derive(Deserialize, Serialize)]
struct PluginManifest {
    name: String,
    #[serde(rename = "type")]
    kind: String,
    source: String,
    dependencies: Vec<String>,
    panels: Vec<String>,
    #[serde(default)]
    error: Option<String>,
}
