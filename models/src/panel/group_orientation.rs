use dioxus::{
    html::geometry::{PixelsRect, PixelsVector2D},
    prelude::*,
};
use std::{fmt, ops::Range};

/// Defines the layout flow direction of a [`PanelGroup`][`frontend::components::PanelGroup`].
#[derive(PartialEq, Eq, Clone, Copy, Hash)]
pub enum GroupOrientation {
    /// Panels are arranged side-by-side (left to right), resizing within the `PanelGroup` is possible horizontally.
    Horizontal,
    /// Panels are arranged stacked (top to bottom), resizing within the `PanelGroup` is possible vertically.
    Vertical,
}

impl fmt::Display for GroupOrientation {
    /// Returns the corresponding HTML class name for members of the `PanelGroup`:
    /// - `"horizontal"` for [`Horizontal`][`GroupOrientation::Horizontal`] variant
    /// - `"vertical"` for [`Vertical`][`GroupOrientation::Vertical`] variant
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Horizontal => write!(f, "horizontal"),
            Self::Vertical => write!(f, "vertical"),
        }
    }
}

/// A trait to extract a 1D pixel coordinate range from a 2D bounding rectangle based on the [`GroupOrientation`] variant.
pub trait RangeExtractor {
    /// Extracts either the X-range ([`Horizontal`]) or Y-range ([`Vertical`]) from the provided [`PixelsRect`].
    fn extract_range(&self, rect: PixelsRect) -> Range<i32>;
}

/// A trait providing orientation-aware abstractions for pointer inputs and rendering transformations.
/// Inherits the [`RangeExtractor`] trait and its methods.
pub trait PointerPosition: RangeExtractor {
    /// Extracts the relevant axis coordinate (X or Y) from a Dioxus [`MouseEvent`].
    fn pointer_position(&self, event: MouseEvent) -> f64;
    /// Creates a 2D translation vector extending along the active axis.
    fn translation_vector(&self, length: f64) -> PixelsVector2D;
}

/// Concrete strategy for horizontal panel resizing operations inside a [`PanelGroup`][`frontend::components::PanelGroup`].
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

/// Concrete strategy for vertical panel resizing operations inside a [`PanelGroup`][`frontend::components::PanelGroup`].
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
    /// Returns a trait object capable of extracting pointer coordinates and generating
    /// vectors tailored to this orientation.
    pub fn as_trait(&self) -> &'static dyn PointerPosition {
        match self {
            Self::Horizontal => &Horizontal,
            Self::Vertical => &Vertical,
        }
    }

    /// Returns a trait object capable of extracting 1D boundaries tailored to this orientation.
    pub fn as_range(&self) -> &'static dyn RangeExtractor {
        match self {
            Self::Horizontal => &Horizontal,
            Self::Vertical => &Vertical,
        }
    }
}
