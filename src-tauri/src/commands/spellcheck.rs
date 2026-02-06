//! Spellchecker commands
//!
//! Manages custom dictionary and spellchecker settings.
//! The actual spellchecking is done by the WebView's built-in spellchecker.

use std::path::PathBuf;
use tauri::Manager;

/// Get the custom dictionary file path
fn get_custom_dict_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    Ok(dir.join("custom-dictionary.txt"))
}

/// Get custom dictionary words
#[tauri::command]
pub fn get_custom_dictionary(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let path = get_custom_dict_path(&app)?;
    if !path.exists() {
        return Ok(vec![]);
    }
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read dictionary: {}", e))?;
    Ok(content
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|l| l.trim().to_string())
        .collect())
}

/// Add a word to custom dictionary
#[tauri::command]
pub fn add_to_dictionary(app: tauri::AppHandle, word: String) -> Result<(), String> {
    let path = get_custom_dict_path(&app)?;
    let mut words = get_custom_dictionary(app)?;
    if !words.contains(&word) {
        words.push(word);
        let content = words.join("\n") + "\n";
        std::fs::write(&path, content)
            .map_err(|e| format!("Failed to write dictionary: {}", e))?;
    }
    Ok(())
}

/// Remove a word from custom dictionary
#[tauri::command]
pub fn remove_from_dictionary(app: tauri::AppHandle, word: String) -> Result<(), String> {
    let path = get_custom_dict_path(&app)?;
    let words = get_custom_dictionary(app)?;
    let filtered: Vec<_> = words.into_iter().filter(|w| w != &word).collect();
    let content = filtered.join("\n") + "\n";
    std::fs::write(&path, content)
        .map_err(|e| format!("Failed to write dictionary: {}", e))
}

/// Get spellchecker enabled state from preferences
#[tauri::command]
pub fn get_spellchecker_enabled(
    state: tauri::State<'_, crate::commands::preferences::PreferencesState>,
) -> Result<bool, String> {
    let prefs = state.preferences.lock().map_err(|e| e.to_string())?;
    Ok(prefs.get("spellcheckerEnabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(false))
}
