//! Context menu commands
//!
//! Provides context menu support for the editor, sidebar, and tab bar.
//! Uses frontend-based HTML context menus (more flexible than native).

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ContextMenuItem {
    pub id: String,
    pub label: String,
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub separator: bool,
    #[serde(default)]
    pub accelerator: Option<String>,
}

/// Get editor context menu items based on selection state
#[tauri::command]
pub fn get_editor_context_menu(
    has_selection: bool,
    is_link: bool,
    is_image: bool,
) -> Vec<ContextMenuItem> {
    let mut items = vec![];

    if has_selection {
        items.push(ContextMenuItem {
            id: "cut".to_string(),
            label: "Cut".to_string(),
            enabled: true,
            separator: false,
            accelerator: Some("CmdOrCtrl+X".to_string()),
        });
        items.push(ContextMenuItem {
            id: "copy".to_string(),
            label: "Copy".to_string(),
            enabled: true,
            separator: false,
            accelerator: Some("CmdOrCtrl+C".to_string()),
        });
    }

    items.push(ContextMenuItem {
        id: "paste".to_string(),
        label: "Paste".to_string(),
        enabled: true,
        separator: false,
        accelerator: Some("CmdOrCtrl+V".to_string()),
    });

    items.push(ContextMenuItem {
        id: "separator-1".to_string(),
        label: String::new(),
        enabled: false,
        separator: true,
        accelerator: None,
    });

    if has_selection {
        items.push(ContextMenuItem {
            id: "copy-as-markdown".to_string(),
            label: "Copy as Markdown".to_string(),
            enabled: true,
            separator: false,
            accelerator: None,
        });
        items.push(ContextMenuItem {
            id: "copy-as-html".to_string(),
            label: "Copy as HTML".to_string(),
            enabled: true,
            separator: false,
            accelerator: None,
        });
        items.push(ContextMenuItem {
            id: "separator-2".to_string(),
            label: String::new(),
            enabled: false,
            separator: true,
            accelerator: None,
        });
    }

    items.push(ContextMenuItem {
        id: "select-all".to_string(),
        label: "Select All".to_string(),
        enabled: true,
        separator: false,
        accelerator: Some("CmdOrCtrl+A".to_string()),
    });

    if is_link {
        items.push(ContextMenuItem {
            id: "separator-link".to_string(),
            label: String::new(),
            enabled: false,
            separator: true,
            accelerator: None,
        });
        items.push(ContextMenuItem {
            id: "open-link".to_string(),
            label: "Open Link".to_string(),
            enabled: true,
            separator: false,
            accelerator: None,
        });
        items.push(ContextMenuItem {
            id: "copy-link".to_string(),
            label: "Copy Link".to_string(),
            enabled: true,
            separator: false,
            accelerator: None,
        });
    }

    if is_image {
        items.push(ContextMenuItem {
            id: "separator-image".to_string(),
            label: String::new(),
            enabled: false,
            separator: true,
            accelerator: None,
        });
        items.push(ContextMenuItem {
            id: "copy-image".to_string(),
            label: "Copy Image".to_string(),
            enabled: true,
            separator: false,
            accelerator: None,
        });
        items.push(ContextMenuItem {
            id: "save-image".to_string(),
            label: "Save Image As...".to_string(),
            enabled: true,
            separator: false,
            accelerator: None,
        });
    }

    items
}

/// Get sidebar context menu items
#[tauri::command]
pub fn get_sidebar_context_menu(
    _file_path: String,
    is_directory: bool,
) -> Vec<ContextMenuItem> {
    let mut items = vec![];

    if is_directory {
        items.push(ContextMenuItem {
            id: "new-file".to_string(),
            label: "New File".to_string(),
            enabled: true,
            separator: false,
            accelerator: None,
        });
        items.push(ContextMenuItem {
            id: "new-folder".to_string(),
            label: "New Folder".to_string(),
            enabled: true,
            separator: false,
            accelerator: None,
        });
        items.push(ContextMenuItem {
            id: "separator-1".to_string(),
            label: String::new(),
            enabled: false,
            separator: true,
            accelerator: None,
        });
    }

    items.push(ContextMenuItem {
        id: "rename".to_string(),
        label: "Rename".to_string(),
        enabled: true,
        separator: false,
        accelerator: None,
    });

    items.push(ContextMenuItem {
        id: "delete".to_string(),
        label: "Move to Trash".to_string(),
        enabled: true,
        separator: false,
        accelerator: None,
    });

    items.push(ContextMenuItem {
        id: "separator-2".to_string(),
        label: String::new(),
        enabled: false,
        separator: true,
        accelerator: None,
    });

    items.push(ContextMenuItem {
        id: "reveal-in-explorer".to_string(),
        label: "Reveal in File Explorer".to_string(),
        enabled: true,
        separator: false,
        accelerator: None,
    });

    items.push(ContextMenuItem {
        id: "copy-path".to_string(),
        label: "Copy Path".to_string(),
        enabled: true,
        separator: false,
        accelerator: None,
    });

    items
}

/// Get tab context menu items
#[tauri::command]
pub fn get_tab_context_menu(
    has_path: bool,
    is_saved: bool,
) -> Vec<ContextMenuItem> {
    let mut items = vec![];

    items.push(ContextMenuItem {
        id: "close-tab".to_string(),
        label: "Close".to_string(),
        enabled: true,
        separator: false,
        accelerator: Some("CmdOrCtrl+W".to_string()),
    });

    items.push(ContextMenuItem {
        id: "close-others".to_string(),
        label: "Close Others".to_string(),
        enabled: true,
        separator: false,
        accelerator: None,
    });

    items.push(ContextMenuItem {
        id: "close-all".to_string(),
        label: "Close All".to_string(),
        enabled: true,
        separator: false,
        accelerator: None,
    });

    items.push(ContextMenuItem {
        id: "separator-1".to_string(),
        label: String::new(),
        enabled: false,
        separator: true,
        accelerator: None,
    });

    if has_path {
        items.push(ContextMenuItem {
            id: "copy-path".to_string(),
            label: "Copy Path".to_string(),
            enabled: true,
            separator: false,
            accelerator: None,
        });

        items.push(ContextMenuItem {
            id: "reveal-in-explorer".to_string(),
            label: "Reveal in File Explorer".to_string(),
            enabled: true,
            separator: false,
            accelerator: None,
        });

        items.push(ContextMenuItem {
            id: "separator-2".to_string(),
            label: String::new(),
            enabled: false,
            separator: true,
            accelerator: None,
        });
    }

    items.push(ContextMenuItem {
        id: "rename".to_string(),
        label: "Rename".to_string(),
        enabled: has_path,
        separator: false,
        accelerator: None,
    });

    if !is_saved {
        items.push(ContextMenuItem {
            id: "save".to_string(),
            label: "Save".to_string(),
            enabled: true,
            separator: false,
            accelerator: Some("CmdOrCtrl+S".to_string()),
        });
    }

    items
}
