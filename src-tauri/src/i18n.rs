//! Internationalization (i18n) support for the Rust backend.
//!
//! Reads the same JSON locale files used by the Vue frontend.
//! Uses `include_str!` to embed them at compile time.

use serde_json::Value;
use std::collections::HashMap;

const EN: &str = include_str!("../../src/locales/en.json");
const ZH_CN: &str = include_str!("../../src/locales/zh-CN.json");

pub struct I18n {
    messages: HashMap<String, Value>,
}

impl I18n {
    pub fn new(locale: &str) -> Self {
        let json = match locale {
            "zh-CN" | "zh-Hans" | "zh" => ZH_CN,
            _ => EN,
        };
        let messages: HashMap<String, Value> =
            serde_json::from_str(json).expect("Failed to parse locale JSON");
        Self { messages }
    }

    /// Get a translated string by flat dot-notation key.
    /// Falls back to the key itself if not found.
    pub fn t(&self, key: &str) -> String {
        self.messages
            .get(key)
            .and_then(|v| v.as_str())
            .unwrap_or(key)
            .to_string()
    }
}
