/**
 * Tauri API bridge for renderer process
 *
 * This module provides a compatibility bridge shaped like the legacy electron.js API
 * while internally using Tauri APIs.
 */

// Import pure JS path polyfill for synchronous path operations
import pathPolyfill from './pathPolyfill'
import i18n from '@/i18n'
import { localizeUntitledFilename } from '@/util/displayName'

// Augment Window interface for Tauri and custom globals
declare global {
  interface Window {
    __TAURI_INTERNALS__?: any
    __TAURI_API_INITIALIZED__?: boolean
    electronAPI?: TauriApiObject
    webkitAudioContext?: typeof AudioContext
    marktext?: { paths: { userDataPath: string } }
  }
}

// ============================================================================
// Types
// ============================================================================

interface FileSaveData {
  pathname?: string
  markdown: string
  filename?: string
  defaultPath?: string
  options?: { encoding?: string }
}

interface FileMoveData {
  pathname: string
}

interface ExportData {
  type: string
  content: string
  pathname?: string
  title?: string
}

interface UnsavedFile {
  pathname?: string
  markdown: string
}

interface SaveResult {
  success: boolean
  path: string
}

interface StatResult {
  is_file: boolean
  is_directory: boolean
  is_symlink: boolean
  size: number
  modified?: string
  created?: string
  accessed?: string
}

interface WindowState {
  isFullscreen: boolean
}

interface EventListener {
  callback: Function
  unsubscribe: (() => void) | Promise<() => void>
}

interface IpcChannelHandler {
  (args: any[]): Promise<any>
}

interface TauriModule {
  invoke: (cmd: string, args?: Record<string, any>) => Promise<any>
}

interface TauriEventModule {
  listen: (event: string, handler: (event: { payload: any }) => void) => Promise<() => void>
  once: (event: string, handler: (event: { payload: any }) => void) => Promise<() => void>
}

interface TauriShellModule {
  open: (path: string) => Promise<void>
  Command: {
    create: (
      cmd: string,
      args: string[]
    ) => {
      execute: () => Promise<{ stdout: string; stderr: string }>
    }
  }
}

interface TauriDialogModule {
  [key: string]: any
}

interface TauriClipboardModule {
  readText: () => Promise<string>
  writeText: (text: string) => Promise<void>
}

interface TauriFsModule {
  readTextFile: (path: string) => Promise<string>
  writeTextFile: (path: string, contents: string) => Promise<void>
  readDir: (path: string) => Promise<Array<{ name: string }>>
}

interface TauriOsModule {
  [key: string]: any
}

interface TauriPathModule {
  [key: string]: any
}

interface TauriProcessModule {
  [key: string]: any
}

interface FsStatResult {
  isFile: () => boolean
  isDirectory: () => boolean
  isSymbolicLink: () => boolean
  size: number
  mtime: Date | null
  ctime: Date | null
  atime: Date | null
}

interface MkdirOptions {
  recursive?: boolean
}

interface RmdirOptions {
  recursive?: boolean
}

interface WriteJsonOptions {
  spaces?: number
}

interface PathObject {
  root?: string
  dir?: string
  base?: string
  ext?: string
  name?: string
}

interface HashObject {
  update: (input: string | Uint8Array) => HashObject
  digest: (encoding?: string) => Promise<string | number[]>
}

interface Store {
  dispatch: (action: string, payload?: any) => any
  commit: (mutation: string, payload?: any) => void
  state: any
}

interface TauriApiObject {
  ipcRenderer: typeof ipcRenderer
  shell: typeof shell
  clipboard: typeof clipboard
  nativeImage: typeof nativeImage
  webFrame: typeof webFrame
  webUtils: typeof webUtils
  fs: typeof fs
  path: typeof path
  os: typeof os
  process: typeof processInfo
  crypto: typeof crypto
  childProcess: typeof childProcess
  isOsx: boolean
  isWindows: boolean
  isLinux: boolean
  isMas: boolean
  staticPath: string | null
}

// Check if we're running in Tauri
const isTauri = (): boolean => {
  return typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined
}

// Lazy load Tauri APIs to avoid errors when not in Tauri context
let tauriCore: TauriModule | null = null
let tauriEvent: TauriEventModule | null = null
let tauriShell: TauriShellModule | null = null
let tauriDialog: TauriDialogModule | null = null
let tauriClipboard: TauriClipboardModule | null = null
let tauriFs: TauriFsModule | null = null
let tauriOs: TauriOsModule | null = null
let tauriPath: TauriPathModule | null = null
let tauriProcess: TauriProcessModule | null = null

const loadTauriApis = async (): Promise<boolean> => {
  if (!isTauri()) return false
  // Load core APIs first (required)
  try {
    tauriCore = await import('@tauri-apps/api/core')
    tauriEvent = await import('@tauri-apps/api/event')
  } catch (e) {
    console.error('Failed to load Tauri core APIs:', e)
    return false
  }
  // Load plugin APIs individually (optional - don't block on failure)
  const pluginLoaders: [string, () => Promise<void>][] = [
    [
      'shell',
      async () => {
        tauriShell = (await import('@tauri-apps/plugin-shell')) as any
      }
    ],
    [
      'dialog',
      async () => {
        tauriDialog = await import('@tauri-apps/plugin-dialog')
      }
    ],
    [
      'clipboard',
      async () => {
        tauriClipboard = (await import('@tauri-apps/plugin-clipboard-manager')) as any
      }
    ],
    [
      'fs',
      async () => {
        tauriFs = (await import('@tauri-apps/plugin-fs')) as any
      }
    ],
    [
      'os',
      async () => {
        tauriOs = await import('@tauri-apps/plugin-os')
      }
    ],
    [
      'path',
      async () => {
        tauriPath = await import('@tauri-apps/api/path')
      }
    ],
    [
      'process',
      async () => {
        tauriProcess = await import('@tauri-apps/plugin-process')
      }
    ]
  ]
  for (const [name, loader] of pluginLoaders) {
    try {
      await loader()
    } catch (e) {
      console.warn(`Failed to load Tauri plugin "${name}":`, e)
    }
  }
  // Expose runtime file-src converter for places that must build local asset URLs
  // outside this module (e.g. Muya internals).
  if (
    typeof window !== 'undefined' &&
    tauriCore &&
    typeof (tauriCore as any).convertFileSrc === 'function'
  ) {
    ;(window as any).__MT_CONVERT_FILE_SRC__ = (p: string) => (tauriCore as any).convertFileSrc(p)
  }
  return true
}

// Initialize Tauri APIs
const tauriReady: Promise<boolean> = loadTauriApis()

// Event listener management for IPC emulation
const eventListeners: Map<string, EventListener[]> = new Map()

// ============================================================================
// IPC Renderer emulation - maps legacy IPC channels to Tauri commands/events
// ============================================================================

/**
 * Extract the encoding string from the file state.
 * The encoding can be either a string ('utf-8') or an object ({ encoding: 'utf8', isBom: false }).
 */
function getEncodingString(encoding: any): string | null {
  if (!encoding) return null
  if (typeof encoding === 'string') return encoding
  if (typeof encoding === 'object' && typeof encoding.encoding === 'string')
    return encoding.encoding
  return null
}

function normalizeLineEndingsForSave(content: string, lineEnding?: string): string {
  if (typeof content !== 'string') return ''
  // Normalize to LF first, then re-emit by target line ending.
  const lf = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (lineEnding === 'crlf') {
    return lf.replace(/\n/g, '\r\n')
  }
  return lf
}

function t(key: string): string {
  return i18n.global.t(key)
}

function getLocalizedDefaultFilename(filename?: string, pathname?: string): string {
  const localized = localizeUntitledFilename(filename, pathname, t)
  return localized || `${t('dialog.untitled')}.md`
}

// High-level IPC channel handlers that map to specific Tauri commands
const ipcChannelHandlers: Record<string, IpcChannelHandler> = {
  // File operations
  'mt::response-file-save': async (args: any[]): Promise<SaveResult | undefined> => {
    const [data] = args as [FileSaveData | undefined]
    if (!data) return
    const { id, pathname, markdown, filename, defaultPath, options } = data
    let savePath = pathname
    if (!savePath) {
      // New file - show save dialog
      savePath = await tauriCore!.invoke('save_file_dialog', {
        defaultPath: defaultPath || null,
        filename: getLocalizedDefaultFilename(filename, pathname)
      })
      if (!savePath) return // User cancelled
    }
    const result: SaveResult = await tauriCore!.invoke('save_markdown_file', {
      filePath: savePath,
      content: normalizeLineEndingsForSave(markdown ?? '', options?.lineEnding),
      encoding: getEncodingString(options?.encoding)
    })
    if (result.success && result.path) {
      await tauriCore!.invoke('add_recent_document', { filePath: result.path })
      // Notify editor that save succeeded (update pathname, filename, saved state)
      ipcRenderer.emit('mt::set-pathname', null, {
        id,
        pathname: result.path,
        filename: pathPolyfill.basename(result.path)
      })
    }
    return result
  },
  'mt::response-file-save-as': async (args: any[]): Promise<SaveResult | null | undefined> => {
    const [data] = args as [FileSaveData | undefined]
    if (!data) return
    const { id, pathname, markdown, filename, options } = data
    const dir = pathname ? pathPolyfill.dirname(pathname) : null
    const savePath: string | null = await tauriCore!.invoke('save_file_dialog', {
      defaultPath: dir,
      filename: getLocalizedDefaultFilename(filename, pathname)
    })
    if (!savePath) return null
    const result: SaveResult = await tauriCore!.invoke('save_markdown_file', {
      filePath: savePath,
      content: normalizeLineEndingsForSave(markdown ?? '', options?.lineEnding),
      encoding: getEncodingString(options?.encoding)
    })
    if (result.success && result.path) {
      await tauriCore!.invoke('add_recent_document', { filePath: result.path })
      // Notify editor that save-as succeeded
      ipcRenderer.emit('mt::set-pathname', null, {
        id,
        pathname: result.path,
        filename: pathPolyfill.basename(result.path)
      })
    }
    return result
  },
  'mt::save-tabs': async (args: any[]): Promise<void> => {
    const [unsavedFiles] = args as [UnsavedFile[] | undefined]
    if (!unsavedFiles || !unsavedFiles.length) return
    for (const file of unsavedFiles) {
      if (file.pathname && typeof file.markdown === 'string') {
        await tauriCore!.invoke('save_markdown_file', {
          filePath: file.pathname,
          content: normalizeLineEndingsForSave(file.markdown, file.options?.lineEnding),
          encoding: getEncodingString(file.options?.encoding)
        })
      }
    }
  },
  'mt::save-and-close-tabs': async (args: any[]): Promise<void> => {
    const [unsavedFiles] = args as [UnsavedFile[] | undefined]
    if (!unsavedFiles) return
    for (const file of unsavedFiles) {
      if (file.pathname && typeof file.markdown === 'string') {
        await tauriCore!.invoke('save_markdown_file', {
          filePath: file.pathname,
          content: normalizeLineEndingsForSave(file.markdown, file.options?.lineEnding),
          encoding: getEncodingString(file.options?.encoding)
        })
      }
    }
  },
  // File open operations (legacy flow: open dialog → read files → mt::open-new-tab)
  'mt::cmd-open-file': async (): Promise<void> => {
    const paths: string[] = await tauriCore!.invoke('open_file_dialog')
    if (!paths || !paths.length) return
    for (const filePath of paths) {
      try {
        const doc = await tauriCore!.invoke('read_markdown_file', { filePath })
        ipcRenderer.emit('mt::open-new-tab', null, doc, {}, true)
      } catch (e) {
        console.error(`Failed to open file ${filePath}:`, e)
      }
    }
  },
  'mt::cmd-open-folder': async (): Promise<string> => {
    const folderPath: string = await tauriCore!.invoke('open_folder_dialog')
    return folderPath
  },
  // Open a single file by path (used by sidebar file click, quick open, etc.)
  // Legacy flow: windowManager ipc channel `mt::open-file` → editor.openTab()
  'mt::open-file': async (args: any[]): Promise<void> => {
    const [filePath, options = {}] = args as [string, any]
    if (!filePath || !tauriCore) return
    try {
      const doc = await tauriCore.invoke('read_markdown_file', { filePath })
      ipcRenderer.emit('mt::open-new-tab', null, doc, options, true)
    } catch (e) {
      console.error(`Failed to open file ${filePath}:`, e)
    }
  },
  // Window operations
  'mt::cmd-new-editor-window': async (): Promise<any> => {
    return await tauriCore!.invoke('create_editor_window', { filePath: null })
  },
  'mt::open-setting-window': async (): Promise<any> => {
    return await tauriCore!.invoke('create_settings_window', { page: null })
  },
  'mt::cmd-close-window': async (): Promise<any> => {
    return await tauriCore!.invoke('close_window')
  },
  // Rename file on disk and notify editor
  'mt::rename': async (args: any[]): Promise<void> => {
    const [data] = args as [{ id: string; pathname: string; newPathname: string } | undefined]
    if (!data) return
    const { id, pathname, newPathname } = data
    try {
      await tauriCore!.invoke('rename', { oldPath: pathname, newPath: newPathname })
      // Notify the editor that rename succeeded
      ipcRenderer.emit('mt::set-pathname', null, {
        id,
        pathname: newPathname,
        filename: pathPolyfill.basename(newPathname)
      })
    } catch (e) {
      console.error('Failed to rename file:', e)
    }
  },
  // Move file to a new location
  'mt::response-file-move-to': async (args: any[]): Promise<string | null | undefined> => {
    const [data] = args as [FileMoveData | undefined]
    if (!data) return
    const { id, pathname } = data
    const dest: string | null = await tauriCore!.invoke('save_file_dialog', {
      defaultPath: pathPolyfill.dirname(pathname),
      filename: pathPolyfill.basename(pathname)
    })
    if (!dest) return null
    await tauriCore!.invoke('rename', { oldPath: pathname, newPath: dest })
    // Update editor state with the new pathname
    ipcRenderer.emit('mt::set-pathname', null, {
      id,
      pathname: dest,
      filename: pathPolyfill.basename(dest)
    })
    return dest
  },
  // Export
  'mt::response-export': async (args: any[]): Promise<string | null | undefined> => {
    const [data] = args as [ExportData | undefined]
    if (!data) return
    const { type, content, pathname, title } = data
    const ext = type === 'pdf' ? '.pdf' : '.html'
    const basename = pathname
      ? pathPolyfill.basename(pathname, '.md')
      : localizeUntitledFilename(title, '', t) || t('dialog.untitled')
    const filePath: string | null = await tauriCore!.invoke('export_file_dialog', {
      exportType: type,
      defaultPath: pathname ? pathPolyfill.dirname(pathname) : null,
      filename: basename + ext
    })
    if (!filePath) return null
    if (type === 'styledHtml' || type === 'html') {
      await tauriCore!.invoke('export_html', { filePath, content })
    }
    // PDF export is handled by window.print() on the frontend side
    return filePath
  },
  // Preferences
  'mt::ask-for-user-preference': async (): Promise<void> => {
    const preferences = await tauriCore!.invoke('get_preferences')
    if (preferences) {
      ipcRenderer.emit('mt::user-preference', null, preferences)
    }
  },
  'mt::set-user-preference': async (args: any[]): Promise<void> => {
    const [data] = args
    if (data && typeof data === 'object') {
      await tauriCore!.invoke('set_preferences', { preferences: data })
      // Update ALL windows (local + other windows via Tauri global event)
      ipcRenderer.emit('mt::user-preference', null, data)
      if (tauriEvent) {
        tauriEvent.emit('mt::user-preference-changed', data)
      }
    }
  },
  'mt::cmd-set-single-preference': async (args: any[]): Promise<void> => {
    const [key, value] = args as [string, any]
    await tauriCore!.invoke('set_preference', { key, value })
    // Update ALL windows
    const data = { [key]: value }
    ipcRenderer.emit('mt::user-preference', null, data)
    if (tauriEvent) {
      tauriEvent.emit('mt::user-preference-changed', data)
    }
  },
  // Recent documents
  'mt::get-recent-documents': async (): Promise<any> => {
    return await tauriCore!.invoke('get_recent_documents')
  },
  'mt::clear-recent-documents': async (): Promise<any> => {
    return await tauriCore!.invoke('clear_recent_documents')
  },
  // Image
  'mt::pick-image': async (): Promise<any> => {
    return await tauriCore!.invoke('pick_image_dialog')
  },
  'mt::get-image-completions': async (args: any[]): Promise<any> => {
    const [directory, query] = args as [string, string]
    return await tauriCore!.invoke('get_image_completions', { directory, query })
  },
  'mt::copy-image-to-folder': async (args: any[]): Promise<any> => {
    const [source, destDir] = args as [string, string]
    return await tauriCore!.invoke('copy_image_to_folder', { source, destDir })
  },
  'mt::check-file-exists': async (args: any[]): Promise<any> => {
    const [path] = args as [string]
    return await tauriCore!.invoke('check_file_exists', { path })
  },
  'mt::check-images-exist': async (args: any[]): Promise<any> => {
    const [paths] = args as [string[]]
    return await tauriCore!.invoke('check_images_exist', { paths })
  },
  'mt::find-images-by-name': async (args: any[]): Promise<any> => {
    const [baseDir, fileNames] = args as [string, string[]]
    return await tauriCore!.invoke('find_images_by_name', { baseDir, fileNames })
  },
  'mt::migrate-asset-folder': async (args: any[]): Promise<any> => {
    const [oldBaseDir, newBaseDir, refs] = args as [string, string, string[]]
    return await tauriCore!.invoke('migrate_asset_folder', { oldBaseDir, newBaseDir, refs })
  },
  // File watcher
  'mt::watch-file': async (args: any[]): Promise<any> => {
    const [filePath] = args as [string]
    return await tauriCore!.invoke('watch_file', { filePath })
  },
  'mt::watch-directory': async (args: any[]): Promise<any> => {
    const [dirPath] = args as [string]
    return await tauriCore!.invoke('watch_directory', { dirPath })
  },
  'mt::unwatch': async (args: any[]): Promise<any> => {
    const [watchPath] = args as [string]
    return await tauriCore!.invoke('unwatch', { watchPath })
  },
  'mt::unwatch-all': async (): Promise<any> => {
    return await tauriCore!.invoke('unwatch_all')
  },
  // Keybindings
  'mt::get-keybindings': async (): Promise<any> => {
    return await tauriCore!.invoke('get_keybindings')
  },
  'mt::save-keybindings': async (args: any[]): Promise<any> => {
    const [keybindings] = args
    return await tauriCore!.invoke('save_user_keybindings', { keybindings })
  },
  // Keybinding preference page: returns keyboard layout info.
  // In Tauri/WebView2 we don't have Electron's low-level keyboard API,
  // so we return a stub US layout. setKeyboardLayout() is already a no-op.
  'mt::keybinding-get-keyboard-info': async (): Promise<any> => {
    return { layout: 'US', keymap: {} }
  },
  // Keybinding preference page: returns default + user keybindings for editing.
  'mt::keybinding-get-pref-keybindings': async (): Promise<any> => {
    const defaultKeybindings = await tauriCore!.invoke('get_default_keybindings')
    const userKeybindings = await tauriCore!.invoke('get_user_keybindings')
    return { defaultKeybindings, userKeybindings }
  },
  // Pandoc
  'mt::check-pandoc': async (): Promise<any> => {
    return await tauriCore!.invoke('check_pandoc')
  },
  'mt::import-with-pandoc': async (args: any[]): Promise<any> => {
    const [filePath] = args as [string]
    return await tauriCore!.invoke('import_with_pandoc', { filePath })
  },
  // Spellcheck
  'mt::get-custom-dictionary': async (): Promise<any> => {
    return await tauriCore!.invoke('get_custom_dictionary')
  },
  'mt::add-to-dictionary': async (args: any[]): Promise<any> => {
    const [word] = args as [string]
    return await tauriCore!.invoke('add_to_dictionary', { word })
  },
  'mt::remove-from-dictionary': async (args: any[]): Promise<any> => {
    const [word] = args as [string]
    return await tauriCore!.invoke('remove_from_dictionary', { word })
  },
  // Trash
  'mt::response-file-trash': async (args: any[]): Promise<any> => {
    const [data] = args as [FileMoveData | undefined]
    if (!data) return
    const { pathname } = data
    return await tauriCore!.invoke('trash_file', { filePath: pathname })
  },
  // Window state
  'mt::window-minimize': async (): Promise<any> => {
    return await tauriCore!.invoke('minimize_window')
  },
  'mt::window-maximize': async (): Promise<any> => {
    await tauriCore!.invoke('maximize_window')
    const state: WindowState & { isMaximized?: boolean } =
      await tauriCore!.invoke('get_window_state')
    ipcRenderer.emit(state?.isMaximized ? 'mt::window-maximize' : 'mt::window-unmaximize', null)
    return state
  },
  'mt::window-unmaximize': async (): Promise<any> => {
    const state: WindowState & { isMaximized?: boolean } =
      await tauriCore!.invoke('get_window_state')
    if (state?.isMaximized) {
      await tauriCore!.invoke('maximize_window')
    }
    ipcRenderer.emit('mt::window-unmaximize', null)
    return await tauriCore!.invoke('get_window_state')
  },
  'mt::window-get-state': async (): Promise<any> => {
    return await tauriCore!.invoke('get_window_state')
  },
  'mt::window-close': async (): Promise<any> => {
    return await tauriCore!.invoke('close_window')
  },
  'mt::window-toggle-fullscreen': async (): Promise<any> => {
    const state: WindowState = await tauriCore!.invoke('get_window_state')
    return await tauriCore!.invoke('set_fullscreen', { fullscreen: !state.isFullscreen })
  },
  'mt::window-toggle-always-on-top': async (args: any[]): Promise<any> => {
    const [alwaysOnTop] = args as [boolean]
    return await tauriCore!.invoke('set_always_on_top', { alwaysOnTop: !!alwaysOnTop })
  },
  // Show app menu as popup (hamburger button in custom titlebar)
  'mt::show-app-menu': async (args: any[]): Promise<void> => {
    if (tauriCore) {
      try {
        const [pos] = args as [{ x?: number; y?: number } | undefined]
        await tauriCore.invoke('show_app_menu', {
          x: pos?.x ?? null,
          y: pos?.y ?? null
        })
      } catch (e) {
        console.warn('Failed to show app menu:', e)
      }
    }
  },
  // Drag-and-drop file open: reads files and opens them as tabs
  'mt::window::drop': async (args: any[]): Promise<void> => {
    const [fileList] = args as [string[]]
    if (!fileList || !fileList.length || !tauriCore) return
    for (const filePath of fileList) {
      try {
        const doc = await tauriCore.invoke('read_markdown_file', { filePath })
        ipcRenderer.emit('mt::open-new-tab', null, doc, {}, true)
      } catch (e) {
        console.warn(`Failed to open dropped file ${filePath}:`, e)
      }
    }
  },
  // Renderer log: legacy channel is preserved for compatibility.
  // In Tauri this is a no-op because the logger already writes to console.
  'mt::renderer-log': async (): Promise<void> => {
    // No-op: log.error/warn/info already writes to console before calling this.
  },
  // Close window confirm: shows a 3-option dialog (Save / Don't Save / Cancel)
  // Preserves behavior of legacy close-confirm channel.
  'mt::close-window-confirm': async (args: any[]): Promise<void> => {
    const [unsavedFiles] = args as [any[]]
    if (!unsavedFiles || !unsavedFiles.length) {
      // No unsaved files — just close
      await tauriCore!.invoke('close_window')
      return
    }

    const { confirm } = await import('@/components/common/confirmDialog')
    const count = unsavedFiles.length
    const message =
      count === 1
        ? 'Do you want to save the changes you made?'
        : `You have ${count} unsaved files. Do you want to save changes?`

    const shouldSave = await confirm('MarkText', message, {
      confirmText: 'Save',
      cancelText: "Don't Save"
    })

    try {
      if (shouldSave) {
        // User clicked "Save" → save files then close
        for (const file of unsavedFiles) {
          if (file.pathname && typeof file.markdown === 'string') {
            await tauriCore!.invoke('save_markdown_file', {
              filePath: file.pathname,
              content: file.markdown,
              encoding: getEncodingString(file.options?.encoding)
            })
          }
        }
      }
      // Both "Save" (after saving) and "Don't Save" close the window
      await tauriCore!.invoke('close_window')
    } catch (err) {
      console.error('Error during window close:', err)
    }
  },
  // Check for updates — uses Tauri core invoke to avoid needing the npm package
  'mt::check-for-update': async (): Promise<void> => {
    if (!tauriCore) return
    try {
      const update = await tauriCore.invoke('plugin:updater|check')
      if (update) {
        ipcRenderer.emit('mt::UPDATE_AVAILABLE', null, 'A new version is available.')
      } else {
        ipcRenderer.emit('mt::UPDATE_NOT_AVAILABLE', null, 'You are using the latest version.')
      }
    } catch (e: any) {
      // Updater plugin may not be configured — show a friendly message
      ipcRenderer.emit(
        'mt::UPDATE_NOT_AVAILABLE',
        null,
        'Update check is not available in this build.'
      )
    }
  },
  // No-op handlers for channels that don't need backend interaction
  'mt::set-title': async (): Promise<void> => {},
  'mt::send-initialized': async (): Promise<void> => {},
  'mt::editor-ready': async (): Promise<void> => {},
  'mt::update-line-ending-menu': async (): Promise<void> => {},
  'mt::update-text-direction-menu': async (): Promise<void> => {},
  'mt::update-format-menu': async (): Promise<void> => {},
  'mt::view-layout-changed': async (): Promise<void> => {},
  'mt::window-tab-closed': async (): Promise<void> => {},
  // Print: use browser `window.print()` in Tauri.
  'mt::response-print': async (): Promise<void> => {
    try {
      window.print()
    } catch (e) {
      console.error('Failed to print:', e)
    }
    // Notify editor to clean up the print container
    ipcRenderer.emit('mt::print-service-clearup', null)
  }
}

// Convert mt:: channel names to Tauri command names (fallback)
function channelToCommand(channel: string): string {
  return channel.replace(/^mt::/, '').replace(/-/g, '_')
}

function channelToEvent(channel: string): string {
  return channel
}

// ---------------------------------------------------------------------------
// Local event emitter for in-process events.
// Legacy ipcRenderer extended Node.js EventEmitter, so code throughout
// MarkText uses ipcRenderer.emit(channel, fakeEvent, ...data) to dispatch
// events locally within the renderer process. The Tauri event system only
// handles cross-process events (Rust ↔ JS). This local emitter bridges the
// gap so that emit() and on() work for both in-process and cross-process events.
// ---------------------------------------------------------------------------
const localEventListeners = new Map<string, Set<Function>>()
const localOnceListeners = new Map<string, Set<Function>>()

export const ipcRenderer = {
  /**
   * Emit an event locally (in-process). Mirrors Node.js EventEmitter.emit().
   * Dispatches to all listeners registered via on() and once().
   * Signature: emit(channel, fakeEvent, ...data) — preserved from legacy convention.
   */
  emit: (channel: string, ...args: any[]): boolean => {
    let handled = false
    // Dispatch to persistent listeners (registered via on())
    const listeners = localEventListeners.get(channel)
    if (listeners && listeners.size > 0) {
      handled = true
      listeners.forEach(cb => {
        try {
          cb(...args)
        } catch (e) {
          console.error(`Error in local listener for ${channel}:`, e)
        }
      })
    }
    // Dispatch to one-shot listeners (registered via once())
    const onceSet = localOnceListeners.get(channel)
    if (onceSet && onceSet.size > 0) {
      handled = true
      const callbacks = Array.from(onceSet)
      onceSet.clear()
      callbacks.forEach(cb => {
        try {
          cb(...args)
        } catch (e) {
          console.error(`Error in local once-listener for ${channel}:`, e)
        }
      })
    }
    return handled
  },

  send: async (channel: string, ...args: any[]): Promise<void> => {
    if (!isTauri()) return
    await tauriReady
    // Check for specific handler first
    if (ipcChannelHandlers[channel]) {
      try {
        await ipcChannelHandlers[channel](args)
      } catch (e) {
        console.error(`Tauri handler error for ${channel}:`, e)
      }
      return
    }
    // Fallback: convert channel to command
    if (!tauriCore) {
      console.warn(`Tauri core not loaded, skipping fallback for: ${channel}`)
      return
    }
    const command = channelToCommand(channel)
    try {
      await tauriCore.invoke(command, { args })
    } catch (e: any) {
      console.warn(`Tauri invoke fallback for ${channel} (${command}):`, e.message || e)
    }
  },
  invoke: async (channel: string, ...args: any[]): Promise<any> => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    // Check for specific handler first
    if (ipcChannelHandlers[channel]) {
      try {
        return await ipcChannelHandlers[channel](args)
      } catch (e) {
        console.error(`Tauri handler error for ${channel}:`, e)
        throw e
      }
    }
    // Fallback
    if (!tauriCore) {
      return Promise.reject(new Error('Tauri core API not loaded'))
    }
    const command = channelToCommand(channel)
    try {
      return await tauriCore.invoke(command, { args })
    } catch (e) {
      console.error(`Tauri invoke error for ${channel}:`, e)
      throw e
    }
  },
  sendSync: (channel: string, ..._args: any[]): null => {
    console.warn('sendSync not supported in Tauri, returning null for:', channel)
    return null
  },

  /**
   * Register a persistent listener. Fires for:
   *   1. Local events via ipcRenderer.emit(channel, ...)
   *   2. Tauri backend events (from Rust via tauriEvent)
   */
  on: (channel: string, callback: (event: any, ...args: any[]) => void): (() => void) => {
    // Register locally for emit() calls
    if (!localEventListeners.has(channel)) {
      localEventListeners.set(channel, new Set())
    }
    localEventListeners.get(channel)!.add(callback)

    // Also register with Tauri event system for backend (Rust → JS) events
    let tauriUnsubscribe: (() => void) | null = null
    if (isTauri()) {
      const unlistenPromise = tauriReady.then(async () => {
        if (!tauriEvent) return null
        const eventName = channelToEvent(channel)
        const unsub = await tauriEvent.listen(eventName, event => {
          const fakeEvent = { sender: null }
          callback(fakeEvent, event.payload)
        })
        if (!eventListeners.has(channel)) {
          eventListeners.set(channel, [])
        }
        eventListeners.get(channel)!.push({ callback, unsubscribe: unsub })
        return unsub
      })
      // Wrap for cleanup
      tauriUnsubscribe = null
      unlistenPromise.then(fn => {
        tauriUnsubscribe = fn
      })
    }

    // Return unsubscribe function that cleans up both local and Tauri listeners
    return () => {
      localEventListeners.get(channel)?.delete(callback)
      if (tauriUnsubscribe) tauriUnsubscribe()
    }
  },

  /**
   * Register a one-shot listener. Fires once for:
   *   1. Local events via ipcRenderer.emit(channel, ...)
   *   2. Tauri backend events (from Rust via tauriEvent)
   * Whichever fires first removes the listener from both paths.
   */
  once: (channel: string, callback: (event: any, ...args: any[]) => void): (() => void) => {
    // Wrapper that removes itself after first call (from either path)
    let fired = false
    const wrappedCallback = (...args: any[]) => {
      if (fired) return
      fired = true
      // Clean up local once-listener
      localOnceListeners.get(channel)?.delete(wrappedCallback)
      // Clean up Tauri listener
      if (tauriUnsubscribe) tauriUnsubscribe()
      callback(...args)
    }

    // Register locally for emit() calls
    if (!localOnceListeners.has(channel)) {
      localOnceListeners.set(channel, new Set())
    }
    localOnceListeners.get(channel)!.add(wrappedCallback)

    // Also register with Tauri event system
    let tauriUnsubscribe: (() => void) | null = null
    if (isTauri()) {
      tauriReady.then(async () => {
        if (!tauriEvent || fired) return
        const eventName = channelToEvent(channel)
        tauriUnsubscribe = await tauriEvent.once(eventName, event => {
          const fakeEvent = { sender: null }
          wrappedCallback(fakeEvent, event.payload)
        })
      })
    }

    return () => {
      fired = true
      localOnceListeners.get(channel)?.delete(wrappedCallback)
      if (tauriUnsubscribe) tauriUnsubscribe()
    }
  },

  removeAllListeners: (channel: string): void => {
    // Clean up local listeners
    localEventListeners.delete(channel)
    localOnceListeners.delete(channel)
    // Clean up Tauri event listeners
    if (eventListeners.has(channel)) {
      const listeners = eventListeners.get(channel)!
      listeners.forEach(({ unsubscribe }) => {
        if (typeof unsubscribe === 'function') {
          unsubscribe()
        }
      })
      eventListeners.delete(channel)
    }
  }
}

// ============================================================================
// Shell API using Tauri shell plugin
// ============================================================================

export const shell = {
  openExternal: async (url: string, _options?: any): Promise<void> => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      await tauriShell!.open(url)
    } catch (e) {
      console.error('Failed to open external:', e)
      throw e
    }
  },
  openPath: async (path: string): Promise<string> => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      await tauriShell!.open(path)
      return ''
    } catch (e: any) {
      console.error('Failed to open path:', e)
      return e.message
    }
  },
  showItemInFolder: async (fullPath: string): Promise<void> => {
    if (!isTauri()) return
    await tauriReady
    try {
      // Reveal parent folder and select the item
      const dir = pathPolyfill.dirname(fullPath)
      await tauriShell!.open(dir)
    } catch (e) {
      console.error('Failed to show item in folder:', e)
    }
  },
  beep: (): void => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext!)()
      const oscillator = audioContext.createOscillator()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.connect(audioContext.destination)
      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.1)
    } catch (e) {
      console.warn('Beep not supported')
    }
  }
}

// ============================================================================
// Clipboard API using Tauri clipboard plugin
// ============================================================================

export const clipboard = {
  readText: async (_type?: string): Promise<string> => {
    if (!isTauri()) return ''
    await tauriReady
    try {
      return (await tauriClipboard!.readText()) || ''
    } catch (e) {
      console.error('Failed to read clipboard:', e)
      return ''
    }
  },
  writeText: async (text: string, _type?: string): Promise<void> => {
    if (!isTauri()) return
    await tauriReady
    try {
      await tauriClipboard!.writeText(text)
    } catch (e) {
      console.error('Failed to write clipboard:', e)
    }
  },
  readHTML: async (_type?: string): Promise<string> => '',
  writeHTML: async (markup: string, _type?: string): Promise<void> => {
    if (!isTauri()) return
    await tauriReady
    try {
      await tauriClipboard!.writeText(markup)
    } catch (e) {
      console.error('Failed to write HTML to clipboard:', e)
    }
  },
  readRTF: (_type?: string): string => '',
  writeRTF: (_text: string, _type?: string): void => {},
  readBookmark: (): { title: string; url: string } => ({ title: '', url: '' }),
  writeBookmark: (_title: string, _url: string, _type?: string): void => {},
  readFindText: (): string => '',
  writeFindText: (_text: string): void => {},
  clear: async (_type?: string): Promise<void> => {
    if (!isTauri()) return
    await tauriReady
    try {
      await tauriClipboard!.writeText('')
    } catch (e) {
      console.error('Failed to clear clipboard:', e)
    }
  },
  availableFormats: (_type?: string): string[] => [],
  has: (_format: string, _type?: string): boolean => false,
  read: (_format: string): string => '',
  readBuffer: (_format: string): Uint8Array => new Uint8Array(0),
  writeBuffer: (_format: string, _buffer: Uint8Array, _type?: string): void => {},
  write: (_data: any, _type?: string): void => {}
}

// ============================================================================
// Native Image API - limited support in Tauri
// ============================================================================

export const nativeImage = {
  createEmpty: (): null => null,
  createFromPath: (_path: string): null => null,
  createFromBuffer: (_buffer: Uint8Array, _options?: any): null => null,
  createFromDataURL: (_dataURL: string): null => null
}

// ============================================================================
// WebFrame API - use CSS zoom
// ============================================================================

export const webFrame = {
  setZoomFactor: (factor: number): void => {
    ;(document.body.style as any).zoom = factor
  },
  getZoomFactor: (): number => {
    return parseFloat((document.body.style as any).zoom) || 1
  },
  setZoomLevel: (level: number): void => {
    const factor = Math.pow(1.2, level)
    ;(document.body.style as any).zoom = factor
  },
  getZoomLevel: (): number => {
    const factor = parseFloat((document.body.style as any).zoom) || 1
    return Math.log(factor) / Math.log(1.2)
  }
}

// ============================================================================
// WebUtils API - for drag & drop file path access
// ============================================================================

export const webUtils = {
  getPathForFile: (file: File & { path?: string }): string => {
    return file.path || file.name || ''
  }
}

// ============================================================================
// File System API using Tauri fs plugin + Rust commands
// ============================================================================

export const fs: Record<string, any> = {
  readFile: async (filePath: string, _options?: any): Promise<string> => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      const content: string = await tauriFs!.readTextFile(filePath)
      return content
    } catch (e: any) {
      throw new Error(`Failed to read file: ${e.message}`)
    }
  },
  readFileSync: (_filePath: string, _options?: any): null => {
    console.warn('readFileSync not supported in Tauri, use async version')
    return null
  },
  readdir: async (dirPath: string, _options?: any): Promise<string[]> => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      const entries = await tauriFs!.readDir(dirPath)
      return entries.map((e: { name: string }) => e.name)
    } catch (e: any) {
      throw new Error(`Failed to read directory: ${e.message}`)
    }
  },
  readdirSync: (_dirPath: string, _options?: any): string[] => {
    console.warn('readdirSync not supported in Tauri')
    return []
  },
  stat: async (filePath: string, _options?: any): Promise<FsStatResult> => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      const stat: StatResult = await tauriCore!.invoke('stat', { path: filePath })
      return {
        isFile: () => stat.is_file,
        isDirectory: () => stat.is_directory,
        isSymbolicLink: () => stat.is_symlink,
        size: stat.size,
        mtime: stat.modified ? new Date(stat.modified) : null,
        ctime: stat.created ? new Date(stat.created) : null,
        atime: stat.accessed ? new Date(stat.accessed) : null
      }
    } catch (e: any) {
      throw new Error(`Failed to stat: ${e.message}`)
    }
  },
  statSync: (_filePath: string): null => {
    console.warn('statSync not supported in Tauri')
    return null
  },
  lstat: async (filePath: string, options?: any): Promise<FsStatResult> => {
    return fs.stat(filePath, options)
  },
  lstatSync: (_filePath: string): null => null,
  access: async (filePath: string, _mode?: number): Promise<void> => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      const exists: boolean = await tauriCore!.invoke('exists', { path: filePath })
      if (!exists) throw new Error('File does not exist')
    } catch (e) {
      throw e
    }
  },
  accessSync: (_filePath: string, _mode?: number): void => {},
  existsSync: (_filePath: string): boolean => {
    console.warn('existsSync not supported in Tauri')
    return false
  },
  realpath: async (filePath: string, _options?: any): Promise<string> => filePath,
  realpathSync: (filePath: string, _options?: any): string => filePath,
  readlink: async (filePath: string, _options?: any): Promise<string> => filePath,
  readlinkSync: (_filePath: string, _options?: any): null => null,
  writeFile: async (filePath: string, data: string, _options?: any): Promise<void> => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      await tauriFs!.writeTextFile(filePath, data)
    } catch (e: any) {
      throw new Error(`Failed to write file: ${e.message}`)
    }
  },
  writeFileSync: (_filePath: string, _data: string, _options?: any): void => {
    console.warn('writeFileSync not supported in Tauri')
  },
  appendFile: async (filePath: string, data: string, _options?: any): Promise<void> => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      const existing: string = await tauriFs!.readTextFile(filePath).catch(() => '')
      await tauriFs!.writeTextFile(filePath, existing + data)
    } catch (e: any) {
      throw new Error(`Failed to append file: ${e.message}`)
    }
  },
  mkdir: async (dirPath: string, options?: MkdirOptions): Promise<void> => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      await tauriCore!.invoke('mkdir', {
        path: dirPath,
        recursive: options?.recursive || false
      })
    } catch (e: any) {
      throw new Error(`Failed to create directory: ${e.message}`)
    }
  },
  mkdirSync: (_dirPath: string, _options?: MkdirOptions): void => {
    console.warn('mkdirSync not supported in Tauri')
  },
  rename: async (oldPath: string, newPath: string): Promise<void> => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      await tauriCore!.invoke('rename', { oldPath, newPath })
    } catch (e: any) {
      throw new Error(`Failed to rename: ${e.message}`)
    }
  },
  renameSync: (_oldPath: string, _newPath: string): void => {
    console.warn('renameSync not supported in Tauri')
  },
  unlink: async (filePath: string): Promise<void> => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      await tauriCore!.invoke('remove', { path: filePath })
    } catch (e: any) {
      throw new Error(`Failed to remove file: ${e.message}`)
    }
  },
  unlinkSync: (_filePath: string): void => {
    console.warn('unlinkSync not supported in Tauri')
  },
  rmdir: async (dirPath: string, options?: RmdirOptions): Promise<void> => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      await tauriCore!.invoke('remove', {
        path: dirPath,
        recursive: options?.recursive || false
      })
    } catch (e: any) {
      throw new Error(`Failed to remove directory: ${e.message}`)
    }
  },
  rm: async (filePath: string, _options?: any): Promise<void> => {
    return fs.unlink(filePath)
  },
  copyFile: async (src: string, dest: string, _mode?: number): Promise<void> => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      await tauriCore!.invoke('copy_file', { source: src, dest })
    } catch (e: any) {
      throw new Error(`Failed to copy file: ${e.message}`)
    }
  },
  copyFileSync: (_src: string, _dest: string, _mode?: number): void => {
    console.warn('copyFileSync not supported in Tauri')
  },
  createReadStream: (_filePath: string, _options?: any): null => null,
  createWriteStream: (_filePath: string, _options?: any): null => null,
  watch: (_filePath: string, _options?: any, _listener?: Function): null => null,
  watchFile: (_filename: string, _options?: any, _listener?: Function): void => {},
  unwatchFile: (_filename: string, _listener?: Function): void => {},
  get constants(): { F_OK: number; R_OK: number; W_OK: number; X_OK: number } {
    return { F_OK: 0, R_OK: 4, W_OK: 2, X_OK: 1 }
  }
}

// ============================================================================
// Ensure fs-extra compatibility (ensureDir, pathExists, etc.)
// ============================================================================

fs.ensureDir = async (dirPath: string): Promise<void> => {
  return fs.mkdir(dirPath, { recursive: true })
}
fs.ensureDirSync = (_dirPath: string): void => {
  console.warn('ensureDirSync not supported in Tauri')
}
fs.pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await tauriReady
    return await tauriCore!.invoke('exists', { path: filePath })
  } catch {
    return false
  }
}
fs.pathExistsSync = (_filePath: string): boolean => false
fs.outputFile = async (filePath: string, data: string, options?: any): Promise<void> => {
  const dir = pathPolyfill.dirname(filePath)
  await fs.ensureDir(dir)
  return fs.writeFile(filePath, data, options)
}
fs.readJson = async (filePath: string): Promise<any> => {
  const content: string = await fs.readFile(filePath)
  return JSON.parse(content)
}
fs.writeJson = async (filePath: string, data: any, options?: WriteJsonOptions): Promise<void> => {
  const content = JSON.stringify(data, null, options?.spaces || 2)
  return fs.writeFile(filePath, content)
}
fs.remove = async (filePath: string): Promise<void> => {
  try {
    await tauriReady
    await tauriCore!.invoke('remove', { path: filePath, recursive: true })
  } catch (e) {
    // ignore if not found
  }
}

// ============================================================================
// Path API - Use pure JS polyfill for synchronous operations (required by Muya)
// ============================================================================

export const path = {
  join: (...args: string[]): string => pathPolyfill.join(...args),
  resolve: (...args: string[]): string => pathPolyfill.resolve(...args),
  dirname: (filePath: string): string => pathPolyfill.dirname(filePath),
  basename: (filePath: string, ext?: string): string => pathPolyfill.basename(filePath, ext),
  extname: (filePath: string): string => pathPolyfill.extname(filePath),
  parse: (filePath: string): PathObject => pathPolyfill.parse(filePath),
  format: (pathObject: PathObject): string => pathPolyfill.format(pathObject),
  normalize: (filePath: string): string => pathPolyfill.normalize(filePath),
  isAbsolute: (filePath: string): boolean => pathPolyfill.isAbsolute(filePath),
  relative: (from: string, to: string): string => pathPolyfill.relative(from, to),
  get sep(): string {
    return pathPolyfill.sep
  },
  get delimiter(): string {
    return pathPolyfill.delimiter
  },
  get posix(): null {
    return null
  },
  get win32(): null {
    return null
  }
}

// ============================================================================
// OS API using Tauri os plugin
// ============================================================================

export const os = {
  homedir: async (): Promise<string> => {
    if (!isTauri()) return ''
    await tauriReady
    try {
      return await tauriCore!.invoke('get_homedir')
    } catch (e) {
      return ''
    }
  },
  tmpdir: async (): Promise<string> => {
    if (!isTauri()) return ''
    await tauriReady
    try {
      return await tauriCore!.invoke('get_tmpdir')
    } catch (e) {
      return ''
    }
  },
  platform: async (): Promise<string> => {
    if (!isTauri()) return ''
    await tauriReady
    try {
      return await tauriCore!.invoke('get_platform')
    } catch (e) {
      return ''
    }
  },
  type: async (): Promise<string> => {
    if (!isTauri()) return ''
    await tauriReady
    try {
      const platform: string = await tauriCore!.invoke('get_platform')
      switch (platform) {
        case 'windows':
          return 'Windows_NT'
        case 'macos':
          return 'Darwin'
        case 'linux':
          return 'Linux'
        default:
          return platform
      }
    } catch (e) {
      return ''
    }
  },
  arch: async (): Promise<string> => {
    if (!isTauri()) return ''
    await tauriReady
    try {
      return await tauriCore!.invoke('get_arch')
    } catch (e) {
      return ''
    }
  },
  release: (): string => '',
  hostname: async (): Promise<string> => {
    if (!isTauri()) return ''
    await tauriReady
    try {
      return await tauriCore!.invoke('get_hostname')
    } catch (e) {
      return ''
    }
  },
  cpus: (): any[] => [],
  totalmem: (): number => 0,
  freemem: (): number => 0,
  get EOL(): string {
    return navigator.platform.startsWith('Win') ? '\r\n' : '\n'
  }
}

// ============================================================================
// Process info
// ============================================================================

export const processInfo = {
  get platform(): string {
    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.includes('win')) return 'win32'
    if (userAgent.includes('mac')) return 'darwin'
    if (userAgent.includes('linux')) return 'linux'
    return 'unknown'
  },
  get arch(): string {
    return navigator.userAgent.includes('x64') ? 'x64' : 'x86'
  },
  get versions(): Record<string, any> {
    return {}
  },
  get env(): Record<string, any> {
    return {}
  },
  cwd: (): string => '',
  get argv(): string[] {
    return []
  },
  get execPath(): string {
    return ''
  },
  get pid(): number {
    return 0
  },
  get ppid(): number {
    return 0
  },
  get resourcesPath(): string {
    return ''
  }
}

// ============================================================================
// Crypto API - use Web Crypto API
// ============================================================================

export const crypto = {
  createHash: (algorithm: string): HashObject => {
    let data = new Uint8Array()
    return {
      update: function (input: string | Uint8Array): HashObject {
        const encoder = new TextEncoder()
        const inputBytes = typeof input === 'string' ? encoder.encode(input) : input
        const newData = new Uint8Array(data.length + inputBytes.length)
        newData.set(data)
        newData.set(inputBytes, data.length)
        data = newData
        return this
      },
      digest: async function (encoding?: string): Promise<string | number[]> {
        const hashBuffer = await window.crypto.subtle.digest(
          algorithm.toUpperCase().replace('-', ''),
          data
        )
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        if (encoding === 'hex') {
          return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
        }
        return hashArray
      }
    }
  },
  randomBytes: (size: number): Uint8Array => {
    const bytes = new Uint8Array(size)
    window.crypto.getRandomValues(bytes)
    return bytes
  },
  randomUUID: (): string => {
    return window.crypto.randomUUID()
  }
}

// ============================================================================
// Child Process API - limited support via Tauri shell
// ============================================================================

export const childProcess = {
  spawn: (_command: string, _args?: string[], _options?: any): null => {
    console.warn('spawn not fully supported in Tauri')
    return null
  },
  exec: async (
    command: string,
    options?: any,
    callback?: (err: Error | null, stdout?: string, stderr?: string) => void
  ): Promise<any> => {
    if (!isTauri()) {
      if (callback) callback(new Error('Tauri API not available'))
      return null
    }
    await tauriReady
    try {
      const result = await tauriShell!.Command.create('cmd', ['/c', command]).execute()
      if (callback) callback(null, result.stdout, result.stderr)
      return result
    } catch (e: any) {
      if (callback) callback(e)
      return null
    }
  },
  execFile: (
    _file: string,
    _args?: string[],
    _options?: any,
    callback?: (err: Error | null, stdout?: string, stderr?: string) => void
  ): null => {
    console.warn('execFile not fully supported in Tauri')
    if (callback) callback(new Error('Not supported'))
    return null
  },
  execSync: (_command: string, _options?: any): null => {
    console.warn('execSync not supported in Tauri')
    return null
  },
  execFileSync: (_file: string, _args?: string[], _options?: any): null => {
    console.warn('execFileSync not supported in Tauri')
    return null
  },
  spawnSync: (_command: string, _args?: string[], _options?: any): null => {
    console.warn('spawnSync not supported in Tauri')
    return null
  }
}

// ============================================================================
// Platform detection
// ============================================================================

interface PlatformInfo {
  isOsx: boolean
  isWindows: boolean
  isLinux: boolean
  isMas: boolean
}

const detectPlatform = (): PlatformInfo => {
  const userAgent = navigator.userAgent.toLowerCase()
  return {
    isOsx: userAgent.includes('mac'),
    isWindows: userAgent.includes('win'),
    isLinux: userAgent.includes('linux'),
    isMas: false
  }
}

const platformInfo = detectPlatform()

export const isOsx: boolean = platformInfo.isOsx
export const isWindows: boolean = platformInfo.isWindows
export const isLinux: boolean = platformInfo.isLinux
export const isMas: boolean = platformInfo.isMas

// ============================================================================
// Drag-and-drop handler - listens for Tauri native drag-drop events
// In Tauri, browser File API doesn't expose full paths (unlike legacy file.path behavior),
// so we use Tauri's native tauri://drag-drop event which provides full OS paths.
//
// Preserves legacy flow for drag-drop opened files.
// → isMarkdownFile() check → openFileOrFolder() → loadMarkdownFile() → mt::open-new-tab
// ============================================================================

// Markdown extensions matching the old version (common/filesystem/paths.js)
const MARKDOWN_EXTENSIONS = [
  '.markdown',
  '.mdown',
  '.mkdn',
  '.md',
  '.mkd',
  '.mdwn',
  '.mdtxt',
  '.mdtext',
  '.mdx',
  '.text',
  '.txt'
]

function hasMarkdownExtension(filename: string): boolean {
  if (!filename) return false
  const lower = filename.toLowerCase()
  return MARKDOWN_EXTENSIONS.some(ext => lower.endsWith(ext))
}

let dragDropInitialized = false

export function initDragDrop(bus: any): void {
  if (dragDropInitialized || !isTauri()) return
  dragDropInitialized = true

  tauriReady.then(async () => {
    if (!tauriEvent || !tauriCore) {
      console.warn('Tauri APIs not loaded, cannot listen for drag-drop events')
      return
    }

    // Listen for Tauri's native drag-drop event which provides full file paths
    await tauriEvent.listen('tauri://drag-drop', async (event: any) => {
      const paths: string[] = event.payload?.paths || []
      if (!paths.length) return

      // Close the import dialog
      bus.$emit('importDialog', false)

      // Process each dropped file (same logic as old mt::window::drop handler)
      for (const filePath of paths) {
        if (hasMarkdownExtension(filePath)) {
          // Open markdown file as a new tab
          try {
            const doc = await tauriCore!.invoke('read_markdown_file', { filePath })
            ipcRenderer.emit('mt::open-new-tab', null, doc, {}, true)
          } catch (e) {
            console.warn(`Failed to open dropped file ${filePath}:`, e)
          }
        }
        // Non-markdown files (e.g. .docx, .tex) are silently ignored for now.
        // Old version used Pandoc import for these, which requires pandoc to be installed.
      }
    })
  })
}

// ============================================================================
// Open-files handler - listens for Rust 'open-files' events (from command-line
// args, file association, or single-instance second launch). Opens each file
// as a new tab.
// ============================================================================

let openFilesInitialized = false

export function initOpenFilesListener(): void {
  if (openFilesInitialized || !isTauri()) return
  openFilesInitialized = true

  tauriReady.then(async () => {
    if (!tauriEvent || !tauriCore) return
    await tauriEvent.listen('open-files', async (event: any) => {
      const files: string[] = event.payload || []
      for (const filePath of files) {
        if (hasMarkdownExtension(filePath)) {
          try {
            const doc = await tauriCore!.invoke('read_markdown_file', { filePath })
            ipcRenderer.emit('mt::open-new-tab', null, doc, {}, true)
          } catch (e) {
            console.warn(`Failed to open file from open-files event: ${filePath}`, e)
          }
        }
      }
    })
  })
}

// ============================================================================
// File-change sync handler - listens for Rust fs-change events and forwards
// them to renderer store event mt::update-file.
// ============================================================================

let fsChangeSyncInitialized = false
const fsChangeDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>()

export function initFsChangeSync(): void {
  if (fsChangeSyncInitialized || !isTauri()) return
  fsChangeSyncInitialized = true

  tauriReady.then(async () => {
    if (!tauriEvent || !tauriCore) return

    await tauriEvent.listen('fs-change', (event: any) => {
      const payload = event?.payload || {}
      const eventType: string = payload.event_type
      const filePath: string = payload.path
      if (!filePath || !eventType) return

      // Unlink events don't need file content and are forwarded immediately.
      if (eventType === 'unlink') {
        ipcRenderer.emit('mt::update-file', null, {
          type: 'unlink',
          change: { pathname: filePath }
        })
        return
      }

      // Collapse burst writes (common for AI/external tools) to one read.
      if (fsChangeDebounceTimers.has(filePath)) {
        clearTimeout(fsChangeDebounceTimers.get(filePath)!)
        fsChangeDebounceTimers.delete(filePath)
      }

      const timer = setTimeout(async () => {
        fsChangeDebounceTimers.delete(filePath)
        try {
          const change = await tauriCore!.invoke('read_markdown_file', { filePath })
          ipcRenderer.emit('mt::update-file', null, {
            type: eventType === 'add' ? 'add' : 'change',
            change: Object.assign({}, change, { pathname: filePath })
          })
        } catch (e) {
          // File may be temporarily locked/incomplete during write bursts.
          // We silently ignore and wait for next fs-change.
        }
      }, 220)

      fsChangeDebounceTimers.set(filePath, timer)
    })
  })
}

// ============================================================================
// Menu event handler - listens for Tauri menu events and dispatches them
// Uses the same bus/ipcRenderer patterns as commands/index.js (Pinia-compatible)
// ============================================================================

let menuEventInitialized = false
let _bus: any = null

export function initMenuEvents(bus: any): void {
  if (menuEventInitialized || !isTauri()) return
  menuEventInitialized = true
  _bus = bus

  tauriReady.then(async () => {
    if (!tauriEvent) {
      console.warn('Tauri event API not loaded, cannot listen for menu events')
      return
    }
    await tauriEvent.listen('menu-event', event => {
      const menuId = event.payload as string
      handleMenuAction(menuId)
    })
  })
}

export function handleMenuAction(menuId: string): void {
  const menuActions: Record<string, () => void> = {
    // File
    'file.new-tab': () => ipcRenderer.emit('mt::new-untitled-tab', null),
    'file.new-window': () => ipcRenderer.send('mt::cmd-new-editor-window'),
    'file.open-file': () => ipcRenderer.send('mt::cmd-open-file'),
    'file.open-folder': () => ipcRenderer.send('mt::cmd-open-folder'),
    'file.save': () => ipcRenderer.emit('mt::editor-ask-file-save', null),
    'file.save-as': () => ipcRenderer.emit('mt::editor-ask-file-save-as', null),
    'file.auto-save': () => {
      // Toggle auto-save preference
      ipcRenderer.send('mt::cmd-set-single-preference', 'autoSave', true)
    },
    'file.move-to': () => ipcRenderer.emit('mt::editor-move-file', null),
    'file.rename': () => _bus && _bus.$emit('rename'),
    'file.import': () => _bus && _bus.$emit('importDialog', true),
    'file.export-html': () => _bus && _bus.$emit('showExportDialog', 'styledHtml'),
    'file.export-pdf': () => _bus && _bus.$emit('showExportDialog', 'pdf'),
    'file.print': () => _bus && _bus.$emit('showExportDialog', 'print'),
    'file.close-tab': () => ipcRenderer.emit('mt::editor-close-tab', null),
    'file.close-window': () => ipcRenderer.emit('mt::ask-for-close', null),
    'file.preferences': () => ipcRenderer.send('mt::open-setting-window'),
    // Edit
    'edit.copy-as-markdown': () => _bus && _bus.$emit('copyAsMarkdown'),
    'edit.copy-as-html': () => _bus && _bus.$emit('copyAsHtml'),
    'edit.paste-as-plain-text': () => _bus && _bus.$emit('pasteAsPlainText'),
    'edit.duplicate': () => _bus && _bus.$emit('duplicate', 'duplicate'),
    'edit.create-paragraph': () => _bus && _bus.$emit('createParagraph', 'createParagraph'),
    'edit.delete-paragraph': () => _bus && _bus.$emit('deleteParagraph', 'deleteParagraph'),
    'edit.find': () => _bus && _bus.$emit('find', 'find'),
    'edit.find-next': () => _bus && _bus.$emit('findNext', 'findNext'),
    'edit.find-previous': () => _bus && _bus.$emit('findPrev', 'findPrev'),
    'edit.replace': () => _bus && _bus.$emit('replace', 'replace'),
    'edit.find-in-folder': () => ipcRenderer.emit('mt::editor-edit-action', null, 'findInFolder'),
    'edit.line-ending-crlf': () => ipcRenderer.emit('mt::set-line-ending', null, 'crlf'),
    'edit.line-ending-lf': () => ipcRenderer.emit('mt::set-line-ending', null, 'lf'),
    // Paragraph — block-level operations use 'paragraph' event → editor.updateParagraph(type)
    'paragraph.heading-1': () => _bus && _bus.$emit('paragraph', 'heading 1'),
    'paragraph.heading-2': () => _bus && _bus.$emit('paragraph', 'heading 2'),
    'paragraph.heading-3': () => _bus && _bus.$emit('paragraph', 'heading 3'),
    'paragraph.heading-4': () => _bus && _bus.$emit('paragraph', 'heading 4'),
    'paragraph.heading-5': () => _bus && _bus.$emit('paragraph', 'heading 5'),
    'paragraph.heading-6': () => _bus && _bus.$emit('paragraph', 'heading 6'),
    'paragraph.upgrade-heading': () => _bus && _bus.$emit('paragraph', 'upgrade heading'),
    'paragraph.degrade-heading': () => _bus && _bus.$emit('paragraph', 'degrade heading'),
    'paragraph.paragraph': () => _bus && _bus.$emit('paragraph', 'paragraph'),
    'paragraph.order-list': () => _bus && _bus.$emit('paragraph', 'ol-order'),
    'paragraph.bullet-list': () => _bus && _bus.$emit('paragraph', 'ul-bullet'),
    'paragraph.task-list': () => _bus && _bus.$emit('paragraph', 'ul-task'),
    'paragraph.loose-list-item': () => _bus && _bus.$emit('paragraph', 'loose-list-item'),
    'paragraph.code-fence': () => _bus && _bus.$emit('paragraph', 'pre'),
    'paragraph.quote-block': () => _bus && _bus.$emit('paragraph', 'blockquote'),
    'paragraph.math-formula': () => _bus && _bus.$emit('paragraph', 'mathblock'),
    'paragraph.html-block': () => _bus && _bus.$emit('paragraph', 'html'),
    'paragraph.front-matter': () => _bus && _bus.$emit('paragraph', 'front-matter'),
    'paragraph.table': () => _bus && _bus.$emit('paragraph', 'table'),
    'paragraph.horizontal-line': () => _bus && _bus.$emit('paragraph', 'hr'),
    // Format
    'format.strong': () => _bus && _bus.$emit('format', 'strong'),
    'format.emphasis': () => _bus && _bus.$emit('format', 'em'),
    'format.underline': () => _bus && _bus.$emit('format', 'u'),
    'format.superscript': () => _bus && _bus.$emit('format', 'sup'),
    'format.subscript': () => _bus && _bus.$emit('format', 'sub'),
    'format.highlight': () => _bus && _bus.$emit('format', 'mark'),
    'format.inline-code': () => _bus && _bus.$emit('format', 'inline_code'),
    'format.inline-math': () => _bus && _bus.$emit('format', 'inline_math'),
    'format.strike': () => _bus && _bus.$emit('format', 'del'),
    'format.hyperlink': () => _bus && _bus.$emit('format', 'link'),
    'format.image': () => _bus && _bus.$emit('format', 'image'),
    'format.clear-format': () => _bus && _bus.$emit('format', 'clear'),
    // View
    'view.source-code-mode': () => _bus && _bus.$emit('view:toggle-view-entry', 'sourceCode'),
    'view.typewriter-mode': () => _bus && _bus.$emit('view:toggle-view-entry', 'typewriter'),
    'view.focus-mode': () => _bus && _bus.$emit('view:toggle-view-entry', 'focus'),
    'view.toggle-sidebar': () => _bus && _bus.$emit('view:toggle-layout-entry', 'showSideBar'),
    'view.toggle-tabbar': () => _bus && _bus.$emit('view:toggle-layout-entry', 'showTabBar'),
    'view.toggle-toc': () => ipcRenderer.emit('mt::set-view-layout', null, { rightColumn: 'toc' }),
    'view.reload-images': () => _bus && _bus.$emit('invalidate-image-cache'),
    'view.command-palette': () => _bus && _bus.$emit('show-command-palette'),
    'view.zoom-in': () => {
      const current = webFrame.getZoomFactor()
      webFrame.setZoomFactor(Math.min(current + 0.1, 2.0))
    },
    'view.zoom-out': () => {
      const current = webFrame.getZoomFactor()
      webFrame.setZoomFactor(Math.max(current - 0.1, 0.5))
    },
    // Theme
    'theme.cadmium-light': () => ipcRenderer.send('mt::set-user-preference', { theme: 'light' }),
    'theme.dark': () => ipcRenderer.send('mt::set-user-preference', { theme: 'dark' }),
    'theme.graphite-light': () =>
      ipcRenderer.send('mt::set-user-preference', { theme: 'graphite' }),
    'theme.material-dark': () =>
      ipcRenderer.send('mt::set-user-preference', { theme: 'material-dark' }),
    'theme.one-dark': () => ipcRenderer.send('mt::set-user-preference', { theme: 'one-dark' }),
    'theme.ulysses-light': () => ipcRenderer.send('mt::set-user-preference', { theme: 'ulysses' }),
    'theme.everforest-light': () =>
      ipcRenderer.send('mt::set-user-preference', { theme: 'everforest-light' }),
    'theme.everforest-dark': () =>
      ipcRenderer.send('mt::set-user-preference', { theme: 'everforest-dark' }),
    // Window
    'window.toggle-always-on-top': () => ipcRenderer.send('mt::window-toggle-always-on-top', true),
    // Help
    'help.quick-start': () =>
      shell.openExternal('https://github.com/marktext/marktext/blob/develop/docs/QUICKSTART.md'),
    'help.markdown-reference': () =>
      shell.openExternal(
        'https://github.com/marktext/marktext/blob/develop/docs/MARKDOWN_SYNTAX.md'
      ),
    'help.changelog': () =>
      shell.openExternal('https://github.com/marktext/marktext/blob/develop/.github/CHANGELOG.md'),
    'help.donate': () => shell.openExternal('https://opencollective.com/marktext'),
    'help.report-issue': () => shell.openExternal('https://github.com/marktext/marktext/issues'),
    'help.website': () => shell.openExternal('https://github.com/marktext/marktext'),
    'help.watch-on-github': () => shell.openExternal('https://github.com/marktext/marktext'),
    'help.license': () =>
      shell.openExternal('https://github.com/marktext/marktext/blob/develop/LICENSE'),
    'help.check-update': () => ipcRenderer.send('mt::check-for-update'),
    'help.about': () => _bus && _bus.$emit('aboutDialog')
  }

  const action = menuActions[menuId]
  if (action) {
    action()
  } else {
    console.warn('Unknown menu action:', menuId)
  }
}

// ============================================================================
// Static path / App path
// ============================================================================

export const getStaticPath = async (): Promise<string | null> => {
  if (!isTauri()) return null
  await tauriReady
  try {
    return await tauriCore!.invoke('get_app_path', { name: 'resource' })
  } catch (e) {
    return null
  }
}

export const isTauriAvailable: () => boolean = isTauri

// ============================================================================
// Tauri API object matching the legacy `window.electronAPI` shape
// ============================================================================

const tauriApiObject: TauriApiObject = {
  ipcRenderer,
  shell,
  clipboard,
  nativeImage,
  webFrame,
  webUtils,
  fs,
  path,
  os,
  process: processInfo,
  crypto,
  childProcess,
  isOsx,
  isWindows,
  isLinux,
  isMas,
  staticPath: null
}

/**
 * Initialize Tauri API bridge
 */
export function initTauriApi(): boolean {
  if (!isTauri()) return false

  if (typeof window !== 'undefined' && !window.electronAPI) {
    window.electronAPI = tauriApiObject
    window.__TAURI_API_INITIALIZED__ = true
    console.log('[Tauri] API bridge initialized, legacy window.electronAPI shim is available')
  }

  return true
}

// Auto-initialize when loaded in Tauri context
if (isTauri()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTauriApi)
  } else {
    initTauriApi()
  }
}

// Export default object for compatibility
export default {
  ipcRenderer,
  shell,
  clipboard,
  nativeImage,
  webFrame,
  webUtils,
  fs,
  path,
  os,
  process: processInfo,
  crypto,
  childProcess,
  isOsx,
  isWindows,
  isLinux,
  isMas,
  getStaticPath,
  isTauriAvailable,
  initTauriApi,
  initMenuEvents,
  initFsChangeSync
}
