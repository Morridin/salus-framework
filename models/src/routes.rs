//! URL layout for everything plug-in related.
//!
//! This module is the single source of truth for the paths under which plug-ins are reachable.
//! Both the framework's front-end and its back-end build their URLs from the constants and
     //! helpers defined here, so that a change to the layout is a change in one place. Before this
//! existed, the path shape was hard-coded implicitly at five separate call sites, which is what
//! made the front-end resort to searching origin URLs for a marker substring.
//!
//! Two separate namespaces exist, and the distinction matters:
//!
//! * **Files** live under [`PLUGIN_FILES_ROOT`] and are served straight from disk. This path is
//!   deliberately *not* versioned: it is a delivery detail, not a contract. The only consumer is
//!   the `iframe` `src` the framework's front-end emits.
//! * **Endpoints** live under [`plugin_api_root`] and *are* versioned via [`API_VERSION`], because
//!   they are the contract a plug-in author writes against.
//!
//! Keeping the version on the API alone means the delivery layout can be reorganised without
//! forcing a version bump, and an API version bump does not invalidate every file URL.

use crate::version::Version;

/// The version of the framework's HTTP API, as it appears in request paths.
///
/// Bump the minor component when the request or response shape of any endpoint changes in a way
/// that would break an existing plug-in; while the major component is `0`, that is what a minor
/// increment is for. Purely additive changes do not require a bump.
///
/// Note that the path segment this produces drops the minor component from `1.0` onwards, see
/// [`Version`]'s [`Display`][std::fmt::Display] implementation.
pub const API_VERSION: Version = Version::new(0, 2);

/// The root under which plug-in files are served from disk, i.e. `/files/plugins`.
///
/// Unversioned by design, see the module documentation. The `files` segment marks the namespace as
/// file delivery rather than API surface, which keeps the API free of static content and avoids
/// occupying a bare top-level path such as `/plugins`.
pub const PLUGIN_FILES_ROOT: &str = "/files/plugins";

/// Returns the root of the framework's versioned HTTP API, e.g. `/api/v0.2`.
///
/// Everything below this prefix exchanges structured data. Static files are served elsewhere,
/// see [`PLUGIN_FILES_ROOT`].
pub fn api_root() -> String {
    format!("/api/{API_VERSION}")
}

/// Returns the root under which everything plug-in related in the API lives, e.g.
/// `/api/v0.2/plugins`.
///
/// This covers both the framework's own queries about plug-ins - listing them, fetching a single
/// manifest - and, one level deeper, the endpoints a plug-in defines for itself. See
/// [`plugin_api_base`] for the latter.
pub fn plugin_api_root() -> String {
    format!("{}/plugins", api_root())
}

/// Builds the base path from which a plug-in's files are served, without a trailing slash.
///
/// This is the prefix every request originating inside a plug-in's `iframe` carries, which makes
/// it the value to validate an incoming `postMessage` origin against. See
/// [`is_plugin_file_origin`].
///
/// # Arguments
/// * `uuid` - The 4-hex-digit identifier of the plug-in.
///
/// # Examples
/// ```
/// # use models::routes::plugin_files_base;
/// assert_eq!(plugin_files_base("1a2b"), "/files/plugins/1a2b");
/// ```
pub fn plugin_files_base(uuid: &str) -> String {
    format!("{PLUGIN_FILES_ROOT}/{uuid}")
}

/// Builds the full path to one file belonging to a plug-in.
///
/// # Arguments
/// * `uuid` - The 4-hex-digit identifier of the plug-in.
/// * `path` - The file's path relative to the plug-in's own directory, as taken from the `source`
///   field of its manifest. A leading slash is tolerated and stripped.
///
/// # Examples
/// ```
/// # use models::routes::plugin_file;
/// assert_eq!(plugin_file("1a2b", "index.html"), "/files/plugins/1a2b/index.html");
/// assert_eq!(plugin_file("1a2b", "/index.html"), "/files/plugins/1a2b/index.html");
/// ```
pub fn plugin_file(uuid: &str, path: &str) -> String {
    format!("{}/{}", plugin_files_base(uuid), path.trim_start_matches('/'))
}

/// Builds the base path of a plug-in's own API, without a trailing slash.
///
/// A plug-in's endpoints sit directly below its identifier, alongside the framework's own
/// single-segment route for fetching that plug-in's manifest. The two do not collide, because a
/// plug-in endpoint always adds at least one further segment. Should the framework ever need its
/// own sub-routes per plug-in, they would have to be separated from plug-in endpoints explicitly.
///
/// # Arguments
/// * `uuid` - The 4-hex-digit identifier of the plug-in.
///
/// # Examples
/// ```
/// # use models::routes::plugin_api_base;
/// assert_eq!(plugin_api_base("1a2b"), "/api/v0.2/plugins/1a2b");
/// ```
pub fn plugin_api_base(uuid: &str) -> String {
    format!("{}/{uuid}", plugin_api_root())
}

/// Builds the full path of one endpoint a plug-in defines for itself.
///
/// # Arguments
/// * `uuid` - The 4-hex-digit identifier of the plug-in.
/// * `endpoint` - The endpoint path as written in the plug-in's manifest, e.g. `"/status"`. A
///   leading slash is tolerated and stripped, so both manifest conventions work.
///
/// # Examples
/// ```
/// # use models::routes::plugin_api_endpoint;
/// assert_eq!(plugin_api_endpoint("1a2b", "/status"), "/api/v0.2/plugins/1a2b/status");
/// assert_eq!(plugin_api_endpoint("1a2b", "status"), "/api/v0.2/plugins/1a2b/status");
/// ```
pub fn plugin_api_endpoint(uuid: &str, endpoint: &str) -> String {
    format!(
        "{}/{}",
        plugin_api_base(uuid),
        endpoint.trim_start_matches('/')
    )
}

/// Checks whether an origin URL genuinely belongs to the given plug-in's file namespace.
///
/// A plug-in's front-end reports its own `location.href` when it initiates a back-end request.
/// Since every plug-in is served from below [`plugin_files_base`], a request claiming to come from
/// a plug-in must carry that prefix on its path. This is the framework's isolation check between
/// plug-ins: it is what stops one plug-in from issuing requests in another's name.
///
/// The comparison is made against the exact expected prefix rather than by searching the URL for a
/// marker substring, so a plug-in cannot smuggle a matching fragment through a query string or
/// fragment identifier.
///
/// # Arguments
/// * `origin` - The value the plug-in reported, expected to be an absolute URL.
/// * `uuid` - The identifier of the plug-in the message is attributed to.
///
/// # Returns
/// `true` if `origin` is a URL whose path lies inside the plug-in's own directory, `false`
/// otherwise, including when `origin` is not an absolute URL.
///
/// # Examples
/// ```
/// # use models::routes::is_plugin_file_origin;
/// let good = "http://localhost:8080/files/plugins/1a2b/index.html";
/// assert!(is_plugin_file_origin(good, "1a2b"));
///
/// // A different plug-in must not pass as `1a2b`.
/// assert!(!is_plugin_file_origin(good, "c97f"));
///
/// // A prefix match alone is not enough; the segment has to end where it should.
/// assert!(!is_plugin_file_origin("http://localhost:8080/files/plugins/1a2bc/x.html", "1a2b"));
///
/// // The marker may not be smuggled in via the query string or fragment.
/// assert!(!is_plugin_file_origin("http://evil.test/?/files/plugins/1a2b/", "1a2b"));
/// assert!(!is_plugin_file_origin("http://evil.test/#/files/plugins/1a2b/", "1a2b"));
///
/// // Relative values carry no origin information and are rejected.
/// assert!(!is_plugin_file_origin("/files/plugins/1a2b/index.html", "1a2b"));
/// ```
pub fn is_plugin_file_origin(origin: &str, uuid: &str) -> bool {
    // Cut the scheme and authority off, so that only the path remains. Splitting on "//" once and
    // then taking everything from the first slash keeps this free of a URL parser dependency,
    // which matters because this code also runs in the browser via wasm.
    let path = match origin.split_once("//") {
        Some((_scheme, rest)) => match rest.find('/') {
            Some(index) => &rest[index..],
            // An authority without a path cannot be inside a plug-in directory.
            None => return false,
        },
        // Not an absolute URL, so we cannot establish where it came from.
        None => return false,
    };

    // Stop at the first query or fragment marker: anything beyond it is not part of the path and
    // must not be able to satisfy the check.
    let path = path.split(['?', '#']).next().unwrap_or(path);

    // The base must be followed by a separator or nothing at all, otherwise the plug-in "1a2b"
    // would accept a path belonging to "1a2bc".
    path.strip_prefix(&plugin_files_base(uuid))
        .is_some_and(|rest| rest.is_empty() || rest.starts_with('/'))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The origin a plug-in legitimately reports: its own entry point.
    const OWN: &str = "http://localhost:8080/files/plugins/1a2b/index.html";

    #[test]
    fn accepts_a_plugins_own_files() {
        assert!(is_plugin_file_origin(OWN, "1a2b"));
        assert!(is_plugin_file_origin(
            "http://localhost:8080/files/plugins/1a2b/sub/dir/page.html",
            "1a2b"
        ));
        // The directory itself, with and without trailing slash.
        assert!(is_plugin_file_origin("https://host/files/plugins/1a2b", "1a2b"));
        assert!(is_plugin_file_origin("https://host/files/plugins/1a2b/", "1a2b"));
    }

    #[test]
    fn rejects_another_plugins_files() {
        assert!(!is_plugin_file_origin(OWN, "c97f"));
        assert!(!is_plugin_file_origin(
            "http://localhost:8080/files/plugins/c97f/index.html",
            "1a2b"
        ));
    }

    #[test]
    fn requires_the_uuid_segment_to_end_where_it_should() {
        // Without the separator check, "1a2b" would swallow every uuid it prefixes.
        assert!(!is_plugin_file_origin("https://host/files/plugins/1a2bc/x.html", "1a2b"));
        assert!(!is_plugin_file_origin("https://host/files/plugins/1a2b0000", "1a2b"));
    }

    #[test]
    fn rejects_the_marker_smuggled_past_the_path() {
        // A hostile origin must not satisfy the check by carrying the expected prefix in a part
        // of the URL that is not the path.
        assert!(!is_plugin_file_origin("http://evil.test/?/files/plugins/1a2b/", "1a2b"));
        assert!(!is_plugin_file_origin("http://evil.test/#/files/plugins/1a2b/", "1a2b"));
        assert!(!is_plugin_file_origin(
            "http://evil.test/x?a=/files/plugins/1a2b/i.html",
            "1a2b"
        ));
        // Nor by putting it in the authority.
        assert!(!is_plugin_file_origin("http://files/plugins/1a2b@evil.test/", "1a2b"));
    }

    #[test]
    fn rejects_values_that_carry_no_origin() {
        assert!(!is_plugin_file_origin("/files/plugins/1a2b/index.html", "1a2b"));
        assert!(!is_plugin_file_origin("files/plugins/1a2b/index.html", "1a2b"));
        assert!(!is_plugin_file_origin("", "1a2b"));
        // An absolute URL without any path at all.
        assert!(!is_plugin_file_origin("http://localhost:8080", "1a2b"));
    }

    #[test]
    fn file_and_api_namespaces_stay_disjoint() {
        // A plug-in's API path must never pass as one of its file paths, otherwise the origin
        // check would accept a request forged from a response body.
        let api = format!("http://host{}", plugin_api_endpoint("1a2b", "/status"));
        assert!(!is_plugin_file_origin(&api, "1a2b"));
    }

    #[test]
    fn builds_the_documented_paths() {
        assert_eq!(api_root(), "/api/v0.2");
        assert_eq!(plugin_api_root(), "/api/v0.2/plugins");
        assert_eq!(plugin_api_base("1a2b"), "/api/v0.2/plugins/1a2b");
        assert_eq!(plugin_api_endpoint("1a2b", "/status"), "/api/v0.2/plugins/1a2b/status");
        assert_eq!(plugin_files_base("1a2b"), "/files/plugins/1a2b");
        assert_eq!(plugin_file("1a2b", "index.html"), "/files/plugins/1a2b/index.html");
    }

    #[test]
    fn tolerates_either_slash_convention_from_manifests() {
        assert_eq!(
            plugin_api_endpoint("1a2b", "/status"),
            plugin_api_endpoint("1a2b", "status")
        );
        assert_eq!(plugin_file("1a2b", "/a.css"), plugin_file("1a2b", "a.css"));
    }
}