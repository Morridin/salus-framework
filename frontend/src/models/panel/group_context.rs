use crate::models::panel::{GroupOrientation, MetaData};
use dioxus::prelude::*;
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Clone, Copy)]
pub struct GroupContext {
    orientation: GroupOrientation,
    children: Signal<HashMap<Uuid, MetaData>>,
}

impl GroupContext {
    pub fn new(orientation: GroupOrientation, children: Signal<HashMap<Uuid, MetaData>>) -> Self {
        Self {
            orientation,
            children,
        }
    }
    pub fn orientation(&self) -> &GroupOrientation {
        &self.orientation
    }

    pub fn children(&self) -> Signal<HashMap<Uuid, MetaData>> {
        self.children
    }

    pub fn find_left_sibling(&self, own_start: i32) -> Option<Uuid> {
        self.children.peek().iter().find_map(
            |(&k, r)| {
                if r.end() == own_start { Some(k) } else { None }
            },
        )
    }

    pub fn find_right_sibling(&self, own_end: i32) -> Option<Uuid> {
        self.children.peek().iter().find_map(
            move |(&k, r)| {
                if r.start() == own_end { Some(k) } else { None }
            },
        )
    }
}
