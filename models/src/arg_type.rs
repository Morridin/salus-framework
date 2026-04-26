use std::fmt::{Display, Formatter};

#[derive(PartialEq, Debug, Clone)]
pub enum ArgType {
    String,
    Int,
    Float,
    Bool,
    Flag,
}

impl ArgType {
    pub fn from_str(arg_type: &str) -> Option<Self> {
        match arg_type {
            "string" => Some(Self::String),
            "int" => Some(Self::Int),
            "float" => Some(Self::Float),
            "bool" => Some(Self::Bool),
            "flag" => Some(Self::Flag),
            _ => None,
        }
    }
    pub fn validate_str(&self, other: &str) -> bool {
        match self {
            Self::Flag => true,
            Self::String => true,
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
        }
    }
}