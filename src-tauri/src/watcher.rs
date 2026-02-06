//! File system watcher
//!
//! Watches files and directories for changes using the `notify` crate.
//! Replaces chokidar-based watcher from src/main/filesystem/watcher.ts.

use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::Emitter;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FsChangeEvent {
    pub event_type: String, // "change", "add", "unlink", "addDir", "unlinkDir"
    pub path: String,
}

/// Watcher state managed by Tauri
pub struct WatcherState {
    watcher: Mutex<Option<RecommendedWatcher>>,
    watched_paths: Mutex<HashMap<String, WatchType>>,
    #[allow(dead_code)]
    last_events: Mutex<HashMap<String, Instant>>,
}

#[derive(Debug, Clone)]
enum WatchType {
    File,
    Directory,
}

impl WatcherState {
    pub fn new() -> Self {
        Self {
            watcher: Mutex::new(None),
            watched_paths: Mutex::new(HashMap::new()),
            last_events: Mutex::new(HashMap::new()),
        }
    }

    pub fn init(&self, app_handle: tauri::AppHandle) -> Result<(), String> {
        let debounce_map = Arc::new(Mutex::new(HashMap::<String, Instant>::new()));
        let debounce_clone = debounce_map.clone();

        let watcher = RecommendedWatcher::new(
            move |res: Result<Event, notify::Error>| {
                match res {
                    Ok(event) => {
                        let event_type = match event.kind {
                            EventKind::Create(_) => "add",
                            EventKind::Modify(_) => "change",
                            EventKind::Remove(_) => "unlink",
                            _ => return,
                        };

                        for path in &event.paths {
                            let path_str = path.to_string_lossy().to_string();

                            // Debounce: ignore events within 100ms
                            {
                                let mut events = debounce_clone.lock().unwrap();
                                let now = Instant::now();
                                if let Some(last) = events.get(&path_str) {
                                    if now.duration_since(*last) < Duration::from_millis(100) {
                                        continue;
                                    }
                                }
                                events.insert(path_str.clone(), now);
                            }

                            let fs_event = FsChangeEvent {
                                event_type: event_type.to_string(),
                                path: path_str,
                            };

                            let _ = app_handle.emit("fs-change", &fs_event);
                        }
                    }
                    Err(e) => {
                        log::error!("Watcher error: {}", e);
                    }
                }
            },
            Config::default()
                .with_poll_interval(Duration::from_secs(2)),
        )
        .map_err(|e| format!("Failed to create watcher: {}", e))?;

        *self.watcher.lock().map_err(|e| e.to_string())? = Some(watcher);

        Ok(())
    }
}

/// Watch a file for changes
#[tauri::command]
pub fn watch_file(
    state: tauri::State<'_, WatcherState>,
    file_path: String,
) -> Result<(), String> {
    let path = PathBuf::from(&file_path);
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    let mut watcher_guard = state.watcher.lock().map_err(|e| e.to_string())?;
    if let Some(ref mut watcher) = *watcher_guard {
        watcher
            .watch(&path, RecursiveMode::NonRecursive)
            .map_err(|e| format!("Failed to watch: {}", e))?;

        state
            .watched_paths
            .lock()
            .map_err(|e| e.to_string())?
            .insert(file_path, WatchType::File);
    }
    Ok(())
}

/// Watch a directory for changes
#[tauri::command]
pub fn watch_directory(
    state: tauri::State<'_, WatcherState>,
    dir_path: String,
) -> Result<(), String> {
    let path = PathBuf::from(&dir_path);
    if !path.is_dir() {
        return Err(format!("Directory not found: {}", dir_path));
    }

    let mut watcher_guard = state.watcher.lock().map_err(|e| e.to_string())?;
    if let Some(ref mut watcher) = *watcher_guard {
        watcher
            .watch(&path, RecursiveMode::Recursive)
            .map_err(|e| format!("Failed to watch: {}", e))?;

        state
            .watched_paths
            .lock()
            .map_err(|e| e.to_string())?
            .insert(dir_path, WatchType::Directory);
    }
    Ok(())
}

/// Stop watching a file or directory
#[tauri::command]
pub fn unwatch(
    state: tauri::State<'_, WatcherState>,
    watch_path: String,
) -> Result<(), String> {
    let path = PathBuf::from(&watch_path);

    let mut watcher_guard = state.watcher.lock().map_err(|e| e.to_string())?;
    if let Some(ref mut watcher) = *watcher_guard {
        let _ = watcher.unwatch(&path);
    }

    state
        .watched_paths
        .lock()
        .map_err(|e| e.to_string())?
        .remove(&watch_path);

    Ok(())
}

/// Stop watching all files and directories
#[tauri::command]
pub fn unwatch_all(
    state: tauri::State<'_, WatcherState>,
) -> Result<(), String> {
    let mut watcher_guard = state.watcher.lock().map_err(|e| e.to_string())?;
    let mut paths = state.watched_paths.lock().map_err(|e| e.to_string())?;

    if let Some(ref mut watcher) = *watcher_guard {
        for (path_str, _) in paths.iter() {
            let path = PathBuf::from(path_str);
            let _ = watcher.unwatch(&path);
        }
    }

    paths.clear();
    Ok(())
}
