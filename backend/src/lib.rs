use dioxus::fullstack::http::header::{AUTHORIZATION, CONTENT_TYPE};
use dioxus::fullstack::routing::Router;
use std::time::Duration;
use tower_http::cors::{Any, CorsLayer};

mod auth;
mod plugin_handler;

/// General API handlers.
pub mod api;

/// Public utility functions re-exported for convenience across the backend.
pub mod utils {
    pub use crate::auth::authorize;
}

/// Registers global middleware layers and handles central router configurations.
///
/// This function takes the base Dioxus fullstack `Router` and applies a global
/// `CorsLayer` to manage cross-origin requests, setting allowed headers,
/// caching duration, methods, and origins.
///
/// # Arguments
///
/// * `router` - The incoming Dioxus `Router` instance to be configured.
///
/// # Returns
///
/// Returns the updated `Router` instance with the applied Tower HTTP middleware layers.
///
/// # Middleware Configured
///
/// * **CORS (Cross-Origin Resource Sharing):**
///   * Allowed Headers: `Content-Type`, `Authorization`
///   * Max Age: 1 hour (browser cache duration for preflight options requests)
///   * Allowed Methods: `Any` (GET, POST, etc.)
///   * Allowed Origins: `Any` (permits access from any origin)
pub fn add_handlers(router: Router) -> Router {
    router.layer(
        CorsLayer::new()
            .allow_headers([CONTENT_TYPE, AUTHORIZATION])
            .max_age(Duration::from_hours(1))
            .allow_methods(Any)
            .allow_origin(Any),
    )
}
