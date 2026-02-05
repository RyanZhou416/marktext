import fs from 'fs'
import path from 'path'
import { app, ipcMain, Menu, BrowserWindow, IpcMainEvent } from 'electron'
import log from 'electron-log'
import { ensureDirSync, isDirectory2, isFile2 } from 'common/filesystem'
import { isLinux, isOsx, isWindows } from '../config'
import { updateSidebarMenu } from '../menu/actions/edit'
import { updateFormatMenu } from '../menu/actions/format'
import { updateSelectionMenus } from '../menu/actions/paragraph'
import { viewLayoutChanged } from '../menu/actions/view'
import configureMenu, { configSettingMenu } from '../menu/templates'
import type Preference from '../preferences'
import type Keybindings from '../keyboard'

const RECENTLY_USED_DOCUMENTS_FILE_NAME = 'recently-used-documents.json'
const MAX_RECENTLY_USED_DOCUMENTS = 12

export const MenuType = {
  DEFAULT: 0,
  EDITOR: 1,
  SETTINGS: 2
} as const

type MenuTypeValue = typeof MenuType[keyof typeof MenuType]

interface WindowMenu {
  menu: Electron.Menu | null
  type: MenuTypeValue
}

class AppMenu {
  private _preferences: Preference
  private _keybindings: Keybindings
  private _userDataPath: string
  private RECENTS_PATH: string
  private isOsxOrWindows: boolean
  activeWindowId: number
  private windowMenus: Map<number, WindowMenu>

  constructor(preferences: Preference, keybindings: Keybindings, userDataPath: string) {
    this._preferences = preferences
    this._keybindings = keybindings
    this._userDataPath = userDataPath

    this.RECENTS_PATH = path.join(userDataPath, RECENTLY_USED_DOCUMENTS_FILE_NAME)
    this.isOsxOrWindows = isOsx || isWindows
    this.activeWindowId = -1
    this.windowMenus = new Map()

    this._listenForIpcMain()
  }

  /**
   * Add the file or directory path to the recently used documents.
   */
  addRecentlyUsedDocument(filePath: string): void {
    const { isOsxOrWindows, RECENTS_PATH } = this

    if (isOsxOrWindows) app.addRecentDocument(filePath)
    if (isOsx) return

    const recentDocuments = this.getRecentlyUsedDocuments()
    const index = recentDocuments.indexOf(filePath)
    let needSave = index !== 0
    if (index > 0) {
      recentDocuments.splice(index, 1)
    }
    if (index !== 0) {
      recentDocuments.unshift(filePath)
    }

    if (recentDocuments.length > MAX_RECENTLY_USED_DOCUMENTS) {
      needSave = true
      recentDocuments.splice(MAX_RECENTLY_USED_DOCUMENTS, recentDocuments.length - MAX_RECENTLY_USED_DOCUMENTS)
    }

    this.updateAppMenu(recentDocuments)

    if (needSave) {
      ensureDirSync(this._userDataPath)
      const json = JSON.stringify(recentDocuments, null, 2)
      fs.writeFileSync(RECENTS_PATH, json, 'utf-8')
    }
  }

  /**
   * Returns a list of all recently used documents and folders.
   */
  getRecentlyUsedDocuments(): string[] {
    const { RECENTS_PATH } = this
    if (!isFile2(RECENTS_PATH)) {
      return []
    }

    try {
      const recentDocuments = JSON.parse(fs.readFileSync(RECENTS_PATH, 'utf-8'))
        .filter((f: string) => f && (isFile2(f) || isDirectory2(f)))

      if (recentDocuments.length > MAX_RECENTLY_USED_DOCUMENTS) {
        recentDocuments.splice(MAX_RECENTLY_USED_DOCUMENTS, recentDocuments.length - MAX_RECENTLY_USED_DOCUMENTS)
      }
      return recentDocuments
    } catch (err) {
      log.error('Error while read recently used documents:', err)
      return []
    }
  }

  /**
   * Clear recently used documents.
   */
  clearRecentlyUsedDocuments(): void {
    const { isOsxOrWindows, RECENTS_PATH } = this
    if (isOsxOrWindows) app.clearRecentDocuments()
    if (isOsx) return

    const recentDocuments: string[] = []
    this.updateAppMenu(recentDocuments)
    const json = JSON.stringify(recentDocuments, null, 2)
    ensureDirSync(this._userDataPath)
    fs.writeFileSync(RECENTS_PATH, json, 'utf-8')
  }

  /**
   * Add a default menu to the given window.
   */
  addDefaultMenu(windowId: number): void {
    const { windowMenus } = this
    const menu = this._buildSettingMenu() // Setting menu is also the fallback menu.
    windowMenus.set(windowId, menu)
  }

  /**
   * Add the settings menu to the given window.
   */
  addSettingMenu(window: BrowserWindow): void {
    const { windowMenus } = this
    const menu = this._buildSettingMenu()
    windowMenus.set(window.id, menu)
  }

  /**
   * Add the editor menu to the given window.
   */
  addEditorMenu(window: BrowserWindow, options: { sourceCodeModeEnabled?: boolean } = {}): void {
    const isSourceMode = !!options.sourceCodeModeEnabled
    const { windowMenus } = this
    windowMenus.set(window.id, this._buildEditorMenu())

    const { menu } = windowMenus.get(window.id)!

    // Set source-code editor if preferred.
    const sourceCodeModeMenuItem = menu!.getMenuItemById('sourceCodeModeMenuItem')
    if (sourceCodeModeMenuItem) sourceCodeModeMenuItem.checked = isSourceMode

    if (isSourceMode) {
      const typewriterModeMenuItem = menu!.getMenuItemById('typewriterModeMenuItem')
      const focusModeMenuItem = menu!.getMenuItemById('focusModeMenuItem')
      if (typewriterModeMenuItem) typewriterModeMenuItem.enabled = false
      if (focusModeMenuItem) focusModeMenuItem.enabled = false
    }

    const { _keybindings } = this
    _keybindings.registerEditorKeyHandlers(window)

    if (isWindows) {
      // WORKAROUND: Window close event isn't triggered on Windows if `setIgnoreMenuShortcuts(true)` is used (Electron#32674).
      _keybindings.registerAccelerator(window, 'Alt+F4', (win: BrowserWindow) => {
        if (win && !win.isDestroyed()) {
          win.close()
        }
      })
    }
  }

  /**
   * Remove menu from the given window.
   */
  removeWindowMenu(windowId: number): void {
    const { activeWindowId } = this
    this.windowMenus.delete(windowId)
    if (activeWindowId === windowId) {
      this.activeWindowId = -1
    }
  }

  /**
   * Returns the window menu.
   */
  getWindowMenuById(windowId: number): Electron.Menu | null {
    const menu = this.windowMenus.get(windowId)
    if (!menu) {
      log.error(`getWindowMenuById: Cannot find window menu for window id ${windowId}.`)
      throw new Error(`Cannot find window menu for id ${windowId}.`)
    }
    return menu.menu
  }

  /**
   * Check whether the given window has a menu.
   */
  has(windowId: number): boolean {
    return this.windowMenus.has(windowId)
  }

  /**
   * Set the given window as last active.
   */
  setActiveWindow(windowId: number): void {
    if (this.activeWindowId !== windowId) {
      // Change application menu to the current window menu.
      this._setApplicationMenu(this.getWindowMenuById(windowId))
      this.activeWindowId = windowId
    }
  }

  /**
   * Updates all window menus.
   */
  updateAppMenu(recentUsedDocuments?: string[]): void {
    if (!recentUsedDocuments) {
      recentUsedDocuments = this.getRecentlyUsedDocuments()
    }

    // rebuild all window menus
    this.windowMenus.forEach((value, key) => {
      const { menu: oldMenu, type } = value
      if (type !== MenuType.EDITOR || !oldMenu) return

      const { menu: newMenu } = this._buildEditorMenu(recentUsedDocuments)
      if (!newMenu) return

      // all other menu items are set automatically
      updateMenuItem(oldMenu, newMenu, 'sourceCodeModeMenuItem')
      updateMenuItem(oldMenu, newMenu, 'typewriterModeMenuItem')
      updateMenuItem(oldMenu, newMenu, 'focusModeMenuItem')
      updateMenuItem(oldMenu, newMenu, 'sideBarMenuItem')
      updateMenuItem(oldMenu, newMenu, 'tabBarMenuItem')

      // update window menu
      value.menu = newMenu

      // update application menu if necessary
      const { activeWindowId } = this
      if (activeWindowId === key) {
        this._setApplicationMenu(newMenu)
      }
    })
  }

  /**
   * Update line ending menu items.
   */
  updateLineEndingMenu(windowId: number, lineEnding: string): void {
    const menus = this.getWindowMenuById(windowId)
    const crlfMenu = menus.getMenuItemById('crlfLineEndingMenuEntry')
    const lfMenu = menus.getMenuItemById('lfLineEndingMenuEntry')
    if (lineEnding === 'crlf') {
      if (crlfMenu) crlfMenu.checked = true
    } else {
      if (lfMenu) lfMenu.checked = true
    }
  }

  /**
   * Update always on top menu item.
   */
  updateAlwaysOnTopMenu(windowId: number, flag: boolean): void {
    const menus = this.getWindowMenuById(windowId)
    const menu = menus.getMenuItemById('alwaysOnTopMenuItem')
    if (menu) menu.checked = flag
  }

  /**
   * Update all theme entries from editor menus to the selected one.
   */
  updateThemeMenu = (theme: string): void => {
    this.windowMenus.forEach(value => {
      const { menu, type } = value
      if (type !== MenuType.EDITOR || !menu) {
        return
      }

      const themeMenus = menu.getMenuItemById('themeMenu')
      if (!themeMenus || !themeMenus.submenu) {
        return
      }

      themeMenus.submenu.items.forEach(item => (item.checked = false))
      themeMenus.submenu.items
        .forEach(item => {
          if (item.id && item.id === theme) {
            item.checked = true
          }
        })
    })
  }

  /**
   * Update all auto save entries from editor menus to the given state.
   */
  updateAutoSaveMenu = (autoSave: boolean): void => {
    this.windowMenus.forEach(value => {
      const { menu, type } = value
      if (type !== MenuType.EDITOR || !menu) {
        return
      }

      const autoSaveMenu = menu.getMenuItemById('autoSaveMenuItem')
      if (!autoSaveMenu) {
        return
      }
      autoSaveMenu.checked = autoSave
    })
  }

  private _buildEditorMenu(recentUsedDocuments: string[] | null = null): WindowMenu {
    if (!recentUsedDocuments) {
      recentUsedDocuments = this.getRecentlyUsedDocuments()
    }

    const menuTemplate = configureMenu(this._keybindings, this._preferences, recentUsedDocuments)
    const menu = Menu.buildFromTemplate(menuTemplate)
    return { menu, type: MenuType.EDITOR }
  }

  private _buildSettingMenu(): WindowMenu {
    if (isOsx) {
      const menuTemplate = configSettingMenu(this._keybindings)
      const menu = Menu.buildFromTemplate(menuTemplate)
      return { menu, type: MenuType.SETTINGS }
    }
    return { menu: null, type: MenuType.SETTINGS }
  }

  private _setApplicationMenu(menu: Electron.Menu | null): void {
    if (isLinux && !menu) {
      // WORKAROUND for Electron#16521: We cannot hide the (application) menu on Linux.
      const dummyMenu = Menu.buildFromTemplate([])
      Menu.setApplicationMenu(dummyMenu)
    } else {
      Menu.setApplicationMenu(menu)
    }
  }

  private _listenForIpcMain(): void {
    ipcMain.on('mt::add-recently-used-document', (e: IpcMainEvent, pathname: string) => {
      this.addRecentlyUsedDocument(pathname)
    })
    ipcMain.on('mt::update-line-ending-menu', (e: IpcMainEvent, windowId: number, lineEnding: string) => {
      this.updateLineEndingMenu(windowId, lineEnding)
    })
    ipcMain.on('mt::update-format-menu', (e: IpcMainEvent, windowId: number, formats: any) => {
      if (!this.has(windowId)) {
        log.error(`UpdateApplicationMenu: Cannot find window menu for window id ${windowId}.`)
        return
      }
      updateFormatMenu(this.getWindowMenuById(windowId), formats)
    })
    ipcMain.on('mt::update-sidebar-menu', (e: IpcMainEvent, windowId: number, value: boolean) => {
      if (!this.has(windowId)) {
        log.error(`UpdateApplicationMenu: Cannot find window menu for window id ${windowId}.`)
        return
      }
      updateSidebarMenu(this.getWindowMenuById(windowId), value)
    })
    ipcMain.on('mt::view-layout-changed', (e: IpcMainEvent, windowId: number, viewSettings: any) => {
      if (!this.has(windowId)) {
        log.error(`UpdateApplicationMenu: Cannot find window menu for window id ${windowId}.`)
        return
      }
      viewLayoutChanged(this.getWindowMenuById(windowId), viewSettings)
    })
    ipcMain.on('mt::editor-selection-changed', (e: IpcMainEvent, windowId: number, changes: any) => {
      if (!this.has(windowId)) {
        log.error(`UpdateApplicationMenu: Cannot find window menu for window id ${windowId}.`)
        return
      }
      updateSelectionMenus(this.getWindowMenuById(windowId), changes)
    })

    ipcMain.on('menu-add-recently-used', (pathname: string) => {
      this.addRecentlyUsedDocument(pathname)
    })
    ipcMain.on('menu-clear-recently-used', () => {
      this.clearRecentlyUsedDocuments()
    })

    ipcMain.on('broadcast-preferences-changed', (prefs: Record<string, any>) => {
      if (prefs.theme !== undefined) {
        this.updateThemeMenu(prefs.theme)
      }
      if (prefs.autoSave !== undefined) {
        this.updateAutoSaveMenu(prefs.autoSave)
      }
    })
  }
}

const updateMenuItem = (oldMenus: Electron.Menu, newMenus: Electron.Menu, id: string): void => {
  const oldItem = oldMenus.getMenuItemById(id)
  const newItem = newMenus.getMenuItemById(id)
  if (oldItem && newItem) {
    newItem.checked = oldItem.checked
  }
}

// ----------------------------------------------

/**
 * Return the menu from the application menu.
 */
export const getMenuItemById = (menuId: string): Electron.MenuItem | null => {
  const menus = Menu.getApplicationMenu()
  return menus?.getMenuItemById(menuId) || null
}

export default AppMenu
