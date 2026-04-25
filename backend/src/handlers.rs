use crate::utils;
use dioxus::fullstack::body::Body;
use dioxus::fullstack::http::header;
use dioxus::fullstack::response::{IntoResponse, Response};
use dioxus::fullstack::{HeaderMap, HeaderValue};
use dioxus::prelude::*;

#[get("/{uuid}/hello-world", headers: HeaderMap)]
pub async fn hello_world(uuid: String) -> Result<Response> {
    let mut response = match utils::authorize(headers) {
        Ok(response) => response.into_response(),
        Err((status, message)) => return Err(HttpError::new(status, message).into()),
    };

    let headers = response.headers_mut();
    headers.append(
        header::CONTENT_TYPE,
        HeaderValue::from_str("application/json")?,
    );

    let body = response.body_mut();
    *body = Body::from(format!(r#"{{"message": "Hello, dear plugin {uuid}!"}}"#));

    Ok(response)
}

// #[options("/uuid/hello-world")]
// pub async fn hello_world_options(headers: HeaderMap) -> Response {
//     _ = headers;
//     Response::builder()
//         .status(StatusCode::OK)
//         .version(Version::HTTP_3)
//         .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
//         .header(header::ALLOW, "GET")
//         .header(header::ACCESS_CONTROL_ALLOW_METHODS, "GET")
//         .header(
//             header::ACCESS_CONTROL_ALLOW_HEADERS,
//             "Content-Type, Authorization",
//         )
//         .header(header::ACCESS_CONTROL_MAX_AGE, 60 * 60 * 24 * 200)
//         .body(Body::empty())
//         .unwrap()
// }
