import EventEmitter from 'events'
import { BrowserWindow } from 'electron'
import { isLinux } from '../config'
import type { AppEnvironment } from '../app/env'
import type Preference from '../preferences'

// Window type marktext support.
export const WindowType = {
  BASE: 'base', // You shold never create a `BASE` window.
  EDITOR: 'editor',
  SETTINGS: 'settings'
} as const

export type WindowTypeValue = typeof WindowType[keyof typeof WindowType]

export const WindowLifecycle = {
  NONE: 0,
  LOADING: 1,
  READY: 2,
  QUITTED: 3
} as const

export type WindowLifecycleValue = typeof WindowLifecycle[keyof typeof WindowLifecycle]

interface Accessor {
  env: AppEnvironment
  preferences: Preference
  menu: any
  keybindings: any
}

class BaseWindow extends EventEmitter {
  protected _accessor: Accessor
  id: number | null
  browserWindow: BrowserWindow | null
  lifecycle: WindowLifecycleValue
  type: WindowTypeValue

  /**
   * @param accessor The application accessor for application instances.
   */
  constructor(accessor: Accessor) {
    super()

    this._accessor = accessor
    this.id = null
    this.browserWindow = null
    this.lifecycle = WindowLifecycle.NONE
    this.type = WindowType.BASE
  }

  bringToFront(): void {
    const win = this.browserWindow
    if (!win) return
    if (win.isMinimized()) win.restore()
    if (!win.isVisible()) win.show()
    if (isLinux) {
      win.focus()
    } else {
      win.moveTop()
    }
  }

  reload(): void {
    this.browserWindow?.reload()
  }

  destroy(): void {
    this.lifecycle = WindowLifecycle.QUITTED
    this.emit('window-closed')

    this.removeAllListeners()
    if (this.browserWindow) {
      this.browserWindow.destroy()
      this.browserWindow = null
    }
    this.id = null
  }

  // --- private ---------------------------------

  protected _buildUrlWithSettings(windowId: number, env: AppEnvironment, userPreference: Preference): URL {
    // NOTE: Only send absolutely necessary values. Full settings are delay loaded.
    const { type } = this
    const { debug, paths } = env
    const {
      codeFontFamily,
      codeFontSize,
      hideScrollbar,
      theme,
      titleBarStyle
    } = userPreference.getAll()

    /* eslint-disable */
    let baseUrl: string
    if (process.env.NODE_ENV === 'development') {
      baseUrl = 'http://localhost:9091'
    } else {
      // electron-vite: renderer is in out/renderer, main is in out/main
      // Legacy webpack: both are in dist/electron
      const path = require('path')
      const rendererPath = path.join(__dirname, '..', 'renderer', 'index.html')
      const legacyPath = path.join(__dirname, 'index.html')
      const fs = require('fs')
      baseUrl = fs.existsSync(rendererPath)
        ? `file://${rendererPath}`
        : `file://${legacyPath}`
    }
    /* eslint-enable */

    const url = new URL(baseUrl)
    url.searchParams.set('udp', paths.userDataPath)
    url.searchParams.set('debug', debug ? '1' : '0')
    url.searchParams.set('wid', String(windowId))
    url.searchParams.set('type', type)

    // Settings
    url.searchParams.set('cff', codeFontFamily)
    url.searchParams.set('cfs', String(codeFontSize))
    url.searchParams.set('hsb', hideScrollbar ? '1' : '0')
    url.searchParams.set('theme', theme)
    url.searchParams.set('tbs', titleBarStyle)

    return url
  }

  protected _buildUrlString(windowId: number, env: AppEnvironment, userPreference: Preference): string {
    return this._buildUrlWithSettings(windowId, env, userPreference).toString()
  }

  protected _getPreferredBackgroundColor(theme: string): string {
    // Hardcode the theme background color and show the window direct for the fastet window ready time.
    switch (theme) {
      case 'dark':
        return '#282828'
      case 'material-dark':
        return '#34393f'
      case 'ulysses':
        return '#f3f3f3'
      case 'graphite':
        return '#f7f7f7'
      case 'one-dark':
        return '#282c34'
      case 'light':
      default:
        return '#ffffff'
    }
  }
}

export default BaseWindow
