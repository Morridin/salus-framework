use crate::server::list_plugins;
use dioxus::fullstack::serde::Deserialize;
use dioxus::prelude::*;
use crate::models::plugin::PluginManifest;

#[component]
pub fn PluginList(plugin_manifests: Signal<Vec<PluginManifest>>) -> Element {
    let server_success = use_server_future(move || async { list_plugins().await });

    let plugin_list = use_resource(move || async move {
        match dioxus::asset_resolver::read_asset_bytes(asset!("/plugins/plugin-list.json")).await {
            Ok(bytes) => serde_json::from_slice(&bytes)
                .unwrap_or_else(|e| vec![format!("Error parsing plugin list!\n\n{}\n", e)]),
            Err(e) => vec![format!("Error reading plugins list file!\n\n{}\n", e)],
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
                Some(plugin_list) => match plugin_list.first() {
                    Some(name) => rsx! {
                        if name.starts_with("Error ") {
                            pre {
                                class: "plugin-error",
                                "{name}"
                            },
                        }
                        else {
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
                    },
                    None => rsx! { p { "No plugins found!" }, },
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
    let loading_message = format!("Loading plugin manifest {}", uuid);

    let plugin_data = use_resource(move || {
        let manifest = manifest.clone();
        let path_prototype = path_prototype.clone();
        let uuid = uuid.clone();

        async move {
            match dioxus::asset_resolver::read_asset_bytes(manifest).await {
                Ok(bytes) => PluginManifest::create(uuid, &*bytes),
                Err(e) => {
                    let error_message = format!(
                        "Error loading plugin manifest for {}!\n\n{}\n",
                        uuid, e
                    );
                    PluginManifest::create_invalid(uuid, error_message)
                },
            }
        }
    });

    match &*(plugin_data.read()) {
        Some(data) => {
            if data.is_valid() {
                let manifest = data.clone();
                rsx! {
                    span {
                        class: "plugin-list-entry",
                        onclick: move |_| plugin_manifests.push(manifest.clone()),
                        "{data}",
                    },
                }
            }
            else {
                rsx! { "Error: {data}" }
            }
        }
        None => rsx! { "{loading_message}" },
    }
}
