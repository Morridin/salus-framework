use crate::panel::{GroupOrientation, Size};
use dioxus::prelude::*;
use std::collections::HashMap;
use uuid::Uuid;

/// Reactive context shared among a group of sibling panels inside one [`PanelGroup`][`frontend::components::PanelGroup`] component
/// to coordinate their sizes and orientation.
///
/// This context allows panels to query the geometry of their direct neighbours,
/// which is essential for resizing mechanics.
#[derive(Clone, Copy)]
pub struct GroupContext {
    orientation: GroupOrientation,
    children: Signal<HashMap<Uuid, Size>>,
}

impl GroupContext {
    /// Creates a new `GroupContext` with a specific orientation and a reactive map of sizes of [`Panel`][`frontend::components::Panel`]s in the associated [`PanelGroup`][`frontend::components::PanelGroup`].
    pub fn new(orientation: GroupOrientation, children: Signal<HashMap<Uuid, Size>>) -> Self {
        Self {
            orientation,
            children,
        }
    }

    /// Returns the orientation of the elements in the associated [`PanelGroup`][`frontend::components::PanelGroup`].
    pub fn orientation(&self) -> &GroupOrientation {
        &self.orientation
    }

    /// Returns the reactive Dioxus [`Signal`] containing all resizable member's [`Size`]s mapped by the members' [`Uuid`]s.
    pub fn children(&self) -> Signal<HashMap<Uuid, Size>> {
        self.children
    }

    /// Searches for the resizable element directly preceding the current element (left or above).
    ///
    /// # Arguments
    /// * `own_start` - The start coordinate of the calling [`Panel`][`frontend::components::Panel`] along the relevant axis.
    pub fn find_left_sibling(&self, own_start: i32) -> Option<Uuid> {
        self.children.peek().iter().find_map(
            |(&k, r)| {
                if r.end() == own_start { Some(k) } else { None }
            },
        )
    }

    /// Searches for the resizable element directly following the current element (right or below).
    ///
    /// # Arguments
    ///
    /// * `own_end` - The end coordinate of the calling [`Panel`][`frontend::components::Panel`] along the relevant axis.
    pub fn find_right_sibling(&self, own_end: i32) -> Option<Uuid> {
        self.children.peek().iter().find_map(
            move |(&k, r)| {
                if r.start() == own_end { Some(k) } else { None }
            },
        )
    }
}
