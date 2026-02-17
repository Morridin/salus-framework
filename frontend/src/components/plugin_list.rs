use crate::server::list_plugins;
use dioxus::asset_resolver::AssetResolveError;
use dioxus::prelude::*;
use serde::{Deserialize, Serialize};

#[component]
pub fn PluginList(plugin_manifest: Signal<String>) -> Element {
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
                                    plugin_manifest,
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
fn PluginListEntry(uuid: String, plugin_manifest: Signal<String>) -> Element {
    static PLUGINS_FOLDER: Asset = asset!("/plugins");
    let path_prototype = format!("{}/{}", PLUGINS_FOLDER, uuid);
    let manifest = format!("{}/plugin.json", path_prototype);
    let uuid_for_resource = uuid.clone();

    let plugin_data = use_resource(move || {
        let manifest = manifest.clone();
        let path_prototype = path_prototype.clone();
        let uuid = uuid_for_resource.clone();

        async move {
            let mut plugin_data = match dioxus::asset_resolver::read_asset_bytes(manifest).await {
                Ok(bytes) => serde_json::from_slice(&bytes).unwrap_or_else(|e| PluginManifest {
                    error: Some(format!(
                        "Error parsing plug-in manifest for {}!\n\n{}\n",
                        uuid, e
                    )),
                    ..Default::default()
                }),

                Err(e) => PluginManifest {
                    error: Some(format!(
                        "Error loading plug-in manifest for {}!\n\n{}\n",
                        uuid, e
                    )),
                    ..Default::default()
                },
            };

            if plugin_data.error == None {
                match plugin_data.kind.as_str() {
                    "extern" => (),
                    _ => plugin_data.source = format!("{}/{}", path_prototype, plugin_data.source),
                };
            }
            plugin_data
        }
    });

    match &*(plugin_data.read()) {
        Some(data) => {
            if let Some(error) = &data.error {
                rsx! { "Error: {error}" }
            } else {
                let manifest = serde_json::to_string(&data)?;
                rsx! {
                    span {
                        onclick: move |_| plugin_manifest.set(manifest.clone()),
                        "{&data.name}",
                    },
                }
            }
        }
        None => rsx! { "Loading plug-in manifest {uuid}" },
    }
}

#[derive(Deserialize, Serialize, Default)]
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

#[component]
pub fn PluginContainer(plugin_manifest: Signal<String>) -> Element {
    let plugin = match serde_json::from_str::<PluginManifest>(&plugin_manifest()) {
        Ok(plugin) => plugin,
        Err(e) => {
            return rsx! {
                div {
                    class: "plugin-error",
                    h1 { "Error loading plug-in!" },
                    p { "{e}" },
                },
            };
        }
    };

    match plugin.kind.as_str() {
        "static" => rsx! {
            iframe {
                src: plugin.source,
                "sandbox": "allow-downloads allow-forms allow-popups allow-same-origin",
            },
        },
        "dynamic" | "extern" => rsx! {
            iframe {
                src: plugin.source,
            },
        },
        "rust" | "component" => rsx! {
            div {
                class: "plugin-error",
                h1 { "Error loading plug-in!" },
                p { code { "component" }, " type plug-ins are not yet supported!" },
            },
        },
        other => rsx! {
            div {
                class: "plugin-error",
                h1 { "Error loading plug-in!" },
                p { "Plug-in type ", code { "{other}" }, " is unknown and not supported" },
            },
        },
    }
}
