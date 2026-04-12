use crate::models::panel::{GroupOrientation, GroupContext};
use dioxus::prelude::*;
use std::collections::HashMap;

/// Generic grouping element for Panel Elements and ResizeHandle Elements.
/// The user is responsible to input the elements in the correct order.
/// The group will provide context for the resize handle elements so they can find out where they are.
///
/// ## Props
/// - `orientation`: One of either `[Horizontal]` or `Vertical`. Determines the flex direction of the group and hence, in which direction group members can be resized and in which direction they are placed on screen.
/// - `children`: The group members. Prefereably, those are other `PanelGroup`s and `Panel`s, interleaved with `ResizeHandler`s.
#[component]
pub fn PanelGroup(orientation: GroupOrientation, children: Element) -> Element {
    let members = use_signal(|| HashMap::new());

    let context: Option<GroupContext> = try_use_context();

    use_context_provider(|| GroupContext::new(orientation.clone(), members));
    rsx! {
        div {
            class: "panel-group",
            class: "{orientation}",
            { children }
        }
    }
}

