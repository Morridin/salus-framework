use crate::components::plugin_list::{PluginContainer, PluginManifest};
use dioxus::prelude::*;
use dioxus_free_icons::Icon;
use dioxus_free_icons::icons::vsc_icons::VscClose;

/// The highest-level units the main page is built of.
#[component]
pub fn Panel(
    #[props(default)] class: String,
    #[props(default)] panel_name: String,
    #[props(default = false)] headless: bool,
    children: Element,
) -> Element {
    let mut closed = use_signal(|| "");

    rsx! {
        div {
            class: format!("panel {} {}", class, closed),
            if !headless {
                div {
                    class: "panel-header",
                    span { { panel_name }, },
                    button {
                        class: "close-btn",
                        onclick: move |_| closed.set("closed"),
                        Icon {
                            width: 24,
                            height: 24,
                            fill: "black",
                            icon: VscClose,
                        },
                    },
                },
            },
            div {
                class: "panel-body",
                {children},
            },
        },
    }
}

#[component]
pub fn PluginPanel(
    #[props(default)] class: String,
    #[props(default)] panel_name: String,
    #[props(default = false)] headless: bool,
    position: String,
    #[props(default)] plugin_manifests: Signal<Vec<PluginManifest>>,
    children: Element,
) -> Element {
    let plugin_manifests = plugin_manifests();
    let plugin = plugin_manifests
        .iter()
        .rev()
        .filter(|p| p.panels[0] == position)
        .next();

    if let Some(plugin) = plugin {
        rsx! {
            Panel {
                class,
                headless,
                panel_name: plugin.name.clone(),
                PluginContainer { plugin: plugin.clone() }
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
