use dioxus::fullstack::{
    http::{
        method::InvalidMethod,
        header::ACCEPT
    },
    reqwest,
    reqwest::{Method, RequestBuilder},
};
use serde::Deserialize;

/// Represents the JavaScript object a plug-in front-end sends to the framework's front-end when
/// initialising the communication with its back-end.
#[derive(Deserialize, Clone)]
pub struct Message {
    origin: String,
    method: String,
    endpoint: String,
    #[serde(default)]
    body: Option<String>,
}

impl Message {
    /// Parses a raw JSON string slice into a new [`Message`] envelope.
    pub fn new(raw_bytes: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(raw_bytes)
    }

    /// Returns the origin value of the message sender.
    /// This value can be used to place it into the Allow-Origin CORS header.
    pub fn origin(&self) -> &str {
        self.origin.as_str()
    }

    /// Assembles an asynchronous HTTP [`RequestBuilder`] directed at the target plugin endpoint.
    ///
    /// Trims redundant leading slashes from the internal endpoint routing path automatically.
    ///
    /// # Arguments
    /// * `target` - the first portion of the URL, e.g. `"https://42-4-4z.com"`, as obtained
    ///   from JS `window.location.origin`.
    /// * `uuid` - the 4-hex-digit ID of the plug-in.
    pub async fn get_request(
        &self,
        target: &str,
        uuid: &str,
    ) -> Result<RequestBuilder, InvalidMethod> {
        let method = Method::from_bytes(self.method.as_bytes())?;
        let request = reqwest::Client::new()
            .request(
                method,
                format!("{}/{}/{}", target, uuid, self.endpoint.trim_start_matches("/")),
            )
            .header(ACCEPT, "text/plain");
        match self.body {
            Some(ref body) => Ok(request.body(body.clone())),
            None => Ok(request),
        }
    }

    /// Optional reference to the payload body text, if any accompanies the message.
    pub fn body(&self) -> Option<&str> {
        self.body.as_deref()
    }
}
