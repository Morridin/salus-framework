#![doc = include_str!("../../README.md")]
#![doc(issue_tracker_base_url = "https://github.com/Morridin/salus-framework/issues/")]

use crate::components::App;
#[cfg(feature = "web")]
use dioxus::logger::tracing::Level;

mod components;

/// Initialises the application and handles binary-dependent startup:
/// For the back-end binary, the server is equipped with the relevant routers and middleware layers,
/// and for the front-end the application is launched.
fn main() {
    #[cfg(feature = "web")]
    {
        dioxus::logger::init(Level::DEBUG).expect("failed to init logger");
        dioxus::launch(App);
    }

    #[cfg(not(feature = "web"))]
    {
        dioxus::serve(|| async {
            let router = dioxus::server::router(App);
            let router = backend::add_handlers(router);

            Ok(router)
        });
    }
}
