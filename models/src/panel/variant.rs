use crate::panel::GroupOrientation;

/// Represents the state of a [`Panel`][`frontend::components::Panel`] inside the UI layout regarding its node type within the
/// layout tree.
#[derive(PartialEq, Clone)]
pub enum Variant {
    /// This [`Panel`][`frontend::components::Panel`] is a final node containing space for plug-ins (Leaf node).
    Leaf,
    /// This [`Panel`][`frontend::components::Panel`] is a [`PanelGroup`][`frontend::components::PanelGroup`] containing child [`Panel`][`frontend::components::Panel`]s that are aligned following
    /// the specific [`GroupOrientation`] (Branch node).
    Branch(GroupOrientation),
}
