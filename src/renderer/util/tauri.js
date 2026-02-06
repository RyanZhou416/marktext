/**
 * Tauri API bridge for renderer process
 *
 * This module provides the same interface as electron.js but uses Tauri APIs.
 * It allows the renderer code to work with both Electron and Tauri backends.
 */

// Import pure JS path polyfill for synchronous path operations
import pathPolyfill from './pathPolyfill'

// Check if we're running in Tauri
const isTauri = () => {
  return typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined
}

// Lazy load Tauri APIs to avoid errors when not in Tauri context
let tauriCore = null
let tauriEvent = null
let tauriShell = null
let tauriDialog = null
let tauriClipboard = null
let tauriFs = null
let tauriOs = null
let tauriPath = null
let tauriProcess = null

const loadTauriApis = async () => {
  if (!isTauri()) return false
  try {
    tauriCore = await import('@tauri-apps/api/core')
    tauriEvent = await import('@tauri-apps/api/event')
    tauriShell = await import('@tauri-apps/plugin-shell')
    tauriDialog = await import('@tauri-apps/plugin-dialog')
    tauriClipboard = await import('@tauri-apps/plugin-clipboard-manager')
    tauriFs = await import('@tauri-apps/plugin-fs')
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
let tauriReady = loadTauriApis()

// Event listener management for IPC emulation
const eventListeners = new Map()

// ============================================================================
// IPC Renderer emulation - maps Electron IPC channels to Tauri commands/events
// ============================================================================

// High-level IPC channel handlers that map to specific Tauri commands
const ipcChannelHandlers = {
  // File operations
  'mt::response-file-save': async (args) => {
    const [data] = args
    if (!data) return
    const { pathname, markdown, filename, defaultPath, options } = data
    let savePath = pathname
    if (!savePath) {
      // New file - show save dialog
      savePath = await tauriCore.invoke('save_file_dialog', {
        defaultPath: defaultPath || null,
        filename: filename || 'Untitled.md'
      })
      if (!savePath) return // User cancelled
    }
    const result = await tauriCore.invoke('save_markdown_file', {
      filePath: savePath,
      content: markdown,
      encoding: options?.encoding || null
    })
    if (result.success) {
      await tauriCore.invoke('add_recent_document', { filePath: result.path })
    }
    return result
  },
  'mt::response-file-save-as': async (args) => {
    const [data] = args
    if (!data) return
    const { pathname, markdown, filename, options } = data
    const dir = pathname ? pathPolyfill.dirname(pathname) : null
    const savePath = await tauriCore.invoke('save_file_dialog', {
      defaultPath: dir,
      filename: filename || 'Untitled.md'
    })
    if (!savePath) return null
    const result = await tauriCore.invoke('save_markdown_file', {
      filePath: savePath,
      content: markdown,
      encoding: options?.encoding || null
    })
    if (result.success) {
      await tauriCore.invoke('add_recent_document', { filePath: result.path })
    }
    return result
  },
  'mt::save-tabs': async (args) => {
    const [unsavedFiles] = args
    if (!unsavedFiles || !unsavedFiles.length) return
    for (const file of unsavedFiles) {
      if (file.pathname) {
        await tauriCore.invoke('save_markdown_file', {
          filePath: file.pathname,
          content: file.markdown
        })
      }
    }
  },
  'mt::save-and-close-tabs': async (args) => {
    const [unsavedFiles] = args
    if (!unsavedFiles) return
    for (const file of unsavedFiles) {
      if (file.pathname) {
        await tauriCore.invoke('save_markdown_file', {
          filePath: file.pathname,
          content: file.markdown
        })
      }
    }
  },
  // File open operations
  'mt::cmd-open-file': async () => {
    const paths = await tauriCore.invoke('open_file_dialog')
    return paths
  },
  'mt::cmd-open-folder': async () => {
    const folderPath = await tauriCore.invoke('open_folder_dialog')
    return folderPath
  },
  // Window operations
  'mt::cmd-new-editor-window': async () => {
    return await tauriCore.invoke('create_editor_window', { filePath: null })
  },
  'mt::open-setting-window': async () => {
    return await tauriCore.invoke('create_settings_window', { page: null })
  },
  'mt::cmd-close-window': async () => {
    return await tauriCore.invoke('close_window')
  },
  // Move to trash
  'mt::response-file-move-to': async (args) => {
    const [data] = args
    if (!data) return
    const { pathname } = data
    const dest = await tauriCore.invoke('save_file_dialog', {
      defaultPath: pathPolyfill.dirname(pathname),
      filename: pathPolyfill.basename(pathname)
    })
    if (!dest) return null
    await tauriCore.invoke('rename', { old_path: pathname, new_path: dest })
    return dest
  },
  // Export
  'mt::response-export': async (args) => {
    const [data] = args
    if (!data) return
    const { type, content, pathname, title } = data
    const ext = type === 'pdf' ? '.pdf' : '.html'
    const basename = pathname ? pathPolyfill.basename(pathname, '.md') : (title || 'Untitled')
    const filePath = await tauriCore.invoke('export_file_dialog', {
      exportType: type,
      defaultPath: pathname ? pathPolyfill.dirname(pathname) : null,
      filename: basename + ext
    })
    if (!filePath) return null
    if (type === 'styledHtml' || type === 'html') {
      await tauriCore.invoke('export_html', { filePath, content })
    }
    // PDF export is handled by window.print() on the frontend side
    return filePath
  },
  // Preferences
  'mt::ask-for-user-preference': async () => {
    return await tauriCore.invoke('get_preferences')
  },
  'mt::set-user-preference': async (args) => {
    const [data] = args
    if (data && typeof data === 'object') {
      await tauriCore.invoke('set_preferences', { preferences: data })
    }
  },
  'mt::cmd-set-single-preference': async (args) => {
    const [key, value] = args
    await tauriCore.invoke('set_preference', { key, value })
  },
  // Recent documents
  'mt::get-recent-documents': async () => {
    return await tauriCore.invoke('get_recent_documents')
  },
  'mt::clear-recent-documents': async () => {
    return await tauriCore.invoke('clear_recent_documents')
  },
  // Image
  'mt::pick-image': async () => {
    return await tauriCore.invoke('pick_image_dialog')
  },
  'mt::get-image-completions': async (args) => {
    const [directory, query] = args
    return await tauriCore.invoke('get_image_completions', { directory, query })
  },
  'mt::copy-image-to-folder': async (args) => {
    const [source, destDir] = args
    return await tauriCore.invoke('copy_image_to_folder', { source, destDir })
  },
  // File watcher
  'mt::watch-file': async (args) => {
    const [filePath] = args
    return await tauriCore.invoke('watch_file', { filePath })
  },
  'mt::watch-directory': async (args) => {
    const [dirPath] = args
    return await tauriCore.invoke('watch_directory', { dirPath })
  },
  'mt::unwatch': async (args) => {
    const [watchPath] = args
    return await tauriCore.invoke('unwatch', { watchPath })
  },
  'mt::unwatch-all': async () => {
    return await tauriCore.invoke('unwatch_all')
  },
  // Keybindings
  'mt::get-keybindings': async () => {
    return await tauriCore.invoke('get_keybindings')
  },
  'mt::save-keybindings': async (args) => {
    const [keybindings] = args
    return await tauriCore.invoke('save_user_keybindings', { keybindings })
  },
  // Pandoc
  'mt::check-pandoc': async () => {
    return await tauriCore.invoke('check_pandoc')
  },
  'mt::import-with-pandoc': async (args) => {
    const [filePath] = args
    return await tauriCore.invoke('import_with_pandoc', { filePath })
  },
  // Spellcheck
  'mt::get-custom-dictionary': async () => {
    return await tauriCore.invoke('get_custom_dictionary')
  },
  'mt::add-to-dictionary': async (args) => {
    const [word] = args
    return await tauriCore.invoke('add_to_dictionary', { word })
  },
  'mt::remove-from-dictionary': async (args) => {
    const [word] = args
    return await tauriCore.invoke('remove_from_dictionary', { word })
  },
  // Trash
  'mt::response-file-trash': async (args) => {
    const [data] = args
    if (!data) return
    const { pathname } = data
    return await tauriCore.invoke('trash_file', { filePath: pathname })
  },
  // Window state
  'mt::window-minimize': async () => {
    return await tauriCore.invoke('minimize_window')
  },
  'mt::window-maximize': async () => {
    return await tauriCore.invoke('maximize_window')
  },
  'mt::window-close': async () => {
    return await tauriCore.invoke('close_window')
  },
  'mt::window-toggle-fullscreen': async () => {
    const state = await tauriCore.invoke('get_window_state')
    return await tauriCore.invoke('set_fullscreen', { fullscreen: !state.isFullscreen })
  },
  'mt::window-toggle-always-on-top': async (args) => {
    const [alwaysOnTop] = args
    return await tauriCore.invoke('set_always_on_top', { alwaysOnTop: !!alwaysOnTop })
  },
  // No-op handlers for channels that don't need backend interaction
  'mt::set-title': async () => {},
  'mt::send-initialized': async () => {},
  'mt::editor-ready': async () => {},
  'mt::update-line-ending-menu': async () => {},
  'mt::update-text-direction-menu': async () => {}
}

// Convert mt:: channel names to Tauri command names (fallback)
function channelToCommand (channel) {
  return channel.replace(/^mt::/, '').replace(/-/g, '_')
}

function channelToEvent (channel) {
  return channel
}

export const ipcRenderer = {
  send: async (channel, ...args) => {
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
      await tauriCore.invoke(command, { args })
    } catch (e) {
      console.warn(`Tauri invoke fallback for ${channel} (${command}):`, e.message || e)
    }
  },
  invoke: async (channel, ...args) => {
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
      return await tauriCore.invoke(command, { args })
    } catch (e) {
      console.error(`Tauri invoke error for ${channel}:`, e)
      throw e
    }
  },
  sendSync: (channel, ...args) => {
    console.warn('sendSync not supported in Tauri, returning null for:', channel)
    return null
  },
  on: (channel, callback) => {
    if (!isTauri()) return () => {}
    const unlisten = tauriReady.then(async () => {
      const eventName = channelToEvent(channel)
      const unsubscribe = await tauriEvent.listen(eventName, (event) => {
        const fakeEvent = { sender: null }
        callback(fakeEvent, event.payload)
      })
      if (!eventListeners.has(channel)) {
        eventListeners.set(channel, [])
      }
      eventListeners.get(channel).push({ callback, unsubscribe })
      return unsubscribe
    })
    return () => {
      unlisten.then(fn => fn && fn())
    }
  },
  once: async (channel, callback) => {
    if (!isTauri()) return
    await tauriReady
    const eventName = channelToEvent(channel)
    await tauriEvent.once(eventName, (event) => {
      const fakeEvent = { sender: null }
      callback(fakeEvent, event.payload)
    })
  },
  removeAllListeners: (channel) => {
    if (eventListeners.has(channel)) {
      const listeners = eventListeners.get(channel)
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
  openExternal: async (url, options) => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      await tauriShell.open(url)
    } catch (e) {
      console.error('Failed to open external:', e)
      throw e
    }
  },
  openPath: async (path) => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      await tauriShell.open(path)
      return ''
    } catch (e) {
      console.error('Failed to open path:', e)
      return e.message
    }
  },
  showItemInFolder: async (fullPath) => {
    if (!isTauri()) return
    await tauriReady
    try {
      // Reveal parent folder and select the item
      const dir = pathPolyfill.dirname(fullPath)
      await tauriShell.open(dir)
    } catch (e) {
      console.error('Failed to show item in folder:', e)
    }
  },
  beep: () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
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
  readText: async (type) => {
    if (!isTauri()) return ''
    await tauriReady
    try {
      return await tauriClipboard.readText() || ''
    } catch (e) {
      console.error('Failed to read clipboard:', e)
      return ''
    }
  },
  writeText: async (text, type) => {
    if (!isTauri()) return
    await tauriReady
    try {
      await tauriClipboard.writeText(text)
    } catch (e) {
      console.error('Failed to write clipboard:', e)
    }
  },
  readHTML: async (type) => '',
  writeHTML: async (markup, type) => {
    if (!isTauri()) return
    await tauriReady
    try {
      await tauriClipboard.writeText(markup)
    } catch (e) {
      console.error('Failed to write HTML to clipboard:', e)
    }
  },
  readRTF: (type) => '',
  writeRTF: (text, type) => {},
  readBookmark: () => ({ title: '', url: '' }),
  writeBookmark: (title, url, type) => {},
  readFindText: () => '',
  writeFindText: (text) => {},
  clear: async (type) => {
    if (!isTauri()) return
    await tauriReady
    try {
      await tauriClipboard.writeText('')
    } catch (e) {
      console.error('Failed to clear clipboard:', e)
    }
  },
  availableFormats: (type) => [],
  has: (format, type) => false,
  read: (format) => '',
  readBuffer: (format) => new Uint8Array(0),
  writeBuffer: (format, buffer, type) => {},
  write: (data, type) => {}
}

// ============================================================================
// Native Image API - limited support in Tauri
// ============================================================================

export const nativeImage = {
  createEmpty: () => null,
  createFromPath: (path) => null,
  createFromBuffer: (buffer, options) => null,
  createFromDataURL: (dataURL) => null
}

// ============================================================================
// WebFrame API - use CSS zoom
// ============================================================================

export const webFrame = {
  setZoomFactor: (factor) => {
    document.body.style.zoom = factor
  },
  getZoomFactor: () => {
    return parseFloat(document.body.style.zoom) || 1
  },
  setZoomLevel: (level) => {
    const factor = Math.pow(1.2, level)
    document.body.style.zoom = factor
  },
  getZoomLevel: () => {
    const factor = parseFloat(document.body.style.zoom) || 1
    return Math.log(factor) / Math.log(1.2)
  }
}

// ============================================================================
// WebUtils API - for drag & drop file path access
// ============================================================================

export const webUtils = {
  getPathForFile: (file) => {
    return file.path || file.name || ''
  }
}

// ============================================================================
// File System API using Tauri fs plugin + Rust commands
// ============================================================================

export const fs = {
  readFile: async (filePath, options) => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      const content = await tauriFs.readTextFile(filePath)
      return content
    } catch (e) {
      throw new Error(`Failed to read file: ${e.message}`)
    }
  },
  readFileSync: (filePath, options) => {
    console.warn('readFileSync not supported in Tauri, use async version')
    return null
  },
  readdir: async (dirPath, options) => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      const entries = await tauriFs.readDir(dirPath)
      return entries.map(e => e.name)
    } catch (e) {
      throw new Error(`Failed to read directory: ${e.message}`)
    }
  },
  readdirSync: (dirPath, options) => {
    console.warn('readdirSync not supported in Tauri')
    return []
  },
  stat: async (filePath, options) => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      const stat = await tauriCore.invoke('stat', { path: filePath })
      return {
        isFile: () => stat.is_file,
        isDirectory: () => stat.is_directory,
        isSymbolicLink: () => stat.is_symlink,
        size: stat.size,
        mtime: stat.modified ? new Date(stat.modified) : null,
        ctime: stat.created ? new Date(stat.created) : null,
        atime: stat.accessed ? new Date(stat.accessed) : null
      }
    } catch (e) {
      throw new Error(`Failed to stat: ${e.message}`)
    }
  },
  statSync: (filePath) => {
    console.warn('statSync not supported in Tauri')
    return null
  },
  lstat: async (filePath, options) => {
    return fs.stat(filePath, options)
  },
  lstatSync: (filePath) => null,
  access: async (filePath, mode) => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      const exists = await tauriCore.invoke('exists', { path: filePath })
      if (!exists) throw new Error('File does not exist')
    } catch (e) {
      throw e
    }
  },
  accessSync: (filePath, mode) => {},
  existsSync: (filePath) => {
    console.warn('existsSync not supported in Tauri')
    return false
  },
  realpath: async (filePath, options) => filePath,
  realpathSync: (filePath, options) => filePath,
  readlink: async (filePath, options) => filePath,
  readlinkSync: (filePath, options) => null,
  writeFile: async (filePath, data, options) => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      await tauriFs.writeTextFile(filePath, data)
    } catch (e) {
      throw new Error(`Failed to write file: ${e.message}`)
    }
  },
  writeFileSync: (filePath, data, options) => {
    console.warn('writeFileSync not supported in Tauri')
  },
  appendFile: async (filePath, data, options) => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      const existing = await tauriFs.readTextFile(filePath).catch(() => '')
      await tauriFs.writeTextFile(filePath, existing + data)
    } catch (e) {
      throw new Error(`Failed to append file: ${e.message}`)
    }
  },
  mkdir: async (dirPath, options) => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      await tauriCore.invoke('mkdir', {
        path: dirPath,
        recursive: options?.recursive || false
      })
    } catch (e) {
      throw new Error(`Failed to create directory: ${e.message}`)
    }
  },
  mkdirSync: (dirPath, options) => {
    console.warn('mkdirSync not supported in Tauri')
  },
  rename: async (oldPath, newPath) => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      await tauriCore.invoke('rename', { old_path: oldPath, new_path: newPath })
    } catch (e) {
      throw new Error(`Failed to rename: ${e.message}`)
    }
  },
  renameSync: (oldPath, newPath) => {
    console.warn('renameSync not supported in Tauri')
  },
  unlink: async (filePath) => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      await tauriCore.invoke('remove', { path: filePath })
    } catch (e) {
      throw new Error(`Failed to remove file: ${e.message}`)
    }
  },
  unlinkSync: (filePath) => {
    console.warn('unlinkSync not supported in Tauri')
  },
  rmdir: async (dirPath, options) => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      await tauriCore.invoke('remove', {
        path: dirPath,
        recursive: options?.recursive || false
      })
    } catch (e) {
      throw new Error(`Failed to remove directory: ${e.message}`)
    }
  },
  rm: async (filePath, options) => {
    return fs.unlink(filePath)
  },
  copyFile: async (src, dest, mode) => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    try {
      await tauriCore.invoke('copy_file', { source: src, dest })
    } catch (e) {
      throw new Error(`Failed to copy file: ${e.message}`)
    }
  },
  copyFileSync: (src, dest, mode) => {
    console.warn('copyFileSync not supported in Tauri')
  },
  createReadStream: (filePath, options) => null,
  createWriteStream: (filePath, options) => null,
  watch: (filePath, options, listener) => null,
  watchFile: (filename, options, listener) => {},
  unwatchFile: (filename, listener) => {},
  get constants () {
    return { F_OK: 0, R_OK: 4, W_OK: 2, X_OK: 1 }
  }
}

// ============================================================================
// Ensure fs-extra compatibility (ensureDir, pathExists, etc.)
// ============================================================================

fs.ensureDir = async (dirPath) => {
  return fs.mkdir(dirPath, { recursive: true })
}
fs.ensureDirSync = (dirPath) => {
  console.warn('ensureDirSync not supported in Tauri')
}
fs.pathExists = async (filePath) => {
  try {
    await tauriReady
    return await tauriCore.invoke('exists', { path: filePath })
  } catch {
    return false
  }
}
fs.pathExistsSync = (filePath) => false
fs.outputFile = async (filePath, data, options) => {
  const dir = pathPolyfill.dirname(filePath)
  await fs.ensureDir(dir)
  return fs.writeFile(filePath, data, options)
}
fs.readJson = async (filePath) => {
  const content = await fs.readFile(filePath)
  return JSON.parse(content)
}
fs.writeJson = async (filePath, data, options) => {
  const content = JSON.stringify(data, null, options?.spaces || 2)
  return fs.writeFile(filePath, content)
}
fs.remove = async (filePath) => {
  try {
    await tauriReady
    await tauriCore.invoke('remove', { path: filePath, recursive: true })
  } catch (e) {
    // ignore if not found
  }
}

// ============================================================================
// Path API - Use pure JS polyfill for synchronous operations (required by Muya)
// ============================================================================

export const path = {
  join: (...args) => pathPolyfill.join(...args),
  resolve: (...args) => pathPolyfill.resolve(...args),
  dirname: (filePath) => pathPolyfill.dirname(filePath),
  basename: (filePath, ext) => pathPolyfill.basename(filePath, ext),
  extname: (filePath) => pathPolyfill.extname(filePath),
  parse: (filePath) => pathPolyfill.parse(filePath),
  format: (pathObject) => pathPolyfill.format(pathObject),
  normalize: (filePath) => pathPolyfill.normalize(filePath),
  isAbsolute: (filePath) => pathPolyfill.isAbsolute(filePath),
  relative: (from, to) => pathPolyfill.relative(from, to),
  get sep () { return pathPolyfill.sep },
  get delimiter () { return pathPolyfill.delimiter },
  get posix () { return null },
  get win32 () { return null }
}

// ============================================================================
// OS API using Tauri os plugin
// ============================================================================

export const os = {
  homedir: async () => {
    if (!isTauri()) return ''
    await tauriReady
    try { return await tauriCore.invoke('get_homedir') } catch (e) { return '' }
  },
  tmpdir: async () => {
    if (!isTauri()) return ''
    await tauriReady
    try { return await tauriCore.invoke('get_tmpdir') } catch (e) { return '' }
  },
  platform: async () => {
    if (!isTauri()) return ''
    await tauriReady
    try { return await tauriCore.invoke('get_platform') } catch (e) { return '' }
  },
  type: async () => {
    if (!isTauri()) return ''
    await tauriReady
    try {
      const platform = await tauriCore.invoke('get_platform')
      switch (platform) {
        case 'windows': return 'Windows_NT'
        case 'macos': return 'Darwin'
        case 'linux': return 'Linux'
        default: return platform
      }
    } catch (e) { return '' }
  },
  arch: async () => {
    if (!isTauri()) return ''
    await tauriReady
    try { return await tauriCore.invoke('get_arch') } catch (e) { return '' }
  },
  release: () => '',
  hostname: async () => {
    if (!isTauri()) return ''
    await tauriReady
    try { return await tauriCore.invoke('get_hostname') } catch (e) { return '' }
  },
  cpus: () => [],
  totalmem: () => 0,
  freemem: () => 0,
  get EOL () {
    return navigator.platform.startsWith('Win') ? '\r\n' : '\n'
  }
}

// ============================================================================
// Process info
// ============================================================================

export const processInfo = {
  get platform () {
    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.includes('win')) return 'win32'
    if (userAgent.includes('mac')) return 'darwin'
    if (userAgent.includes('linux')) return 'linux'
    return 'unknown'
  },
  get arch () {
    return navigator.userAgent.includes('x64') ? 'x64' : 'x86'
  },
  get versions () { return {} },
  get env () { return {} },
  cwd: () => '',
  get argv () { return [] },
  get execPath () { return '' },
  get pid () { return 0 },
  get ppid () { return 0 },
  get resourcesPath () { return '' }
}

// ============================================================================
// Crypto API - use Web Crypto API
// ============================================================================

export const crypto = {
  createHash: (algorithm) => {
    let data = new Uint8Array()
    return {
      update: function (input) {
        const encoder = new TextEncoder()
        const inputBytes = typeof input === 'string' ? encoder.encode(input) : input
        const newData = new Uint8Array(data.length + inputBytes.length)
        newData.set(data)
        newData.set(inputBytes, data.length)
        data = newData
        return this
      },
      digest: async function (encoding) {
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
  randomBytes: (size) => {
    const bytes = new Uint8Array(size)
    window.crypto.getRandomValues(bytes)
    return bytes
  },
  randomUUID: () => {
    return window.crypto.randomUUID()
  }
}

// ============================================================================
// Child Process API - limited support via Tauri shell
// ============================================================================

export const childProcess = {
  spawn: (command, args, options) => {
    console.warn('spawn not fully supported in Tauri')
    return null
  },
  exec: async (command, options, callback) => {
    if (!isTauri()) {
      if (callback) callback(new Error('Tauri API not available'))
      return null
    }
    await tauriReady
    try {
      const result = await tauriShell.Command.create('cmd', ['/c', command]).execute()
      if (callback) callback(null, result.stdout, result.stderr)
      return result
    } catch (e) {
      if (callback) callback(e)
      return null
    }
  },
  execFile: (file, args, options, callback) => {
    console.warn('execFile not fully supported in Tauri')
    if (callback) callback(new Error('Not supported'))
    return null
  },
  execSync: (command, options) => {
    console.warn('execSync not supported in Tauri')
    return null
  },
  execFileSync: (file, args, options) => {
    console.warn('execFileSync not supported in Tauri')
    return null
  },
  spawnSync: (command, args, options) => {
    console.warn('spawnSync not supported in Tauri')
    return null
  }
}

// ============================================================================
// Platform detection
// ============================================================================

const detectPlatform = () => {
  const userAgent = navigator.userAgent.toLowerCase()
  return {
    isOsx: userAgent.includes('mac'),
    isWindows: userAgent.includes('win'),
    isLinux: userAgent.includes('linux'),
    isMas: false
  }
}

const platformInfo = detectPlatform()

export const isOsx = platformInfo.isOsx
export const isWindows = platformInfo.isWindows
export const isLinux = platformInfo.isLinux
export const isMas = platformInfo.isMas

// ============================================================================
// Menu event handler - listens for Tauri menu events and dispatches them
// ============================================================================

let menuEventInitialized = false
export function initMenuEvents (store) {
  if (menuEventInitialized || !isTauri()) return
  menuEventInitialized = true

  tauriReady.then(async () => {
    await tauriEvent.listen('menu-event', (event) => {
      const menuId = event.payload
      handleMenuAction(menuId, store)
    })
  })
}

function handleMenuAction (menuId, store) {
  // Map menu IDs to Vuex store actions / mutations
  const menuActions = {
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
        const version = await tauriCore.invoke('get_app_version')
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

async function handleOpenFile (store) {
  await tauriReady
  const paths = await tauriCore.invoke('open_file_dialog')
  if (paths && paths.length > 0) {
    for (const filePath of paths) {
      const doc = await tauriCore.invoke('read_markdown_file', { filePath })
      store.dispatch('NEW_TAB_WITH_CONTENT', {
        markdown: doc.markdown,
        filename: doc.filename,
        pathname: doc.pathname,
        options: {}
      })
      await tauriCore.invoke('add_recent_document', { filePath })
    }
  }
}

async function handleOpenFolder (store) {
  await tauriReady
  const folderPath = await tauriCore.invoke('open_folder_dialog')
  if (folderPath) {
    store.dispatch('OPEN_FOLDER', folderPath)
  }
}

// ============================================================================
// Static path / App path
// ============================================================================

export const getStaticPath = async () => {
  if (!isTauri()) return null
  await tauriReady
  try {
    return await tauriCore.invoke('get_app_path', { name: 'resource' })
  } catch (e) {
    return null
  }
}

export const isTauriAvailable = isTauri

// ============================================================================
// Tauri API object matching Electron's window.electronAPI interface
// ============================================================================

const tauriApiObject = {
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
export function initTauriApi () {
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
