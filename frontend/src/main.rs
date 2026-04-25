use dioxus::{
    logger::tracing::Level,
    prelude::*
};
use crate::components::App;

mod components;

fn main() {
    #[cfg(feature = "web")]
    {
        dioxus::logger::init(Level::DEBUG).expect("failed to init logger");
        dioxus::launch(App);
    }
}
