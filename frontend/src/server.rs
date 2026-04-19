use std::{fs, io};
use std::io::{Read, Write};
use dioxus::prelude::*;
use crate::models::PluginManifest;

#[get("/api/list-plugins")]
pub async fn list_plugins() -> Result<()> {
    let plugin_list = generate_plugin_list()?;

    let plugin_list_file = fs::File::create("plugins/plugin-list.json");
    let mut writer = io::BufWriter::new(plugin_list_file?);

    serde_json::to_writer_pretty(&mut writer, &plugin_list)?;

    match writer.flush() {
        Ok(()) => Ok(()),
        Err(e) => Err(e.into()),
    }
}

#[get("/api/plugins")]
pub async fn plugins() -> Result<String> {
    let plugin_list = generate_plugin_list()?;
    serde_json::to_string(&plugin_list).into()
}

#[get("/api/plugins/{id}")]
pub async fn get_plugin_by_id(id: &String) -> Result<PluginManifest> {
    let checked_id = u16::from_str_radix(id, 16)?;
    if checked_id == 0 {
        return Err("Error: The framework is not a valid plugin!".into())
    }

    let plugin_manifest = fs::read(format!("plugins/{checked_id}/plugin-manifest.json"))?;
    let plugin_manifest = PluginManifest::create(*id, &plugin_manifest);
    if plugin_manifest.is_valid() {
        Ok(plugin_manifest)
    }
    else {
        Err(plugin_manifest.to_string().into())
    }
}

fn generate_plugin_list() -> Result<Vec<String>> {
    let mut plugin_list = fs::read_dir("plugins")?
        .map(|result| result.ok())
        .filter(|path_option| path_option.is_some())
        .map(|path_option| path_option.unwrap())
        .filter(|path| path.path().is_dir())
        .map(|path| path.file_name().into_string().unwrap())
        .collect::<Vec<_>>();

    plugin_list.sort();
    Ok(plugin_list)
}

#[get("/login")]
pub async fn login() -> Result<String> {
    Ok("Hello world!".to_string())
}