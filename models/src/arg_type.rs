use std::fmt::{Display, Formatter};

/// Represents the data types supported for plug-in backend program arguments.
///
/// Provides some functions to validate a provided argument based on its type, as well as
/// conversion both from string to enum variant and back.
#[derive(PartialEq, Debug, Clone)]
pub enum ArgType {
    /// The `String` variant represents any sequence of valid UTF-8 characters.
    String,
    /// The `Int` variant represents integers in the range \[-2^127; 2^127 - 1\] ([`i128`]). A valid
    /// `Int` type argument may be formatted in any way Rust can parse to a [`i128`] value.
    Int,
    /// The `Float` variant represents floating point numbers within the range of [`f64`]. A valid
    /// `Float` type argument may be formatted in any way Rust can parse to a [`f64`] value.
    Float,
    /// The `Bool` variant represents boolean value arguments. A valid `Bool` type argument may be
    /// formatted in any way Rust can parse to a [`bool`] value.
    Bool,
    /// The `Flag` variant represents standalone CLI flag arguments without an attached value
    /// (e.g., `-a` in `ls -a`).
    Flag,
    /// The `Body` variant represents a special argument type that captures HTTP request bodies.
    /// Arguments of this type are passed to the plug-in back-end program as temporary files,
    /// with the file name being used as value to the parameter name provided.
    Body,
}

impl ArgType {
    /// Attempts to parse a string slice into its corresponding [`ArgType`].
    ///
    /// Returns `None` if the string does not match any known argument type.
    pub fn from_str(arg_type: &str) -> Option<Self> {
        match arg_type {
            "string" => Some(Self::String),
            "int" => Some(Self::Int),
            "float" => Some(Self::Float),
            "bool" => Some(Self::Bool),
            "flag" => Some(Self::Flag),
            "body" => Some(Self::Body),
            _ => None,
        }
    }

    /// Validates whether a given raw input string can be parsed into this [`ArgType`].
    ///
    /// No validation is performed for `String`, `Flag`, and `Body`; instead the function always
    /// returns `true`.
    pub fn validate_str(&self, other: &str) -> bool {
        match self {
            Self::Flag => true,
            Self::String => true,
            Self::Body => true,
            Self::Int => other.parse::<i128>().is_ok(),
            Self::Float => other.parse::<f64>().is_ok(),
            Self::Bool => other.parse::<bool>().is_ok(),
        }
    }
}

impl Display for ArgType {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            ArgType::String => f.write_str("string"),
            ArgType::Int => f.write_str("int"),
            ArgType::Float => f.write_str("float"),
            ArgType::Bool => f.write_str("bool"),
            ArgType::Flag => f.write_str("flag"),
            ArgType::Body => f.write_str("body"),
        }
    }
}
