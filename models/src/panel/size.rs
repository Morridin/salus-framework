/// Represents the dimensional metrics of a [`Panel`][`frontend::components::Panel`]
/// along its resizable axis (either horizontal or vertical).
///
/// It keeps track of where the [`Panel`][`frontend::components::Panel`] starts along this axis, its current size, and its minimum
/// size to handle resizing operations smoothly.
#[derive(Clone, Copy, PartialEq)]
pub struct Size {
    start: i32,
    size: i32,
    min_size: i32,
}

impl Size {
    /// Creates a new `Size` instance given a starting coordinate, an ending coordinate,
    /// and a minimum size constraint.
    pub fn new(start: i32, end: i32, min_size: i32) -> Self {
        Self {
            start,
            size: end - start,
            min_size,
        }
    }

    /// Simulates a resize operation from the left/top edge without modifying the internal state.
    ///
    /// # Returns
    /// The actual `delta` that can be applied without violating the `min_size` constraint.
    pub fn check_update_left(&self, delta: i32) -> i32 {
        if self.size - delta < self.min_size {
            self.size - self.min_size
        } else {
            delta
        }
    }

    /// Simulates a resize operation from the right/bottom edge without modifying the internal state.
    ///
    /// # Returns
    /// The actual `delta` that can be applied without violating the `min_size` constraint.
    pub fn check_update_right(&self, delta: i32) -> i32 {
        if self.size + delta < self.min_size {
            self.size - self.min_size
        } else {
            delta
        }
    }

    /// Updates the [`Panel`][`frontend::components::Panel`] size from the left/top side, moving the edge by the given delta pixels.
    ///
    /// The function performs boundary checks to ensure that the [`Panel`][`frontend::components::Panel`] always stays above its minimal size.
    /// There is no check performed against moving the edge out of the screen.
    ///
    /// # Returns
    /// The actual value (in pixels) the [`Panel`][`frontend::components::Panel`] was resized by.
    pub fn update_left(&mut self, delta: i32) -> i32 {
        let delta = self.check_update_left(delta);
        self.start += delta;
        self.size -= delta;
        delta
    }

    /// Updates the [`Panel`][`frontend::components::Panel`] size from the right/bottom side, moving the edge by the given delta pixels.
    ///
    /// The function performs boundary checks to ensure that the [`Panel`][`frontend::components::Panel`] always stays above its minimal size.
    /// There is no check performed against moving the edge out of the screen.
    ///
    /// # Returns
    /// The actual value (in pixels) the [`Panel`][`frontend::components::Panel`] was resized by.
    pub fn update_right(&mut self, delta: i32) -> i32 {
        let delta = self.check_update_right(delta);
        self.size += delta;
        delta
    }

    /// Returns the start coordinate of the [`Panel`][`frontend::components::Panel`] along its resizable axis.
    pub fn start(&self) -> i32 {
        self.start
    }

    /// Returns the calculated end coordinate of the [`Panel`][`frontend::components::Panel`] along its resizable axis.
    pub fn end(&self) -> i32 {
        self.start + self.size
    }

    /// Returns the current size (width or height) of the [`Panel`][`frontend::components::Panel`] along its resizable axis.
    pub fn size(&self) -> i32 {
        self.size
    }
}
