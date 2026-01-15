use std::fs;
use axum::http::{HeaderMap, StatusCode};
use axum::response::IntoResponse;

pub async fn hello_world(headers: HeaderMap) -> Result<impl IntoResponse, (StatusCode, String)> {
    if !headers.contains_key("Authorization") {
        return Err((StatusCode::UNAUTHORIZED, "Missing Authorization header".to_string()))
    }

    let token_from_header = headers["Authorization"].to_str().unwrap_or_else(|_| "");
    if !token_from_header.starts_with("Bearer ") {
        return Err((StatusCode::UNAUTHORIZED, "Invalid Authorization header".to_string()))
    }

    let token_from_header = token_from_header.strip_prefix("Bearer ").unwrap();
    let token = fs::read_to_string("../token").unwrap_or_else(|_| "".to_string());
    if token_from_header == token {
        Ok(([("Access-Control-Allow-Origin", "*")], "Hello, World!"))
    }
    else {
        Err((StatusCode::FORBIDDEN, "Invalid authentication token".to_string()))
    }

}