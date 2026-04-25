use crate::components::App;
use dioxus::{logger::tracing::Level, prelude::*};

mod components;

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
