use dioxus::fullstack::extract::Path;
use dioxus::fullstack::{HeaderMap, HeaderValue, StatusCode};
use dioxus::fullstack::body::Body;
use dioxus::fullstack::http::{header, Version};
use dioxus::fullstack::response::{IntoResponse, Response};
use crate::utils;

pub async fn hello_world(Path(uuid): Path<String>, headers: HeaderMap) -> Response {
    let mut response = match utils::authorize(headers) {
        Ok(response) => response.into_response(),
        Err(status) => return status.into_response(),
    };

    let headers = response.headers_mut();
    headers.append(
        header::CONTENT_TYPE,
        HeaderValue::from_str("application/json").unwrap(),
    );

    let body = response.body_mut();
    *body = Body::from(format!(r#"{{"message": "Hello, dear plugin {uuid}!"}}"#));

    response
}

pub async fn hello_world_options(headers: HeaderMap) -> Response {
    _ = headers;
    Response::builder()
        .status(StatusCode::OK)
        .version(Version::HTTP_2)
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .header(header::ALLOW, "GET")
        .header(header::ACCESS_CONTROL_ALLOW_METHODS, "GET")
        .header(
            header::ACCESS_CONTROL_ALLOW_HEADERS,
            "Content-Type, Authorization",
        )
        .header(header::ACCESS_CONTROL_MAX_AGE, 60 * 60 * 24 * 200)
        .body(Body::empty())
        .unwrap()
}
