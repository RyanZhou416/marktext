'use strict'

/**
 * Preload script for MarkText
 *
 * This script runs in the renderer process with Node.js integration enabled,
 * but exposes a safe subset of APIs to the renderer via contextBridge.
 */

import {
  contextBridge,
  ipcRenderer,
  shell,
  clipboard,
  nativeImage,
  webFrame,
  webUtils,
  IpcRendererEvent
} from 'electron'
import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import os from 'os'
import cp from 'child_process'
import crypto from 'crypto'

// Type definitions for the exposed API
export interface SafeIpcRenderer {
  send: (channel: string, ...args: unknown[]) => void
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  sendSync: (channel: string, ...args: unknown[]) => unknown
  on: (channel: string, callback: (event: IpcRendererEvent, ...args: unknown[]) => void) => () => void
  once: (channel: string, callback: (event: IpcRendererEvent, ...args: unknown[]) => void) => void
  removeAllListeners: (channel: string) => void
}

export interface SafeShell {
  openExternal: (url: string, options?: Electron.OpenExternalOptions) => Promise<void>
  openPath: (path: string) => Promise<string>
  showItemInFolder: (fullPath: string) => void
  beep: () => void
}

export interface SafeClipboard {
  readText: (type?: 'selection' | 'clipboard') => string
  writeText: (text: string, type?: 'selection' | 'clipboard') => void
  readHTML: (type?: 'selection' | 'clipboard') => string
  writeHTML: (markup: string, type?: 'selection' | 'clipboard') => void
  readRTF: (type?: 'selection' | 'clipboard') => string
  writeRTF: (text: string, type?: 'selection' | 'clipboard') => void
  readBookmark: () => { title: string; url: string }
  writeBookmark: (title: string, url: string, type?: 'selection' | 'clipboard') => void
  readFindText: () => string
  writeFindText: (text: string) => void
  clear: (type?: 'selection' | 'clipboard') => void
  availableFormats: (type?: 'selection' | 'clipboard') => string[]
  has: (format: string, type?: 'selection' | 'clipboard') => boolean
  read: (format: string) => string
  readBuffer: (format: string) => Buffer
  writeBuffer: (format: string, buffer: Buffer, type?: 'selection' | 'clipboard') => void
  write: (data: Electron.Data, type?: 'selection' | 'clipboard') => void
}

export interface SafeNativeImage {
  createEmpty: () => Electron.NativeImage
  createFromPath: (path: string) => Electron.NativeImage
  createFromBuffer: (buffer: Buffer, options?: Electron.CreateFromBufferOptions) => Electron.NativeImage
  createFromDataURL: (dataURL: string) => Electron.NativeImage
}

export interface SafeWebFrame {
  setZoomFactor: (factor: number) => void
  getZoomFactor: () => number
  setZoomLevel: (level: number) => void
  getZoomLevel: () => number
}

export interface SafeWebUtils {
  getPathForFile: (file: File) => string
}

export interface SafeProcess {
  platform: NodeJS.Platform
  arch: string
  versions: NodeJS.ProcessVersions
  env: Record<string, string | undefined>
  cwd: () => string
  getuid?: () => number
  getgid?: () => number
  argv: string[]
  execPath: string
  pid: number
  ppid: number
  resourcesPath: string
}

export interface PlatformHelpers {
  isOsx: boolean
  isWindows: boolean
  isLinux: boolean
  isMas: boolean
}

export interface ElectronAPI extends PlatformHelpers {
  ipcRenderer: SafeIpcRenderer
  shell: SafeShell
  clipboard: SafeClipboard
  nativeImage: SafeNativeImage
  webFrame: SafeWebFrame
  webUtils: SafeWebUtils
  fs: typeof fs & { constants: typeof fs.constants }
  path: typeof path
  os: typeof os
  process: SafeProcess
  childProcess: typeof cp
  crypto: {
    createHash: (algorithm: string) => {
      update: (data: string | Buffer, encoding?: BufferEncoding) => {
        digest: (outputEncoding?: BufferEncoding | 'hex' | 'base64') => string | Buffer
      }
    }
    randomBytes: (size: number) => Buffer
    randomUUID: () => string
  }
  staticPath: string | null
}

// Polyfill global for compatibility with libraries that expect it
declare const global: typeof globalThis
if (typeof global === 'undefined') {
  (window as unknown as { global: typeof window }).global = window
}

// 计算 __static 路径
const getStaticPath = (): string | null => {
  if (process.env.NODE_ENV === 'development') {
    // 开发环境：webpack DefinePlugin 会处理
    return null
  }
  // 生产环境：resources/app.asar/dist/electron/static
  return path.join(__dirname, 'static')
}

// Channel whitelist for IPC communication
// Only allow channels that start with 'mt::' (MarkText internal channels)
const isValidChannel = (channel: string): boolean => {
  return typeof channel === 'string' && channel.startsWith('mt::')
}

// Wrap ipcRenderer methods with channel validation
const safeIpcRenderer: SafeIpcRenderer = {
  send: (channel: string, ...args: unknown[]) => {
    if (isValidChannel(channel)) {
      ipcRenderer.send(channel, ...args)
    }
  },
  invoke: (channel: string, ...args: unknown[]) => {
    if (isValidChannel(channel)) {
      return ipcRenderer.invoke(channel, ...args)
    }
    return Promise.reject(new Error(`Invalid channel: ${channel}`))
  },
  sendSync: (channel: string, ...args: unknown[]) => {
    if (isValidChannel(channel)) {
      return ipcRenderer.sendSync(channel, ...args)
    }
    return null
  },
  on: (channel: string, callback: (event: IpcRendererEvent, ...args: unknown[]) => void) => {
    if (isValidChannel(channel)) {
      // 保留 event 参数，因为渲染进程代码期望 (event, ...args) 签名
      ipcRenderer.on(channel, callback)
      // Return a function to remove the listener
      return () => ipcRenderer.removeListener(channel, callback)
    }
    return () => {}
  },
  once: (channel: string, callback: (event: IpcRendererEvent, ...args: unknown[]) => void) => {
    if (isValidChannel(channel)) {
      // 保留 event 参数
      ipcRenderer.once(channel, callback)
    }
  },
  removeAllListeners: (channel: string) => {
    if (isValidChannel(channel)) {
      ipcRenderer.removeAllListeners(channel)
    }
  }
}

// Shell API
const safeShell: SafeShell = {
  openExternal: (url: string, options?: Electron.OpenExternalOptions) => shell.openExternal(url, options),
  openPath: (p: string) => shell.openPath(p),
  showItemInFolder: (fullPath: string) => shell.showItemInFolder(fullPath),
  beep: () => shell.beep()
}

// Clipboard API
const safeClipboard: SafeClipboard = {
  readText: (type?: 'selection' | 'clipboard') => clipboard.readText(type),
  writeText: (text: string, type?: 'selection' | 'clipboard') => clipboard.writeText(text, type),
  readHTML: (type?: 'selection' | 'clipboard') => clipboard.readHTML(type),
  writeHTML: (markup: string, type?: 'selection' | 'clipboard') => clipboard.writeHTML(markup, type),
  readRTF: (type?: 'selection' | 'clipboard') => clipboard.readRTF(type),
  writeRTF: (text: string, type?: 'selection' | 'clipboard') => clipboard.writeRTF(text, type),
  readBookmark: () => clipboard.readBookmark(),
  writeBookmark: (title: string, url: string, type?: 'selection' | 'clipboard') =>
    clipboard.writeBookmark(title, url, type),
  readFindText: () => clipboard.readFindText(),
  writeFindText: (text: string) => clipboard.writeFindText(text),
  clear: (type?: 'selection' | 'clipboard') => clipboard.clear(type),
  availableFormats: (type?: 'selection' | 'clipboard') => clipboard.availableFormats(type),
  has: (format: string, type?: 'selection' | 'clipboard') => clipboard.has(format, type),
  read: (format: string) => clipboard.read(format),
  readBuffer: (format: string) => clipboard.readBuffer(format),
  writeBuffer: (format: string, buffer: Buffer, type?: 'selection' | 'clipboard') =>
    clipboard.writeBuffer(format, buffer, type),
  write: (data: Electron.Data, type?: 'selection' | 'clipboard') => clipboard.write(data, type)
}

// NativeImage API (limited for security)
const safeNativeImage: SafeNativeImage = {
  createEmpty: () => nativeImage.createEmpty(),
  createFromPath: (p: string) => nativeImage.createFromPath(p),
  createFromBuffer: (buffer: Buffer, options?: Electron.CreateFromBufferOptions) =>
    nativeImage.createFromBuffer(buffer, options),
  createFromDataURL: (dataURL: string) => nativeImage.createFromDataURL(dataURL)
}

// File System API (async operations for safety)
const safeFs = {
  // Read operations
  readFile: (filePath: fs.PathLike, options?: Parameters<typeof fsPromises.readFile>[1]) =>
    fsPromises.readFile(filePath, options),
  readFileSync: (filePath: fs.PathLike, options?: Parameters<typeof fs.readFileSync>[1]) =>
    fs.readFileSync(filePath, options),
  readdir: (dirPath: fs.PathLike, options?: Parameters<typeof fsPromises.readdir>[1]) =>
    fsPromises.readdir(dirPath, options),
  readdirSync: (dirPath: fs.PathLike, options?: Parameters<typeof fs.readdirSync>[1]) =>
    fs.readdirSync(dirPath, options),
  stat: (filePath: fs.PathLike, options?: Parameters<typeof fsPromises.stat>[1]) =>
    fsPromises.stat(filePath, options),
  statSync: (filePath: fs.PathLike) => fs.statSync(filePath),
  lstat: (filePath: fs.PathLike, options?: Parameters<typeof fsPromises.lstat>[1]) =>
    fsPromises.lstat(filePath, options),
  lstatSync: (filePath: fs.PathLike) => fs.lstatSync(filePath),
  access: (filePath: fs.PathLike, mode?: number) => fsPromises.access(filePath, mode),
  accessSync: (filePath: fs.PathLike, mode?: number) => fs.accessSync(filePath, mode),
  existsSync: (filePath: fs.PathLike) => fs.existsSync(filePath),
  realpath: (filePath: fs.PathLike, options?: Parameters<typeof fsPromises.realpath>[1]) =>
    fsPromises.realpath(filePath, options),
  realpathSync: (filePath: fs.PathLike, options?: Parameters<typeof fs.realpathSync>[1]) =>
    fs.realpathSync(filePath, options),
  readlink: (filePath: fs.PathLike, options?: Parameters<typeof fsPromises.readlink>[1]) =>
    fsPromises.readlink(filePath, options),
  readlinkSync: (filePath: fs.PathLike, options?: Parameters<typeof fs.readlinkSync>[1]) =>
    fs.readlinkSync(filePath, options),

  // Write operations
  writeFile: (filePath: fs.PathLike, data: Parameters<typeof fsPromises.writeFile>[1], options?: Parameters<typeof fsPromises.writeFile>[2]) =>
    fsPromises.writeFile(filePath, data, options),
  writeFileSync: (filePath: fs.PathLike, data: Parameters<typeof fs.writeFileSync>[1], options?: Parameters<typeof fs.writeFileSync>[2]) =>
    fs.writeFileSync(filePath, data, options),
  appendFile: (filePath: fs.PathLike, data: Parameters<typeof fsPromises.appendFile>[1], options?: Parameters<typeof fsPromises.appendFile>[2]) =>
    fsPromises.appendFile(filePath, data, options),
  mkdir: (dirPath: fs.PathLike, options?: Parameters<typeof fsPromises.mkdir>[1]) =>
    fsPromises.mkdir(dirPath, options),
  mkdirSync: (dirPath: fs.PathLike, options?: Parameters<typeof fs.mkdirSync>[1]) =>
    fs.mkdirSync(dirPath, options),
  rename: (oldPath: fs.PathLike, newPath: fs.PathLike) => fsPromises.rename(oldPath, newPath),
  renameSync: (oldPath: fs.PathLike, newPath: fs.PathLike) => fs.renameSync(oldPath, newPath),
  unlink: (filePath: fs.PathLike) => fsPromises.unlink(filePath),
  unlinkSync: (filePath: fs.PathLike) => fs.unlinkSync(filePath),
  rmdir: (dirPath: fs.PathLike, options?: Parameters<typeof fsPromises.rmdir>[1]) =>
    fsPromises.rmdir(dirPath, options),
  rm: (filePath: fs.PathLike, options?: Parameters<typeof fsPromises.rm>[1]) =>
    fsPromises.rm(filePath, options),
  copyFile: (src: fs.PathLike, dest: fs.PathLike, mode?: number) =>
    fsPromises.copyFile(src, dest, mode),
  copyFileSync: (src: fs.PathLike, dest: fs.PathLike, mode?: number) =>
    fs.copyFileSync(src, dest, mode),

  // Stream operations
  createReadStream: (filePath: fs.PathLike, options?: Parameters<typeof fs.createReadStream>[1]) =>
    fs.createReadStream(filePath, options),
  createWriteStream: (filePath: fs.PathLike, options?: Parameters<typeof fs.createWriteStream>[1]) =>
    fs.createWriteStream(filePath, options),

  // Watch
  watch: (filePath: fs.PathLike, options?: Parameters<typeof fs.watch>[1], listener?: Parameters<typeof fs.watch>[2]) =>
    fs.watch(filePath, options as fs.WatchOptions, listener),
  watchFile: (filename: fs.PathLike, options: Parameters<typeof fs.watchFile>[1], listener?: Parameters<typeof fs.watchFile>[2]) =>
    fs.watchFile(filename, options as fs.WatchFileOptions, listener as fs.StatsListener),
  unwatchFile: (filename: fs.PathLike, listener?: fs.StatsListener) =>
    fs.unwatchFile(filename, listener),

  // Constants
  constants: fs.constants
}

// Path API
const safePath = {
  join: (...args: string[]) => path.join(...args),
  resolve: (...args: string[]) => path.resolve(...args),
  dirname: (filePath: string) => path.dirname(filePath),
  basename: (filePath: string, ext?: string) => path.basename(filePath, ext),
  extname: (filePath: string) => path.extname(filePath),
  parse: (filePath: string) => path.parse(filePath),
  format: (pathObject: path.FormatInputPathObject) => path.format(pathObject),
  normalize: (filePath: string) => path.normalize(filePath),
  isAbsolute: (filePath: string) => path.isAbsolute(filePath),
  relative: (from: string, to: string) => path.relative(from, to),
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
const copyEnv = (): Record<string, string | undefined> => {
  const env: Record<string, string | undefined> = {}
  for (const key of Object.keys(process.env)) {
    env[key] = process.env[key]
  }
  return env
}

const safeProcess: SafeProcess = {
  platform: process.platform,
  arch: process.arch,
  versions: { ...process.versions },
  env: copyEnv(),
  cwd: () => process.cwd(),
  getuid: process.getuid ? () => process.getuid!() : undefined,
  getgid: process.getgid ? () => process.getgid!() : undefined,
  argv: process.argv ? [...process.argv] : [],
  execPath: process.execPath,
  pid: process.pid,
  ppid: process.ppid,
  resourcesPath: (process as NodeJS.Process & { resourcesPath: string }).resourcesPath
}

// Crypto API (limited for security)
const safeCrypto = {
  createHash: (algorithm: string) => {
    const hash = crypto.createHash(algorithm)
    return {
      update: (data: string | Buffer, encoding?: BufferEncoding) => {
        hash.update(data, encoding)
        return {
          digest: (outputEncoding?: BufferEncoding | 'hex' | 'base64') =>
            hash.digest(outputEncoding as crypto.BinaryToTextEncoding)
        }
      }
    }
  },
  randomBytes: (size: number) => crypto.randomBytes(size),
  randomUUID: () => crypto.randomUUID()
}

// Child Process API (limited for security)
// Note: These APIs are needed for ripgrep search and image uploaders
const safeChildProcess = {
  spawn: (command: string, args?: readonly string[], options?: cp.SpawnOptions) => {
    const child = cp.spawn(command, args as string[], options)
    // Return a simplified wrapper that can be used across context boundary
    return {
      pid: child.pid,
      stdout: {
        on: (event: string, callback: (...args: unknown[]) => void) =>
          child.stdout && child.stdout.on(event, callback),
        removeListener: (event: string, callback: (...args: unknown[]) => void) =>
          child.stdout && child.stdout.removeListener(event, callback)
      },
      stderr: {
        on: (event: string, callback: (...args: unknown[]) => void) =>
          child.stderr && child.stderr.on(event, callback),
        removeListener: (event: string, callback: (...args: unknown[]) => void) =>
          child.stderr && child.stderr.removeListener(event, callback)
      },
      stdin: {
        write: (data: string | Buffer) => child.stdin && child.stdin.write(data),
        end: () => child.stdin && child.stdin.end()
      },
      on: (event: string, callback: (...args: unknown[]) => void) => child.on(event, callback),
      once: (event: string, callback: (...args: unknown[]) => void) => child.once(event, callback),
      removeListener: (event: string, callback: (...args: unknown[]) => void) =>
        child.removeListener(event, callback),
      kill: (signal?: NodeJS.Signals | number) => child.kill(signal),
      killed: child.killed
    }
  },
  exec: (command: string, options?: cp.ExecOptions, callback?: (error: cp.ExecException | null, stdout: string, stderr: string) => void) => {
    if (typeof options === 'function') {
      callback = options as (error: cp.ExecException | null, stdout: string, stderr: string) => void
      options = {}
    }
    return cp.exec(command, options!, callback!)
  },
  execFile: (file: string, args?: readonly string[], options?: cp.ExecFileOptions, callback?: (error: cp.ExecException | null, stdout: string, stderr: string) => void) => {
    if (typeof options === 'function') {
      callback = options as (error: cp.ExecException | null, stdout: string, stderr: string) => void
      options = {}
    }
    return cp.execFile(file, args as string[], options!, callback!)
  },
  execSync: (command: string, options?: cp.ExecSyncOptions) => cp.execSync(command, options),
  execFileSync: (file: string, args?: readonly string[], options?: cp.ExecFileSyncOptions) =>
    cp.execFileSync(file, args as string[], options),
  spawnSync: (command: string, args?: readonly string[], options?: cp.SpawnSyncOptions) =>
    cp.spawnSync(command, args as string[], options)
}

// WebFrame API
const safeWebFrame: SafeWebFrame = {
  setZoomFactor: (factor: number) => webFrame.setZoomFactor(factor),
  getZoomFactor: () => webFrame.getZoomFactor(),
  setZoomLevel: (level: number) => webFrame.setZoomLevel(level),
  getZoomLevel: () => webFrame.getZoomLevel()
}

// WebUtils API (for drag & drop file path access with contextIsolation)
const safeWebUtils: SafeWebUtils = {
  getPathForFile: (file: File) => webUtils.getPathForFile(file)
}

// Platform detection helpers
const platformHelpers: PlatformHelpers = {
  isOsx: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux',
  isMas: (process as NodeJS.Process & { mas?: boolean }).mas === true
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
  webUtils: safeWebUtils,
  fs: safeFs,
  path: safePath,
  os: safeOs,
  process: safeProcess,
  childProcess: safeChildProcess,
  crypto: safeCrypto,
  staticPath: staticPath,
  ...platformHelpers
} as ElectronAPI)

// Also expose a global marker to detect if preload is loaded
contextBridge.exposeInMainWorld('__ELECTRON_PRELOAD_LOADED__', true)

// Declare global types for renderer
declare global {
  interface Window {
    electronAPI: ElectronAPI
    __ELECTRON_PRELOAD_LOADED__: boolean
  }
}
