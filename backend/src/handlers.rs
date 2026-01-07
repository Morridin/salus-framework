use axum::response::IntoResponse;

pub async fn hello_world() -> impl IntoResponse {
    ([("Access-Control-Allow-Origin", "*")], "Hello, World!")
}