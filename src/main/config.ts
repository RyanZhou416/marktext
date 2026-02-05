import path from 'path'
import fs from 'fs'
import { app, BrowserWindowConstructorOptions } from 'electron'

export const isOsx = process.platform === 'darwin'
export const isWindows = process.platform === 'win32'
export const isLinux = process.platform === 'linux'

// Preload script path - works in both development and production
const getPreloadPath = (): string => {
  // Support both electron-vite (out/) and legacy webpack (dist/electron/) builds
  // app.getAppPath() returns the correct path in both cases:
  // - Development: project root
  // - Production: resources/app.asar
  const appPath = app.getAppPath()

  // Check for electron-vite output structure first
  const electronVitePath = path.join(appPath, 'out', 'preload', 'index.js')
  const legacyPath = path.join(appPath, 'dist', 'electron', 'preload.js')

  // In production, always use relative path based on main entry
  // electron-vite uses out/main/index.js, so preload is at ../preload/index.js
  if (app.isPackaged) {
    // Use __dirname which points to out/main in production
    return path.join(__dirname, '..', 'preload', 'index.js')
  }

  // In development, check which build system is being used
  try {
    fs.accessSync(electronVitePath)
    return electronVitePath
  } catch (e) {
    return legacyPath
  }
}

export const editorWinOptions: BrowserWindowConstructorOptions = Object.freeze({
  minWidth: 550,
  minHeight: 350,
  webPreferences: {
    contextIsolation: true,
    // Disable sandbox to allow preload script to use Node.js modules
    sandbox: false,
    // WORKAROUND: We cannot enable spellcheck if it was disabled during
    // renderer startup due to a bug in Electron (Electron#32755). We'll
    // enable it always and set the HTML spelling attribute to false.
    spellcheck: true,
    // 渲染进程现代化：禁用 nodeIntegration，所有 Node.js 功能通过 preload 暴露
    nodeIntegration: false,
    webSecurity: true,
    preload: getPreloadPath()
  },
  useContentSize: true,
  show: true,
  frame: false,
  titleBarStyle: 'hiddenInset',
  zoomFactor: 1.0
})

export const preferencesWinOptions: BrowserWindowConstructorOptions = Object.freeze({
  minWidth: 450,
  minHeight: 350,
  width: 950,
  height: 650,
  webPreferences: {
    contextIsolation: true,
    // Disable sandbox to allow preload script to use Node.js modules
    sandbox: false,
    // Always true to access native spellchecker.
    spellcheck: true,
    // 渲染进程现代化：禁用 nodeIntegration，所有 Node.js 功能通过 preload 暴露
    nodeIntegration: false,
    webSecurity: true,
    preload: getPreloadPath()
  },
  fullscreenable: false,
  fullscreen: false,
  minimizable: false,
  useContentSize: true,
  show: true,
  frame: false,
  thickFrame: !isOsx,
  titleBarStyle: 'hiddenInset',
  zoomFactor: 1.0
})

export const PANDOC_EXTENSIONS: readonly string[] = Object.freeze([
  'html',
  'docx',
  'odt',
  'latex',
  'tex',
  'ltx',
  'rst',
  'rest',
  'org',
  'wiki',
  'dokuwiki',
  'textile',
  'opml',
  'epub'
])

export const BLACK_LIST: readonly string[] = Object.freeze(['$RECYCLE.BIN'])

export const EXTENSION_HASN: Readonly<Record<string, string>> = Object.freeze({
  styledHtml: '.html',
  pdf: '.pdf'
})

export const TITLE_BAR_HEIGHT = isOsx ? 21 : 32
export const LINE_ENDING_REG = /(?:\r\n|\n)/g
export const LF_LINE_ENDING_REG = /(?:[^\r]\n)|(?:^\n$)/
export const CRLF_LINE_ENDING_REG = /\r\n/

export const GITHUB_REPO_URL = 'https://github.com/marktext/marktext'
// copy from muya
export const URL_REG =
  /^http(s)?:\/\/([a-z0-9\-._~]+\.[a-z]{2,}|[0-9.]+|localhost|\[[a-f0-9.:]+\])(:[0-9]{1,5})?(\/[\S]+)?/i
