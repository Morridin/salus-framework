use dioxus::{
    prelude::*,
    html::geometry::PixelsRect,
};
use std::ops::Range;
use uuid::Uuid;
use models::panel::GroupContext;

#[component]
pub fn ResizeHandler() -> Element {
    let mut resize_active = use_signal(|| false);
    let mut last_mouse_position = use_signal(|| 0.);
    let mut data = use_signal(|| PixelsRect::zero());

    let context: GroupContext = use_context();

    let orientation = context.orientation();
    let orientation_trait = orientation.as_trait();
    let own_range = use_memo(move || orientation_trait.extract_range(data()));

    rsx! {
        div {
            class: "panel-resize-handler",
            class: "{orientation}",
            onmounted: move |e| async move {
                data.set(
                    e
                    .get_client_rect()
                    .await
                    .unwrap_or(PixelsRect::zero())
                );
            },
            onmousedown: move |e| {
                resize_active.set(true);
                last_mouse_position.set(orientation_trait.pointer_position(e));
            },
            if resize_active() {
                div {
                    class: "backdrop",
                    onmousemove: move |e: MouseEvent| {
                        let current_pos = orientation_trait.pointer_position(e);
                        let last_pos = *last_mouse_position.peek();
                        let delta = (current_pos - last_pos) as i32;

                        let delta = resize(delta, own_range(), context);

                        let translation = data.peek().translate(orientation_trait.translation_vector(delta as f64));

                        data.set(translation);
                        last_mouse_position.set(current_pos);
                    },
                    onmouseup: move |_| resize_active.set(false),
                    onmouseleave: move |_| resize_active.set(false)
                },
            }
        }
    }
}

fn resize(delta: i32, own_range: Range<i32>, context: GroupContext) -> i32 {
    let mut siblings = context.children();
    let left_sibling = context.find_left_sibling(own_range.start);
    let right_sibling = context.find_right_sibling(own_range.end);

    let mut delta = delta;

    if delta < 0 {
        if let Some(ls) = left_sibling {
            if let Some(ls) = siblings.write().get_mut(&ls) {
                delta = ls.update_right(delta);
            }
        }
        if let Some(rs) = right_sibling {
            if let Some(rs) = siblings.write().get_mut(&rs) {
                rs.update_left(delta);
            }
        }
    } else {
        if let Some(rs) = right_sibling {
            if let Some(rs) = siblings.write().get_mut(&rs) {
                delta = rs.update_left(delta);
            }
        }
        if let Some(ls) = left_sibling {
            if let Some(ls) = siblings.write().get_mut(&ls) {
                ls.update_right(delta);
            }
        }
    }
    delta
}
