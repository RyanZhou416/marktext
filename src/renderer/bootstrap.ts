import { ipcRenderer } from './util/electron'
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
  }
}

let exceptionLogger = (s: Error) => console.error(s)

const configureLogger = (): void => {
  // 使用自定义 logger - electron-log 不兼容 contextIsolation
  exceptionLogger = log.error
}

const parseUrlArgs = (): ParsedUrlArgs => {
  const params = new URLSearchParams(window.location.search)
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

const bootstrapRenderer = (): void => {
  // Register renderer exception handler
  window.addEventListener('error', (event) => {
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
