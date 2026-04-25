use std::fs;
use dioxus::fullstack::axum_core::response::{IntoResponse, Response};
use dioxus::fullstack::{HeaderMap, StatusCode};
use dioxus::fullstack::body::Body;
use dioxus::fullstack::http::{header, Version};

pub fn authorize(headers: HeaderMap) -> Result<impl IntoResponse, (StatusCode, String)> {
    let auth_header = match headers.get("Authorization") {
        Some(auth_header) => {
            // Go on and check auth header
            auth_header.to_str()
        }
        None => {
            // No authorization header sent, return 401 status code
            return Err((
                StatusCode::UNAUTHORIZED,
                "Missing Authorization header".to_string(),
            ));
        }
    };
    let auth_header = match auth_header {
        Ok(auth_header) => {auth_header}
        Err(_) => return Err((StatusCode::UNAUTHORIZED, "Invalid Authorization header".to_string())),
    };

    let token = match fs::read_to_string("backend/token") {
        // Something is broken in the server FS, return 500 status code
        Err(error) => return Err((StatusCode::INTERNAL_SERVER_ERROR, error.to_string())),
        // We got a token, save it for later.
        Ok(token) => token,
    };

    if !auth_header.starts_with("Bearer ") {
        // Wrong auth type, send 401 status code
        return Err((
            StatusCode::UNAUTHORIZED,
            "Invalid Authorization header".to_string(),
        ));
    }

    // Check token contents
    let token_from_header = auth_header.strip_prefix("Bearer ").unwrap();

    if token_from_header == token {
        Ok(Response::builder()
            .version(Version::HTTP_3)
            .status(StatusCode::OK)
            .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
            .body(Body::empty())
            .unwrap())
    } else {
        Err((
            StatusCode::FORBIDDEN,
            "Invalid authentication token".to_string(),
        ))
    }
}