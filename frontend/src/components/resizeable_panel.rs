use dioxus::prelude::*;
use crate::models::Position;

#[component]
pub fn ResizeablePanel(position: Position, children: Element) -> Element {
    let mut resize_active = use_signal(|| false);
    let mut size = use_signal::<u16>(|| 288);

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
                Position::Left => format!("{size}px"),
                Position::Right => format!("calc(100vw - {size}px)"),
                _ => "100%".to_string(),
            },
            height: match position {
                Position::Top => format!("{size}px"),
                Position::Bottom => format!("calc(100vh - {size}px)"),
                _ => "100%".to_string(),
            },
            flex_direction,
            { children },
            div {
                class: "panel-resize-handler",
                cursor: if resize_horizontal { "ew-resize" } else { "ns-resize" },
                onmousedown: move |e: MouseEvent| {
                    resize_active.set(true)
                },
                div {
                    class: "panel-resize-overlay",
                    z_index: 2,
                    display: if *resize_active.read() { "block" } else { "none" },
                    onmousemove: move |e: MouseEvent| {
                        if *resize_active.peek() {
                            size.set(
                                if resize_horizontal {
                                     e.coordinates().client().x
                                } else {
                                    e.coordinates().client().y
                                } as u16
                            )
                        }
                    },
                    onmouseup: move |e: MouseEvent| {
                        resize_active.set(false);
                    },
                }
            },
        },
    }
}

