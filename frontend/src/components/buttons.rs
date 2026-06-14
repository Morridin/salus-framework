use backend::api;
use dioxus::html::geometry::PagePoint;
use dioxus::prelude::*;
use dioxus_free_icons::{
    icons::ld_icons::{LdMaximize2, LdMinimize2, LdPlus, LdX},
    Icon,
};
use models::plugin::Manifest;
use models::{plugin, Position};

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
pub fn AddButton(position: Position, opened_plugin: Signal<Option<Manifest>>) -> Element {
    let available_plugins = use_resource(move || {
        let position = position.clone();
        async move { api::plugins(Some(position)).await }
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
    selection: Signal<Option<Manifest>>,
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

    let mut select_option = async move |uuid: String| {
        let manifest = api::get_plugin_by_id(uuid).await;
        life_line.set(None);

        match manifest {
            Ok(manifest) => {
                selection.set(Some(manifest));
            }
            Err(_) => {
                selection.set(None);
            }
        }
    };

    match options {
        Ok(options) => rsx! {
            div {
                class: "context-menu",
                h2 {
                    "Select a plug-in from the list below"
                }
                ul {
                    for plugin::Name { uuid, name } in options {
                        {
                            let uuid_click = uuid.clone();
                            let uuid_keydown = uuid.clone();
                            rsx! {
                            li {
                                class: "context-menu-entry",
                                role: "button",
                                tabindex: 0,
                                onclick: move |_| {
                                    let uuid = uuid_click.clone();

                                    async move {
                                        select_option(uuid).await;
                                    }
                                },
                                onkeydown: move |event: KeyboardEvent| {
                                    let uuid = uuid_keydown.clone();
                                    let key = event.key();

                                    async move {
                                        if key != Key::Enter && key != Key::Character(" ".to_string()) {
                                            if key == Key::Escape {
                                                event.prevent_default();
                                                life_line.set(None);
                                            }

                                            return;
                                        }

                                        event.prevent_default();
                                        select_option(uuid).await;
                                    }
                                },
                                "{name}",
                            },}
                        },
                    }
                },
            },
            { backdrop },
        },
        Err(error) => rsx! {
            div {
                class: "context-menu plugin-error",
                onclick: move |_| life_line.set(None),
                "{error}"
            },
            { backdrop },
        },
    }
}
