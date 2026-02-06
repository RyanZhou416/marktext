//! MarkText Tauri Backend
//!
//! This module provides the Rust backend for MarkText when running under Tauri.
//! It replaces the Electron main process with Rust commands.

mod commands;

use tauri::Manager;
/// Run the Tauri application
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            log::info!("MarkText Tauri starting...");
            
            // Log user data path for debugging
            let user_data_path = app.path().app_data_dir()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default();
            log::info!("User data path: {}", user_data_path);
            
            // Get the main window
            #[allow(unused_variables)]
            if let Some(window) = app.get_webview_window("main") {
                log::info!("Main window created");
                
                // Inject Tauri environment info into the webview
                // The renderer's bootstrap.ts will detect __TAURI_ENV__ and use these defaults
                let js = format!(
                    "window.__TAURI_ENV__ = {{ userDataPath: '{}', debug: {}, windowId: 1, type: 'editor', theme: 'light', codeFontFamily: 'DejaVu Sans Mono', codeFontSize: '14', hideScrollbar: false, titleBarStyle: 'custom' }};",
                    user_data_path.replace('\\', "\\\\").replace('\'', "\\'"),
                    if cfg!(debug_assertions) { "true" } else { "false" }
                );
                
                if let Err(e) = window.eval(&js) {
                    log::error!("Failed to inject Tauri env: {}", e);
                }
                
                #[cfg(debug_assertions)]
                {
                    window.open_devtools();
                }
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // File system commands
            commands::fs::read_file,
            commands::fs::read_file_binary,
            commands::fs::write_file,
            commands::fs::read_dir,
            commands::fs::stat,
            commands::fs::exists,
            commands::fs::mkdir,
            commands::fs::remove,
            commands::fs::rename,
            commands::fs::copy_file,
            // Path commands
            commands::path::path_join,
            commands::path::path_resolve,
            commands::path::path_dirname,
            commands::path::path_basename,
            commands::path::path_extname,
            commands::path::path_parse,
            commands::path::path_normalize,
            commands::path::path_is_absolute,
            commands::path::path_relative,
            commands::path::get_separator,
            // System commands
            commands::system::get_homedir,
            commands::system::get_tmpdir,
            commands::system::get_platform,
            commands::system::get_arch,
            commands::system::get_hostname,
            // Font commands
            commands::fonts::get_available_fonts,
            // App commands
            commands::app::get_app_version,
            commands::app::get_app_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
