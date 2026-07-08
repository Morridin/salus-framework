use models::panel::{GroupContext, GroupOrientation};
use dioxus::prelude::*;
use std::collections::HashMap;
use uuid::Uuid;
use crate::components::panel::on_mounted;

/// Generic grouping element for Panel Elements and ResizeHandle Elements.
/// The user is responsible to input the elements in the correct order.
/// The group will provide context for the resize handle elements so they can find out where they are.
///
/// ## Props
/// - `orientation`: One of either `[Horizontal]` or `Vertical`. Determines the flex direction of the group and hence, in which direction group members can be resized and in which direction they are placed on screen.
/// - `children`: The group members. Prefereably, those are other `PanelGroup`s and `Panel`s, interleaved with `ResizeHandler`s.
#[component]
pub fn PanelGroup(
    orientation: GroupOrientation,
    children: Element,
    #[props(default = 0)] min_size: i32,
    #[props(default)] uuid: Option<Uuid>,
) -> Element {
    let members = use_signal(|| HashMap::new());
    let uuid = use_signal(move || uuid.unwrap_or(Uuid::new_v4()));

    let context: Option<GroupContext> = try_use_context();

    use_context_provider(|| GroupContext::new(orientation.clone(), members));

    let size = if let Some(context) = context {
        context.children().read().get(&uuid.peek()).cloned()
    } else {
        None
    };

    rsx! {
        div {
            class: "panel-group",
            class: "{orientation}",
            "data-testvalue": "{min_size}",
            flex_basis: if let Some(size) = size { "{size.size()}px" } else { "auto" },
            onmounted: move |e: MountedEvent| async move { on_mounted(e, context, uuid(), min_size).await },
            { children },
        }
    }
}