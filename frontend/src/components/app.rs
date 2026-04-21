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
            Panel {
                min_size: 288,
                panel_name: "Plugins",
                position: Position::West,
                    PluginList {
                        plugin_manifests
                    }
            },
            ResizeHandler {},
            PanelGroup {
                orientation: GroupOrientation::Vertical,
                min_size: 500,
                TabbedGroup {
                    position: Position::North,
                },
                ResizeHandler {},
                PluginPanel {
                    min_size: 200,
                    panel_name: "Bottom Panel",
                    position: Position::South,
                },
            },
            ResizeHandler {},
            PluginPanel {
                min_size: 288,
                panel_name: "Right Panel",
                position: Position::East,
                "Right panel",
            },
        }
    }
}
