'use strict'

/**
 * Preload script for MarkText
 *
 * This script runs in the renderer process with Node.js integration enabled,
 * but exposes a safe subset of APIs to the renderer via contextBridge.
 */

// Polyfill global for compatibility with libraries that expect it
if (typeof global === 'undefined') {
  window.global = window
}

const {
  contextBridge,
  ipcRenderer,
  shell,
  clipboard,
  nativeImage,
  webFrame
} = require('electron')
const fs = require('fs')
const fsPromises = require('fs/promises')
const path = require('path')
const os = require('os')
const cp = require('child_process')
const crypto = require('crypto')

// 计算 __static 路径
const getStaticPath = () => {
  if (process.env.NODE_ENV === 'development') {
    // 开发环境：webpack DefinePlugin 会处理
    return null
  }
  // 生产环境：resources/app.asar/dist/electron/static
  return path.join(__dirname, 'static')
}

// Channel whitelist for IPC communication
// Only allow channels that start with 'mt::' (MarkText internal channels)
const isValidChannel = (channel) => {
  return typeof channel === 'string' && channel.startsWith('mt::')
}

// Wrap ipcRenderer methods with channel validation
const safeIpcRenderer = {
  send: (channel, ...args) => {
    if (isValidChannel(channel)) {
      ipcRenderer.send(channel, ...args)
    }
  },
  invoke: (channel, ...args) => {
    if (isValidChannel(channel)) {
      return ipcRenderer.invoke(channel, ...args)
    }
    return Promise.reject(new Error(`Invalid channel: ${channel}`))
  },
  sendSync: (channel, ...args) => {
    if (isValidChannel(channel)) {
      return ipcRenderer.sendSync(channel, ...args)
    }
    return null
  },
  on: (channel, callback) => {
    if (isValidChannel(channel)) {
      // 保留 event 参数，因为渲染进程代码期望 (event, ...args) 签名
      ipcRenderer.on(channel, callback)
      // Return a function to remove the listener
      return () => ipcRenderer.removeListener(channel, callback)
    }
    return () => {}
  },
  once: (channel, callback) => {
    if (isValidChannel(channel)) {
      // 保留 event 参数
      ipcRenderer.once(channel, callback)
    }
  },
  removeAllListeners: (channel) => {
    if (isValidChannel(channel)) {
      ipcRenderer.removeAllListeners(channel)
    }
  }
}

// Shell API
const safeShell = {
  openExternal: (url, options) => shell.openExternal(url, options),
  openPath: (p) => shell.openPath(p),
  showItemInFolder: (fullPath) => shell.showItemInFolder(fullPath),
  beep: () => shell.beep()
}

// Clipboard API
const safeClipboard = {
  readText: (type) => clipboard.readText(type),
  writeText: (text, type) => clipboard.writeText(text, type),
  readHTML: (type) => clipboard.readHTML(type),
  writeHTML: (markup, type) => clipboard.writeHTML(markup, type),
  readRTF: (type) => clipboard.readRTF(type),
  writeRTF: (text, type) => clipboard.writeRTF(text, type),
  readBookmark: () => clipboard.readBookmark(),
  writeBookmark: (title, url, type) =>
    clipboard.writeBookmark(title, url, type),
  readFindText: () => clipboard.readFindText(),
  writeFindText: (text) => clipboard.writeFindText(text),
  clear: (type) => clipboard.clear(type),
  availableFormats: (type) => clipboard.availableFormats(type),
  has: (format, type) => clipboard.has(format, type),
  read: (format) => clipboard.read(format),
  readBuffer: (format) => clipboard.readBuffer(format),
  writeBuffer: (format, buffer, type) =>
    clipboard.writeBuffer(format, buffer, type),
  write: (data, type) => clipboard.write(data, type)
}

// NativeImage API (limited for security)
const safeNativeImage = {
  createEmpty: () => nativeImage.createEmpty(),
  createFromPath: (p) => nativeImage.createFromPath(p),
  createFromBuffer: (buffer, options) =>
    nativeImage.createFromBuffer(buffer, options),
  createFromDataURL: (dataURL) => nativeImage.createFromDataURL(dataURL)
}

// File System API (async operations for safety)
const safeFs = {
  // Read operations
  readFile: (filePath, options) => fsPromises.readFile(filePath, options),
  readFileSync: (filePath, options) => fs.readFileSync(filePath, options),
  readdir: (dirPath, options) => fsPromises.readdir(dirPath, options),
  readdirSync: (dirPath, options) => fs.readdirSync(dirPath, options),
  stat: (filePath, options) => fsPromises.stat(filePath, options),
  statSync: (filePath) => fs.statSync(filePath),
  lstat: (filePath, options) => fsPromises.lstat(filePath, options),
  lstatSync: (filePath) => fs.lstatSync(filePath),
  access: (filePath, mode) => fsPromises.access(filePath, mode),
  accessSync: (filePath, mode) => fs.accessSync(filePath, mode),
  existsSync: (filePath) => fs.existsSync(filePath),
  realpath: (filePath, options) => fsPromises.realpath(filePath, options),
  realpathSync: (filePath, options) => fs.realpathSync(filePath, options),
  readlink: (filePath, options) => fsPromises.readlink(filePath, options),
  readlinkSync: (filePath, options) => fs.readlinkSync(filePath, options),

  // Write operations
  writeFile: (filePath, data, options) =>
    fsPromises.writeFile(filePath, data, options),
  writeFileSync: (filePath, data, options) =>
    fs.writeFileSync(filePath, data, options),
  appendFile: (filePath, data, options) =>
    fsPromises.appendFile(filePath, data, options),
  mkdir: (dirPath, options) => fsPromises.mkdir(dirPath, options),
  mkdirSync: (dirPath, options) => fs.mkdirSync(dirPath, options),
  rename: (oldPath, newPath) => fsPromises.rename(oldPath, newPath),
  renameSync: (oldPath, newPath) => fs.renameSync(oldPath, newPath),
  unlink: (filePath) => fsPromises.unlink(filePath),
  unlinkSync: (filePath) => fs.unlinkSync(filePath),
  rmdir: (dirPath, options) => fsPromises.rmdir(dirPath, options),
  rm: (filePath, options) => fsPromises.rm(filePath, options),
  copyFile: (src, dest, mode) => fsPromises.copyFile(src, dest, mode),
  copyFileSync: (src, dest, mode) => fs.copyFileSync(src, dest, mode),

  // Stream operations
  createReadStream: (filePath, options) =>
    fs.createReadStream(filePath, options),
  createWriteStream: (filePath, options) =>
    fs.createWriteStream(filePath, options),

  // Watch
  watch: (filePath, options, listener) => fs.watch(filePath, options, listener),
  watchFile: (filename, options, listener) =>
    fs.watchFile(filename, options, listener),
  unwatchFile: (filename, listener) => fs.unwatchFile(filename, listener),

  // Constants
  constants: fs.constants
}

// Path API
const safePath = {
  join: (...args) => path.join(...args),
  resolve: (...args) => path.resolve(...args),
  dirname: (filePath) => path.dirname(filePath),
  basename: (filePath, ext) => path.basename(filePath, ext),
  extname: (filePath) => path.extname(filePath),
  parse: (filePath) => path.parse(filePath),
  format: (pathObject) => path.format(pathObject),
  normalize: (filePath) => path.normalize(filePath),
  isAbsolute: (filePath) => path.isAbsolute(filePath),
  relative: (from, to) => path.relative(from, to),
  sep: path.sep,
  delimiter: path.delimiter,
  posix: path.posix,
  win32: path.win32
}

// OS API
const safeOs = {
  homedir: () => os.homedir(),
  tmpdir: () => os.tmpdir(),
  platform: () => os.platform(),
  type: () => os.type(),
  arch: () => os.arch(),
  release: () => os.release(),
  hostname: () => os.hostname(),
  cpus: () => os.cpus(),
  totalmem: () => os.totalmem(),
  freemem: () => os.freemem(),
  EOL: os.EOL
}

// Process info (read-only, safe subset)
// 注意：process.env 需要安全复制，避免展开操作符失败
const copyEnv = () => {
  const env = {}
  for (const key of Object.keys(process.env)) {
    env[key] = process.env[key]
  }
  return env
}

const safeProcess = {
  platform: process.platform,
  arch: process.arch,
  versions: { ...process.versions },
  env: copyEnv(),
  cwd: () => process.cwd(),
  getuid: process.getuid ? () => process.getuid() : undefined,
  getgid: process.getgid ? () => process.getgid() : undefined,
  argv: process.argv ? [...process.argv] : [],
  execPath: process.execPath,
  pid: process.pid,
  ppid: process.ppid,
  resourcesPath: process.resourcesPath
}

// Crypto API (limited for security)
const safeCrypto = {
  createHash: (algorithm) => {
    const hash = crypto.createHash(algorithm)
    return {
      update: (data, encoding) => {
        hash.update(data, encoding)
        return {
          digest: (outputEncoding) => hash.digest(outputEncoding)
        }
      }
    }
  },
  randomBytes: (size) => crypto.randomBytes(size),
  randomUUID: () => crypto.randomUUID()
}

// Child Process API (limited for security)
// Note: These APIs are needed for ripgrep search and image uploaders
const safeChildProcess = {
  spawn: (command, args, options) => {
    const child = cp.spawn(command, args, options)
    // Return a simplified wrapper that can be used across context boundary
    return {
      pid: child.pid,
      stdout: {
        on: (event, callback) =>
          child.stdout && child.stdout.on(event, callback),
        removeListener: (event, callback) =>
          child.stdout && child.stdout.removeListener(event, callback)
      },
      stderr: {
        on: (event, callback) =>
          child.stderr && child.stderr.on(event, callback),
        removeListener: (event, callback) =>
          child.stderr && child.stderr.removeListener(event, callback)
      },
      stdin: {
        write: (data) => child.stdin && child.stdin.write(data),
        end: () => child.stdin && child.stdin.end()
      },
      on: (event, callback) => child.on(event, callback),
      once: (event, callback) => child.once(event, callback),
      removeListener: (event, callback) =>
        child.removeListener(event, callback),
      kill: (signal) => child.kill(signal),
      killed: child.killed
    }
  },
  exec: (command, options, callback) => {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    return cp.exec(command, options, callback)
  },
  execFile: (file, args, options, callback) => {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    return cp.execFile(file, args, options, callback)
  },
  execSync: (command, options) => cp.execSync(command, options),
  execFileSync: (file, args, options) => cp.execFileSync(file, args, options),
  spawnSync: (command, args, options) => cp.spawnSync(command, args, options)
}

// WebFrame API
const safeWebFrame = {
  setZoomFactor: (factor) => webFrame.setZoomFactor(factor),
  getZoomFactor: () => webFrame.getZoomFactor(),
  setZoomLevel: (level) => webFrame.setZoomLevel(level),
  getZoomLevel: () => webFrame.getZoomLevel()
}

// Platform detection helpers
const platformHelpers = {
  isOsx: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux',
  isMas: process.mas === true
}

// Static path for production
const staticPath = getStaticPath()

// Expose APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  ipcRenderer: safeIpcRenderer,
  shell: safeShell,
  clipboard: safeClipboard,
  nativeImage: safeNativeImage,
  webFrame: safeWebFrame,
  fs: safeFs,
  path: safePath,
  os: safeOs,
  process: safeProcess,
  childProcess: safeChildProcess,
  crypto: safeCrypto,
  staticPath: staticPath,
  ...platformHelpers
})

// Also expose a global marker to detect if preload is loaded
contextBridge.exposeInMainWorld('__ELECTRON_PRELOAD_LOADED__', true)
