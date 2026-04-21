/// Small struct to associate a plugin display name with its uuid without having to use tuples.
pub struct Name {
    pub uuid: String,
    pub name: String,
}