use serde::{Deserialize, Serialize};
use std::fmt;
use std::fmt::Formatter;

/// A two-component version number, used to version the framework's HTTP API.
///
/// This is deliberately not a full semantic version: there is no patch component, because a patch
/// release by definition does not change an API contract and therefore has no business appearing
/// in a URL. Should one ever be needed for other purposes, it can be added as a further field
/// without disturbing anything here, since it would never take part in the path representation.
/// The version is also independent of the crate version in `Cargo.toml` - the two may coincide,
/// but nothing enforces or relies on that.
///
/// Ordering is by `major` first, then `minor`, which makes version comparisons safe to write
/// directly rather than by hand at every call site.
///
/// The type is crate-internal for now, since every consumer goes through [`routes`][crate::routes]
/// and only ever sees the resulting path strings. It derives [`Serialize`] and [`Deserialize`] in
/// anticipation of plug-in manifests declaring the API version they were written against; at that
/// point it will have to be re-exported, because [`plugin::Manifest`][crate::plugin::Manifest] is
/// public.
#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Debug, Hash)]
pub struct Version {
    /// The major version. Incremented on any breaking change once past `0.x`.
    pub major: u32,
    /// The minor version. While `major` is `0`, an increment here may break compatibility.
    pub minor: u32,
}

impl Version {
    /// Creates a new [`Version`] from its major and minor components.
    pub const fn new(major: u32, minor: u32) -> Self {
        Self { major, minor }
    }

    /// Returns the full version string, always including the minor component.
    ///
    /// Unlike [`Display`][fmt::Display], this representation is lossless and therefore
    /// unambiguous. Use it in log lines, error messages and anywhere two versions need to remain
    /// distinguishable.
    pub fn full(&self) -> String {
        format!("v{}.{}", self.major, self.minor)
    }

    /// Returns `true` while this version is still in the unstable `0.x` range, where a minor
    /// increment is allowed to break compatibility.
    pub const fn is_unstable(&self) -> bool {
        self.major == 0
    }
}

impl fmt::Display for Version {
    /// Formats the version as it appears in a URL path segment.
    ///
    /// While `major` is `0`, the minor component is included, because in the `0.x` range every
    /// minor increment may break compatibility and therefore deserves its own path. From `1.0`
    /// onwards only the major component is emitted, since minor versions are then additive by
    /// definition and a new path would invalidate existing URLs for no gain.
    ///
    /// **This representation is lossy on purpose**: `1.0` and `1.1` both format as `v1`, so the
    /// output must not be treated as a round-trippable encoding of the value. Use [`full`] when
    /// two versions have to stay distinguishable.
    ///
    /// [`full`]: Version::full
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        if self.is_unstable() {
            write!(f, "v{}.{}", self.major, self.minor)
        } else {
            write!(f, "v{}", self.major)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::Version;

    #[test]
    fn keeps_the_minor_component_while_unstable() {
        assert_eq!(Version::new(0, 2).to_string(), "v0.2");
        assert_eq!(Version::new(0, 3).to_string(), "v0.3");
    }

    #[test]
    fn drops_the_minor_component_from_one_zero_onwards() {
        assert_eq!(Version::new(1, 0).to_string(), "v1");
        assert_eq!(Version::new(1, 1).to_string(), "v1");
        assert_eq!(Version::new(2, 7).to_string(), "v2");
    }

    #[test]
    fn full_stays_lossless() {
        assert_eq!(Version::new(0, 2).full(), "v0.2");
        assert_eq!(Version::new(1, 1).full(), "v1.1");

        // The point of `full`: these two are indistinguishable via `Display`.
        assert_eq!(Version::new(1, 0).to_string(), Version::new(1, 1).to_string());
        assert_ne!(Version::new(1, 0).full(), Version::new(1, 1).full());
    }

    #[test]
    fn orders_by_major_then_minor() {
        assert!(Version::new(0, 2) < Version::new(0, 3));
        assert!(Version::new(0, 9) < Version::new(1, 0));
        assert!(Version::new(1, 0) < Version::new(1, 1));
    }

    #[test]
    fn reports_instability_below_one_zero() {
        assert!(Version::new(0, 1).is_unstable());
        assert!(Version::new(0, 2).is_unstable());
        assert!(!Version::new(1, 0).is_unstable());
    }
}