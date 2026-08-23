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

/// Errors that may occur when the front-end communicates with the back-end.
/// This enum is only used in the front-end.
///
/// The enum wraps several other errors into a uniform type.
#[derive(Debug)]
pub enum BackendRequestError {
    /// A Dioxus asset could not be loaded.
    AssetLoad(AssetResolveError),
    /// Parsing error when converting a UTF-8 byte vector into a [`String`]
    UTF8Conversion(FromUtf8Error),
    /// The provided HTTP method string could not be parsed into a valid [`Method`].
    InvalidMethod(InvalidMethod),
    /// An error occurred while sending the network request via [`reqwest`].
    RequestError(reqwest::Error),
    /// The IP address of the back-end server could not be determined (JS `window.location.origin` unavailable).
    NoAddress,
}

impl Display for BackendRequestError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::AssetLoad(e) => write!(f, "Error loading asset:\n{e}"),
            Self::UTF8Conversion(e) => write!(f, "Error reading file:\n{e}"),
            Self::InvalidMethod(e) => write!(f, "Invalid HTTP request method:\n{e}"),
            Self::RequestError(e) => write!(f, "Error sending request to backend:\n{e}"),
            Self::NoAddress => write!(f, "No host address available."),
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

/// Core error types representing validation failures, routing errors,
/// or subsystem panics related to plug-ins.
///
/// Implements automatic conversion into Dioxus Fullstack [`HttpError`]s.
/// Only used in the back-end.
#[derive(Debug, Clone)]
pub enum PluginError {
    /// The provided string is not a valid plug-in UUID.
    BadRequestInvalid(String),
    /// The requested plug-in ID is reserved for the framework itself.
    BadRequestFramework,
    /// A required query or body argument for a plug-in endpoint was not provided.
    ///
    /// Format: `(plugin_uuid, endpoint, argument_name)`
    BadRequestParamMissing(String, String, String),
    /// An argument failed type validation.
    ///
    /// Format: `(plugin_uuid, endpoint, argument_name, expected_type, raw_value)`
    BadRequestInvalidParam(String, String, String, ArgType, String),
    /// No plug-in matching the specified UUID could be found.
    NotFoundId(String),
    /// The requested endpoint does not exist on the specified plug-in.
    ///
    /// Format: `(plugin_uuid, endpoint)`
    NotFoundEndpoint(String, String),
    /// The requested plug-in endpoint is not defined for this HTTP method.
    ///
    /// Format: `(plugin_uuid, endpoint, method)`
    BadMethod(String, String, Method),
    /// The global plug-in runtime cache could not be accessed.
    InternalNoCache,
    /// Failed to read from the global plug-in cache.
    InternalReadCache,
    /// Failed to commit updates to the global plug-in cache.
    InternalWriteCache,
    /// The manifest file for the specified plug-in is missing or unreadable.
    InternalReadManifest(String),
    /// The back-end's plug-in endpoint handler encountered an unhandled runtime error that is not
    /// covered by other variants of this enum.
    InternalFail(String, String),
    /// The plug-in's back-end program did not return successfully (return code 0).
    InternalSubProcess(String),
    /// The plug-in back-end program did not finish in time and was terminated.
    InternalTimeout(String, String),
}

impl PluginError {
    /// Maps the internal [`PluginError`] variants to standard HTTP [`StatusCode`]s.
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
            InternalTimeout(_, _) => StatusCode::INTERNAL_SERVER_ERROR,
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
            BadRequestInvalid(uuid) => f.write_fmt(format_args!("Invalid plug-in ID: {uuid}")),
            BadRequestFramework => f.write_str("The framework is not a valid plug-in"),
            BadRequestParamMissing(uuid, endpoint, argument) => f.write_fmt(format_args!("The argument {argument} required by plug-in {uuid}, endpoint {endpoint} is missing")),
            BadRequestInvalidParam(uuid, endpoint, argument, arg_type, fail) => f.write_fmt(format_args!("Could not parse argument {argument} of plug-in {uuid}, endpoint {endpoint}, as {arg_type} (got {fail})")),
            NotFoundId(uuid) => f.write_fmt(format_args!("No plug-in with ID {uuid} available")),
            NotFoundEndpoint(uuid, endpoint) => f.write_fmt(format_args!("Endpoint \"{endpoint}\" not found for plug-in {uuid}")),
            BadMethod(uuid, endpoint, method) => f.write_fmt(format_args!("Method {method} not allowed for plug-in {uuid}, endpoint \"{endpoint}\"")),
            InternalNoCache => f.write_str("Plug-in cache is not available"),
            InternalReadCache => f.write_str("Could not read plug-in cache"),
            InternalWriteCache => f.write_str("Could not write plug-in cache"),
            InternalReadManifest(uuid) => f.write_fmt(format_args!("Error reading manifest file for plug-in {uuid}")),
            InternalFail(uuid, endpoint) => f.write_fmt(format_args!("Error executing plug-in {uuid}, endpoint {endpoint}")),
            InternalSubProcess(error) => f.write_fmt(format_args!("Error executing plug-in back-end: \n\n{error}")),
            InternalTimeout(uuid, endpoint) => f.write_fmt(format_args!("The back-end program for plug-in {uuid}, endpoint {endpoint} was terminated after hitting its wall time.")),
        }
    }
}

impl StdError for PluginError {}
