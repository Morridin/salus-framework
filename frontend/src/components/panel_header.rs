use dioxus::logger::tracing::span::Attributes;
use dioxus::prelude::*;

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
