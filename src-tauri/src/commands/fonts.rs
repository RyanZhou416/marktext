//! Font enumeration commands
//!
//! This module replaces the fontmanager-redux native module.

use font_kit::source::SystemSource;
use std::collections::HashSet;

/// Get all available font families on the system
#[tauri::command]
pub fn get_available_fonts(only_monospace: Option<bool>) -> Result<Vec<String>, String> {
    let source = SystemSource::new();
    
    let families = source.all_families()
        .map_err(|e| format!("Failed to enumerate fonts: {}", e))?;
    
    let only_monospace = only_monospace.unwrap_or(false);
    
    if only_monospace {
        // Filter to only monospace fonts
        // This is a best-effort approach - font-kit doesn't directly expose this info
        // We use common naming conventions
        let monospace_keywords = [
            "mono", "courier", "consola", "code", "terminal",
            "fixed", "typewriter", "source code", "fira code",
            "jetbrains", "hack", "inconsolata", "menlo", "monaco",
            "dejavu sans mono", "liberation mono", "roboto mono",
            "noto mono", "ubuntu mono", "cascadia", "iosevka",
        ];
        
        let filtered: HashSet<String> = families
            .into_iter()
            .filter(|name| {
                let lower = name.to_lowercase();
                monospace_keywords.iter().any(|kw| lower.contains(kw))
            })
            .collect();
        
        let mut result: Vec<String> = filtered.into_iter().collect();
        result.sort();
        Ok(result)
    } else {
        // Return all fonts, deduplicated and sorted
        let unique: HashSet<String> = families.into_iter().collect();
        let mut result: Vec<String> = unique.into_iter().collect();
        result.sort();
        Ok(result)
    }
}
