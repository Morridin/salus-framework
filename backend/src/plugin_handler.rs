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
use tempfile::NamedTempFile;

static PLUGIN_CACHE: OnceLock<
    RwLock<HashMap<u16, HashMap<String, HashMap<String, EndpointHandler>>>>,
> = OnceLock::new();

/// Universal Get handler for all plugins.
#[get("/{uuid}/*endpoint_name?:params", headers:HeaderMap)]
pub async fn get_handler(
    uuid: String,
    endpoint_name: String,
    params: HashMap<String, String>,
) -> dioxus::Result<String> {
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

#[post("/{uuid}/*endpoint_name?:params", headers:HeaderMap, body:Bytes)]
pub async fn post_handler(
    uuid: String,
    endpoint_name: String,
    params: HashMap<String, String>,
) -> dioxus::Result<String> {
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

    let mut tmp_file = NamedTempFile::new()?;
    let mut cmd = Command::new(&endpoint.command);
    let mut cmd = cmd.current_dir(format!("plugins/{uuid}/")).args(&endpoint.default_args);

    for argument in &endpoint.args {
        let arg_type = ArgType::from_str(&argument.arg_type)
            .ok_or(InternalReadManifest(uuid.clone()))?;
        // Body type arguments need special treatment.
        if arg_type == ArgType::Body {
            tmp_file.write_all(&body)?;
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
    let checked_id = u16::from_str_radix(&id, 16)
        .or(Err(BadRequestInvalid(id.to_string())))?;
    if checked_id == 0 {
        // Return None as we can't handle requests to the framework in the general handler.
        // Requests to the framework must be handled in a separate handler.
        // In theory, one could also implement special logic for the framework case as it's just not
        // in the plugins list.
        return Err(BadRequestFramework);
    }

    let plugin_cache = PLUGIN_CACHE.get_or_init(|| RwLock::new(HashMap::new()));

    if !plugin_cache.read().or(Err(InternalReadCache))?.contains_key(&checked_id) {
        // Read manifest file
        let plugin = match fs::read(format!("plugins/{id}/plugin.json")) {
            Ok(plugin) => plugin,
            Err(error) => {
                return Err(
                    match error.kind() {
                        ErrorKind::NotFound => NotFoundId(id.to_string()),
                        _ => InternalReadManifest(id.to_string()),
                    },
                );
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
        plugin_cache.write().or(Err(InternalWriteCache))?.insert(checked_id, routes);
    }

    plugin_cache
        .read()
        .or(Err(InternalReadCache))?
        .get(&checked_id)
        .cloned()
        .ok_or(NotFoundId(id.to_string()))
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
