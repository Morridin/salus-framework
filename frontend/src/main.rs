use std::error::Error;
use tokio::net::TcpStream;
use tokio::io::AsyncWriteExt;
use yew::prelude::*;

#[component]
fn App() -> Html {
    let rt = tokio::runtime::Runtime::new().unwrap();
    let response_text = rt.block_on(async {
        request_external_content().await.unwrap_or_else(|error| error.to_string())
    });

    html! {
        <>
            <h1>{ "Finally - it works!" }</h1>
            <p>{ "This is a showcase program presenting how Yew works." }</p>
            <p>{ "Let's pull something from the backend: "}{ response_text }</p>
        </>
    }
}

async fn request_external_content() -> Result<String, Box<dyn Error>> {
    let address = "https://127.0.0.1:8081";
    let resource = "/hello-world";

    let url = "{address}{resource}";

    let mut stream = TcpStream::connect(address).await?;

    let request = format!("GET {} HTTP/3\r\nHost: {}\r\n\r\n", resource, url);
    let request = request.as_bytes();

    stream.write_all(request).await?;

    let mut result: Vec<u8> = vec![];
    stream.try_read(&mut result)?;
    Ok(String::from_utf8(result)?)
}

fn main() {
    yew::Renderer::<App>::new().render();
}
