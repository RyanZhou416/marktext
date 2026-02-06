//! Keybindings commands
//!
//! Manages keyboard shortcuts configuration.
//! Replaces src/main/keyboard/.

use serde_json::Value;
use std::path::PathBuf;

/// Get default keybindings for the current platform
#[tauri::command]
pub fn get_default_keybindings() -> Value {
    let platform = std::env::consts::OS;
    match platform {
        "macos" => get_macos_keybindings(),
        "linux" => get_linux_keybindings(),
        _ => get_windows_keybindings(),
    }
}

/// Get user custom keybindings
#[tauri::command]
pub fn get_user_keybindings(app: tauri::AppHandle) -> Result<Value, String> {
    let path = get_keybindings_path(&app)?;
    if path.exists() {
        let content = std::fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read keybindings: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse keybindings: {}", e))
    } else {
        Ok(Value::Object(serde_json::Map::new()))
    }
}

/// Save user custom keybindings
#[tauri::command]
pub fn save_user_keybindings(app: tauri::AppHandle, keybindings: Value) -> Result<(), String> {
    let path = get_keybindings_path(&app)?;
    let content = serde_json::to_string_pretty(&keybindings)
        .map_err(|e| format!("Failed to serialize: {}", e))?;
    std::fs::write(&path, content)
        .map_err(|e| format!("Failed to write keybindings: {}", e))
}

/// Get resolved keybindings (defaults merged with user overrides)
#[tauri::command]
pub fn get_keybindings(app: tauri::AppHandle) -> Result<Value, String> {
    let defaults = get_default_keybindings();
    let user = get_user_keybindings(app)?;

    // Merge user keybindings over defaults
    let mut merged = defaults;
    if let (Value::Object(ref mut def), Value::Object(ref usr)) = (&mut merged, &user) {
        for (key, value) in usr {
            def.insert(key.clone(), value.clone());
        }
    }

    Ok(merged)
}

fn get_keybindings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    use tauri::Manager;
    let dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    Ok(dir.join("keybindings.json"))
}

fn get_windows_keybindings() -> Value {
    serde_json::json!({
        "file.new-tab": "Ctrl+N",
        "file.new-window": "Ctrl+Shift+N",
        "file.open-file": "Ctrl+O",
        "file.open-folder": "Ctrl+Shift+O",
        "file.save": "Ctrl+S",
        "file.save-as": "Ctrl+Shift+S",
        "file.close-tab": "Ctrl+W",
        "file.close-window": "Ctrl+Shift+W",
        "file.preferences": "Ctrl+,",
        "edit.undo": "Ctrl+Z",
        "edit.redo": "Ctrl+Shift+Z",
        "edit.cut": "Ctrl+X",
        "edit.copy": "Ctrl+C",
        "edit.paste": "Ctrl+V",
        "edit.select-all": "Ctrl+A",
        "edit.find": "Ctrl+F",
        "edit.replace": "Ctrl+H",
        "edit.find-in-folder": "Ctrl+Shift+F",
        "format.strong": "Ctrl+B",
        "format.emphasis": "Ctrl+I",
        "format.underline": "Ctrl+U",
        "format.inline-code": "Ctrl+`",
        "format.strike": "Ctrl+D",
        "format.hyperlink": "Ctrl+L",
        "format.image": "Ctrl+Shift+I",
        "view.toggle-sidebar": "Ctrl+J",
        "view.toggle-tabbar": "Ctrl+Shift+B",
        "view.source-code-mode": "Ctrl+E",
        "view.command-palette": "Ctrl+Shift+P",
        "view.zoom-in": "Ctrl+=",
        "view.zoom-out": "Ctrl+-",
    })
}

fn get_macos_keybindings() -> Value {
    serde_json::json!({
        "file.new-tab": "Cmd+N",
        "file.new-window": "Cmd+Shift+N",
        "file.open-file": "Cmd+O",
        "file.open-folder": "Cmd+Shift+O",
        "file.save": "Cmd+S",
        "file.save-as": "Cmd+Shift+S",
        "file.close-tab": "Cmd+W",
        "file.close-window": "Cmd+Shift+W",
        "file.preferences": "Cmd+,",
        "edit.undo": "Cmd+Z",
        "edit.redo": "Cmd+Shift+Z",
        "edit.cut": "Cmd+X",
        "edit.copy": "Cmd+C",
        "edit.paste": "Cmd+V",
        "edit.select-all": "Cmd+A",
        "edit.find": "Cmd+F",
        "edit.replace": "Cmd+Alt+F",
        "edit.find-in-folder": "Cmd+Shift+F",
        "format.strong": "Cmd+B",
        "format.emphasis": "Cmd+I",
        "format.underline": "Cmd+U",
        "format.inline-code": "Cmd+`",
        "format.strike": "Cmd+D",
        "format.hyperlink": "Cmd+L",
        "format.image": "Cmd+Shift+I",
        "view.toggle-sidebar": "Cmd+J",
        "view.toggle-tabbar": "Cmd+Shift+B",
        "view.source-code-mode": "Cmd+E",
        "view.command-palette": "Cmd+Shift+P",
        "view.zoom-in": "Cmd+=",
        "view.zoom-out": "Cmd+-",
    })
}

fn get_linux_keybindings() -> Value {
    // Linux keybindings are same as Windows
    get_windows_keybindings()
}
