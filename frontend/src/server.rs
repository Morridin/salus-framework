use std::{fs, io};
use std::io::Write;
use dioxus::prelude::*;

#[get("/api/list-plugins")]
pub async fn list_plugins() -> dioxus::Result<()> {
    let mut plugin_list = fs::read_dir("plugins")?
        .map(|result| result.ok())
        .filter(|path_option| path_option.is_some())
        .map(|path_option| path_option.unwrap())
        .filter(|path| path.path().is_dir())
        .map(|path| path.file_name().into_string().unwrap())
        .collect::<Vec<_>>();

    plugin_list.sort();

    let plugin_list_file = fs::File::create("plugins/plugin-list.json");
    let mut writer = io::BufWriter::new(plugin_list_file?);

    serde_json::to_writer_pretty(&mut writer, &plugin_list)?;

    match writer.flush() {
        Ok(()) => Ok(()),
        Err(e) => Err(e.into()),
    }
}