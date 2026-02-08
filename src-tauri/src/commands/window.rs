//! Window management commands
//!
//! Handles window creation, state management, and close confirmation.
//! Replaces src/main/app/windowManager.ts and window-related IPC.

use serde::{Deserialize, Serialize};
use tauri::Manager;
use crate::commands::preferences::PreferencesState;

#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct WindowInfo {
    pub id: String,
    pub title: String,
    pub window_type: String, // "editor" or "settings"
}

/// Create a new editor window
#[tauri::command]
pub async fn create_editor_window(
    app: tauri::AppHandle,
    file_path: Option<String>,
) -> Result<String, String> {
    let window_id = format!("editor_{}", uuid_simple());

    // Prepare environment injection BEFORE building the window
    let user_data_path = app.path().app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    // Read saved language preference for early i18n initialization
    let language = app.try_state::<PreferencesState>()
        .and_then(|state| {
            let prefs = state.preferences.lock().ok()?;
            prefs.get("language").and_then(|v| v.as_str().map(|s| s.to_string()))
        })
        .unwrap_or_else(|| "en".to_string());

    let file_info = if let Some(ref fp) = file_path {
        format!(", filePath: '{}'", fp.replace('\\', "\\\\").replace('\'', "\\'"))
    } else {
        String::new()
    };

    let js = format!(
        "window.__TAURI_ENV__ = {{ userDataPath: '{}', debug: {}, windowId: {}, type: 'editor', language: '{}', theme: 'light', codeFontFamily: 'DejaVu Sans Mono', codeFontSize: '14', hideScrollbar: false, titleBarStyle: 'custom'{} }};",
        user_data_path.replace('\\', "\\\\").replace('\'', "\\'"),
        if cfg!(debug_assertions) { "true" } else { "false" },
        1,
        language,
        file_info,
    );

    // Use initialization_script (runs BEFORE page JS) to guarantee __TAURI_ENV__ availability
    let window = tauri::WebviewWindowBuilder::new(
        &app,
        &window_id,
        tauri::WebviewUrl::App("index.html".into()),
    )
    .title("MarkText")
    .inner_size(1280.0, 800.0)
    .min_inner_size(600.0, 400.0)
    .resizable(true)
    .decorations(true)
    .focused(true)
    .initialization_script(&js)
    .build()
    .map_err(|e| format!("Failed to create window: {}", e))?;

    let _ = &window; // suppress unused warning
    Ok(window_id)
}

/// Create settings window
#[tauri::command]
pub async fn create_settings_window(
    app: tauri::AppHandle,
    page: Option<String>,
) -> Result<String, String> {
    let window_id = "settings";

    // If settings window already exists, focus it
    if let Some(existing) = app.get_webview_window(window_id) {
        let _ = existing.set_focus();
        return Ok(window_id.to_string());
    }

    let page_param = page.unwrap_or_else(|| "general".to_string());
    let url = format!("index.html#/preference/{}", page_param);

    // Read saved preferences for early injection
    let user_data_path = app.path().app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    let language = app.try_state::<PreferencesState>()
        .and_then(|state| {
            let prefs = state.preferences.lock().ok()?;
            prefs.get("language").and_then(|v| v.as_str().map(|s| s.to_string()))
        })
        .unwrap_or_else(|| "en".to_string());

    let js = format!(
        "window.__TAURI_ENV__ = {{ userDataPath: '{}', debug: {}, windowId: 2, type: 'settings', language: '{}', theme: 'light', codeFontFamily: 'DejaVu Sans Mono', codeFontSize: '14', hideScrollbar: false, titleBarStyle: 'custom' }};",
        user_data_path.replace('\\', "\\\\").replace('\'', "\\'"),
        if cfg!(debug_assertions) { "true" } else { "false" },
        language,
    );

    // Use initialization_script (runs BEFORE page JS) instead of eval (race condition)
    let window = tauri::WebviewWindowBuilder::new(
        &app,
        window_id,
        tauri::WebviewUrl::App(url.into()),
    )
    .title("MarkText - Settings")
    .inner_size(900.0, 650.0)
    .min_inner_size(600.0, 400.0)
    .resizable(true)
    .decorations(true)
    .focused(true)
    .initialization_script(&js)
    .build()
    .map_err(|e| format!("Failed to create settings window: {}", e))?;

    // Open devtools in debug builds for easier debugging
    #[cfg(debug_assertions)]
    {
        window.open_devtools();
    }

    Ok(window_id.to_string())
}

/// Show close confirmation dialog for unsaved files
#[tauri::command]
pub async fn close_window_confirm(
    app: tauri::AppHandle,
    i18n: tauri::State<'_, crate::i18n::I18n>,
    _window_label: Option<String>,
    unsaved_count: u32,
) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;

    let message = if unsaved_count == 1 {
        i18n.t("dialog.unsavedChanges")
    } else {
        i18n.t("dialog.unsavedMultiple").replace("{count}", &unsaved_count.to_string())
    };

    // Use Tauri dialog
    let result = app
        .dialog()
        .message(&message)
        .title("MarkText")
        .blocking_show();

    // true = OK (save), false = cancel
    if result {
        Ok("save".to_string())
    } else {
        Ok("cancel".to_string())
    }
}

/// Minimize the current window
#[tauri::command]
pub async fn minimize_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

/// Maximize/restore the current window
#[tauri::command]
pub async fn maximize_window(window: tauri::WebviewWindow) -> Result<(), String> {
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

/// Close the current window
#[tauri::command]
pub async fn close_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

/// Set fullscreen
#[tauri::command]
pub async fn set_fullscreen(window: tauri::WebviewWindow, fullscreen: bool) -> Result<(), String> {
    window.set_fullscreen(fullscreen).map_err(|e| e.to_string())
}

/// Toggle always on top
#[tauri::command]
pub async fn set_always_on_top(window: tauri::WebviewWindow, always_on_top: bool) -> Result<(), String> {
    window.set_always_on_top(always_on_top).map_err(|e| e.to_string())
}

/// Get window state
#[tauri::command]
pub async fn get_window_state(window: tauri::WebviewWindow) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "isMaximized": window.is_maximized().unwrap_or(false),
        "isMinimized": window.is_minimized().unwrap_or(false),
        "isFullscreen": window.is_fullscreen().unwrap_or(false),
    }))
}

/// Simple UUID generator (no external dep needed)
fn uuid_simple() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("{:x}", now)
}
