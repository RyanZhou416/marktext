//! File system commands
//!
//! These commands replace the preload fs API exposed to the renderer.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::time::SystemTime;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileStat {
    pub is_file: bool,
    pub is_directory: bool,
    pub is_symlink: bool,
    pub size: u64,
    pub modified: Option<u64>,
    pub created: Option<u64>,
    pub accessed: Option<u64>,
    pub readonly: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_file: bool,
    pub is_directory: bool,
    pub is_symlink: bool,
}

fn system_time_to_millis(time: std::io::Result<SystemTime>) -> Option<u64> {
    time.ok().and_then(|t| {
        t.duration_since(SystemTime::UNIX_EPOCH)
            .ok()
            .map(|d| d.as_millis() as u64)
    })
}

/// Read a file as UTF-8 text
#[tauri::command]
pub async fn read_file(path: String, encoding: Option<String>) -> Result<String, String> {
    let encoding = encoding.unwrap_or_else(|| "utf-8".to_string());
    
    let content = fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    
    // For now, we only support UTF-8
    // TODO: Add support for other encodings using encoding_rs
    if encoding.to_lowercase() != "utf-8" && encoding.to_lowercase() != "utf8" {
        log::warn!("Encoding {} not fully supported, treating as UTF-8", encoding);
    }
    
    String::from_utf8(content)
        .map_err(|e| format!("Failed to decode file as UTF-8: {}", e))
}

/// Read a file as binary (base64 encoded)
#[tauri::command]
pub async fn read_file_binary(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))
}

/// Write content to a file
#[tauri::command]
pub async fn write_file(path: String, contents: String, encoding: Option<String>) -> Result<(), String> {
    let _encoding = encoding.unwrap_or_else(|| "utf-8".to_string());
    
    // Ensure parent directory exists
    if let Some(parent) = Path::new(&path).parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directory: {}", e))?;
        }
    }
    
    fs::write(&path, contents.as_bytes())
        .map_err(|e| format!("Failed to write file: {}", e))
}

/// Read directory contents
#[tauri::command]
pub async fn read_dir(path: String) -> Result<Vec<DirEntry>, String> {
    let entries = fs::read_dir(&path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;
    
    let mut result = Vec::new();
    
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let metadata = entry.metadata().map_err(|e| format!("Failed to get metadata: {}", e))?;
        let file_type = entry.file_type().map_err(|e| format!("Failed to get file type: {}", e))?;
        
        result.push(DirEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            is_file: metadata.is_file(),
            is_directory: metadata.is_dir(),
            is_symlink: file_type.is_symlink(),
        });
    }
    
    Ok(result)
}

/// Get file/directory statistics
#[tauri::command]
pub async fn stat(path: String) -> Result<FileStat, String> {
    let metadata = fs::metadata(&path)
        .map_err(|e| format!("Failed to get file stats: {}", e))?;
    
    Ok(FileStat {
        is_file: metadata.is_file(),
        is_directory: metadata.is_dir(),
        is_symlink: metadata.file_type().is_symlink(),
        size: metadata.len(),
        modified: system_time_to_millis(metadata.modified()),
        created: system_time_to_millis(metadata.created()),
        accessed: system_time_to_millis(metadata.accessed()),
        readonly: metadata.permissions().readonly(),
    })
}

/// Check if a path exists
#[tauri::command]
pub async fn exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}

/// Create a directory (with recursive option)
#[tauri::command]
pub async fn mkdir(path: String, recursive: Option<bool>) -> Result<(), String> {
    if recursive.unwrap_or(false) {
        fs::create_dir_all(&path)
            .map_err(|e| format!("Failed to create directory: {}", e))
    } else {
        fs::create_dir(&path)
            .map_err(|e| format!("Failed to create directory: {}", e))
    }
}

/// Remove a file or directory
#[tauri::command]
pub async fn remove(path: String, recursive: Option<bool>) -> Result<(), String> {
    let path = Path::new(&path);
    
    if path.is_dir() {
        if recursive.unwrap_or(false) {
            fs::remove_dir_all(path)
                .map_err(|e| format!("Failed to remove directory: {}", e))
        } else {
            fs::remove_dir(path)
                .map_err(|e| format!("Failed to remove directory: {}", e))
        }
    } else {
        fs::remove_file(path)
            .map_err(|e| format!("Failed to remove file: {}", e))
    }
}

/// Rename/move a file or directory
#[tauri::command]
pub async fn rename(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(&old_path, &new_path)
        .map_err(|e| format!("Failed to rename: {}", e))
}

/// Copy a file
#[tauri::command]
pub async fn copy_file(source: String, dest: String) -> Result<u64, String> {
    fs::copy(&source, &dest)
        .map_err(|e| format!("Failed to copy file: {}", e))
}
