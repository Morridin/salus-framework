#[derive(Clone, Copy, PartialEq)]
pub struct Size {
    start: i32,
    size: i32,
    min_size: i32,
}

impl Size {
    pub fn new(start: i32, end: i32, min_size: i32) -> Self {
        Self {
            start,
            size: end - start,
            min_size,
        }
    }

    /// Returns the same as update_left, but without doing anything.
    pub fn check_update_left(&self, delta: i32) -> i32 {
        if self.size - delta < self.min_size {
            self.size - self.min_size
        } else {
            delta
        }
    }

    /// Returns the same as update_right but without doing anything.
    pub fn check_update_right(&self, delta: i32) -> i32 {
        if self.size + delta < self.min_size {
            self.size - self.min_size
        } else {
            delta
        }
    }

    /// Updates the panel size from the left side of the panel, hence, moves the left or upper edge (depending on orientation) by delta pixels.
    /// The function performs boundary checks to ensure that the panel always stays above its minimal size.
    /// There is no check performed against moving the edge out of the screen, however, as this is technically not possible.
    /// Returns the value the panel was actually resized by.
    pub fn update_left(&mut self, delta: i32) -> i32 {
        let delta = self.check_update_left(delta);
        self.start += delta;
        self.size -= delta;
        delta
    }

    /// Updates the panel size from the right side of the panel, hence, moves the right or lower edge (depending on orientation) by delta pixels.
    /// The function performs boundary checks to ensure that the panel always stays above its minimal size.
    /// There is no check performed against moving the edge out of the screen, however, as this is technically not possible.
    /// Returns the value the panel was actually resized by.
    pub fn update_right(&mut self, delta: i32) -> i32 {
        let delta = self.check_update_right(delta);
        self.size += delta;
        delta
    }

    pub fn start(&self) -> i32 {
        self.start
    }

    pub fn end(&self) -> i32 {
        self.start + self.size
    }

    pub fn size(&self) -> i32 {
        self.size
    }
}
