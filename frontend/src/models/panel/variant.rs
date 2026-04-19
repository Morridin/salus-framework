use crate::models::panel::GroupOrientation;

#[derive(PartialEq, Clone)]
pub enum Variant {
    Leaf,
    Branch(GroupOrientation),
}