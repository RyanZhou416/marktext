/**
 * Tauri API bridge for renderer process
 *
 * This module provides the same interface as electron.js but uses Tauri APIs.
 * It allows the renderer code to work with both Electron and Tauri backends.
 */

// Import pure JS path polyfill for synchronous path operations
import pathPolyfill from './pathPolyfill'

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
    create: (cmd: string, args: string[]) => {
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
  try {
    tauriCore = await import('@tauri-apps/api/core')
    tauriEvent = await import('@tauri-apps/api/event')
    tauriShell = await import('@tauri-apps/plugin-shell') as any
    tauriDialog = await import('@tauri-apps/plugin-dialog')
    tauriClipboard = await import('@tauri-apps/plugin-clipboard-manager') as any
    tauriFs = await import('@tauri-apps/plugin-fs') as any
    tauriOs = await import('@tauri-apps/plugin-os')
    tauriPath = await import('@tauri-apps/api/path')
    tauriProcess = await import('@tauri-apps/plugin-process')
    return true
  } catch (e) {
    console.error('Failed to load Tauri APIs:', e)
    return false
  }
}

// Initialize Tauri APIs
const tauriReady: Promise<boolean> = loadTauriApis()

// Event listener management for IPC emulation
const eventListeners: Map<string, EventListener[]> = new Map()

// ============================================================================
// IPC Renderer emulation - maps Electron IPC channels to Tauri commands/events
// ============================================================================

// High-level IPC channel handlers that map to specific Tauri commands
const ipcChannelHandlers: Record<string, IpcChannelHandler> = {
  // File operations
  'mt::response-file-save': async (args: any[]): Promise<SaveResult | undefined> => {
    const [data] = args as [FileSaveData | undefined]
    if (!data) return
    const { pathname, markdown, filename, defaultPath, options } = data
    let savePath = pathname
    if (!savePath) {
      // New file - show save dialog
      savePath = await tauriCore!.invoke('save_file_dialog', {
        defaultPath: defaultPath || null,
        filename: filename || 'Untitled.md'
      })
      if (!savePath) return // User cancelled
    }
    const result: SaveResult = await tauriCore!.invoke('save_markdown_file', {
      filePath: savePath,
      content: markdown,
      encoding: options?.encoding || null
    })
    if (result.success) {
      await tauriCore!.invoke('add_recent_document', { filePath: result.path })
    }
    return result
  },
  'mt::response-file-save-as': async (args: any[]): Promise<SaveResult | null | undefined> => {
    const [data] = args as [FileSaveData | undefined]
    if (!data) return
    const { pathname, markdown, filename, options } = data
    const dir = pathname ? pathPolyfill.dirname(pathname) : null
    const savePath: string | null = await tauriCore!.invoke('save_file_dialog', {
      defaultPath: dir,
      filename: filename || 'Untitled.md'
    })
    if (!savePath) return null
    const result: SaveResult = await tauriCore!.invoke('save_markdown_file', {
      filePath: savePath,
      content: markdown,
      encoding: options?.encoding || null
    })
    if (result.success) {
      await tauriCore!.invoke('add_recent_document', { filePath: result.path })
    }
    return result
  },
  'mt::save-tabs': async (args: any[]): Promise<void> => {
    const [unsavedFiles] = args as [UnsavedFile[] | undefined]
    if (!unsavedFiles || !unsavedFiles.length) return
    for (const file of unsavedFiles) {
      if (file.pathname) {
        await tauriCore!.invoke('save_markdown_file', {
          filePath: file.pathname,
          content: file.markdown
        })
      }
    }
  },
  'mt::save-and-close-tabs': async (args: any[]): Promise<void> => {
    const [unsavedFiles] = args as [UnsavedFile[] | undefined]
    if (!unsavedFiles) return
    for (const file of unsavedFiles) {
      if (file.pathname) {
        await tauriCore!.invoke('save_markdown_file', {
          filePath: file.pathname,
          content: file.markdown
        })
      }
    }
  },
  // File open operations
  'mt::cmd-open-file': async (): Promise<string[]> => {
    const paths: string[] = await tauriCore!.invoke('open_file_dialog')
    return paths
  },
  'mt::cmd-open-folder': async (): Promise<string> => {
    const folderPath: string = await tauriCore!.invoke('open_folder_dialog')
    return folderPath
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
  // Move to trash
  'mt::response-file-move-to': async (args: any[]): Promise<string | null | undefined> => {
    const [data] = args as [FileMoveData | undefined]
    if (!data) return
    const { pathname } = data
    const dest: string | null = await tauriCore!.invoke('save_file_dialog', {
      defaultPath: pathPolyfill.dirname(pathname),
      filename: pathPolyfill.basename(pathname)
    })
    if (!dest) return null
    await tauriCore!.invoke('rename', { old_path: pathname, new_path: dest })
    return dest
  },
  // Export
  'mt::response-export': async (args: any[]): Promise<string | null | undefined> => {
    const [data] = args as [ExportData | undefined]
    if (!data) return
    const { type, content, pathname, title } = data
    const ext = type === 'pdf' ? '.pdf' : '.html'
    const basename = pathname ? pathPolyfill.basename(pathname, '.md') : (title || 'Untitled')
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
  'mt::ask-for-user-preference': async (): Promise<any> => {
    return await tauriCore!.invoke('get_preferences')
  },
  'mt::set-user-preference': async (args: any[]): Promise<void> => {
    const [data] = args
    if (data && typeof data === 'object') {
      await tauriCore!.invoke('set_preferences', { preferences: data })
    }
  },
  'mt::cmd-set-single-preference': async (args: any[]): Promise<void> => {
    const [key, value] = args as [string, any]
    await tauriCore!.invoke('set_preference', { key, value })
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
    return await tauriCore!.invoke('maximize_window')
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
  // No-op handlers for channels that don't need backend interaction
  'mt::set-title': async (): Promise<void> => {},
  'mt::send-initialized': async (): Promise<void> => {},
  'mt::editor-ready': async (): Promise<void> => {},
  'mt::update-line-ending-menu': async (): Promise<void> => {},
  'mt::update-text-direction-menu': async (): Promise<void> => {}
}

// Convert mt:: channel names to Tauri command names (fallback)
function channelToCommand (channel: string): string {
  return channel.replace(/^mt::/, '').replace(/-/g, '_')
}

function channelToEvent (channel: string): string {
  return channel
}

export const ipcRenderer = {
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
    const command = channelToCommand(channel)
    try {
      await tauriCore!.invoke(command, { args })
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
    const command = channelToCommand(channel)
    try {
      return await tauriCore!.invoke(command, { args })
    } catch (e) {
      console.error(`Tauri invoke error for ${channel}:`, e)
      throw e
    }
  },
  sendSync: (channel: string, ..._args: any[]): null => {
    console.warn('sendSync not supported in Tauri, returning null for:', channel)
    return null
  },
  on: (channel: string, callback: (event: any, payload: any) => void): (() => void) => {
    if (!isTauri()) return () => {}
    const unlisten = tauriReady.then(async () => {
      const eventName = channelToEvent(channel)
      const unsubscribe = await tauriEvent!.listen(eventName, (event) => {
        const fakeEvent = { sender: null }
        callback(fakeEvent, event.payload)
      })
      if (!eventListeners.has(channel)) {
        eventListeners.set(channel, [])
      }
      eventListeners.get(channel)!.push({ callback, unsubscribe })
      return unsubscribe
    })
    return () => {
      unlisten.then(fn => fn && fn())
    }
  },
  once: async (channel: string, callback: (event: any, payload: any) => void): Promise<void> => {
    if (!isTauri()) return
    await tauriReady
    const eventName = channelToEvent(channel)
    await tauriEvent!.once(eventName, (event) => {
      const fakeEvent = { sender: null }
      callback(fakeEvent, event.payload)
    })
  },
  removeAllListeners: (channel: string): void => {
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
      return await tauriClipboard!.readText() || ''
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
      await tauriCore!.invoke('rename', { old_path: oldPath, new_path: newPath })
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
  get constants (): { F_OK: number; R_OK: number; W_OK: number; X_OK: number } {
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
  get sep (): string { return pathPolyfill.sep },
  get delimiter (): string { return pathPolyfill.delimiter },
  get posix (): null { return null },
  get win32 (): null { return null }
}

// ============================================================================
// OS API using Tauri os plugin
// ============================================================================

export const os = {
  homedir: async (): Promise<string> => {
    if (!isTauri()) return ''
    await tauriReady
    try { return await tauriCore!.invoke('get_homedir') } catch (e) { return '' }
  },
  tmpdir: async (): Promise<string> => {
    if (!isTauri()) return ''
    await tauriReady
    try { return await tauriCore!.invoke('get_tmpdir') } catch (e) { return '' }
  },
  platform: async (): Promise<string> => {
    if (!isTauri()) return ''
    await tauriReady
    try { return await tauriCore!.invoke('get_platform') } catch (e) { return '' }
  },
  type: async (): Promise<string> => {
    if (!isTauri()) return ''
    await tauriReady
    try {
      const platform: string = await tauriCore!.invoke('get_platform')
      switch (platform) {
        case 'windows': return 'Windows_NT'
        case 'macos': return 'Darwin'
        case 'linux': return 'Linux'
        default: return platform
      }
    } catch (e) { return '' }
  },
  arch: async (): Promise<string> => {
    if (!isTauri()) return ''
    await tauriReady
    try { return await tauriCore!.invoke('get_arch') } catch (e) { return '' }
  },
  release: (): string => '',
  hostname: async (): Promise<string> => {
    if (!isTauri()) return ''
    await tauriReady
    try { return await tauriCore!.invoke('get_hostname') } catch (e) { return '' }
  },
  cpus: (): any[] => [],
  totalmem: (): number => 0,
  freemem: (): number => 0,
  get EOL (): string {
    return navigator.platform.startsWith('Win') ? '\r\n' : '\n'
  }
}

// ============================================================================
// Process info
// ============================================================================

export const processInfo = {
  get platform (): string {
    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.includes('win')) return 'win32'
    if (userAgent.includes('mac')) return 'darwin'
    if (userAgent.includes('linux')) return 'linux'
    return 'unknown'
  },
  get arch (): string {
    return navigator.userAgent.includes('x64') ? 'x64' : 'x86'
  },
  get versions (): Record<string, any> { return {} },
  get env (): Record<string, any> { return {} },
  cwd: (): string => '',
  get argv (): string[] { return [] },
  get execPath (): string { return '' },
  get pid (): number { return 0 },
  get ppid (): number { return 0 },
  get resourcesPath (): string { return '' }
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
  exec: async (command: string, options?: any, callback?: (err: Error | null, stdout?: string, stderr?: string) => void): Promise<any> => {
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
  execFile: (_file: string, _args?: string[], _options?: any, callback?: (err: Error | null, stdout?: string, stderr?: string) => void): null => {
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
// Menu event handler - listens for Tauri menu events and dispatches them
// ============================================================================

let menuEventInitialized = false
export function initMenuEvents (store: Store): void {
  if (menuEventInitialized || !isTauri()) return
  menuEventInitialized = true

  tauriReady.then(async () => {
    await tauriEvent!.listen('menu-event', (event) => {
      const menuId = event.payload as string
      handleMenuAction(menuId, store)
    })
  })
}

function handleMenuAction (menuId: string, store: Store): void {
  // Map menu IDs to Vuex store actions / mutations
  const menuActions: Record<string, () => void> = {
    // File
    'file.new-tab': () => store.dispatch('NEW_UNTITLED_TAB'),
    'file.new-window': () => ipcRenderer.send('mt::cmd-new-editor-window'),
    'file.open-file': () => handleOpenFile(store),
    'file.open-folder': () => handleOpenFolder(store),
    'file.save': () => store.dispatch('SAVE_FILE'),
    'file.save-as': () => store.dispatch('SAVE_FILE_AS'),
    'file.close-tab': () => store.dispatch('CLOSE_TAB'),
    'file.close-window': () => ipcRenderer.send('mt::cmd-close-window'),
    'file.preferences': () => ipcRenderer.send('mt::open-setting-window'),
    // Edit
    'edit.find': () => store.dispatch('SEARCH', { type: 'find' }),
    'edit.replace': () => store.dispatch('SEARCH', { type: 'replace' }),
    'edit.find-in-folder': () => store.dispatch('SEARCH', { type: 'folder' }),
    // Paragraph
    'paragraph.heading-1': () => store.dispatch('FORMAT', { type: 'heading', level: 1 }),
    'paragraph.heading-2': () => store.dispatch('FORMAT', { type: 'heading', level: 2 }),
    'paragraph.heading-3': () => store.dispatch('FORMAT', { type: 'heading', level: 3 }),
    'paragraph.heading-4': () => store.dispatch('FORMAT', { type: 'heading', level: 4 }),
    'paragraph.heading-5': () => store.dispatch('FORMAT', { type: 'heading', level: 5 }),
    'paragraph.heading-6': () => store.dispatch('FORMAT', { type: 'heading', level: 6 }),
    'paragraph.paragraph': () => store.dispatch('FORMAT', { type: 'paragraph' }),
    'paragraph.order-list': () => store.dispatch('FORMAT', { type: 'order-list' }),
    'paragraph.bullet-list': () => store.dispatch('FORMAT', { type: 'bullet-list' }),
    'paragraph.task-list': () => store.dispatch('FORMAT', { type: 'task-list' }),
    'paragraph.code-fence': () => store.dispatch('FORMAT', { type: 'pre' }),
    'paragraph.quote-block': () => store.dispatch('FORMAT', { type: 'blockquote' }),
    'paragraph.math-formula': () => store.dispatch('FORMAT', { type: 'mathblock' }),
    'paragraph.html-block': () => store.dispatch('FORMAT', { type: 'html' }),
    'paragraph.table': () => store.dispatch('FORMAT', { type: 'table' }),
    'paragraph.horizontal-line': () => store.dispatch('FORMAT', { type: 'hr' }),
    // Format
    'format.strong': () => store.dispatch('FORMAT', { type: 'strong' }),
    'format.emphasis': () => store.dispatch('FORMAT', { type: 'em' }),
    'format.underline': () => store.dispatch('FORMAT', { type: 'u' }),
    'format.superscript': () => store.dispatch('FORMAT', { type: 'sup' }),
    'format.subscript': () => store.dispatch('FORMAT', { type: 'sub' }),
    'format.highlight': () => store.dispatch('FORMAT', { type: 'mark' }),
    'format.inline-code': () => store.dispatch('FORMAT', { type: 'inline_code' }),
    'format.inline-math': () => store.dispatch('FORMAT', { type: 'inline_math' }),
    'format.strike': () => store.dispatch('FORMAT', { type: 'del' }),
    'format.hyperlink': () => store.dispatch('FORMAT', { type: 'link' }),
    'format.image': () => store.dispatch('FORMAT', { type: 'image' }),
    'format.clear-format': () => store.dispatch('FORMAT', { type: 'clear' }),
    // View
    'view.source-code-mode': () => store.dispatch('TOGGLE_VIEW_MODE'),
    'view.toggle-sidebar': () => store.commit('SET_LAYOUT', { showSideBar: !store.state.layout.showSideBar }),
    'view.toggle-tabbar': () => store.commit('SET_LAYOUT', { showTabBar: !store.state.layout.showTabBar }),
    'view.command-palette': () => store.commit('SET_LAYOUT', { showCommandPalette: true }),
    'view.zoom-in': () => {
      const current = webFrame.getZoomFactor()
      webFrame.setZoomFactor(Math.min(current + 0.1, 2.0))
    },
    'view.zoom-out': () => {
      const current = webFrame.getZoomFactor()
      webFrame.setZoomFactor(Math.max(current - 0.1, 0.5))
    },
    // Window
    'window.toggle-always-on-top': () => ipcRenderer.send('mt::window-toggle-always-on-top', true),
    // Help
    'help.quick-start': () => shell.openExternal('https://github.com/marktext/marktext/blob/develop/docs/QUICKSTART.md'),
    'help.markdown-reference': () => shell.openExternal('https://github.com/marktext/marktext/blob/develop/docs/MARKDOWN_SYNTAX.md'),
    'help.changelog': () => shell.openExternal('https://github.com/marktext/marktext/blob/develop/.github/CHANGELOG.md'),
    'help.about': () => {
      // Show about info via notification or dialog
      tauriReady.then(async () => {
        const version: string = await tauriCore!.invoke('get_app_version')
        alert(`MarkText v${version}\n\nA simple and elegant markdown editor.`)
      })
    }
  }

  const action = menuActions[menuId]
  if (action) {
    action()
  } else {
    console.warn('Unknown menu action:', menuId)
  }
}

async function handleOpenFile (store: Store): Promise<void> {
  await tauriReady
  const paths: string[] = await tauriCore!.invoke('open_file_dialog')
  if (paths && paths.length > 0) {
    for (const filePath of paths) {
      const doc: { markdown: string; filename: string; pathname: string } = await tauriCore!.invoke('read_markdown_file', { filePath })
      store.dispatch('NEW_TAB_WITH_CONTENT', {
        markdown: doc.markdown,
        filename: doc.filename,
        pathname: doc.pathname,
        options: {}
      })
      await tauriCore!.invoke('add_recent_document', { filePath })
    }
  }
}

async function handleOpenFolder (store: Store): Promise<void> {
  await tauriReady
  const folderPath: string = await tauriCore!.invoke('open_folder_dialog')
  if (folderPath) {
    store.dispatch('OPEN_FOLDER', folderPath)
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
// Tauri API object matching Electron's window.electronAPI interface
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
export function initTauriApi (): boolean {
  if (!isTauri()) return false

  if (typeof window !== 'undefined' && !window.electronAPI) {
    window.electronAPI = tauriApiObject
    window.__TAURI_API_INITIALIZED__ = true
    console.log('[Tauri] API bridge initialized, window.electronAPI is now available')
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
  initMenuEvents
}
