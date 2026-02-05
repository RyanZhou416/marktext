import path from 'path'
import { BrowserWindow, ipcMain } from 'electron'
import { enable as remoteEnable } from '@electron/remote/main'
import { electronLocalshortcut } from '@hfelix/electron-localshortcut'
import BaseWindow, { WindowLifecycle, WindowType } from './base'
import { centerWindowOptions } from './utils'
import { TITLE_BAR_HEIGHT, preferencesWinOptions, isLinux, isOsx } from '../config'

declare const __static: string

class SettingWindow extends BaseWindow {
  constructor(accessor: any) {
    super(accessor)
    this.type = WindowType.SETTINGS
  }

  createWindow(category: string | null = null): BrowserWindow {
    const { menu: appMenu, env, keybindings, preferences } = this._accessor
    const winOptions: any = Object.assign({}, preferencesWinOptions)
    centerWindowOptions(winOptions)
    if (isLinux) {
      winOptions.icon = path.join(__static, 'logo-96px.png')
    }

    // WORKAROUND: Electron has issues with different DPI per monitor when
    // setting a fixed window size.
    winOptions.resizable = true

    // Enable native or custom/frameless window and titlebar
    const { titleBarStyle, theme } = preferences.getAll()
    if (!isOsx) {
      winOptions.titleBarStyle = 'default'
      if (titleBarStyle === 'native') {
        winOptions.frame = true
      }
    }

    winOptions.backgroundColor = this._getPreferredBackgroundColor(theme)

    let win: BrowserWindow | null = this.browserWindow = new BrowserWindow(winOptions)
    remoteEnable(win.webContents)
    this.id = win.id

    // Create a menu for the current window
    appMenu.addSettingMenu(win)

    win.once('ready-to-show', () => {
      this.lifecycle = WindowLifecycle.READY
      this.emit('window-ready')
    })

    win.on('focus', () => {
      this.emit('window-focus')
      win!.webContents.send('mt::window-active-status', { status: true })
    })

    // Lost focus
    win.on('blur', () => {
      this.emit('window-blur')
      win!.webContents.send('mt::window-active-status', { status: false })
    })

    win.on('close', event => {
      this.emit('window-close')

      event.preventDefault()
      ipcMain.emit('window-close-by-id', win!.id)
    })

    // The window is now destroyed.
    win.on('closed', () => {
      this.emit('window-closed')

      // Free window reference
      win = null
    })

    this.lifecycle = WindowLifecycle.LOADING
    win.loadURL(this._buildUrlStringWithCategory(this.id!, env, preferences, category))
    win.setSheetOffset(TITLE_BAR_HEIGHT)

    const devToolsAccelerator = keybindings.getAccelerator('view.toggle-dev-tools')
    if (env.debug && devToolsAccelerator) {
      electronLocalshortcut.register(win, devToolsAccelerator, () => {
        win!.webContents.toggleDevTools()
      })
    }
    return win
  }

  private _buildUrlStringWithCategory(windowId: number, env: any, userPreference: any, category: string | null): string {
    const url = this._buildUrlWithSettings(windowId, env, userPreference)
    if (category) {
      // Overwrite type to add category name
      url.searchParams.set('type', `${WindowType.SETTINGS}/${category}`)
    }
    return url.toString()
  }
}

export default SettingWindow
