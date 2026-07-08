use crate::components::{PanelHeader, PluginPanel, buttons::{AddButton, CloseButton}};
use crate::components::panel::on_mounted;
use models::{
    panel::GroupContext,
    plugin::Manifest,
    Position,
};
use dioxus::prelude::*;
use std::collections::HashMap;
use std::vec::IntoIter;
use uuid::Uuid;

/// This function generates an Element that groups PluginPanels in a tabbed view.
///
/// # Props
/// - `position`: One of either `North`, `East`, `South` or `West`. Determines some behavioural traits with respect to rendering.
/// - `min_size`: The minimum size this element may be shrinked to.
/// - `children`: Child elements to display in the empty panel body as placeholder text.
#[component]
pub fn TabbedGroup(position: Position, #[props(default = 0)] min_size: i32, children: Element) -> Element {
    let uuid = use_signal(|| Uuid::new_v4());
    let mut open_plugins = use_signal(|| TabbedPlugins::new());
    let mut active_tab = use_signal(|| None);
    let mut new_plugin = use_signal(|| None);
    let active_plugin = use_memo(move || open_plugins().filter(&active_tab().unwrap_or_default()).first().cloned());

    use_effect(move || if new_plugin().is_some() {
        let id = open_plugins.write().insert(new_plugin.take().unwrap());
        active_tab.set(Some(id));
    });

    let context: Option<GroupContext> = try_use_context();
    let mut plugin_manifests: Signal<Vec<Manifest>> = use_context();

    let size = if let Some(context) = context {
        context.children().read().get(&uuid.peek()).cloned()
    } else {
        None
    };

    for i in 0..plugin_manifests.len() {
        let mut plugin_manifests = plugin_manifests.write();
        let positions = plugin_manifests.get(i).unwrap().panels();
        if positions.first().is_some_and(|p| p == &position) {
            open_plugins.write().insert(plugin_manifests.remove(i));
        }
    }

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
                            class: if active_tab.peek().unwrap_or_default() == uuid { Some("tabbed-active".to_string()) } else { None },
                            panel_name: open_plugins().get(&uuid).unwrap().to_string(),
                            buttons: rsx! {
                                CloseButton {
                                    on_panel_close: move |event: MouseEvent| {
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
            if active_tab().is_some() {
                PluginPanel {
                    headless: true,
                    position,
                    external_plugin: active_plugin,
                }
            }
            else {
                div {
                    class: "panel-body",
                    { children },
                },
            }
        }
    }
}

#[derive(PartialEq, Clone)]
struct TabbedPlugins {
    keys: Vec<Uuid>,
    values: HashMap<Uuid, Manifest>,
}

impl TabbedPlugins {
    pub fn new() -> Self {
        Self {
            keys: vec![],
            values: HashMap::new(),
        }
    }

    pub fn insert(&mut self, plugin: Manifest) -> Uuid {
        let uuid = Uuid::new_v4();
        self.keys.push(uuid);
        self.values.insert(uuid, plugin);
        uuid.clone()
    }

    pub fn remove(&mut self, uuid: &Uuid) {
        self.keys.retain(|k| k != uuid);
        self.values.remove(uuid);
    }

    pub fn get(&self, uuid: &Uuid) -> Option<&Manifest> {
        self.values.get(uuid)
    }

    pub fn find_next(&self, uuid: &Uuid) -> Option<Uuid> {
        if let Some(index) = self.keys.iter().position(|u| u == uuid) {
            if index == 0 {
                return self.keys.get(1).cloned();
            }
            return self.keys.get(index - 1).cloned();
        }
        None
    }

    pub fn filter(&self, uuid: &Uuid) -> Vec<Manifest> {
        self.values
            .iter()
            .filter_map(|(k, v)| if k == uuid { Some(v.clone()) } else { None })
            .collect()
    }
}

impl IntoIterator for TabbedPlugins {
    type Item = Uuid;
    type IntoIter = IntoIter<Uuid>;

    fn into_iter(self) -> Self::IntoIter {
        self.keys.into_iter()
    }
}
