use dioxus::fullstack::http::header::{AUTHORIZATION, CONTENT_TYPE};
use dioxus::fullstack::routing::Router;
use std::time::Duration;
use tower_http::cors::{Any, CorsLayer};

mod auth;
mod plugin_handler;
pub mod api;
pub mod utils {
    pub use crate::auth::authorize;
}

pub fn add_handlers(router: Router) -> Router {
    router
        // .route("/{uuid}/hello-world", get(hello_world))
        // .route("/{uuid}/hello-world", options(hello_world_options))
        .layer(
            CorsLayer::new()
                .allow_headers([CONTENT_TYPE, AUTHORIZATION])
                .max_age(Duration::from_hours(1))
                .allow_methods(Any)
                .allow_origin(Any),
        )
}
