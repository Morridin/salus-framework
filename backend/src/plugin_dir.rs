#![cfg(feature = "server")]
use std::env;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

/// The name of the environment variable used to override where plug-ins are read from.
///
/// See [`root`] for the resolution order.
pub const ENV_VAR: &str = "SALUS_PLUGIN_DIR";

/// The directory name used as a fallback when [`ENV_VAR`] is unset, relative to the current
/// working directory.
const DEFAULT_DIR_NAME: &str = "plugins";

static PLUGIN_DIR: OnceLock<PathBuf> = OnceLock::new();

/// Returns the directory plug-ins are read from and executed in, resolving it on first access.
///
/// Resolution order:
/// 1. The [`ENV_VAR`] environment variable, if set.
/// 2. A directory named `plugins` in the current working directory, otherwise.
///
/// The result is cached for the lifetime of the process: the value is read once, deliberately not
/// re-read on every request, since it describes where the server's data lives and has no business
/// changing while it is running.
///
/// This exists so that the plug-in directory's location is decided in exactly one place. Every
/// other spot in the back-end that needs it goes through this function, or through [`join`].
pub fn root() -> &'static Path {
    PLUGIN_DIR.get_or_init(|| resolve(env::var_os(ENV_VAR)))
}

/// The pure resolution rule behind [`root`], factored out so it can be tested without the
/// process-wide caching getting in the way: [`OnceLock`] resolves once per process, which makes
/// exercising more than one input from within a single test run meaningless.
fn resolve(env_value: Option<std::ffi::OsString>) -> PathBuf {
    match env_value {
        Some(dir) => PathBuf::from(dir),
        None => PathBuf::from(DEFAULT_DIR_NAME),
    }
}

/// Joins a relative path onto the plug-in directory, see [`root`].
///
/// # Examples
/// ```
/// # use backend::plugin_dir;
/// let path = plugin_dir::join("1a2b/plugin.json");
/// assert!(path.ends_with("1a2b/plugin.json"));
/// ```
pub fn join(relative: impl AsRef<Path>) -> PathBuf {
    root().join(relative)
}

#[cfg(test)]
mod tests {
    use super::resolve;
    use std::ffi::OsString;
    use std::path::PathBuf;

    #[test]
    fn prefers_the_environment_variable_when_set() {
        let value = Some(OsString::from("/srv/salus/plugins"));
        assert_eq!(resolve(value), PathBuf::from("/srv/salus/plugins"));
    }

    #[test]
    fn falls_back_to_a_relative_plugins_directory_when_unset() {
        assert_eq!(resolve(None), PathBuf::from("plugins"));
    }
}
