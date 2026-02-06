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

// IPC Renderer emulation using Tauri invoke and events
export const ipcRenderer = {
  send: async (channel, ...args) => {
    if (!isTauri()) return
    await tauriReady
    // Convert IPC channel to Tauri command
    const command = channelToCommand(channel)
    try {
      await tauriCore.invoke(command, { args })
    } catch (e) {
      console.error(`Tauri invoke error for ${channel}:`, e)
    }
  },
  invoke: async (channel, ...args) => {
    if (!isTauri()) return Promise.reject(new Error('Tauri API not available'))
    await tauriReady
    const command = channelToCommand(channel)
    try {
      return await tauriCore.invoke(command, { args })
    } catch (e) {
      console.error(`Tauri invoke error for ${channel}:`, e)
      throw e
    }
  },
  sendSync: (channel, ...args) => {
    // Tauri doesn't support sync IPC - return null
    console.warn('sendSync not supported in Tauri, returning null for:', channel)
    return null
  },
  on: (channel, callback) => {
    if (!isTauri()) return () => {}
    const unlisten = tauriReady.then(async () => {
      const eventName = channelToEvent(channel)
      const unsubscribe = await tauriEvent.listen(eventName, (event) => {
        // Emulate Electron's event object
        const fakeEvent = { sender: null }
        callback(fakeEvent, event.payload)
      })
      // Store for cleanup
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

// Convert mt:: channel names to Tauri command names
function channelToCommand (channel) {
  // mt::get-available-fonts -> get_available_fonts
  return channel
    .replace(/^mt::/, '')
    .replace(/-/g, '_')
}

function channelToEvent (channel) {
  // Keep original format for events
  return channel
}

// Shell API using Tauri shell plugin
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
    // Use Tauri's reveal in file manager
    try {
      // This requires the shell plugin with proper permissions
      await tauriShell.open(fullPath)
    } catch (e) {
      console.error('Failed to show item in folder:', e)
    }
  },
  beep: () => {
    // Use web audio API for beep
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

// Clipboard API using Tauri clipboard plugin
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
  readHTML: async (type) => {
    // Tauri clipboard plugin doesn't support HTML directly
    // Return empty for now
    return ''
  },
  writeHTML: async (markup, type) => {
    // Tauri clipboard plugin doesn't support HTML directly
    // Write as text instead
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

// Native Image API - limited support in Tauri
export const nativeImage = {
  createEmpty: () => null,
  createFromPath: (path) => null,
  createFromBuffer: (buffer, options) => null,
  createFromDataURL: (dataURL) => null
}

// WebFrame API - limited support, use CSS zoom instead
export const webFrame = {
  setZoomFactor: (factor) => {
    document.body.style.zoom = factor
  },
  getZoomFactor: () => {
    return parseFloat(document.body.style.zoom) || 1
  },
  setZoomLevel: (level) => {
    // Convert zoom level to factor: factor = 1.2^level
    const factor = Math.pow(1.2, level)
    document.body.style.zoom = factor
  },
  getZoomLevel: () => {
    const factor = parseFloat(document.body.style.zoom) || 1
    return Math.log(factor) / Math.log(1.2)
  }
}

// WebUtils API - for drag & drop file path access
export const webUtils = {
  getPathForFile: (file) => {
    // In Tauri, we can use the file's path property if available
    // or fall back to the name
    return file.path || file.name || ''
  }
}

// File System API using Tauri fs plugin
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
    // Same as stat for now
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
  realpath: async (filePath, options) => {
    // Return the path as-is for now
    return filePath
  },
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
    return {
      F_OK: 0,
      R_OK: 4,
      W_OK: 2,
      X_OK: 1
    }
  }
}

// Path API - Use pure JS polyfill for synchronous operations (required by Muya)
// This ensures compatibility without async calls
export const path = {
  // Synchronous operations using pure JS polyfill
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
  get sep () {
    return pathPolyfill.sep
  },
  get delimiter () {
    return pathPolyfill.delimiter
  },
  get posix () {
    return null
  },
  get win32 () {
    return null
  }
}

// OS API using Tauri os plugin
export const os = {
  homedir: async () => {
    if (!isTauri()) return ''
    await tauriReady
    try {
      return await tauriCore.invoke('get_homedir')
    } catch (e) {
      return ''
    }
  },
  tmpdir: async () => {
    if (!isTauri()) return ''
    await tauriReady
    try {
      return await tauriCore.invoke('get_tmpdir')
    } catch (e) {
      return ''
    }
  },
  platform: async () => {
    if (!isTauri()) return ''
    await tauriReady
    try {
      return await tauriCore.invoke('get_platform')
    } catch (e) {
      return ''
    }
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
    } catch (e) {
      return ''
    }
  },
  arch: async () => {
    if (!isTauri()) return ''
    await tauriReady
    try {
      return await tauriCore.invoke('get_arch')
    } catch (e) {
      return ''
    }
  },
  release: () => '',
  hostname: async () => {
    if (!isTauri()) return ''
    await tauriReady
    try {
      return await tauriCore.invoke('get_hostname')
    } catch (e) {
      return ''
    }
  },
  cpus: () => [],
  totalmem: () => 0,
  freemem: () => 0,
  get EOL () {
    return navigator.platform.startsWith('Win') ? '\r\n' : '\n'
  }
}

// Process info
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
  get versions () {
    return {}
  },
  get env () {
    return {}
  },
  cwd: () => '',
  get argv () {
    return []
  },
  get execPath () {
    return ''
  },
  get pid () {
    return 0
  },
  get ppid () {
    return 0
  },
  get resourcesPath () {
    return ''
  }
}

// Crypto API - use Web Crypto API
export const crypto = {
  createHash: (algorithm) => {
    // Return a hash-like object using Web Crypto API
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

// Child Process API - limited support via Tauri shell
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
      if (callback) {
        callback(null, result.stdout, result.stderr)
      }
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

// Platform detection
const detectPlatform = () => {
  const userAgent = navigator.userAgent.toLowerCase()
  return {
    isOsx: userAgent.includes('mac'),
    isWindows: userAgent.includes('win'),
    isLinux: userAgent.includes('linux'),
    isMas: false // Mac App Store - not applicable for Tauri
  }
}

const platformInfo = detectPlatform()

export const isOsx = platformInfo.isOsx
export const isWindows = platformInfo.isWindows
export const isLinux = platformInfo.isLinux
export const isMas = platformInfo.isMas

// Static path - will be set by Tauri
export const getStaticPath = async () => {
  if (!isTauri()) return null
  await tauriReady
  try {
    return await tauriCore.invoke('get_app_path', { name: 'resource' })
  } catch (e) {
    return null
  }
}

// Check if Tauri is available
export const isTauriAvailable = isTauri

// Tauri API object matching Electron's window.electronAPI interface
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
  staticPath: null // Will be set during init
}

/**
 * Initialize Tauri API bridge
 * Sets up window.electronAPI for Muya and other components that expect it
 */
export function initTauriApi () {
  if (!isTauri()) return false

  // Set up window.electronAPI for compatibility with Muya and other components
  // This allows Muya to use path and webUtils without knowing about Tauri
  if (typeof window !== 'undefined' && !window.electronAPI) {
    window.electronAPI = tauriApiObject
    window.__TAURI_API_INITIALIZED__ = true
    console.log('[Tauri] API bridge initialized, window.electronAPI is now available')
  }

  return true
}

// Auto-initialize when loaded in Tauri context
if (isTauri()) {
  // Wait for DOM to be ready before initializing
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
  initTauriApi
}
