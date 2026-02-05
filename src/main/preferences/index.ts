import fs from 'fs'
import path from 'path'
import EventEmitter from 'events'
import Store from 'electron-store'
import { BrowserWindow, ipcMain, nativeTheme, IpcMainEvent } from 'electron'
import log from 'electron-log'
import { isWindows } from '../config'
import { hasSameKeys } from '../utils'
import schema from './schema.json'

declare const __static: string

const PREFERENCES_FILE_NAME = 'preferences'

interface AppPaths {
  preferencesPath: string
}

class Preference extends EventEmitter {
  private preferencesPath: string
  private hasPreferencesFile: boolean
  private store: Store
  private staticPath: string

  constructor(paths: AppPaths) {
    // TODO: Preferences should not loaded if global.MARKTEXT_SAFE_MODE is set.
    super()

    const { preferencesPath } = paths
    this.preferencesPath = preferencesPath
    this.hasPreferencesFile = fs.existsSync(path.join(this.preferencesPath, `./${PREFERENCES_FILE_NAME}.json`))
    this.store = new Store({
      schema: schema as any,
      name: PREFERENCES_FILE_NAME
    })

    this.staticPath = path.join(__static, 'preference.json')
    this.init()
  }

  init = (): void => {
    let defaultSettings: Record<string, any> | null = null
    try {
      defaultSettings = JSON.parse(fs.readFileSync(this.staticPath, { encoding: 'utf8' }) || '{}')

      // Set best theme on first application start.
      if (nativeTheme.shouldUseDarkColors) {
        defaultSettings!.theme = 'dark'
      }
    } catch (err) {
      log.error(err)
    }

    if (!defaultSettings) {
      throw new Error('Can not load static preference.json file')
    }

    // I don't know why `this.store.size` is 3 when first load, so I just check file existed.
    if (!this.hasPreferencesFile) {
      this.store.set(defaultSettings)
    } else {
      const userSetting = this.getAll()
      // Update outdated settings
      const requiresUpdate = !hasSameKeys(defaultSettings, userSetting)
      const userSettingKeys = Object.keys(userSetting)
      const defaultSettingKeys = Object.keys(defaultSettings)

      if (requiresUpdate) {
        // Remove outdated settings
        for (const key of userSettingKeys) {
          if (!defaultSettingKeys.includes(key)) {
            delete userSetting[key]
            this.store.delete(key)
          }
        }

        // Add new setting options
        let addedNewEntries = false
        for (const key in defaultSettings) {
          if (!userSettingKeys.includes(key)) {
            addedNewEntries = true
            userSetting[key] = defaultSettings[key]
          }
        }
        if (addedNewEntries) {
          this.store.set(userSetting)
        }
      }
    }

    this._listenForIpcMain()
  }

  getAll(): Record<string, any> {
    return this.store.store
  }

  setItem(key: string, value: any): void {
    ipcMain.emit('broadcast-preferences-changed', { [key]: value })
    this.store.set(key, value)
  }

  getItem(key: string): any {
    return this.store.get(key)
  }

  /**
   * Change multiple setting entries.
   */
  setItems(settings: Record<string, any>): void {
    if (!settings) {
      log.error('Cannot change settings without entires: object is undefined or null.')
      return
    }

    Object.keys(settings).forEach(key => {
      this.setItem(key, settings[key])
    })
  }

  getPreferredEol(): string {
    const endOfLine = this.getItem('endOfLine')
    if (endOfLine === 'lf') {
      return 'lf'
    }
    return endOfLine === 'crlf' || isWindows ? 'crlf' : 'lf'
  }

  exportJSON(): void {
    // todo
  }

  importJSON(): void {
    // todo
  }

  private _listenForIpcMain(): void {
    ipcMain.on('mt::ask-for-user-preference', (e: IpcMainEvent) => {
      const win = BrowserWindow.fromWebContents(e.sender)
      win?.webContents.send('mt::user-preference', this.getAll())
    })
    ipcMain.on('mt::set-user-preference', (e: IpcMainEvent, settings: Record<string, any>) => {
      this.setItems(settings)
    })
    ipcMain.on('mt::cmd-toggle-autosave', (e: IpcMainEvent) => {
      this.setItem('autoSave', !!this.getItem('autoSave'))
    })

    ipcMain.on('set-user-preference', (settings: Record<string, any>) => {
      this.setItems(settings)
    })
  }
}

export default Preference
