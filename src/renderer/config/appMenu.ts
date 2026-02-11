/**
 * Application menu configuration for the custom HTML dropdown menu.
 *
 * Menu item IDs must match those used in:
 *   - src-tauri/src/menu.rs  (Rust native menu)
 *   - src/renderer/util/tauri.ts  handleMenuAction()
 *
 * i18n label keys are resolved at render time via $t().
 * Accelerator strings are display-only (actual shortcuts handled by Tauri).
 *
 * role:
 *   - 'check'  →  toggleable item, shows ✓ when active
 *   - 'radio'  →  mutually exclusive within its group, shows ● when active
 */

export interface MenuItem {
  id?: string
  label?: string // i18n key (or raw string for items like "CRLF (Windows)")
  accelerator?: string
  type?: 'separator'
  role?: 'check' | 'radio'
  submenu?: MenuItem[]
}

export interface MenuGroup {
  id: string
  label: string // i18n key
  submenu: MenuItem[]
}

const S: MenuItem = { type: 'separator' }

export const appMenuConfig: MenuGroup[] = [
  // ── File ──
  {
    id: 'file',
    label: 'menu.file',
    submenu: [
      { id: 'file.new-tab', label: 'menu.file.newTab', accelerator: 'Ctrl+N' },
      { id: 'file.new-window', label: 'menu.file.newWindow', accelerator: 'Ctrl+Shift+N' },
      S,
      { id: 'file.open-file', label: 'menu.file.openFile', accelerator: 'Ctrl+O' },
      { id: 'file.open-folder', label: 'menu.file.openFolder', accelerator: 'Ctrl+Shift+O' },
      S,
      { id: 'file.save', label: 'menu.file.save', accelerator: 'Ctrl+S' },
      { id: 'file.save-as', label: 'menu.file.saveAs', accelerator: 'Ctrl+Shift+S' },
      { id: 'file.auto-save', label: 'menu.file.autoSave', role: 'check' },
      S,
      { id: 'file.move-to', label: 'menu.file.moveTo' },
      { id: 'file.rename', label: 'menu.file.rename' },
      S,
      { id: 'file.import', label: 'menu.file.import' },
      {
        label: 'menu.file.export',
        submenu: [
          { id: 'file.export-html', label: 'menu.file.exportHtml' },
          { id: 'file.export-pdf', label: 'menu.file.exportPdf' }
        ]
      },
      { id: 'file.print', label: 'menu.file.print', accelerator: 'Ctrl+P' },
      S,
      { id: 'file.close-tab', label: 'menu.file.closeTab', accelerator: 'Ctrl+W' },
      { id: 'file.close-window', label: 'menu.file.closeWindow', accelerator: 'Ctrl+Shift+W' },
      S,
      { id: 'file.preferences', label: 'menu.file.preferences', accelerator: 'Ctrl+,' }
    ]
  },

  // ── Edit ──
  {
    id: 'edit',
    label: 'menu.edit',
    submenu: [
      { id: 'edit.undo', label: 'menu.edit.undo', accelerator: 'Ctrl+Z' },
      { id: 'edit.redo', label: 'menu.edit.redo', accelerator: 'Ctrl+Y' },
      S,
      { id: 'edit.cut', label: 'menu.edit.cut', accelerator: 'Ctrl+X' },
      { id: 'edit.copy', label: 'menu.edit.copy', accelerator: 'Ctrl+C' },
      { id: 'edit.paste', label: 'menu.edit.paste', accelerator: 'Ctrl+V' },
      { id: 'edit.select-all', label: 'menu.edit.selectAll', accelerator: 'Ctrl+A' },
      S,
      {
        id: 'edit.copy-as-markdown',
        label: 'menu.edit.copyAsMarkdown',
        accelerator: 'Ctrl+Shift+C'
      },
      { id: 'edit.copy-as-html', label: 'menu.edit.copyAsHtml' },
      {
        id: 'edit.paste-as-plain-text',
        label: 'menu.edit.pasteAsPlainText',
        accelerator: 'Ctrl+Shift+V'
      },
      S,
      { id: 'edit.duplicate', label: 'menu.edit.duplicate', accelerator: 'Ctrl+Alt+D' },
      { id: 'edit.create-paragraph', label: 'menu.edit.createParagraph' },
      { id: 'edit.delete-paragraph', label: 'menu.edit.deleteParagraph' },
      S,
      { id: 'edit.find', label: 'menu.edit.find', accelerator: 'Ctrl+F' },
      { id: 'edit.find-next', label: 'menu.edit.findNext', accelerator: 'Ctrl+G' },
      { id: 'edit.find-previous', label: 'menu.edit.findPrevious', accelerator: 'Ctrl+Shift+G' },
      { id: 'edit.replace', label: 'menu.edit.replace', accelerator: 'Ctrl+H' },
      { id: 'edit.find-in-folder', label: 'menu.edit.findInFolder', accelerator: 'Ctrl+Shift+F' },
      S,
      {
        label: 'menu.edit.lineEnding',
        submenu: [
          { id: 'edit.line-ending-crlf', label: 'CRLF (Windows)', role: 'radio' },
          { id: 'edit.line-ending-lf', label: 'LF (Unix)', role: 'radio' }
        ]
      }
    ]
  },

  // ── Paragraph ──
  {
    id: 'paragraph',
    label: 'menu.paragraph',
    submenu: [
      { id: 'paragraph.heading-1', label: 'menu.paragraph.heading1', accelerator: 'Ctrl+1' },
      { id: 'paragraph.heading-2', label: 'menu.paragraph.heading2', accelerator: 'Ctrl+2' },
      { id: 'paragraph.heading-3', label: 'menu.paragraph.heading3', accelerator: 'Ctrl+3' },
      { id: 'paragraph.heading-4', label: 'menu.paragraph.heading4', accelerator: 'Ctrl+4' },
      { id: 'paragraph.heading-5', label: 'menu.paragraph.heading5', accelerator: 'Ctrl+5' },
      { id: 'paragraph.heading-6', label: 'menu.paragraph.heading6', accelerator: 'Ctrl+6' },
      S,
      { id: 'paragraph.upgrade-heading', label: 'menu.paragraph.upgradeHeading' },
      { id: 'paragraph.degrade-heading', label: 'menu.paragraph.degradeHeading' },
      S,
      { id: 'paragraph.paragraph', label: 'menu.paragraph.paragraph', accelerator: 'Ctrl+0' },
      S,
      { id: 'paragraph.order-list', label: 'menu.paragraph.orderedList' },
      { id: 'paragraph.bullet-list', label: 'menu.paragraph.bulletList' },
      { id: 'paragraph.task-list', label: 'menu.paragraph.taskList' },
      { id: 'paragraph.loose-list-item', label: 'menu.paragraph.looseListItem' },
      S,
      {
        id: 'paragraph.code-fence',
        label: 'menu.paragraph.codeBlock',
        accelerator: 'Ctrl+Shift+K'
      },
      {
        id: 'paragraph.quote-block',
        label: 'menu.paragraph.blockQuote',
        accelerator: 'Ctrl+Shift+Q'
      },
      {
        id: 'paragraph.math-formula',
        label: 'menu.paragraph.mathBlock',
        accelerator: 'Ctrl+Shift+M'
      },
      { id: 'paragraph.html-block', label: 'menu.paragraph.htmlBlock' },
      { id: 'paragraph.front-matter', label: 'menu.paragraph.frontMatter' },
      S,
      { id: 'paragraph.table', label: 'menu.paragraph.table', accelerator: 'Ctrl+Shift+T' },
      {
        id: 'paragraph.horizontal-line',
        label: 'menu.paragraph.horizontalRule',
        accelerator: 'Ctrl+Shift+-'
      }
    ]
  },

  // ── Format ──
  {
    id: 'format',
    label: 'menu.format',
    submenu: [
      { id: 'format.strong', label: 'menu.format.bold', accelerator: 'Ctrl+B' },
      { id: 'format.emphasis', label: 'menu.format.italic', accelerator: 'Ctrl+I' },
      { id: 'format.underline', label: 'menu.format.underline', accelerator: 'Ctrl+U' },
      S,
      { id: 'format.superscript', label: 'menu.format.superscript' },
      { id: 'format.subscript', label: 'menu.format.subscript' },
      { id: 'format.highlight', label: 'menu.format.highlight', accelerator: 'Ctrl+Shift+H' },
      S,
      { id: 'format.inline-code', label: 'menu.format.inlineCode', accelerator: 'Ctrl+`' },
      { id: 'format.inline-math', label: 'menu.format.inlineMath', accelerator: 'Ctrl+Shift+E' },
      S,
      { id: 'format.strike', label: 'menu.format.strikethrough', accelerator: 'Ctrl+D' },
      { id: 'format.hyperlink', label: 'menu.format.link', accelerator: 'Ctrl+L' },
      { id: 'format.image', label: 'menu.format.image', accelerator: 'Ctrl+Shift+I' },
      S,
      {
        id: 'format.clear-format',
        label: 'menu.format.clearFormatting',
        accelerator: 'Ctrl+Shift+R'
      }
    ]
  },

  // ── View ──
  {
    id: 'view',
    label: 'menu.view',
    submenu: [
      {
        id: 'view.command-palette',
        label: 'menu.view.commandPalette',
        accelerator: 'Ctrl+Shift+P'
      },
      S,
      {
        id: 'view.source-code-mode',
        label: 'menu.view.sourceCodeMode',
        accelerator: 'Ctrl+E',
        role: 'check'
      },
      { id: 'view.typewriter-mode', label: 'menu.view.typewriterMode', role: 'check' },
      { id: 'view.focus-mode', label: 'menu.view.focusMode', role: 'check' },
      S,
      {
        id: 'view.toggle-sidebar',
        label: 'menu.view.toggleSidebar',
        accelerator: 'Ctrl+J',
        role: 'check'
      },
      {
        id: 'view.toggle-tabbar',
        label: 'menu.view.toggleTabBar',
        accelerator: 'Ctrl+Shift+B',
        role: 'check'
      },
      { id: 'view.toggle-toc', label: 'menu.view.toggleToc' },
      S,
      { id: 'view.reload-images', label: 'menu.view.reloadImages' },
      S,
      { id: 'view.zoom-in', label: 'menu.view.zoomIn', accelerator: 'Ctrl+=' },
      { id: 'view.zoom-out', label: 'menu.view.zoomOut', accelerator: 'Ctrl+-' }
    ]
  },

  // ── Theme ──
  {
    id: 'theme',
    label: 'menu.theme',
    submenu: [
      { id: 'theme.cadmium-light', label: 'menu.theme.cadmiumLight', role: 'radio' },
      { id: 'theme.dark', label: 'menu.theme.dark', role: 'radio' },
      { id: 'theme.graphite-light', label: 'menu.theme.graphiteLight', role: 'radio' },
      { id: 'theme.material-dark', label: 'menu.theme.materialDark', role: 'radio' },
      { id: 'theme.one-dark', label: 'menu.theme.oneDark', role: 'radio' },
      { id: 'theme.ulysses-light', label: 'menu.theme.ulyssesLight', role: 'radio' }
    ]
  },

  // ── Window ──
  {
    id: 'window',
    label: 'menu.window',
    submenu: [
      { id: 'window.minimize', label: 'menu.window.minimize' },
      { id: 'window.maximize', label: 'menu.window.maximize' },
      S,
      { id: 'window.toggle-always-on-top', label: 'menu.window.alwaysOnTop', role: 'check' },
      S,
      { id: 'window.fullscreen', label: 'menu.window.fullscreen' }
    ]
  },

  // ── Help ──
  {
    id: 'help',
    label: 'menu.help',
    submenu: [
      { id: 'help.quick-start', label: 'menu.help.quickStart' },
      { id: 'help.markdown-reference', label: 'menu.help.markdownReference' },
      { id: 'help.changelog', label: 'menu.help.changelog' },
      S,
      { id: 'help.donate', label: 'menu.help.donate' },
      { id: 'help.report-issue', label: 'menu.help.reportIssue' },
      { id: 'help.website', label: 'menu.help.website' },
      { id: 'help.watch-on-github', label: 'menu.help.watchOnGithub' },
      { id: 'help.license', label: 'menu.help.license' },
      S,
      { id: 'help.check-update', label: 'menu.help.checkForUpdates' },
      S,
      { id: 'help.about', label: 'menu.help.about' }
    ]
  }
]
