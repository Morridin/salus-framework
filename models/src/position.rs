use dioxus::events::MouseEvent;
use dioxus::html::InteractionElementOffset;
use serde::{Deserialize, Serialize};

/// This Enum specifies the screen edge on which a UI element, specifically a
/// [`Panel`][frontend::components::Panel] and related components, is placed.
///
/// Provides layout behaviours and resizing math tailored to each screen orientation
/// via the [`as_trait`][Self::as_trait] method.
#[derive(Serialize, Deserialize, PartialEq, Clone)]
pub enum Position {
    /// Right side panel orientation. Appears as `"right"` in plug-in manifest files.
    East,
    /// Bottom panel orientation. Appears as `"bottom"` in plug-in manifest files.
    South,
    /// Left side panel orientation. Appears as `"left"` in plug-in manifest files.
    West,
    /// Main panel orientation. Appears as `"center"` in plug-in manifest files.
    North,
}

impl Position {
    /// Maps the enum variant to its corresponding dynamically dispatched [`PositionTrait`] implementation.
    pub fn as_trait(&self) -> &'static dyn PositionTrait {
        match self {
            Self::East => &East,
            Self::South => &South,
            Self::West => &West,
            Self::North => &North,
        }
    }
}

/// Defines layout styles and math calculations for UI panels based on their screen position.
///
/// Default implementations provide a behaviour similar to that of the left side panel (like `West`).
pub trait PositionTrait {
    /// Returns the CSS `flex-direction` property value. Default is `"row"`.
    fn flex_direction(&self) -> String {
        "row".to_string()
    }

    /// Returns the CSS `cursor` property for resizing handles. Default is `"ew-resize"`,
    /// corresponding to a horizontal, double-pointed arrow.
    fn cursor(&self) -> String {
        "ew-resize".to_string()
    }

    /// Extracts the relevant axis coordinate (X or Y) from a mouse event for resize tracking.
    /// Default is the X coordinate.
    fn get_pointer_position(&self, event: &MouseEvent) -> f64 {
        event.coordinates().client().x
    }
    /// Calculates the change in size based on mouse movement delta. By default, it calculates the
    /// update for resizing along the right edge of the element.
    fn calculate_size_update(
        &self,
        current_pointer_position: f64,
        last_pointer_position: f64,
    ) -> i16 {
        let delta = current_pointer_position - last_pointer_position;
        delta as i16
    }

    /// Returns the value string for the CSS `height` property. Default is `"100%"`.
    fn height(&self, size: i16) -> String {
        _ = size;
        "100%".to_string()
    }

    /// Returns the value string for the CSS `width` property. Default is `"100%"`.
    fn width(&self, size: i16) -> String {
        _ = size;
        "100%".to_string()
    }

    /// Returns the value string for the CSS `flex-basis` property. By default, it returns the
    /// input value `size` appended with the string `"px"`.
    fn flex_basis(&self, size: i16) -> String {
        format!("{size}px")
    }

    /// Returns a class name to steer some styling behaviour. Default is `"side-panel"`.
    fn panel_type(&self) -> String {
        "side-panel".to_string()
    }
}

/// Layout strategy for East (right-aligned) panels.
/// Relevant changes regard inversion of display order of child items and the size update.
pub struct East;
impl PositionTrait for East {
    fn flex_direction(&self) -> String {
        "row-reverse".to_string()
    }
    fn calculate_size_update(
        &self,
        current_pointer_position: f64,
        last_pointer_position: f64,
    ) -> i16 {
        let delta = last_pointer_position - current_pointer_position;
        delta as i16
    }
    fn width(&self, size: i16) -> String {
        format!("{size}px")
    }
}

/// Layout strategy for South (bottom-aligned) panels.
/// Corresponds to the East layout, just with all horizontal options changed to vertical.
pub struct South;
impl PositionTrait for South {
    fn flex_direction(&self) -> String {
        "column-reverse".to_string()
    }

    fn cursor(&self) -> String {
        "ns-resize".to_string()
    }
    fn get_pointer_position(&self, event: &MouseEvent) -> f64 {
        event.coordinates().client().y
    }
    fn calculate_size_update(
        &self,
        current_pointer_position: f64,
        last_pointer_position: f64,
    ) -> i16 {
        let delta = last_pointer_position - current_pointer_position;
        delta as i16
    }

    fn height(&self, size: i16) -> String {
        format!("{size}px")
    }

    fn panel_type(&self) -> String {
        "bottom-panel".to_string()
    }
}

/// Layout strategy for West (left-aligned) panels.
/// Takes over most of the default values of all layouts.
pub struct West;
impl PositionTrait for West {
    fn width(&self, size: i16) -> String {
        format!("{size}px")
    }
}

/// Layout strategy for North (top-aligned) panels.
/// Corresponds to what the West strategy is to the East strategy for the South strategy.
pub struct North;
impl PositionTrait for North {
    fn flex_direction(&self) -> String {
        "column".to_string()
    }
    fn cursor(&self) -> String {
        "ns-resize".to_string()
    }
    fn get_pointer_position(&self, event: &MouseEvent) -> f64 {
        event.coordinates().client().y
    }
    fn height(&self, size: i16) -> String {
        format!("{size}px")
    }

    fn panel_type(&self) -> String {
        "main-panel".to_string()
    }
}
