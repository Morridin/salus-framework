use crate::components::{PanelGroup, ResizeHandler, TabbedGroup};
use dioxus::prelude::*;
use models::{panel::GroupOrientation, Position};

/// Main entry point for the front-end of the Salus framework.
///
/// Constructs the initial panel layout consisting of two side panels, a larger central panel and
/// a bottom panel, as is common among IDEs.
/// Also includes the stylesheet into the front-end.
#[component]
pub fn App() -> Element {

    rsx! {
        document::Stylesheet {
            href: asset!("/www-root/assets/main.css"),
        },
        PanelGroup {
            orientation: GroupOrientation::Horizontal,
            TabbedGroup {
                min_size: 288,
                position: Position::West,
                h1 {
                    "Short User Guide",
                }
                p {
                    "To open a plug-in, click on a \"+\" button and, in the pop-up menu, select the plug-in of your choice.",
                },
                p {
                    "You can close any plug-in by clicking the \"X\" button in the corresponding tab header."
                },
                p {
                    "You can resize any panel by dragging along the gap between two panels, when highlighted in green.",
                    br {},
                    "Please note that all panels have a minimum size below which they can't be reduced.",
                },
            },
            ResizeHandler {},
            PanelGroup {
                orientation: GroupOrientation::Vertical,
                min_size: 500,
                TabbedGroup {
                    position: Position::North,
                    h1 {
                        "Welcome to Salus!",
                    },
                    p {
                        "For an overview of possible actions, please refer to the left panel.",
                    },
                },
                ResizeHandler {},
                TabbedGroup {
                    min_size: 200,
                    position: Position::South,
                    p {
                        i { "There is currently no plug-in running here.", },
                    },
                },
            },
            ResizeHandler {},
            TabbedGroup {
                min_size: 288,
                position: Position::East,
                p {
                    i { "You won't ever need this panel.", },
                },
            },
        }
    }
}
