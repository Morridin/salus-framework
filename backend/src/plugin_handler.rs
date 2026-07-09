#![cfg(feature = "server")]
use crate::auth;
use dioxus::fullstack::body::Bytes;
use dioxus::fullstack::{get, HeaderMap, Method};
use dioxus::prelude::*;
use models::PluginError::*;
use models::{ArgType, PluginError};
use serde::Deserialize;
use std::collections::HashMap;
use std::{fs, path::Path};
use std::io::{ErrorKind, Read, Write};
use std::process::{Command, Stdio};
use std::sync::{OnceLock, RwLock};
use tempfile::NamedTempFile;

/// Global thread-safe cache storing parsed plugin routing tables.
///
/// Kept inside a `OnceLock` for safe global initialization on first access.
/// The inner `RwLock` allows concurrent read access for requests, while ensuring
/// exclusive write access when a new plugin is loaded into the cache.
///
/// **Structure:**
/// `Plugin ID (u16)` -> `URL Path (String)` -> `HTTP Method (String)` -> `EndpointHandler`
static PLUGIN_CACHE: OnceLock<
    RwLock<HashMap<u16, HashMap<String, HashMap<String, EndpointHandler>>>>,
> = OnceLock::new();

/// The universal GET handler for all plug-ins.
///
/// Any HTTP **GET** request any plug-in makes to its back-end ends up here.
/// The handler disassembles the request into plug-in ID, requested endpoint and transmitted
/// parameters.
/// Then, it starts the program defined in the plug-in manifest corresponding to the
/// calling plug-in and returns an HTTP response with the `stdout` or `stderr` contents of the
/// program.
/// If errors occur prior to program execution, the handler terminates and responds with the
/// correct status code indicating an error and a short message with information about the cause.
///
/// # Arguments
///
/// * `uuid` - The instance-global unique identification number (UUID) of the called plug-in.
/// * `endpoint_name` - Effectively the url resource path part after the UUID.
///   Determines which program is called by the handler and which parameters are required.
/// * `params` - The contents of the query string which are disassembled into a hashmap, hence
///   not allowing duplicate query string keys. Whether they are mandatory or not and which
///   parameters are even relevant is entirely dependent on the plug-in endpoint.
/// * `headers` - An `http::HeaderMap` object containing all headers from the HTTP request
///   triggering this handler.
///
/// # Returns
///
/// Returns a `dioxus::Result<String>`:
/// * `Ok(String)` - If and only if the program defined by the plug-in manifest has returned with
///   return code 0, the `stdout` buffer's contents are returned as is in an HTTP response.
/// * `Err(HttpError)` - Except for those cases where parameter parsing fails or the return value
///   is Ok anyway, this function returns an HttpError, usually derived from the `PluginError` enum.
#[get("/{uuid}/*endpoint_name?:params", headers:HeaderMap)]
pub async fn get_handler(
    uuid: String,
    endpoint_name: String,
    params: HashMap<String, String>,
) -> Result<String, HttpError> {
    // Fail fast if request is not authenticated by token.
    let (status, message) = auth::authorize(headers);
    if status != StatusCode::OK {
        return Err(HttpError::new(status, message).into());
    }

    let endpoints = get_plugin_routing_by_id(&uuid)?;
    let endpoint_name = format!("/{}", endpoint_name.trim_start_matches('/'));

    let endpoint = endpoints
        .get(&endpoint_name)
        .ok_or(NotFoundEndpoint(uuid.clone(), endpoint_name.clone()))?
        .get(Method::GET.as_str())
        .ok_or(BadMethod(uuid.clone(), endpoint_name.clone(), Method::GET))?;

    let mut cmd = Command::new(&endpoint.command);
    let mut cmd = cmd.current_dir(format!("plugins/{uuid}/")).args(&endpoint.default_args);

    for argument in &endpoint.args {
        let arg_type = ArgType::from_str(&argument.arg_type)
            .ok_or(InternalReadManifest(uuid.clone()))?;
        let value = match params.get(&argument.display_name) {
            Some(value) => value,
            None => {
                if argument.optional || arg_type == ArgType::Flag {
                    continue;
                } else {
                    return Err(
                        BadRequestParamMissing(
                                uuid,
                                endpoint_name,
                                argument.display_name.clone(),
                            )
                            .into(),
                    );
                }
            }
        };

        if !arg_type.validate_str(value) {
            return Err(
                BadRequestInvalidParam(
                        uuid,
                        endpoint_name,
                        argument.display_name.clone(),
                        arg_type,
                        value.clone(),
                    )
                    .into(),
            );
        }
        let validated = value;

        cmd = cmd.arg(argument.name.clone());
        if arg_type != ArgType::Flag {
            cmd = cmd.arg(validated);
        }
    }

    cmd = cmd.stdout(Stdio::piped());
    match cmd.output() {
        Ok(output) => Ok(String::from_utf8_lossy(&output.stdout).to_string()),
        Err(_) => Err(InternalFail(uuid.clone(), endpoint_name.clone()).into()),
    }
}

/// The universal POST handler for all plug-ins.
///
/// Any HTTP **POST** request any plug-in makes to its back-end ends up here.
/// The handler disassembles the request into plug-in ID, requested endpoint and transmitted
/// parameters.
/// Then, it starts the program defined in the plug-in manifest corresponding to the
/// calling plug-in and returns an HTTP response with the `stdout` or `stderr` contents of the
/// program.
/// If errors occur prior to program execution, the handler terminates and responds with the
/// correct status code indicating an error and a short message with information about the cause.
///
/// # Arguments
///
/// * `uuid` - The instance-global unique identification number (UUID) of the called plug-in.
/// * `endpoint_name` - Effectively the url resource path part after the UUID.
///   Determines which program is called by the handler and which parameters are required.
/// * `params` - The contents of the query string which are disassembled into a hashmap, hence
///   not allowing duplicate query string keys. Whether they are mandatory or not and which
///   parameters are even relevant is entirely dependent on the plug-in endpoint.
/// * `headers` - An `http::HeaderMap` object containing all headers from the HTTP request
///   triggering this handler.
/// * `body` - This parameter contains the HTTP request body as Bytes object. Without any further
///   adjustment, its contents are written into a temporary file, which is then handed over to the
///   plug-in's program per its file name if the plug-in manifest defines such a parameter for
///   the endpoint.
///
/// # Returns
///
/// Returns a `dioxus::Result<String>`:
/// * `Ok(String)` - If and only if the program defined by the plug-in manifest has returned with
///   return code 0, the `stdout` buffer's contents are returned as is in an HTTP response.
/// * `Err(HttpError)` - Except for those cases where parameter parsing fails or the return value
///   is Ok anyway, this function returns an HttpError, usually derived from the `PluginError` enum.
#[post("/{uuid}/*endpoint_name?:params", headers:HeaderMap, body:Bytes)]
pub async fn post_handler(
    uuid: String,
    endpoint_name: String,
    params: HashMap<String, String>,
) -> Result<String, HttpError> {
    // Fail fast if request is not authenticated by token.
    let (status, message) = auth::authorize(headers);
    if status != StatusCode::OK {
        return Err(HttpError::new(status, message).into());
    }

    let endpoints = get_plugin_routing_by_id(&uuid)?;
    let endpoint_name = format!("/{}", endpoint_name.trim_start_matches('/'));

    let endpoint = endpoints
        .get(&endpoint_name)
        .ok_or(NotFoundEndpoint(uuid.clone(), endpoint_name.clone()))?
        .get(Method::POST.as_str())
        .ok_or(BadMethod(uuid.clone(), endpoint_name.clone(), Method::POST))?;

    let mut tmp_file = NamedTempFile::new().map_err(|_| InternalFail(uuid.clone(), endpoint_name.clone()))?;
    let mut cmd = Command::new(&endpoint.command);
    let mut cmd = cmd.current_dir(format!("plugins/{uuid}/")).args(&endpoint.default_args);

    for argument in &endpoint.args {
        let arg_type = ArgType::from_str(&argument.arg_type)
            .ok_or(InternalReadManifest(uuid.clone()))?;
        // Body type arguments need special treatment.
        if arg_type == ArgType::Body {
            tmp_file.write_all(&body).map_err(|_| InternalFail(uuid.clone(), endpoint_name.clone()))?;
            let path = tmp_file.path();
            cmd = cmd.arg(argument.name.clone()).arg(path);
            continue;
        }
        let value = match params.get(&argument.display_name) {
            Some(value) => value,
            None => {
                // Flag type arguments set program arguments that have no value (such as `-a` on ls).
                if argument.optional || arg_type == ArgType::Flag {
                    continue;
                } else {
                    return Err(
                        BadRequestParamMissing(
                                uuid,
                                endpoint_name,
                                argument.display_name.clone(),
                            )
                            .into(),
                    );
                }
            }
        };

        if !arg_type.validate_str(value) {
            return Err(
                BadRequestInvalidParam(
                        uuid,
                        endpoint_name,
                        argument.display_name.clone(),
                        arg_type,
                        value.clone(),
                    )
                    .into(),
            );
        }
        let validated = value;

        cmd = cmd.arg(argument.name.clone());
        if arg_type != ArgType::Flag {
            cmd = cmd.arg(validated);
        }
    }

    let mut cmd = cmd
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|error| InternalSubProcess(error.to_string()))?;

    let mut result = String::new();

    cmd.stdout
        .take()
        .ok_or_else(|| InternalFail(uuid.clone(), endpoint_name.clone()))?
        .read_to_string(&mut result)
        .map_err(|_| InternalFail(uuid.clone(), endpoint_name.clone()))?;

    Ok(result)
}

/// Extracts the routing information for a specific plugin by its UUID.
///
/// Looks up the plugin in the global cache. If it's a cache miss, the function
/// reads the plugin's manifest file (`plugin.json`), parses the endpoints,
/// and populates the cache before returning the routing table.
///
/// # Arguments
///
/// * `id` - A hex-encoded string slice representing the plugin's unique identifier.
///
/// # Errors
///
/// Returns a [`PluginError`] in the following cases:
/// * [`BadRequestInvalid`][PluginError::BadRequestInvalid] - If the `id` cannot be parsed as a base-16 `u16`.
/// * [`BadRequestFramework`][PluginError::BadRequestFramework] - If the parsed ID is `0` (reserved for the framework).
/// * [`NotFoundId`][PluginError::NotFoundId] - If the plugin directory or manifest does not exist.
/// * Internal errors (`InternalReadCache`, `InternalWriteCache`, `InternalReadManifest`) if filesystem or cache operations fail.
fn get_plugin_routing_by_id(
    id: &str,
) -> Result<HashMap<String, HashMap<String, EndpointHandler>>, PluginError> {
    // Sanity checking
    let checked_id = u16::from_str_radix(&id, 16)
        .map_err(|_| BadRequestInvalid(id.to_string()))?;
    if checked_id == 0 {
        // Return None as we can't handle requests to the framework in the general handler.
        // Requests to the framework must be handled in a separate handler.
        // In theory, one could also implement special logic for the framework case as it's just not
        // in the plugins list.
        return Err(BadRequestFramework);
    }

    let plugin_cache = PLUGIN_CACHE.get_or_init(|| RwLock::new(HashMap::new()));

    // Try to read from cache, if hit: return success.
    if let Some(routes) = plugin_cache.read().map_err(|_| InternalReadCache)?.get(&checked_id) {
        return Ok(routes.clone());
    }

    // Else we have a cache miss and want to fill in new data if available.
    let path = Path::new("plugins")
        .join(id)
        .join("plugin.json");
    let plugin_bytes = fs::read(path).map_err(|error| match error.kind() {
        ErrorKind::NotFound => NotFoundId(id.to_string()),
        _ => InternalReadManifest(id.to_string()),
    })?;

    // Transform to plugin struct and return
    let endpoints = serde_json::from_slice::<Plugin>(&plugin_bytes)
        .map_err(|_| InternalReadManifest(id.to_string()))?
        .endpoints;

    // Generate actual item for the cache
    let mut routes = HashMap::new();
    for endpoint in endpoints {
        routes
            .entry(endpoint.url)
            .or_insert_with(HashMap::new)
            .insert(endpoint.method, endpoint.handler);
    }

    // Move into cache
    plugin_cache.write().map_err(|_| InternalWriteCache)?.insert(checked_id, routes.clone());

    Ok(routes)
}

/// Represents the root structure of a plugin's manifest (`plugin.json`), with only those parts
/// included that are relevant to the back-end at this point.
#[derive(Deserialize, Clone)]
struct Plugin {
    /// A list of all API endpoints provided by this plugin.
    endpoints: Vec<PluginEndpoint>,
}

/// Defines a single API endpoint registered by a plugin.
#[derive(Deserialize, Clone)]
struct PluginEndpoint {
    /// The relative URL path for the endpoint (e.g., `"/status"`).
    url: String,
    /// The HTTP method used for this endpoint (e.g., `"GET"`, `"POST"`).
    method: String,
    /// The underlying system command configuration that handles requests to this endpoint.
    handler: EndpointHandler,
}

/// Configures how an incoming request triggers an external system command.
#[derive(Deserialize, Clone)]
struct EndpointHandler {
    /// The executable binary or command name to run (e.g., `"python3"`, `"Deep Thought"`).
    command: String,
    /// Static arguments that are always passed to the command first.
    default_args: Vec<String>,
    /// Dynamic arguments extracted from the request and their mapping to the command call.
    args: Vec<CommandArg>,
}

/// Represents a dynamic argument required by an endpoint handler.
#[derive(Deserialize, Clone)]
struct CommandArg {
    /// The name of the argument, when appended to the program call, including leading dashes.
    name: String,
    /// The name of the argument, when present in the query string of a plug-in's back-end request.
    display_name: String,
    /// The expected data type of the argument (mapped from the `"type"` field in the manifest JSON).
    #[serde(rename = "type")]
    arg_type: String,
    /// Whether this argument can be omitted from the request.
    optional: bool,
}
