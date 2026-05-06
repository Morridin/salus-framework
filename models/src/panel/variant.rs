use crate::panel::GroupOrientation;

#[derive(PartialEq, Clone)]
pub enum Variant {
    Leaf,
    Branch(GroupOrientation),
}