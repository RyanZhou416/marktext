//! File operations commands
//!
//! High-level file operations: open/save dialogs, trash, drag-drop support.
//! These replace the Electron main process file handling (menu/actions/file.js).

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MarkdownDocument {
    pub id: Option<String>,
    pub filename: Option<String>,
    pub pathname: Option<String>,
    pub markdown: String,
    #[serde(default)]
    pub encoding: String,
    #[serde(default)]
    pub line_ending: String,
    #[serde(default)]
    pub adjust_line_ending_on_save: bool,
    #[serde(default)]
    pub trim_trailing_newline: i32,
    /// Whether the file had mixed line endings (CRLF + LF)
    #[serde(default)]
    pub is_mixed_line_endings: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SaveResult {
    pub success: bool,
    pub path: Option<String>,
    pub error: Option<String>,
}

/// Open file dialog and return selected file paths
#[tauri::command]
pub async fn open_file_dialog(
    app: tauri::AppHandle,
    i18n: tauri::State<'_, crate::i18n::I18n>,
) -> Result<Vec<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let result = app
        .dialog()
        .file()
        .add_filter(&i18n.t("dialog.markdown"), &["md", "markdown", "mdown", "mkdn", "mkd", "mdwn", "mdtxt", "mdtext", "txt"])
        .add_filter(&i18n.t("dialog.allFiles"), &["*"])
        .blocking_pick_files();

    match result {
        Some(paths) => Ok(paths.iter().map(|p| p.as_path().map(|pp| pp.to_string_lossy().to_string()).unwrap_or_default()).collect()),
        None => Ok(vec![]),
    }
}

/// Open folder dialog and return selected path
#[tauri::command]
pub async fn open_folder_dialog(
    app: tauri::AppHandle,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let result = app
        .dialog()
        .file()
        .blocking_pick_folder();

    match result {
        Some(path) => Ok(path.as_path().map(|p| p.to_string_lossy().to_string())),
        None => Ok(None),
    }
}

/// Save file dialog and return the selected path
#[tauri::command]
pub async fn save_file_dialog(
    app: tauri::AppHandle,
    i18n: tauri::State<'_, crate::i18n::I18n>,
    default_path: Option<String>,
    filename: Option<String>,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let mut builder = app
        .dialog()
        .file()
        .add_filter(&i18n.t("dialog.markdown"), &["md", "markdown", "txt"])
        .add_filter(&i18n.t("dialog.allFiles"), &["*"]);

    if let Some(ref dp) = default_path {
        let p = PathBuf::from(dp);
        if p.is_dir() {
            builder = builder.set_directory(p);
        } else if let Some(parent) = p.parent() {
            builder = builder.set_directory(parent);
        }
    }

    if let Some(ref name) = filename {
        builder = builder.set_file_name(name);
    } else if let Some(ref dp) = default_path {
        let p = Path::new(dp);
        if let Some(name) = p.file_name() {
            builder = builder.set_file_name(name.to_string_lossy());
        }
    }

    let result = builder.blocking_save_file();
    match result {
        Some(path) => Ok(path.as_path().map(|p| p.to_string_lossy().to_string())),
        None => Ok(None),
    }
}

/// Read a markdown file and return its content with metadata
#[tauri::command]
pub async fn read_markdown_file(file_path: String) -> Result<MarkdownDocument, String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    let content = tokio::fs::read_to_string(&file_path)
        .await
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let filename = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    // Detect line ending and mixed line endings
    let has_crlf = content.contains("\r\n");
    // Check for bare LF (not preceded by CR) — strip CRLF first to count bare LFs
    let bare_lf_content = content.replace("\r\n", "");
    let has_lf = bare_lf_content.contains('\n');
    let is_mixed = has_crlf && has_lf;

    let line_ending = if has_crlf { "crlf".to_string() } else { "lf".to_string() };

    // Normalize mixed line endings to the dominant one
    let normalized_content = if is_mixed {
        content.replace("\r\n", "\n") // normalize to LF
    } else {
        content
    };

    Ok(MarkdownDocument {
        id: None,
        filename: Some(filename),
        pathname: Some(file_path),
        markdown: normalized_content,
        encoding: "utf-8".to_string(),
        line_ending: if is_mixed { "lf".to_string() } else { line_ending },
        adjust_line_ending_on_save: false,
        trim_trailing_newline: 2,
        is_mixed_line_endings: is_mixed,
    })
}

/// Save markdown content to a file
#[tauri::command]
pub async fn save_markdown_file(
    file_path: String,
    content: String,
    encoding: Option<String>,
) -> Result<SaveResult, String> {
    let _encoding = encoding.unwrap_or_else(|| "utf-8".to_string());

    match tokio::fs::write(&file_path, &content).await {
        Ok(()) => Ok(SaveResult {
            success: true,
            path: Some(file_path),
            error: None,
        }),
        Err(e) => Ok(SaveResult {
            success: false,
            path: Some(file_path),
            error: Some(e.to_string()),
        }),
    }
}

/// Move file to system trash/recycle bin
#[tauri::command]
pub async fn trash_file(file_path: String) -> Result<bool, String> {
    trash::delete(&file_path).map_err(|e| format!("Failed to trash file: {}", e))?;
    Ok(true)
}

/// Get the recommended title from markdown content (first heading)
#[tauri::command]
pub fn get_title_from_markdown(markdown: String) -> String {
    for line in markdown.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("# ") {
            return trimmed[2..].trim().to_string();
        }
        if trimmed.starts_with("## ") {
            return trimmed[3..].trim().to_string();
        }
    }
    "Untitled".to_string()
}

/// Export dialog for PDF/HTML
#[tauri::command]
pub async fn export_file_dialog(
    app: tauri::AppHandle,
    i18n: tauri::State<'_, crate::i18n::I18n>,
    export_type: String,
    default_path: Option<String>,
    filename: Option<String>,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let filter_name: String = match export_type.as_str() {
        "pdf" => i18n.t("dialog.portableDocFormat"),
        "styledHtml" | "html" => i18n.t("dialog.htmlFormat"),
        _ => i18n.t("dialog.allFiles"),
    };
    let extensions: Vec<&str> = match export_type.as_str() {
        "pdf" => vec!["pdf"],
        "styledHtml" | "html" => vec!["html"],
        _ => vec!["*"],
    };

    let mut builder = app
        .dialog()
        .file()
        .add_filter(&filter_name, &extensions);

    if let Some(ref dp) = default_path {
        let p = PathBuf::from(dp);
        if let Some(parent) = p.parent() {
            if parent.exists() {
                builder = builder.set_directory(parent);
            }
        }
    }

    if let Some(ref name) = filename {
        builder = builder.set_file_name(name);
    }

    let result = builder.blocking_save_file();
    match result {
        Some(path) => Ok(path.as_path().map(|p| p.to_string_lossy().to_string())),
        None => Ok(None),
    }
}
