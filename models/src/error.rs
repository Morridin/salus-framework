use std::{
    error::Error,
    string::FromUtf8Error,
    fmt::{Debug, Display, Formatter}
};
use dioxus::{
    asset_resolver::AssetResolveError,
    fullstack::{
        http::method::InvalidMethod,
        reqwest,
        HttpError,
        Method,
        StatusCode
    }
};
use serde::de::StdError;
use crate::ArgType;
use crate::error::PluginError::*;

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

#[derive(Debug, Clone)]
pub enum PluginError {
    BadRequestInvalid(String),
    BadRequestFramework,
    BadRequestParamMissing(String, String, String),
    BadRequestInvalidParam(String, String, String, ArgType, String),
    NotFoundId(String),
    NotFoundEndpoint(String, String),
    BadMethod(String, String, Method),
    InternalNoCache,
    InternalReadCache,
    InternalWriteCache,
    InternalReadManifest(String),
    InternalFail(String, String),
    InternalSubProcess(String),
}

impl PluginError {
    fn status_code(&self) -> StatusCode {
        match self {
            BadRequestInvalid(_) => StatusCode::BAD_REQUEST,
            BadRequestFramework => StatusCode::BAD_REQUEST,
            BadRequestParamMissing(_, _, _) => StatusCode::BAD_REQUEST,
            BadRequestInvalidParam(_, _, _, _, _) => StatusCode::BAD_REQUEST,
            NotFoundId(_) => StatusCode::NOT_FOUND,
            NotFoundEndpoint(_, _) => StatusCode::NOT_FOUND,
            BadMethod(_, _, _) => StatusCode::METHOD_NOT_ALLOWED,
            InternalNoCache => StatusCode::INTERNAL_SERVER_ERROR,
            InternalReadCache => StatusCode::INTERNAL_SERVER_ERROR,
            InternalWriteCache => StatusCode::INTERNAL_SERVER_ERROR,
            InternalReadManifest(_) => StatusCode::INTERNAL_SERVER_ERROR,
            InternalFail(_, _) => StatusCode::INTERNAL_SERVER_ERROR,
            InternalSubProcess(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

impl From<PluginError> for HttpError {
    fn from(err: PluginError) -> Self {
        HttpError::new(err.status_code(), err.to_string()).into()
    }
}

impl Display for PluginError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            BadRequestInvalid(uuid) => f.write_fmt(format_args!("Invalid plugin ID: {uuid}")),
            BadRequestFramework => f.write_str("The framework is not a valid plugin"),
            BadRequestParamMissing(uuid, endpoint, argument) => f.write_fmt(format_args!("The argument {argument} required by plugin {uuid}, endpoint {endpoint} is missing")),
            BadRequestInvalidParam(uuid, endpoint, argument, arg_type, fail) => f.write_fmt(format_args!("Could not parse argument {argument} of plugin {uuid}, endpoint {endpoint}, as {arg_type} (got {fail})")),
            NotFoundId(uuid) => f.write_fmt(format_args!("No plugin with ID {uuid} available")),
            NotFoundEndpoint(uuid, endpoint) => f.write_fmt(format_args!("Endpoint \"{endpoint}\" not found for plugin {uuid}")),
            BadMethod(uuid, endpoint, method) => f.write_fmt(format_args!("Method {method} not allowed for plugin {uuid}, endpoint \"{endpoint}\"")),
            InternalNoCache => f.write_str("Plugin cache is not available"),
            InternalReadCache => f.write_str("Could not read plugin cache"),
            InternalWriteCache => f.write_str("Could not write plugin cache"),
            InternalReadManifest(uuid) => f.write_fmt(format_args!("Error reading manifest file for plugin {uuid}")),
            InternalFail(uuid, endpoint) => f.write_fmt(format_args!("Error executing plugin {uuid}, endpoint {endpoint}")),
            InternalSubProcess(error) => f.write_fmt(format_args!("Error executing plugin backend: \n {error}")),
        }
    }
}

impl StdError for PluginError {}