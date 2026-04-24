use dioxus::prelude::*;
use crate::{
    components::{Panel, PanelGroup, PluginList, PluginPanel, ResizeHandler, TabbedGroup},
    models::{
        panel::GroupOrientation,
        Position,
        plugin::PluginManifest
    },
};

#[component]
pub fn App() -> Element {
    // Required for plugin handling
    let plugin_manifests: Signal<Vec<PluginManifest>> = use_signal(|| vec![]);
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
