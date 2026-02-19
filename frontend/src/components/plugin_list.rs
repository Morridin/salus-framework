use crate::server::list_plugins;
use dioxus::prelude::*;
use dioxus::fullstack::serde::Deserialize;

#[component]
pub fn PluginList(plugin_manifests: Signal<Vec<PluginManifest>>) -> Element {
    let server_success = use_server_future(move || async { list_plugins().await });

    let plugin_list = use_resource(move || async move {
        match dioxus::asset_resolver::read_asset_bytes(asset!("/plugins/plugin-list.json")).await {
            Ok(bytes) => serde_json::from_slice(&bytes).unwrap_or_else(|e| vec![format!("Error parsing plugin list!\n\n{}\n", e)]),
            Err(e) => vec![format!("Error reading plugins list file!\n\n{}\n", e)]
        }
    });

    rsx! {
        h2 { "Available Plugins" },
        if let Err(e) = server_success {
            pre {
                class: "plugin-error",
                "Error writing plug-ins list!\n\n{e}"
            },
        }
        else {
            match plugin_list() {
                Some(plugin_list) => {
                    match plugin_list.iter().next() {
                        Some(name) => {
                            if name.starts_with("Error ") {
                                rsx! {
                                    pre {
                                        class: "plugin-error",
                                        "{name}"
                                    },
                                }
                            }
                            else {
                                rsx! {
                                    ul {
                                        for name in plugin_list {
                                            li {
                                                PluginListEntry {
                                                    uuid: name,
                                                    plugin_manifests,
                                                },
                                            },
                                        }
                                    },
                                }
                            }
                        },
                        None => rsx! { p { "No plugins found!" }, },
                    }
                },
                None => rsx! { p { "Plugins still loading ..."}, },
            }
        },
    }
}

#[component]
fn PluginListEntry(uuid: String, plugin_manifests: Signal<Vec<PluginManifest>>) -> Element {
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
                        "Error parsing plugin manifest for {}!\n\n{}\n",
                        uuid, e
                    )),
                    ..Default::default()
                }),

                Err(e) => PluginManifest {
                    error: Some(format!(
                        "Error loading plugin manifest for {}!\n\n{}\n",
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
                let manifest = data.clone();
                rsx! {
                    span {
                        class: "plugin-list-entry",
                        onclick: move |_| plugin_manifests.push(manifest.clone()),
                        "{&data.name}",
                    },
                }
            }
        }
        None => rsx! { "Loading plugin manifest {uuid}" },
    }
}

#[derive(Deserialize, Default, PartialEq, Clone)]
pub(crate) struct PluginManifest {
    pub(crate) name: String,
    #[serde(rename = "type")]
    kind: String,
    source: String,
    dependencies: Vec<String>,
    pub(crate) panels: Vec<String>,
    #[serde(default)]
    error: Option<String>,
}

#[component]
pub fn PluginContainer(plugin: PluginManifest) -> Element {
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
                h1 { "Error loading plugin!" },
                p { code { "component" }, " type plugins are not yet supported!" },
            },
        },
        other => rsx! {
            div {
                class: "plugin-error",
                h1 { "Error loading plugin!" },
                p { "Plugin type ", code { "{other}" }, " is unknown and not supported" },
            },
        },
    }
}
