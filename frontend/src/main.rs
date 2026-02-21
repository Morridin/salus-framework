use models::PluginManifest;
use dioxus::prelude::*;
use crate::components::{Panel, PluginList, PluginPanel};

mod components;
mod server;
mod models;

#[cfg(feature = "web")]
fn main() {
    dioxus::launch(App);
}

#[cfg(feature = "server")]
#[tokio::main]
async fn main() {
    use axum_server::tls_rustls::RustlsConfig;
    use dioxus::server::axum::Router;
    use std::net::SocketAddr;

    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("Failed to install rustls crypto provider");

    let ssr_options = ServeConfig::new();

    let app = Router::new().serve_dioxus_application(ssr_options, App);

    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));

    let config = RustlsConfig::from_pem_file(".certs/cert.pem", ".certs/key.pem")
        .await
        .unwrap();

    axum_server::bind_rustls(addr, config)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

#[component]
fn App() -> Element {
    // Required for plugin handling
    let plugin_manifests: Signal<Vec<PluginManifest>> = use_signal(|| vec![]);

    rsx! {
        document::Stylesheet {
            href: asset!("/www-root/assets/main.css"),
        },
        Panel {
            class: "side-panel",
            panel_name: "Left Panel",
            PluginList {
                plugin_manifests
            },
        },
        div {
            class: "central-pane",
            PluginPanel {
                headless: true,
                class: "main-panel",
                position: "center",
                plugin_manifests,
                div {
                    h1 { "Welcome to Salus!", },
                    p { "To start, please select a plugin on the left panel!", },
                },
            },
            PluginPanel {
                class: "bottom-panel",
                panel_name: "Bottom Panel",
                position: "bottom",
                plugin_manifests,
            },
        },
        PluginPanel {
            class: "side-panel",
            panel_name: "Right Panel",
            position: "right",
            plugin_manifests,
            "Right panel",
        },
    }
}
