use crate::components::panel::on_mounted;
use crate::components::{
    buttons::{AddButton, CloseButton},
    PanelHeader,
    PluginPanel,
};
use dioxus::prelude::*;
use models::{panel::GroupContext, plugin::Manifest, Position};
use std::collections::HashMap;
use std::vec::IntoIter;
use uuid::Uuid;

/// This function generates an [`Element`] that groups [`PluginPanels`] in a tabbed view.
///
/// Automatically organises launched plug-ins into clickable tabs, orchestrates tab removal,
/// focus shifting, and manages custom fallback placeholder content when no tabs are active.
///
/// Can be used as resizable component in a [`PanelGroup`].
///
/// # Arguments
/// * `position` - The [`Position`] variant determines some behavioural traits with respect to rendering.
/// * `min_size` - The minimum size this element may be shrinked to.
/// * `children` - Child elements to display in the empty panel body as placeholder text.
#[component]
pub fn TabbedGroup(
    position: Position,
    #[props(default = 0)] min_size: i32,
    children: Element,
) -> Element {
    let uuid = use_signal(|| Uuid::new_v4());
    let mut open_plugins = use_signal(|| TabbedPlugins::new());
    let mut active_tab = use_signal(|| None);
    let mut new_plugin = use_signal(|| None);

    use_effect(move || {
        if new_plugin().is_some() {
            let id = open_plugins.write().insert(new_plugin.take().unwrap());
            active_tab.set(Some(id));
        }
    });

    let context: Option<GroupContext> = try_use_context();

    let size = if let Some(context) = context {
        context.children().read().get(&uuid.peek()).cloned()
    } else {
        None
    };

    rsx! {
        div {
            class: "panel tabbed",
            flex_basis: if let Some(size) = size { "{size.size()}px" } else { "auto" },
            onmounted: move |e: MountedEvent| async move { on_mounted(e, context, uuid(), min_size).await },
            div {
                class: "tabbed-header",
                div {
                    class: "tabbed-header-panel-group",
                    for uuid in open_plugins() {
                        PanelHeader {
                            class: if active_tab.read().unwrap_or_default() == uuid { Some("tabbed-active".to_string()) } else { None },
                            panel_name: open_plugins().get(&uuid).unwrap().to_string(),
                            buttons: rsx! {
                                CloseButton {
                                    onclick: move |event: MouseEvent| {
                                        event.stop_propagation();
                                        if active_tab.peek().unwrap_or_default() == uuid {
                                            let next = open_plugins.peek().find_next(&uuid);
                                            active_tab.set(next);
                                        }
                                        open_plugins.write().remove(&uuid);
                                    },
                                }
                            },
                            onclick: move |_| active_tab.set(Some(uuid.clone())),
                        },
                    }
                },
                div {
                    class: "panel-header-button-group",
                    AddButton {
                        position: position.clone(),
                        opened_plugin: new_plugin,
                    }
                }
            }
            for tab in open_plugins() {
                div {
                    class: if active_tab().unwrap() == tab { "tabbed-body" } else { "tabbed-body hidden" },
                    key: "{tab}",
                    PluginPanel {
                        headless: true,
                        position: position.clone(),
                        external_plugin: open_plugins().get(&tab).cloned(),
                    }
                }
            }
            if active_tab().is_none() {
                div {
                    class: "panel-body",
                    { children },
                },
            }
        }
    }
}

/// Internal helper collection managing the sequential order and manifest data of open tabs.
/// The mapping is performed using UUIDs, with each tab being assigned its own [`Uuid`].
#[derive(PartialEq, Clone)]
struct TabbedPlugins {
    keys: Vec<Uuid>,
    values: HashMap<Uuid, Manifest>,
}

impl TabbedPlugins {
    /// Creates an empty collection of tabbed plug-ins.
    pub fn new() -> Self {
        Self {
            keys: vec![],
            values: HashMap::new(),
        }
    }

    /// Inserts a plug-in manifest, assigning and returning a unique tab identifier ([`Uuid`]).
    pub fn insert(&mut self, plugin: Manifest) -> Uuid {
        let uuid = Uuid::new_v4();
        self.keys.push(uuid);
        self.values.insert(uuid, plugin);
        uuid.clone()
    }

    /// Removes a plug-in from the collection based on its tab identifier.
    pub fn remove(&mut self, uuid: &Uuid) {
        self.keys.retain(|k| k != uuid);
        self.values.remove(uuid);
    }

    /// Retrieves a reference to the plug-in manifest corresponding to a specific tab identifier.
    pub fn get(&self, uuid: &Uuid) -> Option<&Manifest> {
        self.values.get(uuid)
    }

    /// Determines which tab should gain focus after the specified tab is closed, based on the tab's
    /// [`Uuid`] and returns the `Uuid` of the tab to gain focus next, if any is available.
    pub fn find_next(&self, uuid: &Uuid) -> Option<Uuid> {
        if let Some(index) = self.keys.iter().position(|u| u == uuid) {
            if index == 0 {
                return self.keys.get(1).cloned();
            }
            return self.keys.get(index - 1).cloned();
        }
        None
    }

    /// Retrieves a clone of the plug-in [`Manifest`] associated with the provided [`Uuid`].
    /// If there is no `Manifest` found, None is returned.
    pub fn filter(&self, uuid: &Uuid) -> Option<Manifest> {
        self.values
            .iter()
            .filter_map(|(k, v)| if k == uuid { Some(v.clone()) } else { None })
            .collect::<Vec<_>>()
            .first()
            .cloned()
    }
}

impl IntoIterator for TabbedPlugins {
    type Item = Uuid;
    type IntoIter = IntoIter<Uuid>;

    fn into_iter(self) -> Self::IntoIter {
        self.keys.into_iter()
    }
}
