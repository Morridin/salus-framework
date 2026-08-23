use models::panel::{GroupContext, GroupOrientation};
use dioxus::prelude::*;
use std::collections::HashMap;
use uuid::Uuid;
use crate::components::panel::on_mounted;

/// Generic grouping element for [`Panel`] and [`ResizeHandle`] components.
/// The user is responsible to input the elements in the correct order.
///
/// Provides a reactive [`GroupContext`] to child components, enabling layout coordination,
/// size modifications, and axis alignment (flex direction) management.
/// In the end, the context is the basis for the UI's resizing mechanics.
///
/// # Arguments
/// - `orientation`: The [`GroupOrientation`] variant determines the flex direction of the group
///   and hence, in which direction group members can be resized and in which direction they are
///   placed on screen.
/// - `children`: The group members. Preferably, those are other [`PanelGroup`]s and [`Panel`]s,
///   interleaved with [`ResizeHandler`]s. However, you can also choose any other element. If
///   the element supports the provided [`GroupContext`], it also can be resized.
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
