use dioxus::prelude::*;
use dioxus_free_icons::{
    Icon,
    icons::ld_icons::{LdMaximize2, LdMinimize2, LdX}
};

#[component]
pub fn CloseButton(on_panel_close: EventHandler<MouseEvent>) -> Element {
    rsx! {
        button {
            class: "panel-header-btn close-btn",
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