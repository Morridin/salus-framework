use dioxus::events::MouseEvent;
use dioxus::html::InteractionElementOffset;

/// This Enum specifies where on screen an element is placed.
/// If offers a bunch of utility function via its `as_trait` method that define behaviour adjusted to the element placement.
#[derive(PartialEq, Clone)]
pub enum Position {
    East,
    South,
    West,
    North,
}

impl Position {
    pub fn as_trait(&self) -> &'static dyn PositionTrait {
        match self {
            Self::East => &East,
            Self::South => &South,
            Self::West => &West,
            Self::North => &North,
        }
    }
}

pub trait PositionTrait {
    fn flex_direction(&self) -> String {
        "row".to_string()
    }
    fn cursor(&self) -> String {
        "ew-resize".to_string()
    }
    fn get_pointer_position(&self, event: &MouseEvent) -> f64 {
        event.coordinates().client().x
    }
    fn calculate_size_update(
        &self,
        current_pointer_position: f64,
        last_pointer_position: f64,
    ) -> i16 {
        let delta = current_pointer_position - last_pointer_position;
        delta as i16
    }
    fn height(&self, size: i16) -> String {
        _ = size;
        "100%".to_string()
    }
    fn width(&self, size: i16) -> String {
        _ = size;
        "100%".to_string()
    }
    fn flex_basis(&self, size: i16) -> String {
        format!("{size}px")
    }

    fn panel_type(&self) -> String {
        "side-panel".to_string()
    }
}

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

pub struct West;
impl PositionTrait for West {
    fn width(&self, size: i16) -> String {
        format!("{size}px")
    }
}

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
