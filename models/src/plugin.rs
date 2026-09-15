use crate::Position;
use serde::{Deserialize, Serialize};
use std::fmt;
use std::fmt::Formatter;

/// A convenience structure associating a plug-in's display name with its unique identifier.
///
/// This avoids having to pass around more generic tuples or pairs throughout the framework.
#[derive(Serialize, Deserialize, Clone, PartialEq)]
pub struct Name {
    /// The unique identifier (UUID) (4-digit hex value) of the plug-in.
    pub uuid: String,
    /// The human-readable display name of the plug-in.
    pub name: String,
}

/// Represents the evaluated manifest of a plug-in, enriched with the plug-in's UUID.
///
/// A `Manifest` acts as a wrapper around the raw metadata of a plug-in,
/// providing methods to query its capabilities, source location, and overall validity.
#[derive(Serialize, Deserialize, Clone, PartialEq)]
pub struct Manifest {
    uuid: String,
    manifest: RawPluginManifest,
}

/// The actual plug-in manifest representation inside the framework.
///
/// It contains all fields relevant to the front-end portion of the framework, omitting the
/// endpoints.
/// We separate this from the public `Manifest` struct to allow graceful error handling:
/// If the JSON is corrupted, we can still construct a `Manifest` container and store the
/// parsing error inside `error`, preventing the entire framework from crashing on startup.
#[derive(Serialize, Deserialize, Default, Clone, PartialEq)]
struct RawPluginManifest {
    /// The display name of the plugin.
    name: String,
    /// Maps to the `"type"` field in JSON (e.g., "dynamic", "extern").
    #[serde(rename = "type")]
    kind: String,
    /// Path to the front-end entry point file, relative to the plug-in's directory of residence.
    source: String,
    /// List of other plug-in UUIDs this plug-in depends on.
    /// Completely ignored at the moment. It exists only to replicate this key in the manifest JSON
    /// and to remind us that we need to implement this mechanic.
    ///
    /// **Planned behaviour**: If a plug-in with dependencies is started, it is checked whether its
    /// dependencies are already running and, if not, started as well in their preferred
    /// slot, as needed.
    dependencies: Vec<String>,
    /// A list of panels this plug-in can be started in. Used to determine where it appears in the
    /// plug-in start menu in the front-end.
    panels: Vec<String>,
    /// Holds the error message if JSON parsing failed.
    /// If this field contains a `Some` value, the `is_valid` method will return `false`.
    #[serde(default)]
    error: Option<String>,
}

impl Manifest {
    /// Creates a new `Manifest` by parsing JSON data from a slice of bytes.
    ///
    /// If parsing fails, an invalid manifest containing the error details is returned instead.
    /// "Invalid" means here that the struct declares itself invalid, but is still intact for
    /// the purpose of the program.
    ///
    /// # Examples
    ///
    /// ```
    /// # use models::Manifest;
    /// let raw_json = b"{\"name\": \"Deep Thought\", \"type\": \"dynamic\", \"source\": \"index.html\", \"dependencies\": [], \"panels\": [\"all\"]}";
    /// let manifest = Manifest::create("0042".to_string(), raw_json);
    ///
    /// assert!(manifest.is_valid());
    /// assert_eq!(manifest.uuid(), "0042");
    /// ```
    pub fn new(uuid: String, raw_bytes: &[u8]) -> Self {
        let manifest = match serde_json::from_slice(raw_bytes) {
            Ok(m) => m,
            Err(e) => RawPluginManifest {
                error: Some(format!(
                    "Error parsing plug-in manifest for {}!\n\n{}\n",
                    uuid, e
                )),
                ..Default::default()
            },
        };

        Self { uuid, manifest }
    }

    /// Returns the unique identifier of the plug-in.
    pub fn uuid(&self) -> &str {
        &self.uuid
    }

    /// Returns a list of valid [`Position`]s where this plug-in's panels can be displayed.
    ///
    /// If the manifest specifies `"all"`, it will automatically expand to all available directions.
    /// Unrecognized panel positions in the manifest are silently ignored.
    pub fn panels(&self) -> Vec<Position> {
        // Check for all and exit early.
        if self.manifest.panels.iter().any(|p| p == "all") {
            return vec![
                Position::North,
                Position::East,
                Position::South,
                Position::West,
            ];
        }

        // Go on and do it one by one
        let mut valid_positions: Vec<Position> = vec![];
        for x in &self.manifest.panels {
            valid_positions.push(match x.as_str() {
                "left" => Position::West,
                "bottom" => Position::South,
                "right" => Position::East,
                "center" => Position::North,
                _ => continue,
            });
        }
        valid_positions
    }

    /// Returns the type of the plug-in, which currently can be one of:
    /// - `static`
    /// - `dynamic`
    /// - `extern`
    /// - `rust`
    /// - `component`
    ///
    /// Please note that the last two options are not yet supported by the front-end.
    pub fn kind(&self) -> &str {
        &self.manifest.kind
    }

    /// Returns the path location to the plug-in's front-end entry point file, relative
    /// to its directory of residence.
    pub fn source(&self) -> &str {
        &self.manifest.source
    }

    /// Returns `true` if this `Manifest` instance originates from successful JSON file parsing.
    pub fn is_valid(&self) -> bool {
        self.manifest.error.is_none()
    }
}

impl fmt::Display for Manifest {
    /// Provides a string representation of the `Manifest` instance.
    /// Prints the error message if the manifest is invalid, otherwise prints the plug-in's name.
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        if let Some(error) = &self.manifest.error {
            write!(f, "{}", error)
        } else {
            write!(f, "{}", self.manifest.name)
        }
    }
}
