use dioxus::prelude::*;
use crate::models::Position;

#[component]
pub fn ResizeablePanel(position: Position, children: Element) -> Element {
    let mut resize_active = use_signal(|| false);
    let mut size = use_signal::<i16>(|| 288);
    let mut last_mouse_position = use_signal(|| 0.0);

    let position = position.as_trait();

    rsx! {
        div {
            class: "panel-wrapper",
            // height: position.height(size()),
            // width:  position.width(size()),
            flex_basis: position.flex_basis(size()),
            flex_direction: position.flex_direction(),
            { children },
            div {
                class: "panel-resize-handler",
                cursor: position.cursor(),
                onmousedown: move |e: MouseEvent| {
                    let pos = position.get_pointer_position(&e);
                    resize_active.set(true);
                    last_mouse_position.set(pos);
                },
                div {
                    class: "panel-resize-overlay",
                    z_index: 2,
                    display: if *resize_active.read() { "block" } else { "none" },
                    onmousemove: move |e: MouseEvent| {
                        let current_pos = position.get_pointer_position(&e);
                        let last_pos = *last_mouse_position.peek();
                        size += position.calculate_size_update(current_pos, last_pos);
                        last_mouse_position.set(current_pos);
                    },
                    onmouseup: move |e: MouseEvent| {
                        resize_active.set(false);
                    },
                },
            },
        },
    }
}
