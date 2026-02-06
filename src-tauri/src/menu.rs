//! Application menu system
//!
//! Builds native menus using Tauri 2.x menu API.
//! Replaces src/main/menu/ (templates + actions).

use tauri::menu::{
    MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder,
};
use tauri::Emitter;

/// Build and set the application menu
pub fn setup_menu(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let handle = app.handle();

    // File menu
    let file_menu = SubmenuBuilder::new(handle, "File")
        .items(&[
            &MenuItemBuilder::with_id("file.new-tab", "New Tab")
                .accelerator("CmdOrCtrl+N")
                .build(handle)?,
            &MenuItemBuilder::with_id("file.new-window", "New Window")
                .accelerator("CmdOrCtrl+Shift+N")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("file.open-file", "Open File")
                .accelerator("CmdOrCtrl+O")
                .build(handle)?,
            &MenuItemBuilder::with_id("file.open-folder", "Open Folder")
                .accelerator("CmdOrCtrl+Shift+O")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("file.save", "Save")
                .accelerator("CmdOrCtrl+S")
                .build(handle)?,
            &MenuItemBuilder::with_id("file.save-as", "Save As...")
                .accelerator("CmdOrCtrl+Shift+S")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("file.close-tab", "Close Tab")
                .accelerator("CmdOrCtrl+W")
                .build(handle)?,
            &MenuItemBuilder::with_id("file.close-window", "Close Window")
                .accelerator("CmdOrCtrl+Shift+W")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("file.preferences", "Preferences...")
                .accelerator("CmdOrCtrl+,")
                .build(handle)?,
        ])
        .build()?;

    // Edit menu
    let edit_menu = SubmenuBuilder::new(handle, "Edit")
        .items(&[
            &PredefinedMenuItem::undo(handle, None)?,
            &PredefinedMenuItem::redo(handle, None)?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::cut(handle, None)?,
            &PredefinedMenuItem::copy(handle, None)?,
            &PredefinedMenuItem::paste(handle, None)?,
            &PredefinedMenuItem::select_all(handle, None)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("edit.find", "Find")
                .accelerator("CmdOrCtrl+F")
                .build(handle)?,
            &MenuItemBuilder::with_id("edit.replace", "Replace")
                .accelerator("CmdOrCtrl+H")
                .build(handle)?,
            &MenuItemBuilder::with_id("edit.find-in-folder", "Find in Folder")
                .accelerator("CmdOrCtrl+Shift+F")
                .build(handle)?,
        ])
        .build()?;

    // Paragraph menu
    let paragraph_menu = SubmenuBuilder::new(handle, "Paragraph")
        .items(&[
            &MenuItemBuilder::with_id("paragraph.heading-1", "Heading 1")
                .accelerator("CmdOrCtrl+1")
                .build(handle)?,
            &MenuItemBuilder::with_id("paragraph.heading-2", "Heading 2")
                .accelerator("CmdOrCtrl+2")
                .build(handle)?,
            &MenuItemBuilder::with_id("paragraph.heading-3", "Heading 3")
                .accelerator("CmdOrCtrl+3")
                .build(handle)?,
            &MenuItemBuilder::with_id("paragraph.heading-4", "Heading 4")
                .accelerator("CmdOrCtrl+4")
                .build(handle)?,
            &MenuItemBuilder::with_id("paragraph.heading-5", "Heading 5")
                .accelerator("CmdOrCtrl+5")
                .build(handle)?,
            &MenuItemBuilder::with_id("paragraph.heading-6", "Heading 6")
                .accelerator("CmdOrCtrl+6")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("paragraph.paragraph", "Paragraph")
                .accelerator("CmdOrCtrl+0")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("paragraph.order-list", "Ordered List").build(handle)?,
            &MenuItemBuilder::with_id("paragraph.bullet-list", "Bullet List").build(handle)?,
            &MenuItemBuilder::with_id("paragraph.task-list", "Task List").build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("paragraph.code-fence", "Code Block")
                .accelerator("CmdOrCtrl+Shift+K")
                .build(handle)?,
            &MenuItemBuilder::with_id("paragraph.quote-block", "Block Quote")
                .accelerator("CmdOrCtrl+Shift+Q")
                .build(handle)?,
            &MenuItemBuilder::with_id("paragraph.math-formula", "Math Block")
                .accelerator("CmdOrCtrl+Shift+M")
                .build(handle)?,
            &MenuItemBuilder::with_id("paragraph.html-block", "HTML Block").build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("paragraph.table", "Table")
                .accelerator("CmdOrCtrl+Shift+T")
                .build(handle)?,
            &MenuItemBuilder::with_id("paragraph.horizontal-line", "Horizontal Rule")
                .accelerator("CmdOrCtrl+Shift+-")
                .build(handle)?,
        ])
        .build()?;

    // Format menu
    let format_menu = SubmenuBuilder::new(handle, "Format")
        .items(&[
            &MenuItemBuilder::with_id("format.strong", "Bold")
                .accelerator("CmdOrCtrl+B")
                .build(handle)?,
            &MenuItemBuilder::with_id("format.emphasis", "Italic")
                .accelerator("CmdOrCtrl+I")
                .build(handle)?,
            &MenuItemBuilder::with_id("format.underline", "Underline")
                .accelerator("CmdOrCtrl+U")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("format.superscript", "Superscript").build(handle)?,
            &MenuItemBuilder::with_id("format.subscript", "Subscript").build(handle)?,
            &MenuItemBuilder::with_id("format.highlight", "Highlight")
                .accelerator("CmdOrCtrl+Shift+H")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("format.inline-code", "Inline Code")
                .accelerator("CmdOrCtrl+`")
                .build(handle)?,
            &MenuItemBuilder::with_id("format.inline-math", "Inline Math")
                .accelerator("CmdOrCtrl+Shift+E")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("format.strike", "Strikethrough")
                .accelerator("CmdOrCtrl+D")
                .build(handle)?,
            &MenuItemBuilder::with_id("format.hyperlink", "Link")
                .accelerator("CmdOrCtrl+L")
                .build(handle)?,
            &MenuItemBuilder::with_id("format.image", "Image")
                .accelerator("CmdOrCtrl+Shift+I")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("format.clear-format", "Clear Formatting")
                .accelerator("CmdOrCtrl+Shift+R")
                .build(handle)?,
        ])
        .build()?;

    // View menu
    let view_menu = SubmenuBuilder::new(handle, "View")
        .items(&[
            &MenuItemBuilder::with_id("view.command-palette", "Command Palette")
                .accelerator("CmdOrCtrl+Shift+P")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("view.source-code-mode", "Source Code Mode")
                .accelerator("CmdOrCtrl+E")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("view.toggle-sidebar", "Toggle Sidebar")
                .accelerator("CmdOrCtrl+J")
                .build(handle)?,
            &MenuItemBuilder::with_id("view.toggle-tabbar", "Toggle Tab Bar")
                .accelerator("CmdOrCtrl+Shift+B")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("view.zoom-in", "Zoom In")
                .accelerator("CmdOrCtrl+=")
                .build(handle)?,
            &MenuItemBuilder::with_id("view.zoom-out", "Zoom Out")
                .accelerator("CmdOrCtrl+-")
                .build(handle)?,
        ])
        .build()?;

    // Window menu
    let window_menu = SubmenuBuilder::new(handle, "Window")
        .items(&[
            &PredefinedMenuItem::minimize(handle, None)?,
            &PredefinedMenuItem::maximize(handle, None)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("window.toggle-always-on-top", "Always on Top")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::fullscreen(handle, None)?,
        ])
        .build()?;

    // Help menu
    let help_menu = SubmenuBuilder::new(handle, "Help")
        .items(&[
            &MenuItemBuilder::with_id("help.quick-start", "Quick Start").build(handle)?,
            &MenuItemBuilder::with_id("help.markdown-reference", "Markdown Reference")
                .build(handle)?,
            &MenuItemBuilder::with_id("help.changelog", "Changelog").build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("help.check-update", "Check for Updates...")
                .build(handle)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItemBuilder::with_id("help.about", "About MarkText").build(handle)?,
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
