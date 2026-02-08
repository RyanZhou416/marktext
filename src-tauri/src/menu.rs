//! Application menu system
//!
//! Builds native menus using Tauri 2.x menu API.
//! Replaces src/main/menu/ (templates + actions).

use tauri::menu::{
    MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder,
};
use tauri::{Emitter, Manager};
use crate::i18n::I18n;

/// Build and set the application menu
pub fn setup_menu(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let handle = app.handle();
    let i18n = app.state::<I18n>();

    // File menu
    let file_menu = SubmenuBuilder::new(handle, &i18n.t("menu.file"))
        .items(&[
            &MenuItemBuilder::with_id("file.new-tab", &i18n.t("menu.file.newTab"))
                .accelerator("CmdOrCtrl+N")
                .build(handle)?,
            &MenuItemBuilder::with_id("file.new-window", &i18n.t("menu.file.newWindow"))
                .accelerator("CmdOrCtrl+Shift+N")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("file.open-file", &i18n.t("menu.file.openFile"))
                .accelerator("CmdOrCtrl+O")
                .build(handle)?,
            &MenuItemBuilder::with_id("file.open-folder", &i18n.t("menu.file.openFolder"))
                .accelerator("CmdOrCtrl+Shift+O")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("file.save", &i18n.t("menu.file.save"))
                .accelerator("CmdOrCtrl+S")
                .build(handle)?,
            &MenuItemBuilder::with_id("file.save-as", &i18n.t("menu.file.saveAs"))
                .accelerator("CmdOrCtrl+Shift+S")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("file.close-tab", &i18n.t("menu.file.closeTab"))
                .accelerator("CmdOrCtrl+W")
                .build(handle)?,
            &MenuItemBuilder::with_id("file.close-window", &i18n.t("menu.file.closeWindow"))
                .accelerator("CmdOrCtrl+Shift+W")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("file.preferences", &i18n.t("menu.file.preferences"))
                .accelerator("CmdOrCtrl+,")
                .build(handle)?,
        ])
        .build()?;

    // Edit menu
    let edit_menu = SubmenuBuilder::new(handle, &i18n.t("menu.edit"))
        .items(&[
            &PredefinedMenuItem::undo(handle, None)?,
            &PredefinedMenuItem::redo(handle, None)?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::cut(handle, None)?,
            &PredefinedMenuItem::copy(handle, None)?,
            &PredefinedMenuItem::paste(handle, None)?,
            &PredefinedMenuItem::select_all(handle, None)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("edit.find", &i18n.t("menu.edit.find"))
                .accelerator("CmdOrCtrl+F")
                .build(handle)?,
            &MenuItemBuilder::with_id("edit.replace", &i18n.t("menu.edit.replace"))
                .accelerator("CmdOrCtrl+H")
                .build(handle)?,
            &MenuItemBuilder::with_id("edit.find-in-folder", &i18n.t("menu.edit.findInFolder"))
                .accelerator("CmdOrCtrl+Shift+F")
                .build(handle)?,
        ])
        .build()?;

    // Paragraph menu
    let paragraph_menu = SubmenuBuilder::new(handle, &i18n.t("menu.paragraph"))
        .items(&[
            &MenuItemBuilder::with_id("paragraph.heading-1", &i18n.t("menu.paragraph.heading1"))
                .accelerator("CmdOrCtrl+1")
                .build(handle)?,
            &MenuItemBuilder::with_id("paragraph.heading-2", &i18n.t("menu.paragraph.heading2"))
                .accelerator("CmdOrCtrl+2")
                .build(handle)?,
            &MenuItemBuilder::with_id("paragraph.heading-3", &i18n.t("menu.paragraph.heading3"))
                .accelerator("CmdOrCtrl+3")
                .build(handle)?,
            &MenuItemBuilder::with_id("paragraph.heading-4", &i18n.t("menu.paragraph.heading4"))
                .accelerator("CmdOrCtrl+4")
                .build(handle)?,
            &MenuItemBuilder::with_id("paragraph.heading-5", &i18n.t("menu.paragraph.heading5"))
                .accelerator("CmdOrCtrl+5")
                .build(handle)?,
            &MenuItemBuilder::with_id("paragraph.heading-6", &i18n.t("menu.paragraph.heading6"))
                .accelerator("CmdOrCtrl+6")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("paragraph.paragraph", &i18n.t("menu.paragraph.paragraph"))
                .accelerator("CmdOrCtrl+0")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("paragraph.order-list", &i18n.t("menu.paragraph.orderedList")).build(handle)?,
            &MenuItemBuilder::with_id("paragraph.bullet-list", &i18n.t("menu.paragraph.bulletList")).build(handle)?,
            &MenuItemBuilder::with_id("paragraph.task-list", &i18n.t("menu.paragraph.taskList")).build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("paragraph.code-fence", &i18n.t("menu.paragraph.codeBlock"))
                .accelerator("CmdOrCtrl+Shift+K")
                .build(handle)?,
            &MenuItemBuilder::with_id("paragraph.quote-block", &i18n.t("menu.paragraph.blockQuote"))
                .accelerator("CmdOrCtrl+Shift+Q")
                .build(handle)?,
            &MenuItemBuilder::with_id("paragraph.math-formula", &i18n.t("menu.paragraph.mathBlock"))
                .accelerator("CmdOrCtrl+Shift+M")
                .build(handle)?,
            &MenuItemBuilder::with_id("paragraph.html-block", &i18n.t("menu.paragraph.htmlBlock")).build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("paragraph.table", &i18n.t("menu.paragraph.table"))
                .accelerator("CmdOrCtrl+Shift+T")
                .build(handle)?,
            &MenuItemBuilder::with_id("paragraph.horizontal-line", &i18n.t("menu.paragraph.horizontalRule"))
                .accelerator("CmdOrCtrl+Shift+-")
                .build(handle)?,
        ])
        .build()?;

    // Format menu
    let format_menu = SubmenuBuilder::new(handle, &i18n.t("menu.format"))
        .items(&[
            &MenuItemBuilder::with_id("format.strong", &i18n.t("menu.format.bold"))
                .accelerator("CmdOrCtrl+B")
                .build(handle)?,
            &MenuItemBuilder::with_id("format.emphasis", &i18n.t("menu.format.italic"))
                .accelerator("CmdOrCtrl+I")
                .build(handle)?,
            &MenuItemBuilder::with_id("format.underline", &i18n.t("menu.format.underline"))
                .accelerator("CmdOrCtrl+U")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("format.superscript", &i18n.t("menu.format.superscript")).build(handle)?,
            &MenuItemBuilder::with_id("format.subscript", &i18n.t("menu.format.subscript")).build(handle)?,
            &MenuItemBuilder::with_id("format.highlight", &i18n.t("menu.format.highlight"))
                .accelerator("CmdOrCtrl+Shift+H")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("format.inline-code", &i18n.t("menu.format.inlineCode"))
                .accelerator("CmdOrCtrl+`")
                .build(handle)?,
            &MenuItemBuilder::with_id("format.inline-math", &i18n.t("menu.format.inlineMath"))
                .accelerator("CmdOrCtrl+Shift+E")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("format.strike", &i18n.t("menu.format.strikethrough"))
                .accelerator("CmdOrCtrl+D")
                .build(handle)?,
            &MenuItemBuilder::with_id("format.hyperlink", &i18n.t("menu.format.link"))
                .accelerator("CmdOrCtrl+L")
                .build(handle)?,
            &MenuItemBuilder::with_id("format.image", &i18n.t("menu.format.image"))
                .accelerator("CmdOrCtrl+Shift+I")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("format.clear-format", &i18n.t("menu.format.clearFormatting"))
                .accelerator("CmdOrCtrl+Shift+R")
                .build(handle)?,
        ])
        .build()?;

    // View menu
    let view_menu = SubmenuBuilder::new(handle, &i18n.t("menu.view"))
        .items(&[
            &MenuItemBuilder::with_id("view.command-palette", &i18n.t("menu.view.commandPalette"))
                .accelerator("CmdOrCtrl+Shift+P")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("view.source-code-mode", &i18n.t("menu.view.sourceCodeMode"))
                .accelerator("CmdOrCtrl+E")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("view.toggle-sidebar", &i18n.t("menu.view.toggleSidebar"))
                .accelerator("CmdOrCtrl+J")
                .build(handle)?,
            &MenuItemBuilder::with_id("view.toggle-tabbar", &i18n.t("menu.view.toggleTabBar"))
                .accelerator("CmdOrCtrl+Shift+B")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("view.zoom-in", &i18n.t("menu.view.zoomIn"))
                .accelerator("CmdOrCtrl+=")
                .build(handle)?,
            &MenuItemBuilder::with_id("view.zoom-out", &i18n.t("menu.view.zoomOut"))
                .accelerator("CmdOrCtrl+-")
                .build(handle)?,
        ])
        .build()?;

    // Window menu
    let window_menu = SubmenuBuilder::new(handle, &i18n.t("menu.window"))
        .items(&[
            &PredefinedMenuItem::minimize(handle, None)?,
            &PredefinedMenuItem::maximize(handle, None)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("window.toggle-always-on-top", &i18n.t("menu.window.alwaysOnTop"))
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::fullscreen(handle, None)?,
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
            &window_menu,
            &help_menu,
        ])
        .build()?;

    app.set_menu(menu)?;

    // Handle menu events
    app.on_menu_event(move |app_handle, event| {
        let id = event.id().0.as_str();
        log::info!("Menu event: {}", id);

        // Emit menu event to all windows (the focused one will handle it)
        let _ = app_handle.emit("menu-event", id);
    });

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
