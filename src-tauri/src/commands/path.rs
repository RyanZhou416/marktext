//! Path utility commands
//!
//! These commands replace the preload path API exposed to the renderer.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf, MAIN_SEPARATOR};

#[derive(Debug, Serialize, Deserialize)]
pub struct ParsedPath {
    pub root: String,
    pub dir: String,
    pub base: String,
    pub ext: String,
    pub name: String,
}

/// Join path segments
#[tauri::command]
pub fn path_join(paths: Vec<String>) -> Result<String, String> {
    if paths.is_empty() {
        return Ok(String::new());
    }
    
    let mut result = PathBuf::from(&paths[0]);
    for path in paths.iter().skip(1) {
        result = result.join(path);
    }
    
    Ok(result.to_string_lossy().to_string())
}

/// Resolve path to absolute
#[tauri::command]
pub fn path_resolve(paths: Vec<String>) -> Result<String, String> {
    if paths.is_empty() {
        return std::env::current_dir()
            .map(|p| p.to_string_lossy().to_string())
            .map_err(|e| format!("Failed to get current directory: {}", e));
    }
    
    let mut result = if Path::new(&paths[0]).is_absolute() {
        PathBuf::from(&paths[0])
    } else {
        std::env::current_dir()
            .map_err(|e| format!("Failed to get current directory: {}", e))?
            .join(&paths[0])
    };
    
    for path in paths.iter().skip(1) {
        if Path::new(path).is_absolute() {
            result = PathBuf::from(path);
        } else {
            result = result.join(path);
        }
    }
    
    // Normalize the path
    let normalized = normalize_path(&result);
    Ok(normalized.to_string_lossy().to_string())
}

/// Get the directory name of a path
#[tauri::command]
pub fn path_dirname(path: String) -> Result<String, String> {
    Path::new(&path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "No parent directory".to_string())
}

/// Get the base name of a path
#[tauri::command]
pub fn path_basename(path: String, ext: Option<String>) -> Result<String, String> {
    let basename = Path::new(&path)
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    
    if let Some(ext) = ext {
        if basename.ends_with(&ext) {
            Ok(basename[..basename.len() - ext.len()].to_string())
        } else {
            Ok(basename)
        }
    } else {
        Ok(basename)
    }
}

/// Get the extension of a path
#[tauri::command]
pub fn path_extname(path: String) -> Result<String, String> {
    Ok(Path::new(&path)
        .extension()
        .map(|s| format!(".{}", s.to_string_lossy()))
        .unwrap_or_default())
}

/// Parse a path into components
#[tauri::command]
pub fn path_parse(path: String) -> Result<ParsedPath, String> {
    let p = Path::new(&path);
    
    let root = p.ancestors()
        .last()
        .map(|a| a.to_string_lossy().to_string())
        .unwrap_or_default();
    
    let dir = p.parent()
        .map(|d| d.to_string_lossy().to_string())
        .unwrap_or_default();
    
    let base = p.file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    
    let ext = p.extension()
        .map(|s| format!(".{}", s.to_string_lossy()))
        .unwrap_or_default();
    
    let name = p.file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    
    Ok(ParsedPath {
        root,
        dir,
        base,
        ext,
        name,
    })
}

/// Normalize a path
#[tauri::command]
pub fn path_normalize(path: String) -> Result<String, String> {
    let normalized = normalize_path(Path::new(&path));
    Ok(normalized.to_string_lossy().to_string())
}

/// Check if a path is absolute
#[tauri::command]
pub fn path_is_absolute(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).is_absolute())
}

/// Get the relative path from one path to another
#[tauri::command]
pub fn path_relative(from: String, to: String) -> Result<String, String> {
    let from_path = normalize_path(Path::new(&from));
    let to_path = normalize_path(Path::new(&to));
    
    // Simple implementation - for complex cases, consider using pathdiff crate
    if let Ok(relative) = to_path.strip_prefix(&from_path) {
        Ok(relative.to_string_lossy().to_string())
    } else {
        // Fall back to returning the absolute path
        Ok(to_path.to_string_lossy().to_string())
    }
}

/// Get the path separator for the current platform
#[tauri::command]
pub fn get_separator() -> Result<String, String> {
    Ok(MAIN_SEPARATOR.to_string())
}

/// Normalize a path by resolving . and .. components
fn normalize_path(path: &Path) -> PathBuf {
    let mut components = Vec::new();
    
    for component in path.components() {
        use std::path::Component;
        match component {
            Component::Prefix(p) => components.push(Component::Prefix(p)),
            Component::RootDir => {
                components.clear();
                components.push(Component::RootDir);
            }
            Component::CurDir => {}
            Component::ParentDir => {
                if let Some(Component::Normal(_)) = components.last() {
                    components.pop();
                } else {
                    components.push(Component::ParentDir);
                }
            }
            Component::Normal(name) => components.push(Component::Normal(name)),
        }
    }
    
    if components.is_empty() {
        PathBuf::from(".")
    } else {
        components.iter().collect()
    }
}
