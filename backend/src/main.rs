use axum::{Router, routing::get};
use axum_server::tls_rustls::RustlsConfig;
use backend::handlers::hello_world;
use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    let app = Router::new().route("/hello-world", get(hello_world));

    let addr = SocketAddr::from(([127, 0, 0, 1], 8081));

    let config =
        RustlsConfig::from_pem_file("backend/.certs/cert.pem", "backend/.certs/key.pem")
            .await
            .unwrap();

    axum_server::bind_rustls(addr, config)
        .serve(app.into_make_service())
        .await
        .unwrap();
}
