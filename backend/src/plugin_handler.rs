#![cfg(feature = "server")]
use crate::auth;
use dioxus::fullstack::body::Bytes;
use dioxus::fullstack::{get, HeaderMap, Method};
use dioxus::prelude::*;
use models::PluginError::*;
use models::{ArgType, PluginError};
use serde::Deserialize;
use std::collections::HashMap;
use std::fs;
use std::io::{ErrorKind, Read, Write};
use std::process::{Command, Stdio};
use std::sync::{OnceLock, RwLock};
use std::time::Duration;
use tempfile::NamedTempFile;
use wait_timeout::ChildExt;

static PLUGIN_CACHE: OnceLock<
    RwLock<HashMap<u16, HashMap<String, HashMap<String, EndpointHandler>>>>,
> = OnceLock::new();

/// The universal GET handler for all plug-ins.
/// Plug-in HTTP GET requests end up here, are forwarded to the general universal handler
/// function whose result is awaited and returned.
///
/// For parameters and further details, please see [`universal_handler`].
#[get("/{uuid}/*endpoint_name?:params", headers:HeaderMap, body:Bytes)]
pub async fn get_handler(
    uuid: String,
    endpoint_name: String,
    params: HashMap<String, String>,
) -> Result<String, HttpError> {
    universal_handler(uuid, endpoint_name, Method::GET, params, headers, body).await
}

/// The universal POST handler for all plug-ins.
/// Plug-in HTTP POST requests end up here, are forwarded to the general universal handler
/// function whose result is awaited and returned.
///
/// For parameters and further details, please see [`universal_handler`].
#[post("/{uuid}/*endpoint_name?:params", headers:HeaderMap, body:Bytes)]
pub async fn post_handler(
    uuid: String,
    endpoint_name: String,
    params: HashMap<String, String>,
) -> Result<String, HttpError> {
    universal_handler(uuid, endpoint_name, Method::POST, params, headers, body).await
}

/// The universal PUT handler for all plug-ins.
/// Plug-in HTTP PUT requests end up here, are forwarded to the general universal handler
/// function whose result is awaited and returned.
///
/// For parameters and further details, please see [`universal_handler`].
#[put("/{uuid}/*endpoint_name?:params", headers:HeaderMap, body:Bytes)]
pub async fn put_handler(
    uuid: String,
    endpoint_name: String,
    params: HashMap<String, String>,
) -> Result<String, HttpError> {
    universal_handler(uuid, endpoint_name, Method::PUT, params, headers, body).await
}

/// The universal PATCH handler for all plug-ins.
/// Plug-in HTTP PATCH requests end up here, are forwarded to the general universal handler
/// function whose result is awaited and returned.
///
/// For parameters and further details, please see [`universal_handler`].
#[patch("/{uuid}/*endpoint_name?:params", headers:HeaderMap, body:Bytes)]
pub async fn patch_handler(
    uuid: String,
    endpoint_name: String,
    params: HashMap<String, String>,
) -> Result<String, HttpError> {
    universal_handler(uuid, endpoint_name, Method::PATCH, params, headers, body).await
}

/// The universal DELTE handler for all plug-ins.
/// Plug-in HTTP DELETE requests end up here, are forwarded to the general universal handler
/// function whose result is awaited and returned.
///
/// For parameters and further details, please see [`universal_handler`].
#[delete("/{uuid}/*endpoint_name?:params", headers:HeaderMap, body:Bytes)]
pub async fn delete_handler(
    uuid: String,
    endpoint_name: String,
    params: HashMap<String, String>,
) -> Result<String, HttpError> {
    universal_handler(uuid, endpoint_name, Method::DELETE, params, headers, body).await
}

/// The universal back-end request handler for all plug-ins and methods.
///
/// **Any** HTTP request any plug-in makes to its back-end ends up here.
/// The handler disassembles the request into plug-in ID, requested endpoint and transmitted
/// parameters.
/// Then, it starts the program defined in the plug-in manifest corresponding to the
/// calling plug-in and returns an HTTP response with the `stdout` or `stderr` contents of the
/// program.
/// If errors occur prior to program execution, the handler terminates and responds with the
/// correct status code indicating an error and a short message with information about the cause.
///
/// # Arguments
/// * `uuid` - The instance-global unique identification number (UUID) of the called plug-in.
/// * `endpoint_name` - Effectively the url resource path part after the UUID.
///   Determines which program is called by the handler and which parameters are required.
/// * `method` - A [`Method`] variant out of `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
///   `HEAD` is already handled by Dioxus/Axum and transformed to `GET` internally.
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
/// Returns a `dioxus::Result<String>`:
/// * `Ok(String)` - If and only if the program defined by the plug-in manifest has returned with
///   return code 0, the `stdout` buffer's contents are returned as is in an HTTP response.
/// * `Err(HttpError)` - Except for those cases where parameter parsing fails or the return value
///   is Ok anyway, this function returns an HttpError, usually derived from the `PluginError` enum.
async fn universal_handler(
    uuid: String,
    mut endpoint_name: String,
    method: Method,
    params: HashMap<String, String>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<String, HttpError> {
    // Fail fast if request is not authenticated by token.
    let (status, message) = auth::authorize(headers);
    if status != StatusCode::OK {
        return Err(HttpError::new(status, message));
    }

    if !endpoint_name.starts_with('/') {
        endpoint_name.insert(0, '/');
    }

    let endpoints = get_plugin_routing_by_id(&uuid)?;
    let endpoint = endpoints
        .get(&endpoint_name)
        .ok_or_else(|| NotFoundEndpoint(uuid.clone(), endpoint_name.clone()))?
        .get(method.as_str())
        .ok_or_else(|| BadMethod(uuid.clone(), endpoint_name.clone(), method))?;

    let mut cmd = Command::new(&endpoint.command);
    cmd.current_dir(format!("plugins/{uuid}/"))
        .args(&endpoint.default_args);

    let _temp_file = build_command_args(
        &mut cmd,
        &endpoint.args,
        &params,
        &body,
        &uuid,
        &endpoint_name,
    );

    execute_subprocess(cmd, &uuid, &endpoint_name).map_err(|e| e.into())
}

/// This function extracts the information needed from the backend handler about the plugin
/// specified by its UUID.
///
/// Returns `Some(Plugin)` if there is a plugin in the plugins directory with the UUID specified.
/// Returns `None`, if the plugin UUID is invalid, 0 (that's reserved for the framework) or there's
/// no plugin available to this UUID.
fn get_plugin_routing_by_id(
    id: &str,
) -> Result<HashMap<String, HashMap<String, EndpointHandler>>, PluginError> {
    // Sanity checking
    let checked_id = u16::from_str_radix(&id, 16).or(Err(BadRequestInvalid(id.to_string())))?;
    if checked_id == 0 {
        // Return None as we can't handle requests to the framework in the general handler.
        // Requests to the framework must be handled in a separate handler.
        // In theory, one could also implement special logic for the framework case as it's just not
        // in the plugins list.
        return Err(BadRequestFramework);
    }

    let plugin_cache = PLUGIN_CACHE.get_or_init(|| RwLock::new(HashMap::new()));

    if !plugin_cache
        .read()
        .or(Err(InternalReadCache))?
        .contains_key(&checked_id)
    {
        // Read manifest file
        let plugin = match fs::read(format!("plugins/{id}/plugin.json")) {
            Ok(plugin) => plugin,
            Err(error) => {
                return Err(match error.kind() {
                    ErrorKind::NotFound => NotFoundId(id.to_string()),
                    _ => InternalReadManifest(id.to_string()),
                });
            }
        };

        // Transform to plugin struct and return
        let endpoints = serde_json::from_slice::<Plugin>(&plugin)
            .or(Err(InternalReadManifest(id.to_string())))?
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
        plugin_cache
            .write()
            .or(Err(InternalWriteCache))?
            .insert(checked_id, routes);
    }

    plugin_cache
        .read()
        .or(Err(InternalReadCache))?
        .get(&checked_id)
        .cloned()
        .ok_or(NotFoundId(id.to_string()))
}

/// Evaluates the request parameters and assembles the subprocess program call.
///
/// # Arguments
/// * `cmd` - The command to be assembled after parameter evaluation.
/// * `endpoint_args` - The list of arguments the plug-in manifest defines for the endpoint.
/// * `provided_args` - A [`HashMap`] of arguments provided with the HTTP request to the endpoint.
/// * `body` - The request body to be incorporated in a temp file if the endpoint requires it.
/// * `uuid` - The plug-in UUID, for error message detailing only.
/// * `endpoint_name` - The called endpoint name, for error message detailing only.
///
/// # Returns
/// If anything goes wrong, a [`PluginError`] variant is returned inside an `Err`.
/// Else, the created [`NamedTempFile`], if any,  is returned in an `Option` for lifetime reasons.
fn build_command_args(
    cmd: &mut Command,
    endpoint_args: &[CommandArg],
    provided_args: &HashMap<String, String>,
    body: &Bytes,
    uuid: &str,
    endpoint_name: &str,
) -> Result<Option<NamedTempFile>, PluginError> {
    let mut optional_temp_file = None;

    for argument in endpoint_args {
        let arg_type = ArgType::from_str(&argument.arg_type)
            .ok_or_else(|| InternalReadManifest(uuid.to_string()))?;

        // Body type arguments need special treatment.
        if arg_type == ArgType::Body {
            let temp_file = optional_temp_file.get_or_insert(
                NamedTempFile::new()
                    .map_err(|_| InternalFail(uuid.to_string(), endpoint_name.to_string()))?,
            );
            temp_file
                .write_all(&body)
                .map_err(|_| InternalFail(uuid.to_string(), endpoint_name.to_string()))?;
            let path = temp_file.path();
            cmd.arg(argument.name.clone()).arg(path);
            continue;
        }

        let value = match provided_args.get(&argument.display_name) {
            Some(value) => value,
            None if argument.optional || arg_type == ArgType::Flag => continue,
            None => {
                return Err(BadRequestParamMissing(
                    uuid.to_string(),
                    endpoint_name.to_string(),
                    argument.display_name.clone(),
                ));
            }
        };

        if !arg_type.validate_str(value) {
            return Err(BadRequestInvalidParam(
                uuid.to_string(),
                endpoint_name.to_string(),
                argument.display_name.clone(),
                arg_type,
                value.clone(),
            ));
        }

        cmd.arg(argument.name.clone());
        if arg_type != ArgType::Flag {
            cmd.arg(value);
        }
    }
    Ok(optional_temp_file)
}

/// Executes a readily assembled subprocess, terminates it after 1 second, if necessary and collects
/// the results.
///
/// # Arguments
/// * `cmd` - The `Command` struct that resembles the assembled subprocess call template.
/// * `uuid` - The plug-in UUID, for error message detailing only.
/// * `endpoint_name` - The called endpoint name, for error message detailing only.
///
/// # Returns
/// See [`universal_handler`].
fn execute_subprocess(
    mut cmd: Command,
    uuid: &str,
    endpoint_name: &str,
) -> Result<String, PluginError> {
    let internal_fail = InternalFail(uuid.to_string(), endpoint_name.to_string());

    let mut subprocess = cmd
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| InternalSubProcess(error.to_string()))?;

    let timeout = Duration::from_secs(1);
    let status_code = match subprocess.wait_timeout(timeout) {
        Ok(Some(status)) => status.code(),
        Ok(None) => {
            subprocess.kill().map_err(|_| internal_fail)?;
            return Err(InternalTimeout(uuid.to_string(), endpoint_name.to_string()));
        }
        Err(_) => return Err(internal_fail),
    };

    let mut result = String::new();
    if status_code == Some(0) {
        subprocess
            .stdout
            .take()
            .ok_or_else(|| internal_fail.clone())?
            .read_to_string(&mut result)
            .map_err(|_| internal_fail)?;
        Ok(result)
    } else {
        subprocess
            .stderr
            .take()
            .ok_or_else(|| internal_fail.clone())?
            .read_to_string(&mut result)
            .map_err(|_| internal_fail)?;
        Err(InternalSubProcess(result))
    }
}

#[derive(Deserialize, Clone)]
struct Plugin {
    endpoints: Vec<PluginEndpoint>,
}

#[derive(Deserialize, Clone)]
struct PluginEndpoint {
    url: String,
    method: String,
    handler: EndpointHandler,
}

#[derive(Deserialize, Clone)]
struct EndpointHandler {
    command: String,
    default_args: Vec<String>,
    args: Vec<CommandArg>,
}

#[derive(Deserialize, Clone)]
struct CommandArg {
    name: String,
    display_name: String,
    #[serde(rename = "type")]
    arg_type: String,
    optional: bool,
}
