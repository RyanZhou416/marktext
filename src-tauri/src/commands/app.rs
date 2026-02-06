//! Application commands
//!
//! These commands provide application-level information.

use tauri::AppHandle;

/// Get the application version
#[tauri::command]
pub fn get_app_version() -> Result<String, String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}

/// Get various application paths
#[tauri::command]
pub fn get_app_path(app: AppHandle, name: String) -> Result<String, String> {
    use tauri::Manager;
    
    let path_resolver = app.path();
    
    let path = match name.as_str() {
        "home" => dirs::home_dir(),
        "appData" => path_resolver.app_data_dir().ok(),
        "userData" => path_resolver.app_data_dir().ok(),
        "cache" => path_resolver.app_cache_dir().ok(),
        "temp" => Some(std::env::temp_dir()),
        "exe" => std::env::current_exe().ok(),
        "desktop" => dirs::desktop_dir(),
        "documents" => dirs::document_dir(),
        "downloads" => dirs::download_dir(),
        "music" => dirs::audio_dir(),
        "pictures" => dirs::picture_dir(),
        "videos" => dirs::video_dir(),
        "logs" => path_resolver.app_log_dir().ok(),
        "config" => path_resolver.app_config_dir().ok(),
        "resource" => path_resolver.resource_dir().ok(),
        _ => return Err(format!("Unknown path name: {}", name)),
    };
    
    path.map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| format!("Could not resolve path: {}", name))
}
