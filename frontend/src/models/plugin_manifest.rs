use std::fmt;
use std::fmt::Formatter;
use serde::Deserialize;

#[derive(Clone, PartialEq)]
pub struct PluginManifest {
    uuid: String,
    manifest: RawPluginManifest,
}

impl PluginManifest {
    pub fn create(uuid: String, raw_bytes: &[u8]) -> Self {
        let manifest = serde_json::from_slice(raw_bytes).unwrap_or_else(|e| RawPluginManifest {
            error: Some(format!(
                "Error parsing plugin manifest for {}!\n\n{}\n",
                uuid, e
            )),
            ..Default::default()
        });
        Self { uuid, manifest }
    }

    pub(crate) fn create_invalid(uuid: String, error_message: String) -> Self {
        let manifest = RawPluginManifest {
            error: Some(error_message),
            ..Default::default()
        };
        Self { uuid, manifest }
    }

    pub fn uuid(&self) -> &str {
        &self.uuid
    }

    pub fn panels(&self) -> &Vec<String> {
        &self.manifest.panels
    }

    pub fn kind(&self) -> &str {
        &self.manifest.kind
    }

    pub fn source(&self) -> &str {
        &self.manifest.source
    }

    pub fn is_valid(&self) -> bool {
        *(&self.manifest.error.is_none())
    }
}

impl fmt::Display for PluginManifest {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        if let Some(error) = &self.manifest.error {
            write!(f, "{}", error)
        }
        else {
            write!(f, "{}", self.manifest.name)
        }
    }
}

#[derive(Deserialize, Default, Clone, PartialEq)]
struct RawPluginManifest {
    name: String,
    #[serde(rename = "type")]
    kind: String,
    source: String,
    dependencies: Vec<String>,
    panels: Vec<String>,
    #[serde(default)]
    error: Option<String>,
}