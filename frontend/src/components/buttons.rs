use crate::models::{PluginManifest, Position, plugin};
use crate::server;
use dioxus::html::geometry::ClientPoint;
use dioxus::prelude::*;
use dioxus_free_icons::icons::ld_icons::LdPlus;
use dioxus_free_icons::{
    Icon,
    icons::ld_icons::{LdMaximize2, LdMinimize2, LdX},
};

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
    let available_plugins = use_resource(move || async move { server::plugins(&position).await });
    let mut life_line = use_signal(|| None);

    rsx! {
        button {
            class: "icon-btn",
            onclick: move |event: MouseEvent| {
                life_line.set(Some(event.client_coordinates()));
            },
            Icon {
                icon: LdPlus,
            }
        },
        ContextMenu {
            life_line,
            options: available_plugins().unwrap(),
            selection: opened_plugin
        }
    }
}

#[component]
fn ContextMenu(
    life_line: Signal<Option<ClientPoint>>,
    options: Result<Vec<plugin::Name>>,
    selection: Signal<Option<PluginManifest>>,
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
                        for plugin::Name { uuid, name } in options {
                            li {
                                class: "context-menu-entry",
                                onclick: move |_| {
                                    life_line.set(None);
                                    selection.set(Some(uuid));
                                },
                                "{name}",
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
