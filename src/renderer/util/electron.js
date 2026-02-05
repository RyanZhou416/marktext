/**
 * Electron API bridge for renderer process
 *
 * 渲染进程现代化：通过 preload 脚本安全暴露的 API 访问 Electron 和 Node.js 功能。
 * 所有 API 通过 window.electronAPI 访问，由 preload 脚本通过 contextBridge 暴露。
 */

// Check if preload is loaded
const isPreloadLoaded = () => {
  return typeof window !== 'undefined' && window.__ELECTRON_PRELOAD_LOADED__ === true
}

// Get the electronAPI object
const getElectronAPI = () => {
  if (!isPreloadLoaded()) {
    console.error(
      'Preload script not loaded. Make sure contextIsolation is enabled and preload script is configured.'
    )
    return null
  }
  return window.electronAPI
}

// IPC Renderer
export const ipcRenderer = {
  send: (channel, ...args) => {
    const api = getElectronAPI()
    if (api) {
      api.ipcRenderer.send(channel, ...args)
    }
  },
  invoke: (channel, ...args) => {
    const api = getElectronAPI()
    if (api) {
      return api.ipcRenderer.invoke(channel, ...args)
    }
    return Promise.reject(new Error('Electron API not available'))
  },
  sendSync: (channel, ...args) => {
    const api = getElectronAPI()
    if (api) {
      return api.ipcRenderer.sendSync(channel, ...args)
    }
    return null
  },
  on: (channel, callback) => {
    const api = getElectronAPI()
    if (api) {
      return api.ipcRenderer.on(channel, callback)
    }
    return () => {}
  },
  once: (channel, callback) => {
    const api = getElectronAPI()
    if (api) {
      api.ipcRenderer.once(channel, callback)
    }
  },
  removeAllListeners: (channel) => {
    const api = getElectronAPI()
    if (api) {
      api.ipcRenderer.removeAllListeners(channel)
    }
  }
}

// Shell API
export const shell = {
  openExternal: (url, options) => {
    const api = getElectronAPI()
    if (api) {
      return api.shell.openExternal(url, options)
    }
    return Promise.reject(new Error('Electron API not available'))
  },
  openPath: (path) => {
    const api = getElectronAPI()
    if (api) {
      return api.shell.openPath(path)
    }
    return Promise.reject(new Error('Electron API not available'))
  },
  showItemInFolder: (fullPath) => {
    const api = getElectronAPI()
    if (api) {
      api.shell.showItemInFolder(fullPath)
    }
  },
  beep: () => {
    const api = getElectronAPI()
    if (api) {
      api.shell.beep()
    }
  }
}

// Clipboard API
export const clipboard = {
  readText: (type) => {
    const api = getElectronAPI()
    return api ? api.clipboard.readText(type) : ''
  },
  writeText: (text, type) => {
    const api = getElectronAPI()
    if (api) {
      api.clipboard.writeText(text, type)
    }
  },
  readHTML: (type) => {
    const api = getElectronAPI()
    return api ? api.clipboard.readHTML(type) : ''
  },
  writeHTML: (markup, type) => {
    const api = getElectronAPI()
    if (api) {
      api.clipboard.writeHTML(markup, type)
    }
  },
  readRTF: (type) => {
    const api = getElectronAPI()
    return api ? api.clipboard.readRTF(type) : ''
  },
  writeRTF: (text, type) => {
    const api = getElectronAPI()
    if (api) {
      api.clipboard.writeRTF(text, type)
    }
  },
  readBookmark: () => {
    const api = getElectronAPI()
    return api ? api.clipboard.readBookmark() : { title: '', url: '' }
  },
  writeBookmark: (title, url, type) => {
    const api = getElectronAPI()
    if (api) {
      api.clipboard.writeBookmark(title, url, type)
    }
  },
  readFindText: () => {
    const api = getElectronAPI()
    return api ? api.clipboard.readFindText() : ''
  },
  writeFindText: (text) => {
    const api = getElectronAPI()
    if (api) {
      api.clipboard.writeFindText(text)
    }
  },
  clear: (type) => {
    const api = getElectronAPI()
    if (api) {
      api.clipboard.clear(type)
    }
  },
  availableFormats: (type) => {
    const api = getElectronAPI()
    return api ? api.clipboard.availableFormats(type) : []
  },
  has: (format, type) => {
    const api = getElectronAPI()
    return api ? api.clipboard.has(format, type) : false
  },
  read: (format) => {
    const api = getElectronAPI()
    return api ? api.clipboard.read(format) : ''
  },
  readBuffer: (format) => {
    const api = getElectronAPI()
    return api ? api.clipboard.readBuffer(format) : new Uint8Array(0)
  },
  writeBuffer: (format, buffer, type) => {
    const api = getElectronAPI()
    if (api) {
      api.clipboard.writeBuffer(format, buffer, type)
    }
  },
  write: (data, type) => {
    const api = getElectronAPI()
    if (api) {
      api.clipboard.write(data, type)
    }
  }
}

// Native Image API
export const nativeImage = {
  createEmpty: () => {
    const api = getElectronAPI()
    return api ? api.nativeImage.createEmpty() : null
  },
  createFromPath: (path) => {
    const api = getElectronAPI()
    return api ? api.nativeImage.createFromPath(path) : null
  },
  createFromBuffer: (buffer, options) => {
    const api = getElectronAPI()
    return api ? api.nativeImage.createFromBuffer(buffer, options) : null
  },
  createFromDataURL: (dataURL) => {
    const api = getElectronAPI()
    return api ? api.nativeImage.createFromDataURL(dataURL) : null
  }
}

// WebFrame API
export const webFrame = {
  setZoomFactor: (factor) => {
    const api = getElectronAPI()
    if (api && api.webFrame) {
      api.webFrame.setZoomFactor(factor)
    }
  },
  getZoomFactor: () => {
    const api = getElectronAPI()
    return api && api.webFrame ? api.webFrame.getZoomFactor() : 1
  },
  setZoomLevel: (level) => {
    const api = getElectronAPI()
    if (api && api.webFrame) {
      api.webFrame.setZoomLevel(level)
    }
  },
  getZoomLevel: () => {
    const api = getElectronAPI()
    return api && api.webFrame ? api.webFrame.getZoomLevel() : 0
  }
}

// File System API
export const fs = {
  // Read operations
  readFile: (filePath, options) => {
    const api = getElectronAPI()
    return api
      ? api.fs.readFile(filePath, options)
      : Promise.reject(new Error('Electron API not available'))
  },
  readFileSync: (filePath, options) => {
    const api = getElectronAPI()
    return api ? api.fs.readFileSync(filePath, options) : null
  },
  readdir: (dirPath, options) => {
    const api = getElectronAPI()
    return api
      ? api.fs.readdir(dirPath, options)
      : Promise.reject(new Error('Electron API not available'))
  },
  readdirSync: (dirPath, options) => {
    const api = getElectronAPI()
    return api ? api.fs.readdirSync(dirPath, options) : []
  },
  stat: (filePath, options) => {
    const api = getElectronAPI()
    return api
      ? api.fs.stat(filePath, options)
      : Promise.reject(new Error('Electron API not available'))
  },
  statSync: (filePath) => {
    const api = getElectronAPI()
    return api ? api.fs.statSync(filePath) : null
  },
  lstat: (filePath, options) => {
    const api = getElectronAPI()
    return api
      ? api.fs.lstat(filePath, options)
      : Promise.reject(new Error('Electron API not available'))
  },
  lstatSync: (filePath) => {
    const api = getElectronAPI()
    return api ? api.fs.lstatSync(filePath) : null
  },
  access: (filePath, mode) => {
    const api = getElectronAPI()
    return api
      ? api.fs.access(filePath, mode)
      : Promise.reject(new Error('Electron API not available'))
  },
  accessSync: (filePath, mode) => {
    const api = getElectronAPI()
    if (api) {
      api.fs.accessSync(filePath, mode)
    }
  },
  existsSync: (filePath) => {
    const api = getElectronAPI()
    return api ? api.fs.existsSync(filePath) : false
  },
  realpath: (filePath, options) => {
    const api = getElectronAPI()
    return api
      ? api.fs.realpath(filePath, options)
      : Promise.reject(new Error('Electron API not available'))
  },
  realpathSync: (filePath, options) => {
    const api = getElectronAPI()
    return api ? api.fs.realpathSync(filePath, options) : null
  },
  readlink: (filePath, options) => {
    const api = getElectronAPI()
    return api
      ? api.fs.readlink(filePath, options)
      : Promise.reject(new Error('Electron API not available'))
  },
  readlinkSync: (filePath, options) => {
    const api = getElectronAPI()
    return api ? api.fs.readlinkSync(filePath, options) : null
  },

  // Write operations
  writeFile: (filePath, data, options) => {
    const api = getElectronAPI()
    return api
      ? api.fs.writeFile(filePath, data, options)
      : Promise.reject(new Error('Electron API not available'))
  },
  writeFileSync: (filePath, data, options) => {
    const api = getElectronAPI()
    if (api) {
      api.fs.writeFileSync(filePath, data, options)
    }
  },
  appendFile: (filePath, data, options) => {
    const api = getElectronAPI()
    return api
      ? api.fs.appendFile(filePath, data, options)
      : Promise.reject(new Error('Electron API not available'))
  },
  mkdir: (dirPath, options) => {
    const api = getElectronAPI()
    return api
      ? api.fs.mkdir(dirPath, options)
      : Promise.reject(new Error('Electron API not available'))
  },
  mkdirSync: (dirPath, options) => {
    const api = getElectronAPI()
    if (api) {
      api.fs.mkdirSync(dirPath, options)
    }
  },
  rename: (oldPath, newPath) => {
    const api = getElectronAPI()
    return api
      ? api.fs.rename(oldPath, newPath)
      : Promise.reject(new Error('Electron API not available'))
  },
  renameSync: (oldPath, newPath) => {
    const api = getElectronAPI()
    if (api) {
      api.fs.renameSync(oldPath, newPath)
    }
  },
  unlink: (filePath) => {
    const api = getElectronAPI()
    return api
      ? api.fs.unlink(filePath)
      : Promise.reject(new Error('Electron API not available'))
  },
  unlinkSync: (filePath) => {
    const api = getElectronAPI()
    if (api) {
      api.fs.unlinkSync(filePath)
    }
  },
  rmdir: (dirPath, options) => {
    const api = getElectronAPI()
    return api
      ? api.fs.rmdir(dirPath, options)
      : Promise.reject(new Error('Electron API not available'))
  },
  rm: (filePath, options) => {
    const api = getElectronAPI()
    return api
      ? api.fs.rm(filePath, options)
      : Promise.reject(new Error('Electron API not available'))
  },
  copyFile: (src, dest, mode) => {
    const api = getElectronAPI()
    return api
      ? api.fs.copyFile(src, dest, mode)
      : Promise.reject(new Error('Electron API not available'))
  },
  copyFileSync: (src, dest, mode) => {
    const api = getElectronAPI()
    if (api) {
      api.fs.copyFileSync(src, dest, mode)
    }
  },

  // Stream operations
  createReadStream: (filePath, options) => {
    const api = getElectronAPI()
    return api ? api.fs.createReadStream(filePath, options) : null
  },
  createWriteStream: (filePath, options) => {
    const api = getElectronAPI()
    return api ? api.fs.createWriteStream(filePath, options) : null
  },

  // Watch
  watch: (filePath, options, listener) => {
    const api = getElectronAPI()
    return api ? api.fs.watch(filePath, options, listener) : null
  },
  watchFile: (filename, options, listener) => {
    const api = getElectronAPI()
    if (api) {
      api.fs.watchFile(filename, options, listener)
    }
  },
  unwatchFile: (filename, listener) => {
    const api = getElectronAPI()
    if (api) {
      api.fs.unwatchFile(filename, listener)
    }
  },

  // Constants
  get constants () {
    const api = getElectronAPI()
    return api ? api.fs.constants : {}
  }
}

// Path API
export const path = {
  join: (...args) => {
    const api = getElectronAPI()
    return api ? api.path.join(...args) : args.join('/')
  },
  resolve: (...args) => {
    const api = getElectronAPI()
    return api ? api.path.resolve(...args) : args.join('/')
  },
  dirname: (filePath) => {
    const api = getElectronAPI()
    return api ? api.path.dirname(filePath) : ''
  },
  basename: (filePath, ext) => {
    const api = getElectronAPI()
    return api ? api.path.basename(filePath, ext) : ''
  },
  extname: (filePath) => {
    const api = getElectronAPI()
    return api ? api.path.extname(filePath) : ''
  },
  parse: (filePath) => {
    const api = getElectronAPI()
    return api ? api.path.parse(filePath) : {}
  },
  format: (pathObject) => {
    const api = getElectronAPI()
    return api ? api.path.format(pathObject) : ''
  },
  normalize: (filePath) => {
    const api = getElectronAPI()
    return api ? api.path.normalize(filePath) : filePath
  },
  isAbsolute: (filePath) => {
    const api = getElectronAPI()
    return api ? api.path.isAbsolute(filePath) : false
  },
  relative: (from, to) => {
    const api = getElectronAPI()
    return api ? api.path.relative(from, to) : ''
  },
  get sep () {
    const api = getElectronAPI()
    return api ? api.path.sep : '/'
  },
  get delimiter () {
    const api = getElectronAPI()
    return api ? api.path.delimiter : ':'
  },
  get posix () {
    const api = getElectronAPI()
    return api ? api.path.posix : null
  },
  get win32 () {
    const api = getElectronAPI()
    return api ? api.path.win32 : null
  }
}

// OS API
export const os = {
  homedir: () => {
    const api = getElectronAPI()
    return api ? api.os.homedir() : ''
  },
  tmpdir: () => {
    const api = getElectronAPI()
    return api ? api.os.tmpdir() : ''
  },
  platform: () => {
    const api = getElectronAPI()
    return api ? api.os.platform() : ''
  },
  type: () => {
    const api = getElectronAPI()
    return api ? api.os.type() : ''
  },
  arch: () => {
    const api = getElectronAPI()
    return api ? api.os.arch() : ''
  },
  release: () => {
    const api = getElectronAPI()
    return api ? api.os.release() : ''
  },
  hostname: () => {
    const api = getElectronAPI()
    return api ? api.os.hostname() : ''
  },
  cpus: () => {
    const api = getElectronAPI()
    return api ? api.os.cpus() : []
  },
  totalmem: () => {
    const api = getElectronAPI()
    return api ? api.os.totalmem() : 0
  },
  freemem: () => {
    const api = getElectronAPI()
    return api ? api.os.freemem() : 0
  },
  get EOL () {
    const api = getElectronAPI()
    return api ? api.os.EOL : '\n'
  }
}

// Process info (safe subset)
export const processInfo = {
  get platform () {
    const api = getElectronAPI()
    return api ? api.process.platform : ''
  },
  get arch () {
    const api = getElectronAPI()
    return api ? api.process.arch : ''
  },
  get versions () {
    const api = getElectronAPI()
    return api ? api.process.versions : {}
  },
  get env () {
    const api = getElectronAPI()
    return api ? api.process.env : {}
  },
  cwd: () => {
    const api = getElectronAPI()
    return api ? api.process.cwd() : ''
  },
  get argv () {
    const api = getElectronAPI()
    return api ? api.process.argv : []
  },
  get execPath () {
    const api = getElectronAPI()
    return api ? api.process.execPath : ''
  },
  get pid () {
    const api = getElectronAPI()
    return api ? api.process.pid : 0
  },
  get ppid () {
    const api = getElectronAPI()
    return api ? api.process.ppid : 0
  },
  get resourcesPath () {
    const api = getElectronAPI()
    return api ? api.process.resourcesPath : ''
  }
}

// Crypto API
export const crypto = {
  createHash: (algorithm) => {
    const api = getElectronAPI()
    return api ? api.crypto.createHash(algorithm) : null
  },
  randomBytes: (size) => {
    const api = getElectronAPI()
    return api ? api.crypto.randomBytes(size) : null
  },
  randomUUID: () => {
    const api = getElectronAPI()
    return api ? api.crypto.randomUUID() : ''
  }
}

// Child Process API
export const childProcess = {
  spawn: (command, args, options) => {
    const api = getElectronAPI()
    return api ? api.childProcess.spawn(command, args, options) : null
  },
  exec: (command, options, callback) => {
    const api = getElectronAPI()
    if (api) {
      return api.childProcess.exec(command, options, callback)
    }
    if (callback) {
      callback(new Error('Electron API not available'))
    }
    return null
  },
  execFile: (file, args, options, callback) => {
    const api = getElectronAPI()
    if (api) {
      return api.childProcess.execFile(file, args, options, callback)
    }
    if (callback) {
      callback(new Error('Electron API not available'))
    }
    return null
  },
  execSync: (command, options) => {
    const api = getElectronAPI()
    return api ? api.childProcess.execSync(command, options) : null
  },
  execFileSync: (file, args, options) => {
    const api = getElectronAPI()
    return api ? api.childProcess.execFileSync(file, args, options) : null
  },
  spawnSync: (command, args, options) => {
    const api = getElectronAPI()
    return api ? api.childProcess.spawnSync(command, args, options) : null
  }
}

// Platform detection helpers
export const isOsx = (() => {
  const api = getElectronAPI()
  return api ? api.isOsx : false
})()

export const isWindows = (() => {
  const api = getElectronAPI()
  return api ? api.isWindows : false
})()

export const isLinux = (() => {
  const api = getElectronAPI()
  return api ? api.isLinux : false
})()

export const isMas = (() => {
  const api = getElectronAPI()
  return api ? api.isMas : false
})()

// Static path for accessing bundled static files
export const getStaticPath = () => {
  const api = getElectronAPI()
  return api ? api.staticPath : null
}

// Export a default object for compatibility
export default {
  ipcRenderer,
  shell,
  clipboard,
  nativeImage,
  webFrame,
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
  getStaticPath
}
