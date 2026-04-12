use crate::components::buttons::{CloseButton, MinimiseButton};
use crate::models::panel::{GroupContext, Size};
use crate::models::{PluginManifest, Position};
use dioxus::html::geometry::PixelsRect;
use dioxus::prelude::*;
use uuid::Uuid;

/// The highest-level units the main page is built of.
#[component]
pub fn Panel(
    #[props(default)] custom_classes: String,
    #[props(default)] panel_name: String,
    #[props(default = false)] headless: bool,
    #[props(default = true)] minimisable: bool,
    #[props(default = false)] required: bool,
    #[props(default = 0)] min_size: i32,
    position: Position,
    children: Element,
) -> Element {
    let mut panel_minimised = use_signal(|| false);
    let mut panel_closed = use_signal(|| false);
    let uuid = use_signal(|| Uuid::new_v4());

    let context: Option<GroupContext> = try_use_context();

    if panel_closed() {
        return rsx! {};
    }

    let minimised_class = if panel_minimised() { "minimised" } else { "" };

    let inner_position = position.as_trait();
    let panel_type = inner_position.panel_type();

    let size = if let Some(context) = context {
        context.children().read().get(&uuid.peek()).copied()
    } else {
        None
    };

    rsx! {
        div {
            class: "panel {panel_type}",
            class: "{minimised_class}",
            class: "{custom_classes}",
            flex_basis: if let Some(size) = size { "{size.size()}px" } else { "auto" },
            onmounted: move |e: MountedEvent| async move {
                if context.is_none() {
                    return
                }
                let context = context.unwrap();
                let bounding_rect = e.get_client_rect().await;
                if let Ok(bounding_rect) = bounding_rect {
                    let range = context
                        .orientation()
                        .as_range()
                        .extract_range(bounding_rect);
                    context
                    .children()
                    .write()
                    .insert(uuid(), Size::new(range.start, range.end, min_size));
                }
            },
            if !headless {
                PanelHeader {
                    panel_name,
                    custom_classes: minimised_class,
                    buttons: rsx! {
                        if minimisable {
                            MinimiseButton { panel_minimised },
                        },
                        if !required {
                            CloseButton { panel_closed },
                        }
                    },
                },
            }
            if !panel_minimised() {
                div {
                    class: "panel-body",
                    {children},
                },
            }
        },
    }
}

#[component]
fn PanelHeader(panel_name: String, custom_classes: String, buttons: Element) -> Element {
    rsx! {
        div {
            class: "panel-header",
            class: "{custom_classes}",
            span { "{panel_name}", },
            div {
                class: "panel-header-button-group",
                { buttons },
            },
        },
    }
}
