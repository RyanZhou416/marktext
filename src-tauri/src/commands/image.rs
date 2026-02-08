//! Image management commands
//!
//! Image insertion dialog, path autocomplete, and folder management.
//! Replaces src/main/dataCenter image handling and imagePathAutoComplement.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

const IMAGE_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "ico"];

#[derive(Debug, Serialize, Deserialize)]
pub struct ImageInfo {
    pub filename: String,
    pub path: String,
    pub size: u64,
}

/// Pick image file dialog
#[tauri::command]
pub async fn pick_image_dialog(app: tauri::AppHandle, i18n: tauri::State<'_, crate::i18n::I18n>) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let result = app
        .dialog()
        .file()
        .add_filter(&i18n.t("dialog.images"), &["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"])
        .blocking_pick_file();

    match result {
        Some(path) => Ok(path.as_path().map(|p| p.to_string_lossy().to_string())),
        None => Ok(None),
    }
}

/// Get image auto-completions by scanning a directory
#[tauri::command]
pub async fn get_image_completions(
    directory: String,
    query: Option<String>,
) -> Result<Vec<ImageInfo>, String> {
    let dir_path = Path::new(&directory);
    if !dir_path.is_dir() {
        return Ok(vec![]);
    }

    let query_lower = query
        .as_deref()
        .unwrap_or("")
        .to_lowercase();

    let mut results = Vec::new();

    let entries = std::fs::read_dir(dir_path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        if !IMAGE_EXTENSIONS.contains(&ext.as_str()) {
            continue;
        }

        let filename = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        // Filter by query if provided
        if !query_lower.is_empty() && !filename.to_lowercase().contains(&query_lower) {
            continue;
        }

        let size = entry.metadata().map(|m| m.len()).unwrap_or(0);

        results.push(ImageInfo {
            filename,
            path: path.to_string_lossy().to_string(),
            size,
        });
    }

    // Sort by filename
    results.sort_by(|a, b| a.filename.cmp(&b.filename));

    // Limit results
    results.truncate(50);

    Ok(results)
}

/// Copy an image to the target directory
#[tauri::command]
pub async fn copy_image_to_folder(
    source: String,
    dest_dir: String,
) -> Result<String, String> {
    let src = Path::new(&source);
    if !src.exists() {
        return Err(format!("Source file not found: {}", source));
    }

    let dest_path = PathBuf::from(&dest_dir);
    if !dest_path.exists() {
        tokio::fs::create_dir_all(&dest_path)
            .await
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    let filename = src
        .file_name()
        .ok_or("Invalid source filename")?;

    let dest_file = dest_path.join(filename);

    // If file already exists, add a number suffix
    let final_dest = if dest_file.exists() {
        let stem = src.file_stem().and_then(|s| s.to_str()).unwrap_or("image");
        let ext = src.extension().and_then(|e| e.to_str()).unwrap_or("png");
        let mut counter = 1;
        loop {
            let new_name = format!("{}-{}.{}", stem, counter, ext);
            let new_path = dest_path.join(&new_name);
            if !new_path.exists() {
                break new_path;
            }
            counter += 1;
        }
    } else {
        dest_file
    };

    tokio::fs::copy(&source, &final_dest)
        .await
        .map_err(|e| format!("Failed to copy image: {}", e))?;

    Ok(final_dest.to_string_lossy().to_string())
}
