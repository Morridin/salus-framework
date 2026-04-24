use crate::models::{plugin, Position};
use crate::server;
use dioxus::html::geometry::PagePoint;
use dioxus::prelude::*;
use dioxus_free_icons::icons::ld_icons::LdPlus;
use dioxus_free_icons::{
    icons::ld_icons::{LdMaximize2, LdMinimize2, LdX},
    Icon,
};
use crate::models::plugin::PluginManifest;

#[component]
pub fn CloseButton(on_panel_close: EventHandler<MouseEvent>) -> Element {
    rsx! {
        button {
            class: "icon-btn close-btn",
            onclick: on_panel_close,
            Icon {
                icon: LdX,
            },
        },
    }
}

#[component]
pub fn MinimiseButton(panel_minimised: Signal<bool>) -> Element {
    rsx! {
        button {
            class: "icon-btn minimise-btn",
            onclick: move |_| panel_minimised.toggle(),
            if !panel_minimised() {
                Icon {
                    icon: LdMinimize2,
                }
            }
            else {
                Icon {
                    icon: LdMaximize2,
                }
            }
        },
    }
}

#[component]
pub fn AddButton(position: Position, opened_plugin: Signal<Option<PluginManifest>>) -> Element {
    let available_plugins = use_resource(move || {
        let position = position.clone();
        async move { server::plugins(Some(position)).await }
    });
    let plugins_ready = use_memo(move || available_plugins.state() == UseResourceState::Ready);
    let mut life_line = use_signal(|| None);

    rsx! {
        button {
            class: "icon-btn",
            disabled: !plugins_ready(),
            onclick: move |event: MouseEvent| {
                life_line.set(Some(event.page_coordinates()));
            },
            Icon {
                icon: LdPlus,
            }
        },
        if plugins_ready() {
            ContextMenu {
                life_line,
                options: available_plugins.value().unwrap(),
                selection: opened_plugin
            }
        }
    }
}

#[component]
fn ContextMenu(
    life_line: Signal<Option<PagePoint>>,
    options: Result<Vec<plugin::Name>>,
    selection: Signal<Option<PluginManifest>>,
) -> Element {
    if life_line().is_none() {
        return rsx! {};
    }

    let position = life_line.unwrap();
    let backdrop = rsx! {
        div {
            class: "backdrop",
            onclick: move |_| life_line.set(None),
            oncontextmenu: move |event| {
                event.prevent_default();
                life_line.set(Some(event.page_coordinates()));
            }
        }
    };

    match options {
        Ok(options) => rsx! {
            ul {
                class: "context-menu",
                left: "{position.x}px",
                top: "{position.y}px",
                for plugin::Name { uuid, name } in options {
                    li {
                        class: "context-menu-entry",
                        onclick: move |_| {
                            let uuid = uuid.clone();
                            async move {
                                let manifest = server::get_plugin_by_id(uuid).await;
                                life_line.set(None);

                                match manifest {
                                    Ok(manifest) => {
                                        selection.set(Some(manifest));
                                    },
                                    Err(_) => {
                                        selection.set(None);
                                    }
                                }
                            }
                        },
                        "{name}",
                    },
                }
            },
            { backdrop },
        },
        Err(error) => rsx! {
            div {
                class: "context-menu plugin-error",
                left: "{position.x}px",
                top: "{position.y}px",
                onclick: move |_| life_line.set(None),
                "{error}"
            },
            { backdrop },
        },
    }
}
