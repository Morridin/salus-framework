use axum::{Router, routing::get};
use std::net::SocketAddr;
use tokio::net::TcpListener;

use backend::handlers::hello_world;

#[tokio::main]
async fn main() {
    let app = Router::new().route("/hello-world", get(hello_world));

    let addr = SocketAddr::from(([127, 0, 0, 1], 8081));
    let listener = TcpListener::bind(addr).await.unwrap();

    axum::serve(listener, app.into_make_service())
        .await
        .unwrap();
}
