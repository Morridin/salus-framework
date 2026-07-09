//! # Panel Management System
//! This module resembles the centrepiece of the resizing capabilities of [`Panel`]s and
//! [`PanelGroup`]s in the front-end.
//!
//! ## Architecture Overview
//! The system is based on the combination of three components:
//!
//! * [`GroupOrientation`]: Defines along which axis ([`Horizontal`][GroupOrientation::Horizontal]
//!   or [`Vertical`][GroupOrientation::Vertical]) a [`PanelGroup`] aligns its children and allows
//!   their resizing.
//! * [`GroupContext`]: The reactive Dioxus context that holds the current size data of all
//!   resizable children of a [`PanelGroup`] via a [`Signal`][dioxus::prelude::Signal].
//!   This allows any child element of the group to identify their resizable siblings
//!   ([`GroupContext::find_left_sibling`], [`GroupContext::find_right_sibling`]) and hence enables
//!   it to update its siblings' layout data along with its own, effectively performing the math
//!   behind a resizing operation.
//! * [`Size`]: Encapsulates the mathematical logic for pixel calculations necessary when
//!   the user drags along a [`Panel`] edge to resize it. Ensures that no resizing operation
//!   violates the minimum size any [`Panel`] defines.
//!
//! The [`Variant`] enum is a preview for the planned [`Panel`] splitting feature that is already
//! known from many IDEs. At this time is serves no further purpose.
//!
//! ## Front-End Focussed
//! The included structures are primarily intended for use inside the front-end's UI structures
//! based on the [`Panel`] component. Hence, this module relies heavily on Dioxus structures.
mod group_context;
mod group_orientation;
mod size;
mod variant;

// Re-exports to flatten the API.
pub use group_context::GroupContext;
pub use group_orientation::GroupOrientation;
pub use size::Size;
pub use variant::Variant;
