use crate::models::panel::{GroupContext, GroupOrientation, MetaData, Size};
use dioxus::prelude::*;
use std::collections::HashMap;
use uuid::Uuid;

/// Generic grouping element for Panel Elements and ResizeHandle Elements.
/// The user is responsible to input the elements in the correct order.
/// The group will provide context for the resize handle elements so they can find out where they are.
///
/// ## Props
/// - `orientation`: One of either `[Horizontal]` or `Vertical`. Determines the flex direction of the group and hence, in which direction group members can be resized and in which direction they are placed on screen.
/// - `children`: The group members. Prefereably, those are other `PanelGroup`s and `Panel`s, interleaved with `ResizeHandler`s.
#[component]
pub fn TabbedGroup(
    children: Element,
    #[props(default = 0)] min_size: i32,
) -> Element {
    let members = use_signal(|| HashMap::new());
    let uuid = use_signal(|| Uuid::new_v4());

    let context: Option<GroupContext> = try_use_context();

    use_context_provider(|| GroupContext::new(GroupOrientation::Horizontal, members));

    let metadata = if let Some(context) = context {
        context.children().read().get(&uuid.peek()).cloned()
    } else {
        None
    };

    rsx! {
        div {
            class: "panel-group",
            class: "{orientation}",
            flex_basis: if let Some(metadata) = metadata { "{metadata.size.size()}px" } else { "auto" },
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
                        .insert(uuid(), MetaData {title: String::new(), size: Size::new(range.start, range.end, min_size)});
                }
            },
            { children },
        }
    }
}
