use std::{
    fmt,
    ops::Range
};
use dioxus::{
    prelude::*,
    html::geometry::{PixelsRect, PixelsVector2D}
};

#[derive(PartialEq, Eq, Clone, Copy, Hash)]
pub enum GroupOrientation {
    Horizontal,
    Vertical,
}

impl fmt::Display for GroupOrientation {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Horizontal => write!(f, "horizontal"),
            Self::Vertical => write!(f, "vertical"),
        }
    }
}

pub trait RangeExtractor {
    fn extract_range(&self, rect: PixelsRect) -> Range<i32>;
}
pub trait PointerPosition: RangeExtractor {
    fn pointer_position(&self, event: MouseEvent) -> f64;
    fn translation_vector(&self, length: f64) -> PixelsVector2D;
}

pub struct Horizontal;

impl RangeExtractor for Horizontal {
    fn extract_range(&self, rect: PixelsRect) -> Range<i32> {
        rect.round().to_i32().x_range()
    }
}

impl PointerPosition for Horizontal {
    fn pointer_position(&self, event: MouseEvent) -> f64 {
        event.client_coordinates().x
    }
    fn translation_vector(&self, length: f64) -> PixelsVector2D {
        PixelsVector2D::new(length, 0.)
    }
}

pub struct Vertical;

impl RangeExtractor for Vertical {
    fn extract_range(&self, rect: PixelsRect) -> Range<i32> {
        rect.round().to_i32().y_range()
    }
}

impl PointerPosition for Vertical {
    fn pointer_position(&self, event: MouseEvent) -> f64 {
        event.client_coordinates().y
    }

    fn translation_vector(&self, length: f64) -> PixelsVector2D {
        PixelsVector2D::new(0., length)
    }
}
impl GroupOrientation {
    pub fn as_trait(&self) -> &'static dyn PointerPosition {
        match self {
            Self::Horizontal => &Horizontal,
            Self::Vertical => &Vertical,
        }
    }

    pub fn as_range(&self) -> &'static dyn RangeExtractor {
        match self {
            Self::Horizontal => &Horizontal,
            Self::Vertical => &Vertical,
        }
    }
}
