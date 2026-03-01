//! Application menu system
//!
//! Builds native menus using Tauri 2.x menu API.
//! Replaces src/main/menu/ (templates + actions).

use tauri::menu::{
    MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder,
};
use tauri::{Emitter, Manager};
use crate::i18n::I18n;
use crate::commands::preferences::PreferencesState;

/// Build and set the application menu (called at startup)
pub fn setup_menu(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let handle = app.handle();
    let i18n = app.state::<I18n>();
    build_and_set_menu(handle, &i18n)?;

    // Handle menu events
    app.on_menu_event(move |app_handle, event| {
        let id = event.id().0.as_str();
        log::info!("Menu event: {}", id);

        // Emit menu event to all windows (the focused one will handle it)
        let _ = app_handle.emit("menu-event", id);
    });

    Ok(())
}

/// Rebuild the menu at runtime (e.g. when language changes)
#[tauri::command]
pub async fn rebuild_menu(app: tauri::AppHandle, locale: String) -> Result<(), String> {
    // Create a new I18n instance with the requested locale
    let i18n = I18n::new(&locale);

    build_and_set_menu(&app, &i18n).map_err(|e| e.to_string())?;

    // Re-register menu event handler
    app.on_menu_event(move |app_handle, event| {
        let id = event.id().0.as_str();
        log::info!("Menu event: {}", id);
        let _ = app_handle.emit("menu-event", id);
    });

    // If using custom title bar, hide menu again on all windows
    let prefs_state = app.try_state::<crate::commands::preferences::PreferencesState>();
    let use_custom = prefs_state
        .map(|state| {
            let prefs = state.preferences.lock().unwrap();
            prefs.get("titleBarStyle")
                .and_then(|v| v.as_str())
                .unwrap_or("custom") == "custom"
        })
        .unwrap_or(true);

    if use_custom {
        for (_label, window) in app.webview_windows() {
            let _ = window.hide_menu();
        }
    }

    Ok(())
}

/// Core function that builds and sets the menu bar
fn build_and_set_menu(handle: &tauri::AppHandle, i18n: &I18n) -> Result<(), Box<dyn std::error::Error>> {

    // File > Export submenu
    let export_submenu = SubmenuBuilder::new(handle, &i18n.t("menu.file.export"))
        .items(&[
            &MenuItemBuilder::with_id("file.export-html", &i18n.t("menu.file.exportHtml"))
                .build(handle)?,
            &MenuItemBuilder::with_id("file.export-pdf", &i18n.t("menu.file.exportPdf"))
                .build(handle)?,
        ])
        .build()?;

    // File menu
    let file_new_tab = MenuItemBuilder::with_id("file.new-tab", &i18n.t("menu.file.newTab"))
        .accelerator("CmdOrCtrl+N").build(handle)?;
    let file_new_window = MenuItemBuilder::with_id("file.new-window", &i18n.t("menu.file.newWindow"))
        .accelerator("CmdOrCtrl+Shift+N").build(handle)?;
    let file_open_file = MenuItemBuilder::with_id("file.open-file", &i18n.t("menu.file.openFile"))
        .accelerator("CmdOrCtrl+O").build(handle)?;
    let file_open_folder = MenuItemBuilder::with_id("file.open-folder", &i18n.t("menu.file.openFolder"))
        .accelerator("CmdOrCtrl+Shift+O").build(handle)?;

    // Open Recent submenu (populated from recent documents list)
    let file_open_recent = {
        let mut builder = SubmenuBuilder::new(handle, &i18n.t("menu.file.openRecent"));
        let recent_docs = handle.try_state::<PreferencesState>()
            .and_then(|state| {
                let path = state.recent_documents_path.lock().ok()?;
                let content = std::fs::read_to_string(&*path).ok()?;
                let arr: Vec<String> = serde_json::from_str::<serde_json::Value>(&content).ok()?
                    .as_array()?
                    .iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect();
                Some(arr)
            })
            .unwrap_or_default();
        for (idx, doc_path) in recent_docs.iter().enumerate().take(12) {
            let label = std::path::Path::new(doc_path)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| doc_path.clone());
            let id = format!("file.recent-{}", idx);
            builder = builder.item(
                &MenuItemBuilder::with_id(id, &label).build(handle)?
            );
        }
        if !recent_docs.is_empty() {
            builder = builder.separator();
        }
        builder = builder.item(
            &MenuItemBuilder::with_id("file.clear-recent", &i18n.t("menu.file.clearRecentlyUsed")).build(handle)?
        );
        builder.build()?
    };

    let file_save = MenuItemBuilder::with_id("file.save", &i18n.t("menu.file.save"))
        .accelerator("CmdOrCtrl+S").build(handle)?;
    let file_save_as = MenuItemBuilder::with_id("file.save-as", &i18n.t("menu.file.saveAs"))
        .accelerator("CmdOrCtrl+Shift+S").build(handle)?;
    let file_auto_save = MenuItemBuilder::with_id("file.auto-save", &i18n.t("menu.file.autoSave"))
        .build(handle)?;
    let file_move_to = MenuItemBuilder::with_id("file.move-to", &i18n.t("menu.file.moveTo"))
        .build(handle)?;
    let file_rename = MenuItemBuilder::with_id("file.rename", &i18n.t("menu.file.rename"))
        .build(handle)?;
    let file_import = MenuItemBuilder::with_id("file.import", &i18n.t("menu.file.import"))
        .build(handle)?;
    let file_print = MenuItemBuilder::with_id("file.print", &i18n.t("menu.file.print"))
        .accelerator("CmdOrCtrl+P").build(handle)?;
    let file_close_tab = MenuItemBuilder::with_id("file.close-tab", &i18n.t("menu.file.closeTab"))
        .accelerator("CmdOrCtrl+W").build(handle)?;
    let file_close_window = MenuItemBuilder::with_id("file.close-window", &i18n.t("menu.file.closeWindow"))
        .accelerator("CmdOrCtrl+Shift+W").build(handle)?;
    let file_preferences = MenuItemBuilder::with_id("file.preferences", &i18n.t("menu.file.preferences"))
        .accelerator("CmdOrCtrl+,").build(handle)?;

    let sep1 = PredefinedMenuItem::separator(handle)?;
    let sep2 = PredefinedMenuItem::separator(handle)?;
    let sep3 = PredefinedMenuItem::separator(handle)?;
    let sep4 = PredefinedMenuItem::separator(handle)?;
    let sep5 = PredefinedMenuItem::separator(handle)?;
    let sep6 = PredefinedMenuItem::separator(handle)?;

    let file_menu = SubmenuBuilder::new(handle, &i18n.t("menu.file"))
        .items(&[
            &file_new_tab, &file_new_window,
            &sep1,
            &file_open_file, &file_open_folder, &file_open_recent,
            &sep2,
            &file_save, &file_save_as, &file_auto_save,
            &sep3,
            &file_move_to, &file_rename,
            &sep4,
            &file_import, &export_submenu, &file_print,
            &sep5,
            &file_close_tab, &file_close_window,
            &sep6,
            &file_preferences,
        ])
        .build()?;

    // Edit > Line Ending submenu
    let line_ending_submenu = SubmenuBuilder::new(handle, &i18n.t("menu.edit.lineEnding"))
        .items(&[
            &MenuItemBuilder::with_id("edit.line-ending-crlf", "CRLF (Windows)")
                .build(handle)?,
            &MenuItemBuilder::with_id("edit.line-ending-lf", "LF (Unix)")
                .build(handle)?,
        ])
        .build()?;

    // Edit menu — pass translated labels to PredefinedMenuItems
    let edit_undo = PredefinedMenuItem::undo(handle, Some(&i18n.t("menu.edit.undo")))?;
    let edit_redo = PredefinedMenuItem::redo(handle, Some(&i18n.t("menu.edit.redo")))?;
    let edit_cut = PredefinedMenuItem::cut(handle, Some(&i18n.t("menu.edit.cut")))?;
    let edit_copy = PredefinedMenuItem::copy(handle, Some(&i18n.t("menu.edit.copy")))?;
    let edit_paste = PredefinedMenuItem::paste(handle, Some(&i18n.t("menu.edit.paste")))?;
    let edit_select_all = PredefinedMenuItem::select_all(handle, Some(&i18n.t("menu.edit.selectAll")))?;
    let edit_copy_md = MenuItemBuilder::with_id("edit.copy-as-markdown", &i18n.t("menu.edit.copyAsMarkdown"))
        .accelerator("CmdOrCtrl+Shift+C").build(handle)?;
    let edit_copy_html = MenuItemBuilder::with_id("edit.copy-as-html", &i18n.t("menu.edit.copyAsHtml"))
        .build(handle)?;
    let edit_paste_plain = MenuItemBuilder::with_id("edit.paste-as-plain-text", &i18n.t("menu.edit.pasteAsPlainText"))
        .accelerator("CmdOrCtrl+Shift+V").build(handle)?;
    let edit_duplicate = MenuItemBuilder::with_id("edit.duplicate", &i18n.t("menu.edit.duplicate"))
        .accelerator("CmdOrCtrl+Alt+D").build(handle)?;
    let edit_create_para = MenuItemBuilder::with_id("edit.create-paragraph", &i18n.t("menu.edit.createParagraph"))
        .build(handle)?;
    let edit_delete_para = MenuItemBuilder::with_id("edit.delete-paragraph", &i18n.t("menu.edit.deleteParagraph"))
        .build(handle)?;
    let edit_find = MenuItemBuilder::with_id("edit.find", &i18n.t("menu.edit.find"))
        .accelerator("CmdOrCtrl+F").build(handle)?;
    let edit_find_next = MenuItemBuilder::with_id("edit.find-next", &i18n.t("menu.edit.findNext"))
        .accelerator("CmdOrCtrl+G").build(handle)?;
    let edit_find_prev = MenuItemBuilder::with_id("edit.find-previous", &i18n.t("menu.edit.findPrevious"))
        .accelerator("CmdOrCtrl+Shift+G").build(handle)?;
    let edit_replace = MenuItemBuilder::with_id("edit.replace", &i18n.t("menu.edit.replace"))
        .accelerator("CmdOrCtrl+H").build(handle)?;
    let edit_find_in_folder = MenuItemBuilder::with_id("edit.find-in-folder", &i18n.t("menu.edit.findInFolder"))
        .accelerator("CmdOrCtrl+Shift+F").build(handle)?;

    let esep1 = PredefinedMenuItem::separator(handle)?;
    let esep2 = PredefinedMenuItem::separator(handle)?;
    let esep3 = PredefinedMenuItem::separator(handle)?;
    let esep4 = PredefinedMenuItem::separator(handle)?;
    let esep5 = PredefinedMenuItem::separator(handle)?;

    let edit_menu = SubmenuBuilder::new(handle, &i18n.t("menu.edit"))
        .items(&[
            &edit_undo, &edit_redo,
            &esep1,
            &edit_cut, &edit_copy, &edit_paste, &edit_select_all,
            &esep2,
            &edit_copy_md, &edit_copy_html, &edit_paste_plain,
            &esep3,
            &edit_duplicate, &edit_create_para, &edit_delete_para,
            &esep4,
            &edit_find, &edit_find_next, &edit_find_prev, &edit_replace, &edit_find_in_folder,
            &esep5,
            &line_ending_submenu,
        ])
        .build()?;

    // Paragraph menu
    let paragraph_menu = SubmenuBuilder::new(handle, &i18n.t("menu.paragraph"))
        .items(&[
            &MenuItemBuilder::with_id("paragraph.heading-1", &i18n.t("menu.paragraph.heading1"))
                .accelerator("CmdOrCtrl+1").build(handle)?,
            &MenuItemBuilder::with_id("paragraph.heading-2", &i18n.t("menu.paragraph.heading2"))
                .accelerator("CmdOrCtrl+2").build(handle)?,
            &MenuItemBuilder::with_id("paragraph.heading-3", &i18n.t("menu.paragraph.heading3"))
                .accelerator("CmdOrCtrl+3").build(handle)?,
            &MenuItemBuilder::with_id("paragraph.heading-4", &i18n.t("menu.paragraph.heading4"))
                .accelerator("CmdOrCtrl+4").build(handle)?,
            &MenuItemBuilder::with_id("paragraph.heading-5", &i18n.t("menu.paragraph.heading5"))
                .accelerator("CmdOrCtrl+5").build(handle)?,
            &MenuItemBuilder::with_id("paragraph.heading-6", &i18n.t("menu.paragraph.heading6"))
                .accelerator("CmdOrCtrl+6").build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("paragraph.upgrade-heading", &i18n.t("menu.paragraph.upgradeHeading"))
                .build(handle)?,
            &MenuItemBuilder::with_id("paragraph.degrade-heading", &i18n.t("menu.paragraph.degradeHeading"))
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("paragraph.paragraph", &i18n.t("menu.paragraph.paragraph"))
                .accelerator("CmdOrCtrl+0").build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("paragraph.order-list", &i18n.t("menu.paragraph.orderedList")).build(handle)?,
            &MenuItemBuilder::with_id("paragraph.bullet-list", &i18n.t("menu.paragraph.bulletList")).build(handle)?,
            &MenuItemBuilder::with_id("paragraph.task-list", &i18n.t("menu.paragraph.taskList")).build(handle)?,
            &MenuItemBuilder::with_id("paragraph.loose-list-item", &i18n.t("menu.paragraph.looseListItem")).build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("paragraph.code-fence", &i18n.t("menu.paragraph.codeBlock"))
                .accelerator("CmdOrCtrl+Shift+K").build(handle)?,
            &MenuItemBuilder::with_id("paragraph.quote-block", &i18n.t("menu.paragraph.blockQuote"))
                .accelerator("CmdOrCtrl+Shift+Q").build(handle)?,
            &MenuItemBuilder::with_id("paragraph.math-formula", &i18n.t("menu.paragraph.mathBlock"))
                .accelerator("CmdOrCtrl+Shift+M").build(handle)?,
            &MenuItemBuilder::with_id("paragraph.html-block", &i18n.t("menu.paragraph.htmlBlock")).build(handle)?,
            &MenuItemBuilder::with_id("paragraph.front-matter", &i18n.t("menu.paragraph.frontMatter")).build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("paragraph.table", &i18n.t("menu.paragraph.table"))
                .accelerator("CmdOrCtrl+Shift+T").build(handle)?,
            &MenuItemBuilder::with_id("paragraph.horizontal-line", &i18n.t("menu.paragraph.horizontalRule"))
                .accelerator("CmdOrCtrl+Shift+-").build(handle)?,
        ])
        .build()?;

    // Format menu
    let format_menu = SubmenuBuilder::new(handle, &i18n.t("menu.format"))
        .items(&[
            &MenuItemBuilder::with_id("format.strong", &i18n.t("menu.format.bold"))
                .accelerator("CmdOrCtrl+B").build(handle)?,
            &MenuItemBuilder::with_id("format.emphasis", &i18n.t("menu.format.italic"))
                .accelerator("CmdOrCtrl+I").build(handle)?,
            &MenuItemBuilder::with_id("format.underline", &i18n.t("menu.format.underline"))
                .accelerator("CmdOrCtrl+U").build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("format.superscript", &i18n.t("menu.format.superscript")).build(handle)?,
            &MenuItemBuilder::with_id("format.subscript", &i18n.t("menu.format.subscript")).build(handle)?,
            &MenuItemBuilder::with_id("format.highlight", &i18n.t("menu.format.highlight"))
                .accelerator("CmdOrCtrl+Shift+H").build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("format.inline-code", &i18n.t("menu.format.inlineCode"))
                .accelerator("CmdOrCtrl+`").build(handle)?,
            &MenuItemBuilder::with_id("format.inline-math", &i18n.t("menu.format.inlineMath"))
                .accelerator("CmdOrCtrl+Shift+E").build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("format.strike", &i18n.t("menu.format.strikethrough"))
                .accelerator("CmdOrCtrl+D").build(handle)?,
            &MenuItemBuilder::with_id("format.hyperlink", &i18n.t("menu.format.link"))
                .accelerator("CmdOrCtrl+L").build(handle)?,
            &MenuItemBuilder::with_id("format.image", &i18n.t("menu.format.image"))
                .accelerator("CmdOrCtrl+Shift+I").build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("format.clear-format", &i18n.t("menu.format.clearFormatting"))
                .accelerator("CmdOrCtrl+Shift+R").build(handle)?,
        ])
        .build()?;

    // View menu
    let view_menu = SubmenuBuilder::new(handle, &i18n.t("menu.view"))
        .items(&[
            &MenuItemBuilder::with_id("view.command-palette", &i18n.t("menu.view.commandPalette"))
                .accelerator("CmdOrCtrl+Shift+P").build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("view.source-code-mode", &i18n.t("menu.view.sourceCodeMode"))
                .accelerator("CmdOrCtrl+E").build(handle)?,
            &MenuItemBuilder::with_id("view.typewriter-mode", &i18n.t("menu.view.typewriterMode"))
                .build(handle)?,
            &MenuItemBuilder::with_id("view.focus-mode", &i18n.t("menu.view.focusMode"))
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("view.toggle-sidebar", &i18n.t("menu.view.toggleSidebar"))
                .accelerator("CmdOrCtrl+J").build(handle)?,
            &MenuItemBuilder::with_id("view.toggle-tabbar", &i18n.t("menu.view.toggleTabBar"))
                .accelerator("CmdOrCtrl+Shift+B").build(handle)?,
            &MenuItemBuilder::with_id("view.toggle-toc", &i18n.t("menu.view.toggleToc"))
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("view.reload-images", &i18n.t("menu.view.reloadImages"))
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("view.zoom-in", &i18n.t("menu.view.zoomIn"))
                .accelerator("CmdOrCtrl+=").build(handle)?,
            &MenuItemBuilder::with_id("view.zoom-out", &i18n.t("menu.view.zoomOut"))
                .accelerator("CmdOrCtrl+-").build(handle)?,
        ])
        .build()?;

    // Theme menu
    let theme_menu = SubmenuBuilder::new(handle, &i18n.t("menu.theme"))
        .items(&[
            &MenuItemBuilder::with_id("theme.cadmium-light", &i18n.t("menu.theme.cadmiumLight")).build(handle)?,
            &MenuItemBuilder::with_id("theme.dark", &i18n.t("menu.theme.dark")).build(handle)?,
            &MenuItemBuilder::with_id("theme.graphite-light", &i18n.t("menu.theme.graphiteLight")).build(handle)?,
            &MenuItemBuilder::with_id("theme.material-dark", &i18n.t("menu.theme.materialDark")).build(handle)?,
            &MenuItemBuilder::with_id("theme.one-dark", &i18n.t("menu.theme.oneDark")).build(handle)?,
            &MenuItemBuilder::with_id("theme.ulysses-light", &i18n.t("menu.theme.ulyssesLight")).build(handle)?,
        ])
        .build()?;

    // Window menu — pass translated labels to PredefinedMenuItems
    let window_menu = SubmenuBuilder::new(handle, &i18n.t("menu.window"))
        .items(&[
            &PredefinedMenuItem::minimize(handle, Some(&i18n.t("menu.window.minimize")))?,
            &PredefinedMenuItem::maximize(handle, Some(&i18n.t("menu.window.maximize")))?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("window.toggle-always-on-top", &i18n.t("menu.window.alwaysOnTop"))
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::fullscreen(handle, Some(&i18n.t("menu.window.fullscreen")))?,
        ])
        .build()?;

    // Help menu
    let help_menu = SubmenuBuilder::new(handle, &i18n.t("menu.help"))
        .items(&[
            &MenuItemBuilder::with_id("help.quick-start", &i18n.t("menu.help.quickStart")).build(handle)?,
            &MenuItemBuilder::with_id("help.markdown-reference", &i18n.t("menu.help.markdownReference"))
                .build(handle)?,
            &MenuItemBuilder::with_id("help.changelog", &i18n.t("menu.help.changelog")).build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("help.donate", &i18n.t("menu.help.donate")).build(handle)?,
            &MenuItemBuilder::with_id("help.report-issue", &i18n.t("menu.help.reportIssue")).build(handle)?,
            &MenuItemBuilder::with_id("help.website", &i18n.t("menu.help.website")).build(handle)?,
            &MenuItemBuilder::with_id("help.watch-on-github", &i18n.t("menu.help.watchOnGithub")).build(handle)?,
            &MenuItemBuilder::with_id("help.license", &i18n.t("menu.help.license")).build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("help.check-update", &i18n.t("menu.help.checkForUpdates"))
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("help.about", &i18n.t("menu.help.about")).build(handle)?,
        ])
        .build()?;

    // Build the menu bar
    let menu = MenuBuilder::new(handle)
        .items(&[
            &file_menu,
            &edit_menu,
            &paragraph_menu,
            &format_menu,
            &view_menu,
            &theme_menu,
            &window_menu,
            &help_menu,
        ])
        .build()?;

    handle.set_menu(menu)?;

    Ok(())
}

/// Show the application menu as a popup at the given position (hamburger menu button)
#[tauri::command]
pub async fn show_app_menu(
    app: tauri::AppHandle,
    window: tauri::Window,
    _x: Option<f64>,
    _y: Option<f64>,
) -> Result<(), String> {
    use tauri::menu::ContextMenu;
    if let Some(menu) = app.menu() {
        menu.popup(window).map_err(|e| e.to_string())?;
    }
    Ok(())
}
