//! MarkText Tauri Backend
//!
//! This module provides the Rust backend for MarkText when running under Tauri.
//! It replaces the Electron main process with Rust commands.

mod commands;
mod i18n;
mod menu;
mod watcher;

use commands::preferences::PreferencesState;
use watcher::WatcherState;
use tauri::{Emitter, Manager};

/// Check if we're in portable mode (marktext-user-data dir exists next to executable)
fn check_portable_mode() -> Option<std::path::PathBuf> {
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let portable_dir = exe_dir.join("marktext-user-data");
            if portable_dir.is_dir() {
                log::info!("Portable mode detected: {}", portable_dir.display());
                return Some(portable_dir);
            }
        }
    }
    None
}

/// Parse command-line arguments
fn parse_cli_args() -> CliArgs {
    let args: Vec<String> = std::env::args().collect();
    let mut cli = CliArgs::default();

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--new-window" | "-n" => cli.new_window = true,
            "--debug" => cli.debug = true,
            "--safe" => cli.safe_mode = true,
            "--user-data-dir" => {
                if i + 1 < args.len() {
                    i += 1;
                    cli.user_data_dir = Some(args[i].clone());
                }
            }
            arg if arg.starts_with("--editor-engine=") => {
                let value = arg.trim_start_matches("--editor-engine=");
                if value == "muya" || value == "milkdown" {
                    cli.editor_engine = Some(value.to_string());
                }
            }
            arg if !arg.starts_with('-') => {
                // Assume it's a file path
                cli.files.push(arg.to_string());
            }
            _ => {}
        }
        i += 1;
    }

    cli
}

#[derive(Debug, Default)]
struct CliArgs {
    new_window: bool,
    debug: bool,
    safe_mode: bool,
    user_data_dir: Option<String>,
    editor_engine: Option<String>,
    files: Vec<String>,
}

/// Run the Tauri application
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    let cli_args = parse_cli_args();
    let portable_dir = check_portable_mode();

    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::SIZE
                        | tauri_plugin_window_state::StateFlags::POSITION
                        | tauri_plugin_window_state::StateFlags::MAXIMIZED
                        | tauri_plugin_window_state::StateFlags::FULLSCREEN,
                )
                .build(),
        )
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            // When a second instance is launched, bring the existing window to focus
            log::info!("Single instance: second instance detected with args: {:?}", argv);
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
            // If files were passed, emit event to open them
            let files: Vec<String> = argv.iter()
                .skip(1)
                .filter(|a| !a.starts_with('-'))
                .cloned()
                .collect();
            if !files.is_empty() {
                let _ = app.emit("open-files", files);
            }
        }));

    #[cfg(feature = "updater")]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder.setup(move |app| {
            log::info!("MarkText Tauri starting...");

            // Determine user data directory
            let app_data_dir = if let Some(ref dir) = cli_args.user_data_dir {
                std::path::PathBuf::from(dir)
            } else if let Some(ref portable) = portable_dir {
                portable.clone()
            } else {
                app.path().app_data_dir()
                    .unwrap_or_else(|_| std::path::PathBuf::from("."))
            };

            let user_data_path = app_data_dir.to_string_lossy().to_string();
            log::info!("User data path: {}", user_data_path);

            // Ensure data directories exist
            let _ = std::fs::create_dir_all(&app_data_dir);
            let _ = std::fs::create_dir_all(app_data_dir.join("images"));

            // Manage preferences state
            let prefs = PreferencesState::new(&app_data_dir);

            // Read language preference for i18n
            let locale = {
                let p = prefs.preferences.lock().unwrap();
                p.get("language")
                    .and_then(|v| v.as_str())
                    .unwrap_or("en")
                    .to_string()
            };
            log::info!("Locale: {}", locale);

            app.manage(prefs);

            // Create and manage i18n state
            let i18n_state = i18n::I18n::new(&locale);
            app.manage(i18n_state);

            // Initialize and manage watcher state
            let watcher_state = WatcherState::new();
            if let Err(e) = watcher_state.init(app.handle().clone()) {
                log::error!("Failed to initialize file watcher: {}", e);
            }
            app.manage(watcher_state);

            // Setup application menu (with i18n)
            if let Err(e) = menu::setup_menu(app) {
                log::error!("Failed to setup menu: {}", e);
            }

            // Create main window manually (not via tauri.conf.json) so we can
            // use initialization_script to guarantee __TAURI_ENV__ is available
            // before ANY page JavaScript executes.
            {
                log::info!("Creating main window...");

                // Load preferences for initial state
                let prefs_state = app.state::<PreferencesState>();
                let theme = {
                    let prefs = prefs_state.preferences.lock().unwrap();
                    prefs.get("theme")
                        .and_then(|v| v.as_str())
                        .unwrap_or("light")
                        .to_string()
                };
                let code_font_family = {
                    let prefs = prefs_state.preferences.lock().unwrap();
                    prefs.get("codeFontFamily")
                        .and_then(|v| v.as_str())
                        .unwrap_or("DejaVu Sans Mono")
                        .to_string()
                };
                let code_font_size = {
                    let prefs = prefs_state.preferences.lock().unwrap();
                    prefs.get("codeFontSize")
                        .and_then(|v| v.as_u64())
                        .unwrap_or(14)
                        .to_string()
                };
                let title_bar_style = {
                    let prefs = prefs_state.preferences.lock().unwrap();
                    prefs.get("titleBarStyle")
                        .and_then(|v| v.as_str())
                        .unwrap_or("custom")
                        .to_string()
                };
                let use_custom_titlebar = title_bar_style == "custom";

                // Editor engine: CLI overrides preference
                let editor_engine = cli_args.editor_engine.clone()
                    .or_else(|| {
                        let prefs = prefs_state.preferences.lock().unwrap();
                        prefs.get("editorEngine")
                            .and_then(|v| v.as_str())
                            .map(String::from)
                    })
                    .unwrap_or_else(|| "muya".to_string());

                // Build file path list from CLI
                let files_json = if cli_args.files.is_empty() {
                    String::new()
                } else {
                    let paths: Vec<String> = cli_args.files.iter()
                        .map(|f| format!("'{}'", f.replace('\\', "\\\\").replace('\'', "\\'")))
                        .collect();
                    format!(", files: [{}]", paths.join(", "))
                };

                // Inject Tauri environment info into the webview
                let is_debug = cli_args.debug || cfg!(debug_assertions);
                let js = format!(
                    "window.__TAURI_ENV__ = {{ userDataPath: '{}', debug: {}, windowId: 1, type: 'editor', language: '{}', theme: '{}', codeFontFamily: '{}', codeFontSize: '{}', hideScrollbar: false, titleBarStyle: '{}', portable: {}, safeMode: {}, editorEngine: '{}'{} }};",
                    user_data_path.replace('\\', "\\\\").replace('\'', "\\'"),
                    if is_debug { "true" } else { "false" },
                    locale,
                    theme,
                    code_font_family,
                    code_font_size,
                    title_bar_style,
                    if portable_dir.is_some() { "true" } else { "false" },
                    if cli_args.safe_mode { "true" } else { "false" },
                    editor_engine,
                    files_json,
                );

                // Dev mode (tauri dev): load from dev server; Release: load from built assets
                let webview_url = if tauri::is_dev() {
                    match &app.config().build.dev_url {
                        Some(u) => tauri::WebviewUrl::External(u.clone()),
                        None => tauri::WebviewUrl::App("index.html".into()),
                    }
                } else {
                    tauri::WebviewUrl::App("index.html".into())
                };

                let win_builder = tauri::WebviewWindowBuilder::new(
                    app,
                    "main",
                    webview_url,
                )
                .title("MarkText")
                .inner_size(1280.0, 800.0)
                .min_inner_size(600.0, 400.0)
                .resizable(true)
                .decorations(!use_custom_titlebar)
                .visible(false) // Start hidden to avoid flash; frontend calls show_main_window when ready
                .initialization_script(&js);

                let window = win_builder.build()
                .expect("Failed to create main window");


                log::info!("Main window created (titleBarStyle={})", title_bar_style);

                // When using custom title bar, hide the native menu bar.
                // MarkText uses a custom title bar with a hamburger button that shows the menu as a popup.
                if use_custom_titlebar {
                    let _ = window.hide_menu();
                }

                // Intercept window close to check for unsaved files first.
                // The frontend handles the unsaved-files dialog and calls
                // close_window (which uses destroy()) when ready.
                {
                    let handle = app.handle().clone();
                    window.on_window_event(move |event| {
                        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                            api.prevent_close();
                            let _ = handle.emit("mt::ask-for-close", ());
                        }
                    });
                }

                #[cfg(feature = "devtools")]
                window.open_devtools();

                // Fallback: if frontend doesn't call show_main_window within 8s (e.g. JS error),
                // show the window anyway so user sees something instead of a hidden process.
                {
                    let handle = app.handle().clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_secs(8));
                        if let Some(win) = handle.get_webview_window("main") {
                            let _ = win.show();
                        }
                    });
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // File system commands (basic)
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
            // File operations (high-level)
            commands::file_ops::open_file_dialog,
            commands::file_ops::open_folder_dialog,
            commands::file_ops::save_file_dialog,
            commands::file_ops::read_markdown_file,
            commands::file_ops::save_markdown_file,
            commands::file_ops::trash_file,
            commands::file_ops::get_title_from_markdown,
            commands::file_ops::export_file_dialog,
            // Preferences
            commands::preferences::get_preferences,
            commands::preferences::set_preference,
            commands::preferences::set_preferences,
            commands::preferences::get_user_data,
            commands::preferences::set_user_data,
            commands::preferences::get_recent_documents,
            commands::preferences::add_recent_document,
            commands::preferences::clear_recent_documents,
            // Window management
            commands::window::create_editor_window,
            commands::window::create_settings_window,
            menu::show_app_menu,
            menu::rebuild_menu,
            commands::window::close_window_confirm,
            commands::window::show_main_window,
            commands::window::show_settings_window,
            commands::window::minimize_window,
            commands::window::maximize_window,
            commands::window::close_window,
            commands::window::set_fullscreen,
            commands::window::set_always_on_top,
            commands::window::get_window_state,
            commands::window::set_title_bar_style,
            // Keybindings
            commands::keybindings::get_default_keybindings,
            commands::keybindings::get_user_keybindings,
            commands::keybindings::save_user_keybindings,
            commands::keybindings::get_keybindings,
            // Export
            commands::export::check_pandoc,
            commands::export::get_pandoc_version,
            commands::export::import_with_pandoc,
            commands::export::export_html,
            commands::export::markdown_to_html,
            // Image
            commands::image::pick_image_dialog,
            commands::image::get_image_completions,
            commands::image::copy_image_to_folder,
            // Spellcheck
            commands::spellcheck::get_custom_dictionary,
            commands::spellcheck::add_to_dictionary,
            commands::spellcheck::remove_from_dictionary,
            commands::spellcheck::get_spellchecker_enabled,
            // Context menu
            commands::context_menu::get_editor_context_menu,
            commands::context_menu::get_sidebar_context_menu,
            commands::context_menu::get_tab_context_menu,
            // File watcher
            watcher::watch_file,
            watcher::watch_directory,
            watcher::unwatch,
            watcher::unwatch_all,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
