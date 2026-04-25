use dioxus::fullstack::{
    http::{
        method::InvalidMethod,
        header::ACCEPT
    },
    reqwest,
    reqwest::{Method, RequestBuilder},
};
use serde::Deserialize;

#[derive(Deserialize, Clone)]
pub struct Message {
    origin: String,
    method: String,
    endpoint: String,
    #[serde(default)]
    body: Option<String>,
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
        let request = reqwest::Client::new()
            .request(
                method,
                format!("http://{}/{}/{}", target, uuid, self.endpoint), // TODO: FIX!!!
            )
            .header(ACCEPT, "text/plain");
        match self.body {
            Some(ref body) => Ok(request.body(body.clone())),
            None => Ok(request),
        }
    }

    pub fn body(&self) -> Option<&str> {
        match self.body {
            Some(ref body) => Some(body.as_str()),
            None => None,
        }
    }
}
