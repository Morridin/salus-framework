use dioxus::prelude::*;
use dioxus_free_icons::{
    Icon,
    icons::ld_icons::{LdMaximize2, LdMinimize2, LdX}
};

#[component]
pub fn CloseButton(panel_closed: Signal<bool>) -> Element {
    rsx! {
        button {
            class: "panel-header-btn close-btn",
            onclick: move |_| panel_closed.set(true),
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
            class: "panel-header-btn minimise-button",
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