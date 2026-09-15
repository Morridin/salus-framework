use std::fs;
use dioxus::fullstack::{HeaderMap, StatusCode};

/// Validates the incoming request headers for a valid Bearer authentication token.
///
/// This function extracts the `Authorization` header, ensures it uses the `Bearer` scheme,
/// and compares the provided token against a secret token stored locally in a file named `token`.
///
/// # Arguments
///
/// * `headers` - The HTTP header map from the incoming request.
///
/// # Returns
///
/// Returns a tuple containing:
/// * `StatusCode` - The HTTP status reflecting the outcome of the authorization check.
/// * `String` - A descriptive message accompanything the status (e.g., `"OK"` or an error description).
///
/// # Status Codes
///
/// * `200 OK` - If the token matches the server's expected token.
/// * `400 BAD_REQUEST` - If the token cannot be properly parsed after the prefix.
/// * `401 UNAUTHORIZED` - If the header is missing, malformed, or doesn't start with `"Bearer "`.
/// * `403 FORBIDDEN` - If the token is syntactically valid but does not match the stored token.
/// * `500 INTERNAL_SERVER_ERROR` - If the server fails to read the local `token` file from disk.
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
