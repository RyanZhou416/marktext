import fs from 'fs'
import path from 'path'
import EventEmitter from 'events'
import { BrowserWindow, ipcMain, dialog, IpcMainEvent } from 'electron'
import * as secureStorage from './secureStorage'
import schema from './schema.json'
import Store from 'electron-store'
import log from 'electron-log'
import { ensureDirSync } from 'common/filesystem'
import { IMAGE_EXTENSIONS } from 'common/filesystem/paths'

const DATA_CENTER_NAME = 'dataCenter'

interface AppPaths {
  dataCenterPath: string
  userDataPath: string
}

interface ImageItem {
  url: string
  timeStamp: number
}

class DataCenter extends EventEmitter {
  private dataCenterPath: string
  private userDataPath: string
  private serviceName: string
  private encryptKeys: string[]
  private hasDataCenterFile: boolean
  private store: Store

  constructor(paths: AppPaths) {
    super()

    const { dataCenterPath, userDataPath } = paths
    this.dataCenterPath = dataCenterPath
    this.userDataPath = userDataPath
    this.serviceName = 'marktext'
    this.encryptKeys = ['githubToken']
    this.hasDataCenterFile = fs.existsSync(
      path.join(this.dataCenterPath, `./${DATA_CENTER_NAME}.json`)
    )
    this.store = new Store({
      schema: schema as any,
      name: DATA_CENTER_NAME
    })

    this.init()
    this._migrateFromKeytar()
  }

  /**
   * 从 keytar 迁移数据到 safeStorage (一次性迁移)
   */
  private async _migrateFromKeytar(): Promise<void> {
    try {
      const result = await secureStorage.migrateFromKeytar(
        this.serviceName,
        this.encryptKeys
      )
      if (result.migrated.length > 0) {
        log.info(
          'Successfully migrated secure data from keytar:',
          result.migrated
        )
      }
      if (result.errors.length > 0) {
        log.error('Failed to migrate some keys:', result.errors)
      }
    } catch (err) {
      log.error('Migration from keytar failed:', err)
    }
  }

  init(): void {
    const defaultData = {
      imageFolderPath: path.join(this.userDataPath, 'images'),
      screenshotFolderPath: path.join(this.userDataPath, 'screenshot'),
      webImages: [],
      cloudImages: [],
      currentUploader: 'none',
      imageBed: {
        github: {
          owner: '',
          repo: '',
          branch: ''
        }
      }
    }

    if (!this.hasDataCenterFile) {
      this.store.set(defaultData)
      ensureDirSync(this.store.get('screenshotFolderPath') as string)
    }
    this._listenForIpcMain()
  }

  async getAll(): Promise<Record<string, any>> {
    const { serviceName, encryptKeys } = this
    const data = this.store.store
    try {
      const encryptData = await Promise.all(
        encryptKeys.map((key) => {
          return secureStorage.getPassword(serviceName, key)
        })
      )
      const encryptObj = encryptKeys.reduce((acc, k, i) => {
        return {
          ...acc,
          [k]: encryptData[i]
        }
      }, {} as Record<string, any>)

      return Object.assign(data, encryptObj)
    } catch (err) {
      log.error('Failed to decrypt secure keys:', err)
      return data
    }
  }

  addImage(key: string, url: string): void {
    const items = this.store.get(key) as ImageItem[]
    const alreadyHas = items.some((item) => item.url === url)
    let item: ImageItem
    if (alreadyHas) {
      item = items.find((item) => item.url === url)!
      item.timeStamp = +new Date()
    } else {
      item = {
        url,
        timeStamp: +new Date()
      }
      items.push(item)
    }

    ipcMain.emit('broadcast-web-image-added', { type: key, item })
    this.store.set(key, items)
  }

  removeImage(type: string, url: string): void {
    const items = this.store.get(type) as ImageItem[]
    const index = items.findIndex(item => item.url === url)
    if (index === -1) return
    const item = items[index]
    items.splice(index, 1)
    ipcMain.emit('broadcast-web-image-removed', { type, item })
    this.store.set(type, items)
  }

  /**
   * return a promise
   */
  getItem(key: string): Promise<any> {
    const { encryptKeys, serviceName } = this
    if (encryptKeys.includes(key)) {
      return secureStorage.getPassword(serviceName, key)
    } else {
      const value = this.store.get(key)
      return Promise.resolve(value)
    }
  }

  async setItem(key: string, value: any): Promise<void> {
    const { encryptKeys, serviceName } = this
    if (key === 'screenshotFolderPath') {
      ensureDirSync(value)
    }
    ipcMain.emit('broadcast-user-data-changed', { [key]: value })
    if (encryptKeys.includes(key)) {
      try {
        await secureStorage.setPassword(serviceName, key, value)
      } catch (err) {
        log.error('Secure storage error:', err)
      }
    } else {
      this.store.set(key, value)
    }
  }

  /**
   * Change multiple setting entries.
   */
  setItems(settings: Record<string, any>): void {
    if (!settings) {
      log.error(
        'Cannot change settings without entires: object is undefined or null.'
      )
      return
    }

    Object.keys(settings).forEach((key) => {
      this.setItem(key, settings[key])
    })
  }

  private _listenForIpcMain(): void {
    // local main events
    ipcMain.on('set-image-folder-path', (newPath: string) => {
      this.setItem('imageFolderPath', newPath)
    })

    // events from renderer process
    ipcMain.on('mt::ask-for-user-data', async (e: IpcMainEvent) => {
      const win = BrowserWindow.fromWebContents(e.sender)
      const userData = await this.getAll()
      win?.webContents.send('mt::user-preference', userData)
    })

    ipcMain.on('mt::ask-for-modify-image-folder-path', async (e: IpcMainEvent, imagePath: string) => {
      if (!imagePath) {
        const win = BrowserWindow.fromWebContents(e.sender)
        if (!win) return
        const { filePaths } = await dialog.showOpenDialog(win, {
          properties: ['openDirectory', 'createDirectory']
        })
        if (filePaths && filePaths[0]) {
          imagePath = filePaths[0]
        }
      }
      if (imagePath) {
        this.setItem('imageFolderPath', imagePath)
      }
    })

    ipcMain.on('mt::set-user-data', (e: IpcMainEvent, userData: Record<string, any>) => {
      this.setItems(userData)
    })

    // TODO: Replace sync. call.
    ipcMain.on('mt::ask-for-image-path', async (e: IpcMainEvent) => {
      const win = BrowserWindow.fromWebContents(e.sender)
      if (!win) {
        e.returnValue = ''
        return
      }
      const { filePaths } = await dialog.showOpenDialog(win, {
        properties: ['openFile'],
        filters: [
          {
            name: 'Images',
            extensions: IMAGE_EXTENSIONS
          }
        ]
      })

      if (filePaths && filePaths[0]) {
        e.returnValue = filePaths[0]
      } else {
        e.returnValue = ''
      }
    })
  }
}

export default DataCenter
