//! Export and print commands
//!
//! Handles PDF/HTML export and Pandoc integration.
//! Replaces export logic from src/main/menu/actions/file.js.

use std::path::Path;
use std::process::Command;

/// Check if pandoc is installed and available
#[tauri::command]
pub fn check_pandoc() -> Result<bool, String> {
    match Command::new("pandoc").arg("--version").output() {
        Ok(output) => Ok(output.status.success()),
        Err(_) => Ok(false),
    }
}

/// Get pandoc version string
#[tauri::command]
pub fn get_pandoc_version() -> Result<Option<String>, String> {
    match Command::new("pandoc").arg("--version").output() {
        Ok(output) => {
            if output.status.success() {
                let version = String::from_utf8_lossy(&output.stdout);
                let first_line = version.lines().next().unwrap_or("").to_string();
                Ok(Some(first_line))
            } else {
                Ok(None)
            }
        }
        Err(_) => Ok(None),
    }
}

/// Import a file using pandoc (convert to markdown)
#[tauri::command]
pub async fn import_with_pandoc(file_path: String) -> Result<String, String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    let output = Command::new("pandoc")
        .arg(&file_path)
        .arg("-t")
        .arg("gfm")
        .arg("--wrap=none")
        .output()
        .map_err(|e| format!("Failed to run pandoc: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Pandoc conversion failed: {}", stderr))
    }
}

/// Save HTML content to file (for HTML export)
#[tauri::command]
pub async fn export_html(file_path: String, content: String) -> Result<(), String> {
    tokio::fs::write(&file_path, &content)
        .await
        .map_err(|e| format!("Failed to write HTML: {}", e))
}

/// Convert markdown to styled HTML for export
#[tauri::command]
pub fn markdown_to_html(markdown: String, title: String) -> String {
    // Basic HTML wrapper - the actual markdown rendering is done by the frontend (Muya)
    format!(
        r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }}
        code {{ background: #f6f8fa; padding: 2px 4px; border-radius: 3px; }}
        pre code {{ display: block; padding: 16px; overflow-x: auto; }}
        blockquote {{ border-left: 4px solid #dfe2e5; margin: 0; padding: 0 16px; color: #6a737d; }}
        img {{ max-width: 100%; }}
        table {{ border-collapse: collapse; width: 100%; }}
        td, th {{ border: 1px solid #dfe2e5; padding: 8px; }}
    </style>
</head>
<body>
{}
</body>
</html>"#,
        title, markdown
    )
}
