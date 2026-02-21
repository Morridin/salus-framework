use std::{
    error::Error,
    string::FromUtf8Error,
    fmt::{Debug, Display, Formatter}
};
use dioxus::{
    asset_resolver::AssetResolveError,
    fullstack::{
        http::method::InvalidMethod,
        reqwest
    }
};

#[derive(Debug)]
pub enum BackendRequestError {
    AssetLoad(AssetResolveError),
    UTF8Conversion(FromUtf8Error),
    InvalidMethod(InvalidMethod),
    RequestError(reqwest::Error),
    NoPlugin(),
}

impl Display for BackendRequestError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::AssetLoad(e) => write!(f, "Error loading asset:\n{e}"),
            Self::UTF8Conversion(e) => write!(f, "Error reading file:\n{e}"),
            Self::InvalidMethod(e) => write!(f, "Invalid HTTP request method:\n{e}"),
            Self::RequestError(e) => write!(f, "Error sending request to backend:\n{e}"),
            Self::NoPlugin() => write!(f, "No plugin loaded."),
        }
    }
}

impl Error for BackendRequestError {}

impl From<AssetResolveError> for BackendRequestError {
    fn from(e: AssetResolveError) -> Self {
        Self::AssetLoad(e)
    }
}

impl From<FromUtf8Error> for BackendRequestError {
    fn from(e: FromUtf8Error) -> Self {
        Self::UTF8Conversion(e)
    }
}

impl From<InvalidMethod> for BackendRequestError {
    fn from(e: InvalidMethod) -> Self {
        Self::InvalidMethod(e)
    }
}
impl From<reqwest::Error> for BackendRequestError {
    fn from(error: reqwest::Error) -> Self {
        Self::RequestError(error)
    }
}