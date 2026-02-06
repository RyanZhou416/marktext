//! Preferences and data center commands
//!
//! Manages user preferences (preference.json) and user data (user-data.json).
//! Replaces electron-store and src/main/preferences/ + src/main/dataCenter/.

use serde_json::Value;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

/// Application state for preferences
pub struct PreferencesState {
    pub preferences: Mutex<Value>,
    pub user_data: Mutex<Value>,
    pub preferences_path: Mutex<PathBuf>,
    pub user_data_path: Mutex<PathBuf>,
    pub recent_documents_path: Mutex<PathBuf>,
}

impl PreferencesState {
    pub fn new(app_data_dir: &std::path::Path) -> Self {
        // Ensure directory exists
        let _ = std::fs::create_dir_all(app_data_dir);

        let prefs_path = app_data_dir.join("preference.json");
        let user_data_path = app_data_dir.join("user-data.json");
        let recent_path = app_data_dir.join("recently-used-documents.json");

        // Load or create preferences
        let prefs = load_json_file(&prefs_path).unwrap_or_else(|| serde_json::json!({}));
        let user_data = load_json_file(&user_data_path).unwrap_or_else(|| serde_json::json!({}));

        Self {
            preferences: Mutex::new(prefs),
            user_data: Mutex::new(user_data),
            preferences_path: Mutex::new(prefs_path),
            user_data_path: Mutex::new(user_data_path),
            recent_documents_path: Mutex::new(recent_path),
        }
    }
}

fn load_json_file(path: &std::path::Path) -> Option<Value> {
    let content = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&content).ok()
}

fn save_json_file(path: &std::path::Path, value: &Value) -> Result<(), String> {
    let content = serde_json::to_string_pretty(value)
        .map_err(|e| format!("Failed to serialize: {}", e))?;
    std::fs::write(path, content)
        .map_err(|e| format!("Failed to write file: {}", e))
}

/// Get all preferences merged with defaults
#[tauri::command]
pub fn get_preferences(
    state: tauri::State<'_, PreferencesState>,
    app: tauri::AppHandle,
) -> Result<Value, String> {
    let prefs = state.preferences.lock().map_err(|e| e.to_string())?;

    // Load default preferences from bundled static/preference.json
    let default_prefs = load_default_preferences(&app);

    // Merge: defaults with user overrides
    let mut merged = default_prefs;
    if let Value::Object(ref user) = *prefs {
        if let Value::Object(ref mut defaults) = merged {
            for (key, value) in user {
                defaults.insert(key.clone(), value.clone());
            }
        }
    }

    Ok(merged)
}

/// Load default preferences from the bundled preference.json
fn load_default_preferences(app: &tauri::AppHandle) -> Value {
    // Try to read from resource directory
    if let Ok(resource_dir) = app.path().resource_dir() {
        let default_path = resource_dir.join("static").join("preference.json");
        if let Some(val) = load_json_file(&default_path) {
            return val;
        }
        // Also try without 'static' prefix
        let alt_path = resource_dir.join("preference.json");
        if let Some(val) = load_json_file(&alt_path) {
            return val;
        }
    }
    // Fallback: minimal defaults
    serde_json::json!({
        "autoSave": false,
        "autoSaveDelay": 5000,
        "theme": "light",
        "sourceCode": false,
        "zoom": 1.0,
        "defaultEncoding": "utf-8",
        "endOfLine": "default",
        "codeFontFamily": "DejaVu Sans Mono",
        "codeFontSize": 14,
        "hideScrollbar": false,
        "tabSize": 4,
        "trimTrailingNewline": 2,
        "sideBarVisibility": false,
        "tabBarVisibility": false
    })
}

/// Set a single preference
#[tauri::command]
pub fn set_preference(
    state: tauri::State<'_, PreferencesState>,
    key: String,
    value: Value,
) -> Result<(), String> {
    let mut prefs = state.preferences.lock().map_err(|e| e.to_string())?;
    if let Value::Object(ref mut map) = *prefs {
        map.insert(key, value);
    }
    let path = state.preferences_path.lock().map_err(|e| e.to_string())?;
    save_json_file(&path, &prefs)
}

/// Set multiple preferences at once
#[tauri::command]
pub fn set_preferences(
    state: tauri::State<'_, PreferencesState>,
    preferences: Value,
) -> Result<(), String> {
    let mut prefs = state.preferences.lock().map_err(|e| e.to_string())?;
    if let (Value::Object(ref mut current), Value::Object(ref new_prefs)) = (&mut *prefs, &preferences) {
        for (key, value) in new_prefs {
            current.insert(key.clone(), value.clone());
        }
    }
    let path = state.preferences_path.lock().map_err(|e| e.to_string())?;
    save_json_file(&path, &prefs)
}

/// Get all user data
#[tauri::command]
pub fn get_user_data(
    state: tauri::State<'_, PreferencesState>,
) -> Result<Value, String> {
    let data = state.user_data.lock().map_err(|e| e.to_string())?;
    Ok(data.clone())
}

/// Set user data field
#[tauri::command]
pub fn set_user_data(
    state: tauri::State<'_, PreferencesState>,
    key: String,
    value: Value,
) -> Result<(), String> {
    let mut data = state.user_data.lock().map_err(|e| e.to_string())?;
    if let Value::Object(ref mut map) = *data {
        map.insert(key, value);
    }
    let path = state.user_data_path.lock().map_err(|e| e.to_string())?;
    save_json_file(&path, &data)
}

/// Get recently used documents
#[tauri::command]
pub fn get_recent_documents(
    state: tauri::State<'_, PreferencesState>,
) -> Result<Vec<String>, String> {
    let path = state.recent_documents_path.lock().map_err(|e| e.to_string())?;
    match load_json_file(&path) {
        Some(Value::Array(arr)) => {
            Ok(arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect())
        }
        _ => Ok(vec![]),
    }
}

/// Add a document to recently used
#[tauri::command]
pub fn add_recent_document(
    state: tauri::State<'_, PreferencesState>,
    file_path: String,
) -> Result<(), String> {
    let path = state.recent_documents_path.lock().map_err(|e| e.to_string())?;
    let mut docs = match load_json_file(&path) {
        Some(Value::Array(arr)) => arr
            .iter()
            .filter_map(|v| v.as_str().map(|s| s.to_string()))
            .collect::<Vec<_>>(),
        _ => vec![],
    };

    // Remove existing entry if present
    docs.retain(|p| p != &file_path);
    // Add to front
    docs.insert(0, file_path);
    // Keep max 12 entries
    docs.truncate(12);

    let json_arr: Value = docs.into_iter().map(Value::String).collect::<Vec<_>>().into();
    save_json_file(&path, &json_arr)
}

/// Clear recently used documents
#[tauri::command]
pub fn clear_recent_documents(
    state: tauri::State<'_, PreferencesState>,
) -> Result<(), String> {
    let path = state.recent_documents_path.lock().map_err(|e| e.to_string())?;
    save_json_file(&path, &Value::Array(vec![]))
}
