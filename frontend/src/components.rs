//! Module declarations and public API re-exports for all front-end layout interface elements.
mod panel;
mod plugin_panel;
mod buttons;
mod panel_group;
mod resize_handler;
mod tabbed_group;
mod app;
mod panel_header;

// Flatten the API for a nicer look and feel.
pub use self::app::App;
pub use self::panel::Panel;
pub use self::panel_header::PanelHeader;
pub use self::plugin_panel::PluginPanel;
pub use self::tabbed_group::TabbedGroup;
pub use self::panel_group::PanelGroup;
pub use self::resize_handler::ResizeHandler;
