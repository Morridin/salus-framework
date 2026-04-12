#[derive(PartialEq, Clone)]
pub struct ResizeData {
    /// Minimum panel size in resizable direction, in px.
    /// Default 0.
    min_size: u16,
    /// Maximum panel size in resizable direction, in px.
    /// Default is no limit.
    max_size: Option<u16>,
    /// Initial panel size in resizable direction, in px.
    init_size: Option<u16>,
}

impl ResizeData {
    pub fn new(min_size: Option<u16>, max_size: Option<u16>, init_size: Option<u16>) -> Self {
        let min_size = min_size.unwrap_or(0);
        Self {
            min_size,
            max_size,
            init_size,
        }
    }

    pub fn may_shrink(&self, current_size: u16) -> bool {
        current_size > self.min_size
    }

    pub fn may_grow(&self, current_size: u16) -> bool {
        if let Some(max_size) = self.max_size {
            current_size < max_size
        }
        else {
            true
        }
    }

    pub fn init_size(&self) -> Option<u16> {
        self.init_size
    }
}