use models::{
    PluginManifest,
    Position,
    panel::GroupOrientation
};
use components::{
    Panel,
    PanelGroup,
    PluginList,
    PluginPanel,
    ResizeHandler
};
use dioxus::{
    logger::tracing::Level,
    prelude::*
};

mod components;
mod models;
mod server;

fn main() {
    #[cfg(feature = "web")]
    {
        dioxus::logger::init(Level::DEBUG).expect("failed to init logger");
        dioxus::launch(App);
    }

    #[cfg(feature = "server")]
    {
        dioxus::serve(|| async { Ok(dioxus::server::router(App)) });
    }
}

#[component]
fn App() -> Element {
    // Required for plugin handling
    let plugin_manifests: Signal<Vec<PluginManifest>> = use_signal(|| vec![]);

    rsx! {
        document::Stylesheet {
            href: asset!("/www-root/assets/main.css"),
        },
        PanelGroup {
            orientation: GroupOrientation::Horizontal,
            Panel {
                panel_name: "Plugins",
                position: Position::West,
                    PluginList {
                        plugin_manifests
                    }
            },
            ResizeHandler {},
            PanelGroup {
                orientation: GroupOrientation::Vertical,
                PluginPanel {
                    headless: true,
                    position: Position::North,
                    plugin_manifests,
                    div {
                        h1 { "Welcome to Salus!", },
                        p { "To start, please select a plugin on the left panel!", },
                    },
                },
                ResizeHandler {},
                PluginPanel {
                    panel_name: "Bottom Panel",
                    position: Position::South,
                    plugin_manifests,
                },
            },
            ResizeHandler {},
            Panel {
                panel_name: "Right Panel",
                position: Position::East,
                "Right panel",
            },
        }
    }
}
