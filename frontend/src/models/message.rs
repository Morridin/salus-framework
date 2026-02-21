use dioxus::{
    fullstack::{
        http::method::InvalidMethod,
        reqwest,
        reqwest::{RequestBuilder, Method}
    }
};
use serde::Deserialize;

#[derive(Deserialize)]
pub struct Message {
    origin: String,
    method: String,
    endpoint: String,
    body: String,
}

impl Message {
    pub fn create(raw_bytes: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(raw_bytes)
    }

    pub fn origin(&self) -> &str {
        self.origin.as_str()
    }

    pub async fn get_request(
        &self,
        target: &str,
        uuid: &str,
    ) -> Result<RequestBuilder, InvalidMethod> {
        let method = Method::from_bytes(self.method.as_bytes())?;
        Ok(reqwest::Client::new()
            .request(
                method,
                format!("https://{}/{}/{}", target, uuid, self.endpoint),
            )
            .body(self.body.clone()))
    }

    pub fn body(&self) -> &str {
        self.body.as_str()
    }
}
