use std::fs;
use dioxus::fullstack::{HeaderMap, StatusCode};

pub fn authorize(headers: HeaderMap) -> (StatusCode, String) {
    let auth_header = match headers.get("Authorization") {
        Some(auth_header) => {
            // Go on and check auth header
            auth_header.to_str()
        }
        None => {
            // No authorization header sent, return 401 status code
            return (
                StatusCode::UNAUTHORIZED,
                "Missing Authorization header".to_string(),
            );
        }
    };
    let auth_header = match auth_header {
        Ok(auth_header) => {auth_header}
        Err(_) => return (StatusCode::UNAUTHORIZED, "Invalid Authorization header".to_string()),
    };

    let token = match fs::read_to_string("token") {
        // Something is broken in the server FS, return 500 status code
        Err(error) => return (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()),
        // We got a token, save it for later.
        Ok(token) => token,
    };

    if !auth_header.starts_with("Bearer ") {
        // Wrong auth type, send 401 status code
        return (
            StatusCode::UNAUTHORIZED,
            "Invalid Authorization header".to_string(),
        );
    }

    // Check token contents
    let token_from_header = match auth_header.strip_prefix("Bearer ") {
        Some(token_from_header) => token_from_header,
        None => return (StatusCode::BAD_REQUEST, "Error reading auth token.".to_string()),
    };

    if token_from_header == token {
        (StatusCode::OK, "OK".to_string())
    } else {
        (
            StatusCode::FORBIDDEN,
            "Invalid authentication token".to_string(),
        )
    }
}