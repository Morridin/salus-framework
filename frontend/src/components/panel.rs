use crate::components::{
    PanelGroup, PanelHeader, ResizeHandler,
    buttons::{CloseButton, MinimiseButton},
};
use dioxus::html::geometry::PagePoint;
use dioxus::prelude::*;
use models::{
    panel::{GroupContext, GroupOrientation, Size, Variant},
    Position,
};
use indexmap::IndexSet;
use uuid::Uuid;

/// The highest-level units the main page is built of.
#[component]
pub fn Panel(
    #[props(default)] custom_classes: String,
    #[props(default)] panel_name: String,
    #[props(default = false)] headless: bool,
    #[props(default = true)] minimisable: bool,
    #[props(default = true)] required: bool,
    #[props(default = 0)] min_size: i32,
    position: Position,
    children: Element,
) -> Element {
    let panel_minimised = use_signal(|| false);
    let mut panel_closed = use_signal(|| false);
    let context_menu_open = use_signal(|| None);
    let mut variant = use_signal(|| Variant::Leaf);
    let uuid = use_signal(|| Uuid::new_v4());

    match variant() {
        Variant::Leaf => {
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
                    onmounted: move |e: MountedEvent| async move { on_mounted(e, context, uuid(), min_size).await },
                    oncontextmenu: move |e: MouseEvent| on_context_menu(e, context_menu_open),
                    if !headless {
                        PanelHeader {
                            panel_name,
                            class: minimised_class,
                            buttons: rsx! {
                                if minimisable {
                                    MinimiseButton { panel_minimised },
                                },
                                if !required {
                                    CloseButton { on_panel_close: move |_| panel_closed.set(true) },
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
                if context_menu_open().is_some() {
                    ContextMenu {
                        life_line: context_menu_open,
                        allowed_directions: IndexSet::from([GroupOrientation::Horizontal, GroupOrientation::Vertical]),
                        on_split: move |orientation| variant.set(Variant::Branch(orientation)),
                    }
                }
            }
        }
        Variant::Branch(orientation) => rsx! {
            PanelGroup {
                orientation,
                min_size,
                uuid: uuid(),
                Panel {
                    custom_classes: custom_classes.clone(),
                    panel_name,
                    headless,
                    minimisable,
                    required,
                    position: position.clone(),
                    children,
                },
                ResizeHandler {},
                Panel {
                    custom_classes: custom_classes.clone(),
                    headless,
                    minimisable,
                    required,
                    position: position.clone(),
                }
            }
        },
    }
}

pub async fn on_mounted(
    event: MountedEvent,
    context: Option<GroupContext>,
    uuid: Uuid,
    min_size: i32,
) {
    if context.is_none() {
        return;
    }

    let context = context.unwrap();
    let bounding_rect = event.get_client_rect().await;

    if let Ok(bounding_rect) = bounding_rect {
        let range = context
            .orientation()
            .as_range()
            .extract_range(bounding_rect);
        context
            .children()
            .write()
            .insert(uuid, Size::new(range.start, range.end, min_size));
    }
}

fn on_context_menu(event: MouseEvent, mut context_menu_open: Signal<Option<PagePoint>>) {
    event.prevent_default();
    context_menu_open.set(Some(event.page_coordinates()));
}

#[component]
fn ContextMenu(
    life_line: Signal<Option<PagePoint>>,
    allowed_directions: IndexSet<GroupOrientation>,
    on_split: EventHandler<GroupOrientation>,
) -> Element {
    if life_line().is_none() {
        return rsx! {};
    }
    let position = life_line.unwrap();
    rsx! {
        ul {
            class: "context-menu",
            left: "{position.x}px",
            top: "{position.y}px",
            for orientation in allowed_directions {
                li {
                    class: "context-menu-entry",
                    onclick: {
                        let orientation = orientation.clone();
                        move |_| {
                            life_line.set(None);
                            on_split(orientation);
                        }
                    },
                    "Split {orientation}ly",
                },
            }
        },
        div {
            class: "backdrop",
            onclick: move |_| life_line.set(None),
            oncontextmenu: move |event| {
                event.prevent_default();
                life_line.set(Some(event.page_coordinates()));
            }
        }
    }
}
