use dioxus::{
    logger::tracing::Level,
    prelude::*
};
use crate::components::App;

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
