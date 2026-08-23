//! # Salus Framework Models Crate
//!
//! This crate contains the common, shared data model and type system for the Salus framework.
//! It defines core structures for layout/resizing, plug-in properties and standardised errors.
//! Also included is the `Message` type for communication between plug-in and framework front-ends.
//!
//! ## Module Structure
//!
//! * [`panel`]: Encapsulates the geometry and calculation routines required for resizing the UI panels.
//! * [`plugin`]: Manages the plug-in manifest for the front-end.
//! * [`ArgType`]: Typing helper enum for parsing arguments from HTTP requests into sub process calls.
//! * [`Message`]: The Rust equivalent to the `PluginFrontendRequest` JS type mentioned in the framework's ReadMe that plug-in front-ends send to the framework's front-end.
//! * [`PluginError`] / [`BackendRequestError`]: Centralised place for error definitions for the framework.

pub mod panel;
pub mod plugin;
pub mod routes;

mod error;
mod message;
mod position;
mod version;

mod arg_type;

// Re-exports for a flat API
pub use error::{BackendRequestError, PluginError};
pub use message::Message;
pub use position::Position;
pub use arg_type::ArgType;
