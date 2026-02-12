import { ipcRenderer } from './util/tauri'
import log from './util/logger'
import RendererPaths from './node/paths'

interface InitialState {
  codeFontFamily: string | null
  codeFontSize: string | null
  hideScrollbar: boolean
  theme: string | null
  titleBarStyle: string | null
}

interface ParsedUrlArgs {
  type: string | null
  debug: boolean
  userDataPath: string | null
  windowId: number
  initialState: InitialState
}

interface MarkTextEnv {
  debug: boolean
  paths: RendererPaths
  windowId: number
  type: string | null
}

interface MarkText {
  initialState: InitialState
  env: MarkTextEnv
  paths: RendererPaths
}

declare global {
  interface Window {
    marktext: MarkText
    __TAURI_INTERNALS__?: any
    __TAURI_ENV__?: {
      userDataPath: string
      debug: boolean
      windowId: number
      type: string
      language: string
      theme: string
      codeFontFamily: string
      codeFontSize: string
      hideScrollbar: boolean
      titleBarStyle: string
    }
  }
}

let exceptionLogger = (s: Error) => console.error(s)

const configureLogger = (): void => {
  // 使用自定义 logger - electron-log 不兼容 contextIsolation
  exceptionLogger = log.error
}

/**
 * Detect if running in Tauri environment
 */
const isTauri = (): boolean => {
  return typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined
}

const parseUrlArgs = (): ParsedUrlArgs => {
  const params = new URLSearchParams(window.location.search)

  // Check if URL has the expected parameters
  const hasUrlParams = params.has('wid') && params.has('type')

  if (hasUrlParams) {
    // Standard Electron path: parse from URL
    const codeFontFamily = params.get('cff')
    const codeFontSize = params.get('cfs')
    const debug = params.get('debug') === '1'
    const hideScrollbar = params.get('hsb') === '1'
    const theme = params.get('theme')
    const titleBarStyle = params.get('tbs')
    const userDataPath = params.get('udp')
    const windowId = Number(params.get('wid'))
    const type = params.get('type')

    if (Number.isNaN(windowId)) {
      throw new Error('Error while parsing URL arguments: windowId!')
    }

    return {
      type,
      debug,
      userDataPath,
      windowId,
      initialState: {
        codeFontFamily,
        codeFontSize,
        hideScrollbar,
        theme,
        titleBarStyle
      }
    }
  }

  // Tauri / fallback path: use injected env or sensible defaults
  const env = window.__TAURI_ENV__
  console.log('[Bootstrap] No URL params detected, using Tauri/fallback defaults')

  // Construct a default user data path for Tauri
  // On Windows: C:\Users\<user>\AppData\Roaming\marktext
  // On macOS: ~/Library/Application Support/marktext
  // On Linux: ~/.config/marktext
  let defaultUserDataPath = env?.userDataPath || ''
  if (!defaultUserDataPath) {
    // Try to construct from available info
    if (typeof navigator !== 'undefined') {
      const isWin = navigator.platform.startsWith('Win') || navigator.userAgent.includes('Windows')
      const isMac = navigator.platform.startsWith('Mac')
      if (isWin) {
        // Use APPDATA env var pattern
        defaultUserDataPath = 'C:\\Users\\Default\\AppData\\Roaming\\marktext'
      } else if (isMac) {
        defaultUserDataPath = '/Users/Shared/marktext'
      } else {
        defaultUserDataPath = '/tmp/marktext'
      }
    }
  }

  return {
    type: env?.type || 'editor',
    debug: env?.debug || false,
    userDataPath: defaultUserDataPath,
    windowId: env?.windowId || 1,
    initialState: {
      codeFontFamily: env?.codeFontFamily || 'DejaVu Sans Mono',
      codeFontSize: env?.codeFontSize || '14',
      hideScrollbar: env?.hideScrollbar || false,
      theme: env?.theme || 'light',
      titleBarStyle: env?.titleBarStyle || 'custom'
    }
  }
}

const bootstrapRenderer = (): void => {
  // Register renderer exception handler
  window.addEventListener('error', event => {
    if (event.error) {
      const { message, name, stack } = event.error
      const copy = {
        message,
        name,
        stack
      }

      exceptionLogger(event.error)

      // Pass exception to main process exception handler to show a error dialog.
      ipcRenderer.send('mt::handle-renderer-error', copy)
    } else {
      console.error(event)
    }
  })

  const { debug, initialState, userDataPath, windowId, type } = parseUrlArgs()
  const paths = new RendererPaths(userDataPath!)
  const marktext: MarkText = {
    initialState,
    env: {
      debug,
      paths,
      windowId,
      type
    },
    paths
  }
  window.marktext = marktext

  configureLogger()
}

export default bootstrapRenderer
