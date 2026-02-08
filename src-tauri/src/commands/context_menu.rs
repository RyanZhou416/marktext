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
    i18n: tauri::State<'_, crate::i18n::I18n>,
    has_selection: bool,
    is_link: bool,
    is_image: bool,
) -> Vec<ContextMenuItem> {
    let mut items = vec![];

    if has_selection {
        items.push(ContextMenuItem {
            id: "cut".to_string(),
            label: i18n.t("contextMenu.editor.cut"),
            enabled: true,
            separator: false,
            accelerator: Some("CmdOrCtrl+X".to_string()),
        });
        items.push(ContextMenuItem {
            id: "copy".to_string(),
            label: i18n.t("contextMenu.editor.copy"),
            enabled: true,
            separator: false,
            accelerator: Some("CmdOrCtrl+C".to_string()),
        });
    }

    items.push(ContextMenuItem {
        id: "paste".to_string(),
        label: i18n.t("contextMenu.editor.paste"),
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
            label: i18n.t("contextMenu.editor.copyAsMarkdown"),
            enabled: true,
            separator: false,
            accelerator: None,
        });
        items.push(ContextMenuItem {
            id: "copy-as-html".to_string(),
            label: i18n.t("contextMenu.editor.copyAsHtml"),
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
        label: i18n.t("contextMenu.editor.selectAll"),
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
            label: i18n.t("contextMenu.editor.openLink"),
            enabled: true,
            separator: false,
            accelerator: None,
        });
        items.push(ContextMenuItem {
            id: "copy-link".to_string(),
            label: i18n.t("contextMenu.editor.copyLink"),
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
            label: i18n.t("contextMenu.editor.copyImage"),
            enabled: true,
            separator: false,
            accelerator: None,
        });
        items.push(ContextMenuItem {
            id: "save-image".to_string(),
            label: i18n.t("contextMenu.editor.saveImageAs"),
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
    i18n: tauri::State<'_, crate::i18n::I18n>,
    _file_path: String,
    is_directory: bool,
) -> Vec<ContextMenuItem> {
    let mut items = vec![];

    if is_directory {
        items.push(ContextMenuItem {
            id: "new-file".to_string(),
            label: i18n.t("contextMenu.sidebar.newFile"),
            enabled: true,
            separator: false,
            accelerator: None,
        });
        items.push(ContextMenuItem {
            id: "new-folder".to_string(),
            label: i18n.t("contextMenu.sidebar.newDirectory"),
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
        label: i18n.t("contextMenu.sidebar.rename"),
        enabled: true,
        separator: false,
        accelerator: None,
    });

    items.push(ContextMenuItem {
        id: "delete".to_string(),
        label: i18n.t("contextMenu.sidebar.moveToTrash"),
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
        label: i18n.t("dialog.revealInExplorer"),
        enabled: true,
        separator: false,
        accelerator: None,
    });

    items.push(ContextMenuItem {
        id: "copy-path".to_string(),
        label: i18n.t("contextMenu.tabs.copyPath"),
        enabled: true,
        separator: false,
        accelerator: None,
    });

    items
}

/// Get tab context menu items
#[tauri::command]
pub fn get_tab_context_menu(
    i18n: tauri::State<'_, crate::i18n::I18n>,
    has_path: bool,
    is_saved: bool,
) -> Vec<ContextMenuItem> {
    let mut items = vec![];

    items.push(ContextMenuItem {
        id: "close-tab".to_string(),
        label: i18n.t("contextMenu.tabs.close"),
        enabled: true,
        separator: false,
        accelerator: Some("CmdOrCtrl+W".to_string()),
    });

    items.push(ContextMenuItem {
        id: "close-others".to_string(),
        label: i18n.t("contextMenu.tabs.closeOthers"),
        enabled: true,
        separator: false,
        accelerator: None,
    });

    items.push(ContextMenuItem {
        id: "close-all".to_string(),
        label: i18n.t("contextMenu.tabs.closeAll"),
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
            label: i18n.t("contextMenu.tabs.copyPath"),
            enabled: true,
            separator: false,
            accelerator: None,
        });

        items.push(ContextMenuItem {
            id: "reveal-in-explorer".to_string(),
            label: i18n.t("dialog.revealInExplorer"),
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
        label: i18n.t("contextMenu.tabs.rename"),
        enabled: has_path,
        separator: false,
        accelerator: None,
    });

    if !is_saved {
        items.push(ContextMenuItem {
            id: "save".to_string(),
            label: i18n.t("contextMenu.tabs.save"),
            enabled: true,
            separator: false,
            accelerator: Some("CmdOrCtrl+S".to_string()),
        });
    }

    items
}
