//! System information commands
//!
//! These commands replace the preload os API exposed to the renderer.

use std::env;

/// Get the user's home directory
#[tauri::command]
pub fn get_homedir() -> Result<String, String> {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Could not determine home directory".to_string())
}

/// Get the system's temporary directory
#[tauri::command]
pub fn get_tmpdir() -> Result<String, String> {
    Ok(env::temp_dir().to_string_lossy().to_string())
}

/// Get the current platform
#[tauri::command]
pub fn get_platform() -> Result<String, String> {
    Ok(env::consts::OS.to_string())
}

/// Get the CPU architecture
#[tauri::command]
pub fn get_arch() -> Result<String, String> {
    Ok(env::consts::ARCH.to_string())
}

/// Get the hostname
#[tauri::command]
pub fn get_hostname() -> Result<String, String> {
    hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .map_err(|e| format!("Failed to get hostname: {}", e))
}
