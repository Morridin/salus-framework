//! Standard action buttons for various controls (closing, minimising, adding a plug-in)
//! including the associated context menu for plug-in selection.

use backend::api;
use dioxus::html::geometry::PagePoint;
use dioxus::prelude::*;
use dioxus_free_icons::{
    icons::ld_icons::{LdMaximize2, LdMinimize2, LdPlus, LdX},
    Icon,
};
use models::plugin::Manifest;
use models::{plugin, Position};

/// A button utilised to close an active panel or plug-in view.
/// The button does not close the component it is placed in per sé when clicked.
/// Instead, the event handler provided via its `onclick` argument is executed.
///
/// The button features an X symbol that is widely used to symbolise closing something.
#[component]
pub fn CloseButton(onclick: EventHandler<MouseEvent>) -> Element {
    rsx! {
        button {
            class: "icon-btn close-btn",
            onclick,
            Icon {
                icon: LdX,
            },
        },
    }
}

/// A button used to toggle the minimised state of a panel.
/// The state is passed as [`Signal`] via the button's only argument.
///
/// The button changes its appearance from two arrows diagonally pointing towards the centre if the
/// minimised state evaluates to `false` and two arrows diagonally pointing outwards if the same
/// state evaluates to `true`.
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

/// A button that asynchronously fetches available plug-ins for a
/// specific position upon click, opening a selection context menu.
///
/// # Arguments
/// * `position` - A [`Position`] variant indicating the [`Panel`] in which the plug-in shall be opened.
/// * `opened_plugin` - A reactive Dioxus [`Signal`] that not only indicates via its [`Option`]
///   variant whether a plug-in was selected or not, but also, in the `Some` case, which plug-in.
#[component]
pub fn AddButton(position: Position, opened_plugin: Signal<Option<Manifest>>) -> Element {
    let mut available_plugins = use_resource(move || {
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
                available_plugins.restart();
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

/// An overlay menu for keyboard- and mouse-based selection of a plug-in from a list.
/// Currently, it is always shown centered on the screen, due to unresolved problems with mouse
/// pointer based positioning close to the lower and right screen edge.
///
/// # Arguments
/// * `life_line` - A reactive Dioxus [`Signal`] that originally steered both the context menu's
///   position on the screen via [`PagePoint`] contained inside its `Option` and its visibility
///   via the `Option` state itself. Setting this to `None` closes the context menu.
/// * `options` - A list of plug-in display names with their associated ID to be shown by the menu.
/// * `selection` - The plug-in selected, if any.
#[component]
fn ContextMenu(
    life_line: Signal<Option<PagePoint>>,
    options: Result<Vec<plugin::Name>>,
    selection: Signal<Option<Manifest>>,
) -> Element {
    if life_line().is_none() {
        return rsx! {};
    }

    let backdrop = rsx! {
        div {
            class: "backdrop",
            onclick: move |_| life_line.set(None),
            oncontextmenu: move |event| {
                event.prevent_default();
                life_line.set(None);
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
