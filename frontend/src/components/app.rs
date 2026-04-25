use crate::components::{Panel, PanelGroup, PluginList, PluginPanel, ResizeHandler, TabbedGroup};
use dioxus::prelude::*;
use models::{panel::GroupOrientation, plugin::Manifest, Position};

#[component]
pub fn App() -> Element {
    // Required for plugin handling
    let plugin_manifests: Signal<Vec<Manifest>> = use_signal(|| vec![]);
    use_context_provider(|| plugin_manifests);

    rsx! {
        document::Stylesheet {
            href: asset!("/www-root/assets/main.css"),
        },
        PanelGroup {
            orientation: GroupOrientation::Horizontal,
            TabbedGroup {
                min_size: 288,
                position: Position::West,
            },
            ResizeHandler {},
            PanelGroup {
                orientation: GroupOrientation::Vertical,
                min_size: 500,
                TabbedGroup {
                    position: Position::North,
                },
                ResizeHandler {},
                TabbedGroup {
                    min_size: 200,
                    position: Position::South,
                },
            },
            ResizeHandler {},
            TabbedGroup {
                min_size: 288,
                position: Position::East,
            },
        }
    }
}
