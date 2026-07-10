use dioxus::prelude::*;

/// The header component of a [`Panel`]. Also used by the [`TabbedGroup`] as tab header.
///
/// Renders the panel's name left-aligned and passes through a collection of
/// control buttons (e.g. close or minimise actions) to the right side. The buttons are displayed
/// from left to right in the order they are handed over.
#[component]
pub fn PanelHeader(
    panel_name: String,
    #[props(default)] class: Option<String>,
    buttons: Element,
    #[props(default)] onclick: EventHandler<MouseEvent>,
) -> Element {
    let base_class = "panel-header";
    let class = if let Some(class) = class {
        format!("{base_class} {class}")
    } else {
        format!("{base_class}")
    };
    rsx! {
        div {
            class,
            onclick,
            span { "{panel_name}", },
            div {
                class: "panel-header-button-group",
                { buttons },
            },
        },
    }
}
