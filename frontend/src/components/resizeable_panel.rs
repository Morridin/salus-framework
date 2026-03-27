use crate::models::Position;
use dioxus::prelude::*;

#[component]
pub fn ResizeablePanel(position: Position, children: Element) -> Element {
    let mut resize_active = use_signal(|| false);
    let mut size = use_signal::<i16>(|| 288);
    let mut last_mouse_position = use_signal(|| 0.0);

    let (resize_horizontal, flex_direction) = match position {
        Position::Left => (true, "row"),
        Position::Right => (true, "row-reverse"),
        Position::Top => (false, "column"),
        Position::Bottom => (false, "column-reverse"),
    };

    rsx! {
        div {
            class: "panel-wrapper",
            class: if resize_horizontal { "side-panel" } else { "bottom-panel" },
            width:  match position {
                Position::Left | Position::Right => format!("{size}px"),
                _ => "100%".to_string(),
            },
            height: match position {
                Position::Top | Position::Bottom => format!("{size}px"),
                _ => "100%".to_string(),
            },
            flex_direction,
            { children },
            div {
                class: "panel-resize-handler",
                cursor: if resize_horizontal { "ew-resize" } else { "ns-resize" },
                onmousedown: move |e: MouseEvent| {
                    resize_active.set(true);
                    last_mouse_position.set(
                        if resize_horizontal {
                            e.coordinates().client().x
                        }
                        else {
                            e.coordinates().client().y
                        }
                    );
                },
                div {
                    class: "panel-resize-overlay",
                    z_index: 2,
                    display: if *resize_active.read() { "block" } else { "none" },
                    onmousemove: move |e: MouseEvent| {
                        let current_position = if resize_horizontal {
                            e.coordinates().client().x
                        } else {
                            e.coordinates().client().y
                        };
                        let delta = (current_position - *last_mouse_position.peek()) as i16;
                        size += match position {
                            Position::Left | Position::Top => delta,
                            Position::Right | Position::Bottom => -delta,
                        };
                        last_mouse_position.set(current_position);
                    },
                    onmouseup: move |e: MouseEvent| {
                        resize_active.set(false);
                    },
                },
            },
        },
    }
}
