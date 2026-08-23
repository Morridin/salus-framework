use models::{Position, plugin};
#[cfg(feature = "server")]
use dioxus::CapturedError;
use dioxus::prelude::*;
#[cfg(feature = "server")]
use std::io::Write;
#[cfg(feature = "server")]
use std::{fs, io};

/// Generates a list of all available plug-ins and saves it to a static JSON file.
///
/// Scans the plugins directory, compiles the IDs, and writes the pretty-printed
/// result to `plugins/plugin-list.json`.
///
/// # Errors
///
/// Returns an error if:
/// * The plug-in list generation fails.
/// * The file cannot be created or written to.
/// * The buffer cannot be flushed properly.
#[get("/api/list-plugins")]
pub async fn list_plugins() -> Result<()> {
    let plugin_list = generate_plugin_list()?;

    let plugin_list_file = fs::File::create(crate::plugin_dir::join("plugin-list.json"))?;
    let mut writer = io::BufWriter::new(plugin_list_file);

    serde_json::to_writer_pretty(&mut writer, &plugin_list)?;

    match writer.flush() {
        Ok(()) => Ok(()),
        Err(e) => Err(e.into()),
    }
}

/// Retrieves a list of plug-in names, optionally filtered by their UI position.
///
/// Iterates through all discovered plugins, fetches their manifests, and filters
/// them based on whether they support the requested panel layout position.
///
/// # Arguments
///
/// * `position` - An optional target UI position (e.g., `"center"`) to filter the plugins.
///
/// # Errors
///
/// Returns an error if the underlying plug-in list generation fails. Individual
/// plug-in loading failures are silently skipped.
#[get("/api/plugins?position")]
pub async fn plugins(position: Option<Position>) -> Result<Vec<plugin::Name>> {
    let plugin_list = generate_plugin_list()?;

    let mut output = vec![];

    for id in plugin_list {
        let plugin = get_plugin_by_id(id.clone()).await;
        match plugin {
            Err(_) => continue,
            Ok(plugin) => {
                if position.clone().is_none_or(|pos| plugin.panels().contains(&pos)) {
                    output.push(plugin::Name {
                        uuid: id,
                        name: plugin.to_string(),
                    });
                }
            }
        }
    }

    Ok(output)
}

/// Fetches and validates the manifest for a single plug-in by its hex ID.
///
/// Reads the corresponding plug-in manifest JSON file from the filesystem and constructs
/// a validated manifest instance.
///
/// # Arguments
///
/// * `id` - The hex-encoded string identifier of the plugin.
///
/// # Errors
///
/// Returns an error if:
/// * The `id` cannot be parsed as a base-16 number.
/// * The ID is `0` (reserved for the framework).
/// * The manifest file cannot be read or fails validation.
#[get("/api/plugins/{id}")]
pub async fn get_plugin_by_id(id: String) -> Result<plugin::Manifest> {
    let checked_id = u16::from_str_radix(&id, 16)?;
    if checked_id == 0 {
        return Err(CapturedError::from_display(
            "Error: The framework is not a valid plugin!",
        ));
    }

    let plugin_manifest = fs::read(crate::plugin_dir::join(&id).join("plugin.json"))?;
    let plugin_manifest = plugin::Manifest::new(id, &plugin_manifest);
    if plugin_manifest.is_valid() {
        Ok(plugin_manifest)
    } else {
        Err(CapturedError::from_display(plugin_manifest))
    }
}

/// Scans the `plugins` directory and returns a sorted list of directory names, resembling the
/// currently available plug-ins.
///
/// Filters the contents of the plug-ins folder to ensure only directories that actually contain
/// a `plugin.json` manifest are collected. Anything else in that directory - stray files, a
/// Python virtual environment, a work-in-progress plug-in without a manifest yet - is skipped
/// rather than treated as a plug-in ID.
///
/// # Errors
///
/// Returns an I/O error if the `plugins` directory cannot be read.
#[cfg(feature = "server")]
fn generate_plugin_list() -> Result<Vec<String>> {
    let mut plugin_list = fs::read_dir(crate::plugin_dir::root())?
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.path().is_dir())
        .filter(|entry| entry.path().join("plugin.json").is_file())
        .map(|entry| entry.file_name().into_string().unwrap())
        .collect::<Vec<_>>();

    plugin_list.sort();
    Ok(plugin_list)
}
