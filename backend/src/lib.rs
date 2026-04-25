use crate::handlers::{hello_world, hello_world_options};
use dioxus::fullstack::routing::{get, options, Router};

pub mod handlers;

pub mod api;
mod auth;

pub mod utils {
    pub use crate::auth::authorize;
}

pub fn add_handlers(router: Router) -> Router {
    router
        .route("/{uuid}/hello-world", get(hello_world))
        .route("/{uuid}/hello-world", options(hello_world_options))
}
