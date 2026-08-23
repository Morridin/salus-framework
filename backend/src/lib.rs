#[cfg(feature = "server")]
use dioxus::fullstack::{
    http::header::{AUTHORIZATION, CONTENT_TYPE},
    routing::Router
};
#[cfg(feature = "server")]
use std::time::Duration;
#[cfg(feature = "server")]
use tower_http::{
    cors::{Any, CorsLayer},
    services::ServeDir
};

mod auth;
mod plugin_handler;

/// General API handlers.
pub mod api;

/// Resolves the directory plug-ins are read from and executed in.
pub mod plugin_dir;

/// Public utility functions re-exported for convenience across the backend.
pub mod utils {
    pub use crate::auth::authorize;
}

/// Registers global middleware layers and handles central router configurations.
///
/// This function takes the base Dioxus fullstack `Router`, nests the plug-in file server under
/// [`models::routes::PLUGIN_FILES_ROOT`], and applies a global `CorsLayer` to manage cross-origin
/// requests, setting allowed headers, caching duration, methods, and origins.
///
/// # Arguments
///
/// * `router` - The incoming Dioxus `Router` instance to be configured.
///
/// # Returns
///
/// Returns the updated `Router` instance with the plug-in file server and CORS middleware layer
/// applied.
///
/// # Middleware Configured
///
/// * **CORS (Cross-Origin Resource Sharing):**
///   * Allowed Headers: `Content-Type`, `Authorization`
///   * Max Age: 1 hour (browser cache duration for preflight options requests)
///   * Allowed Methods: `Any` (GET, POST, etc.)
///   * Allowed Origins: `Any` (permits access from any origin)
#[cfg(feature = "server")]
pub fn add_handlers(router: Router) -> Router {
    router
        .nest_service(
            models::routes::PLUGIN_FILES_ROOT,
            ServeDir::new(plugin_dir::root()),
        )
        .layer(
            CorsLayer::new()
                .allow_headers([CONTENT_TYPE, AUTHORIZATION])
                .max_age(Duration::from_hours(1))
                .allow_methods(Any)
                .allow_origin(Any),
        )
}
