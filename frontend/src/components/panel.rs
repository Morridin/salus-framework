use crate::models::PluginManifest;
use dioxus::html::a::fill;
use dioxus::prelude::*;
use dioxus_free_icons::{
    Icon,
    icons::ld_icons::{LdMaximize2, LdMinimize2, LdX},
};

/// The highest-level units the main page is built of.
#[component]
pub fn Panel(
    #[props(default)] class: String,
    #[props(default)] panel_name: String,
    #[props(default = false)] headless: bool,
    children: Element,
) -> Element {
    let mut visible = use_signal(|| true);
    let mut open = use_signal(|| true);

    let minimised = if open() { "" } else { " minimised" };

    rsx! {
        if visible() {
            div {
                class: "panel {class}{minimised}",
                if !headless {
                    div {
                        class: "panel-header{minimised}",
                        span { { panel_name }, },
                        div {
                            class: "panel-header-button-group",
                            button {
                                class: "minimise-button",
                                onclick: move |_| open.toggle(),
                                if open() {
                                    Icon {
                                        icon: LdMinimize2,
                                    }
                                }
                                else {
                                    Icon {
                                        icon: LdMaximize2,
                                    }
                                }
                            }
                            button {
                                class: "close-btn",
                                onclick: move |_| visible.toggle(),
                                Icon {
                                    icon: LdX,
                                },
                            },
                        },
                    },
                },
                if open() {
                    div {
                        class: "panel-body",
                        {children},
                    },
                }
            },
        }
    }
}
