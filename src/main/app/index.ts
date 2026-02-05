import path from 'path'
import fsPromises from 'fs/promises'
import { exec } from 'child_process'
import dayjs from 'dayjs'
import log from 'electron-log'
import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  Menu,
  nativeTheme,
  shell,
  IpcMainEvent,
  IpcMainInvokeEvent,
  MenuItemConstructorOptions
} from 'electron'
import { isChildOfDirectory } from 'common/filesystem/paths'
import { isLinux, isOsx, isWindows } from '../config'
import parseArgs from '../cli/parser'
import { normalizeAndResolvePath } from '../filesystem'
import { normalizeMarkdownPath } from '../filesystem/markdown'
import { registerKeyboardListeners } from '../keyboard'
import { selectTheme } from '../menu/actions/theme'
import { dockMenu } from '../menu/templates'
import registerSpellcheckerListeners from '../spellchecker'
import { watchers } from '../utils/imagePathAutoComplement'
import { WindowType } from '../windows/base'
import EditorWindow from '../windows/editor'
import SettingWindow from '../windows/setting'
import type Accessor from './accessor'
import type { CliArgs } from '../types'

interface PathInfo {
  isDir: boolean
  path: string
}

interface ContextMenuData {
  type: string
  x: number
  y: number
  menuTemplate: Array<{
    type?: string
    label?: string
    id?: string
    enabled?: boolean
  }>
  tabId?: string
  pathname?: string
}

class App {
  private _accessor: Accessor
  private _args: CliArgs
  private _openFilesCache: PathInfo[]
  private _openFilesTimer: NodeJS.Timeout | null
  private _windowManager: Accessor['windowManager']

  /**
   * @param accessor The application accessor for application instances.
   * @param args Parsed application arguments.
   */
  constructor(accessor: Accessor, args: CliArgs) {
    this._accessor = accessor
    this._args = args || { _: [] }
    this._openFilesCache = []
    this._openFilesTimer = null
    this._windowManager = this._accessor.windowManager

    this._listenForIpcMain()
  }

  /**
   * The entry point into the application.
   */
  init(): void {
    // Enable these features to use `backdrop-filter` css rules!
    if (isOsx) {
      app.commandLine.appendSwitch(
        'enable-experimental-web-platform-features',
        'true'
      )
    }

    app.on('second-instance', (event, argv, workingDirectory) => {
      const { _openFilesCache, _windowManager } = this
      const args = parseArgs(argv.slice(1))

      const buf: PathInfo[] = []
      for (const pathname of args._) {
        // Ignore all unknown flags
        if (pathname.startsWith('--')) {
          continue
        }

        const info = normalizeMarkdownPath(
          path.resolve(workingDirectory, pathname)
        )
        if (info) {
          buf.push(info)
        }
      }

      if (args['--new-window']) {
        this._openPathList(buf, true)
        return
      }

      _openFilesCache.push(...buf)
      if (_openFilesCache.length) {
        this._openFilesToOpen()
      } else {
        const activeWindow = _windowManager.getActiveWindow()
        if (activeWindow) {
          activeWindow.bringToFront()
        }
      }
    })

    app.on('open-file', this.openFile) // macOS only

    app.on('ready', this.ready)

    app.on('window-all-closed', () => {
      // Close all the image path watcher
      for (const watcher of watchers.values()) {
        watcher.close()
      }
      this._windowManager.closeWatcher()
      if (!isOsx) {
        app.quit()
      }
    })

    app.on('activate', () => {
      // macOS only
      // On OS X it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (this._windowManager.windowCount === 0) {
        this.ready()
      }
    })

    // Prevent to load webview and opening links or new windows via HTML/JS.
    app.on('web-contents-created', (event, contents) => {
      contents.on('will-attach-webview', (event) => {
        event.preventDefault()
      })
      contents.on('will-navigate', (event) => {
        event.preventDefault()
      })
      contents.setWindowOpenHandler((details) => {
        return { action: 'deny' }
      })
    })
  }

  async getScreenshotFileName(): Promise<string> {
    const screenshotFolderPath = await this._accessor.dataCenter.getItem(
      'screenshotFolderPath'
    )
    const fileName = `${dayjs().format('YYYY-MM-DD-HH-mm-ss')}-screenshot.png`
    return path.join(screenshotFolderPath as string, fileName)
  }

  ready = (): void => {
    const { _args: args, _openFilesCache } = this
    const { preferences } = this._accessor

    if (args._.length) {
      for (const pathname of args._) {
        // Ignore all unknown flags
        if (pathname.startsWith('--')) {
          continue
        }

        const info = normalizeMarkdownPath(pathname)
        if (info) {
          _openFilesCache.push(info)
        }
      }
    }

    const { startUpAction, defaultDirectoryToOpen, autoSwitchTheme, theme } =
      preferences.getAll()

    if (startUpAction === 'folder' && defaultDirectoryToOpen) {
      const info = normalizeMarkdownPath(defaultDirectoryToOpen)
      if (info) {
        _openFilesCache.unshift(info)
      }
    }

    // Set initial native theme for theme in preferences.
    const isDarkTheme = /dark/i.test(theme)
    if (
      autoSwitchTheme === 0 &&
      isDarkTheme !== nativeTheme.shouldUseDarkColors
    ) {
      selectTheme(nativeTheme.shouldUseDarkColors ? 'dark' : 'light')
      nativeTheme.themeSource = nativeTheme.shouldUseDarkColors
        ? 'dark'
        : 'light'
    } else {
      nativeTheme.themeSource = isDarkTheme ? 'dark' : 'light'
    }

    let isDarkMode = nativeTheme.shouldUseDarkColors
    ipcMain.on('broadcast-preferences-changed', (change: any) => {
      // Set Chromium's color for native elements after theme change.
      if (change.theme) {
        const isDarkTheme = /dark/i.test(change.theme)
        if (isDarkMode !== isDarkTheme) {
          isDarkMode = isDarkTheme
          nativeTheme.themeSource = isDarkTheme ? 'dark' : 'light'
        } else if (nativeTheme.themeSource === 'system') {
          // Need to set dark or light theme because we set `system` to get the current system theme.
          nativeTheme.themeSource = isDarkMode ? 'dark' : 'light'
        }
      }
    })

    if (isOsx) {
      app.dock.setMenu(dockMenu)
    } else if (isWindows) {
      app.setJumpList([
        {
          type: 'recent'
        },
        {
          type: 'tasks',
          items: [
            {
              type: 'task',
              title: 'New Window',
              description: 'Opens a new window',
              program: process.execPath,
              args: '--new-window',
              iconPath: process.execPath,
              iconIndex: 0
            }
          ]
        }
      ])
    }

    if (_openFilesCache.length) {
      this._openFilesToOpen()
    } else {
      this._createEditorWindow()
    }
  }

  openFile = (event: Electron.Event, pathname: string): void => {
    event.preventDefault()
    const info = normalizeMarkdownPath(pathname)
    if (info) {
      this._openFilesCache.push(info)

      if (app.isReady()) {
        // It might come more files
        if (this._openFilesTimer) {
          clearTimeout(this._openFilesTimer)
        }
        this._openFilesTimer = setTimeout(() => {
          this._openFilesTimer = null
          this._openFilesToOpen()
        }, 100)
      }
    }
  }

  // --- private --------------------------------

  /**
   * Creates a new editor window.
   */
  _createEditorWindow(
    rootDirectory: string | null = null,
    fileList: string[] = [],
    markdownList: string[] = [],
    options: object = {}
  ): EditorWindow {
    const editor = new EditorWindow(this._accessor)
    editor.createWindow(rootDirectory, fileList, markdownList, options)
    this._windowManager.add(editor)
    if (this._windowManager.windowCount === 1) {
      this._accessor.menu.setActiveWindow(editor.id)
    }
    return editor
  }

  /**
   * Create a new setting window.
   */
  _createSettingWindow(category?: string): void {
    const setting = new SettingWindow(this._accessor)
    setting.createWindow(category)
    this._windowManager.add(setting)
    if (this._windowManager.windowCount === 1) {
      this._accessor.menu.setActiveWindow(setting.id)
    }
  }

  _openFilesToOpen(): void {
    this._openPathList(this._openFilesCache, false)
  }

  /**
   * Open the path list in the best window(s).
   */
  _openPathList(pathsToOpen: PathInfo[], openFilesInSameWindow: boolean = false): void {
    const { _windowManager } = this
    const openFilesInNewWindow = this._accessor.preferences.getItem(
      'openFilesInNewWindow'
    )

    const fileSet = new Set<string>()
    const directorySet = new Set<string>()
    for (const { isDir, path } of pathsToOpen) {
      if (isDir) {
        directorySet.add(path)
      } else {
        fileSet.add(path)
      }
    }

    // Filter out directories that are already opened.
    for (const window of _windowManager.windows.values()) {
      if (window.type === WindowType.EDITOR) {
        const { openedRootDirectory } = window as EditorWindow
        if (directorySet.has(openedRootDirectory)) {
          window.bringToFront()
          directorySet.delete(openedRootDirectory)
        }
      }
    }

    const directoriesToOpen: Array<{ rootDirectory: string | null; fileList: string[] }> = 
      Array.from(directorySet).map((dir) => ({
        rootDirectory: dir,
        fileList: []
      }))
    const filesToOpen = Array.from(fileSet)

    // Discard all directories except first one and add files.
    if (openFilesInSameWindow) {
      if (directoriesToOpen.length) {
        directoriesToOpen[0].fileList.push(...filesToOpen)
        directoriesToOpen.length = 1
      } else {
        directoriesToOpen.push({
          rootDirectory: null,
          fileList: [...filesToOpen]
        })
      }
      filesToOpen.length = 0
    }

    // Find the best window(s) to open the files in.
    if (!openFilesInSameWindow && !openFilesInNewWindow) {
      const isFirstWindow = _windowManager.getActiveEditorId() === null

      // Prefer new directories
      for (let i = 0; i < directoriesToOpen.length; ++i) {
        const { fileList, rootDirectory } = directoriesToOpen[i]

        let breakOuterLoop = false
        for (let j = 0; j < filesToOpen.length; ++j) {
          const pathname = filesToOpen[j]
          if (isChildOfDirectory(rootDirectory!, pathname)) {
            if (isFirstWindow) {
              fileList.push(...filesToOpen)
              filesToOpen.length = 0
              breakOuterLoop = true
              break
            }
            fileList.push(pathname)
            filesToOpen.splice(j, 1)
            --j
          }
        }

        if (breakOuterLoop) {
          break
        }
      }

      // Find for the remaining files the best window to open the files in.
      if (isFirstWindow && directoriesToOpen.length && filesToOpen.length) {
        const { fileList } = directoriesToOpen[0]
        fileList.push(...filesToOpen)
        filesToOpen.length = 0
      } else {
        const windowList = _windowManager.findBestWindowToOpenIn(filesToOpen)
        for (const item of windowList) {
          const { windowId, fileList } = item

          // File list is empty when all files are already opened.
          if (fileList.length === 0) {
            continue
          }

          if (windowId !== null) {
            const window = _windowManager.get(windowId)
            if (window) {
              (window as EditorWindow).openTabsFromPaths(fileList)
              window.bringToFront()
              continue
            }
            // else: fallthrough
          }
          this._createEditorWindow(null, fileList)
        }
      }

      // Directores are always opened in a new window if not already opened.
      for (const item of directoriesToOpen) {
        const { rootDirectory, fileList } = item
        this._createEditorWindow(rootDirectory, fileList)
      }
    } else {
      // Open each file and directory in a new window.

      for (const pathname of filesToOpen) {
        this._createEditorWindow(null, [pathname])
      }

      for (const item of directoriesToOpen) {
        const { rootDirectory, fileList } = item
        this._createEditorWindow(rootDirectory, fileList)
      }
    }

    // Empty the file list
    pathsToOpen.length = 0
  }

  _openSettingsWindow(category?: string): void {
    const settingWins = this._windowManager.getWindowsByType(
      WindowType.SETTINGS
    )
    if (settingWins.length >= 1) {
      // A setting window is already created
      const browserSettingWindow = settingWins[0].win.browserWindow
      browserSettingWindow.webContents.send('settings::change-tab', category)
      if (isLinux) {
        browserSettingWindow.focus()
      } else {
        browserSettingWindow.moveTop()
      }
      return
    }
    this._createSettingWindow(category)
  }

  _listenForIpcMain(): void {
    registerKeyboardListeners()
    registerSpellcheckerListeners()

    ipcMain.on('app-create-editor-window', () => {
      this._createEditorWindow()
    })

    ipcMain.on('screen-capture', async (win: BrowserWindow) => {
      if (isOsx) {
        // Use macOs `screencapture` command line when in macOs system.
        const screenshotFileName = await this.getScreenshotFileName()
        exec('screencapture -i -c', async (err) => {
          if (err) {
            log.error(err)
            return
          }
          try {
            // Write screenshot image into screenshot folder.
            const image = clipboard.readImage()
            const bufferImage = image.toPNG()
            await fsPromises.writeFile(screenshotFileName, bufferImage)
          } catch (err) {
            log.error(err)
          }
          win.webContents.send('mt::screenshot-captured')
        })
      }
    })

    ipcMain.on('app-create-settings-window', (category: string) => {
      this._openSettingsWindow(category)
    })

    ipcMain.on('app-open-file-by-id', (windowId: number, filePath: string) => {
      const openFilesInNewWindow = this._accessor.preferences.getItem(
        'openFilesInNewWindow'
      )
      if (openFilesInNewWindow) {
        this._createEditorWindow(null, [filePath])
      } else {
        const editor = this._windowManager.get(windowId) as EditorWindow
        if (editor) {
          editor.openTab(filePath, {}, true)
        }
      }
    })

    ipcMain.on('app-open-files-by-id', (windowId: number, fileList: string[]) => {
      const openFilesInNewWindow = this._accessor.preferences.getItem(
        'openFilesInNewWindow'
      )
      if (openFilesInNewWindow) {
        this._createEditorWindow(null, fileList)
      } else {
        const editor = this._windowManager.get(windowId) as EditorWindow
        if (editor) {
          editor.openTabsFromPaths(
            fileList
              .map((p) => normalizeMarkdownPath(p))
              .filter((i): i is PathInfo => i !== null && !i.isDir)
              .map((i) => i.path)
          )
        }
      }
    })

    ipcMain.on('app-open-markdown-by-id', (windowId: number, data: string) => {
      const openFilesInNewWindow = this._accessor.preferences.getItem(
        'openFilesInNewWindow'
      )
      if (openFilesInNewWindow) {
        this._createEditorWindow(null, [], [data])
      } else {
        const editor = this._windowManager.get(windowId) as EditorWindow
        if (editor) {
          editor.openUntitledTab(true, data)
        }
      }
    })

    ipcMain.on(
      'app-open-directory-by-id',
      (windowId: number, pathname: string, openInSameWindow: boolean) => {
        const { openFolderInNewWindow } = this._accessor.preferences.getAll()
        if (openInSameWindow || !openFolderInNewWindow) {
          const editor = this._windowManager.get(windowId) as EditorWindow
          if (editor) {
            editor.openFolder(pathname)
            return
          }
        }
        this._createEditorWindow(pathname)
      }
    )

    // --- renderer -------------------

    ipcMain.on('mt::app-try-quit', () => {
      app.quit()
    })

    ipcMain.on('mt::open-file-by-window-id', (e: IpcMainEvent, windowId: number, filePath: string) => {
      const resolvedPath = normalizeAndResolvePath(filePath)
      const openFilesInNewWindow = this._accessor.preferences.getItem(
        'openFilesInNewWindow'
      )
      if (openFilesInNewWindow) {
        this._createEditorWindow(null, [resolvedPath])
      } else {
        const editor = this._windowManager.get(windowId) as EditorWindow
        if (editor) {
          editor.openTab(resolvedPath, {}, true)
        }
      }
    })

    ipcMain.on('mt::select-default-directory-to-open', async (e: IpcMainEvent) => {
      const { preferences } = this._accessor
      const { defaultDirectoryToOpen } = preferences.getAll()
      const win = BrowserWindow.fromWebContents(e.sender)

      const { filePaths } = await dialog.showOpenDialog(win!, {
        defaultPath: defaultDirectoryToOpen,
        properties: ['openDirectory', 'createDirectory']
      })
      if (filePaths && filePaths[0]) {
        preferences.setItems({ defaultDirectoryToOpen: filePaths[0] })
      }
    })

    ipcMain.on('mt::open-setting-window', () => {
      this._openSettingsWindow()
    })

    ipcMain.on('mt::make-screenshot', (e: IpcMainEvent) => {
      const win = BrowserWindow.fromWebContents(e.sender)
      ipcMain.emit('screen-capture', win)
    })

    ipcMain.on('mt::request-keybindings', (e: IpcMainEvent) => {
      const win = BrowserWindow.fromWebContents(e.sender)
      const { keybindings } = this._accessor
      // Convert map to object
      win!.webContents.send(
        'mt::keybindings-response',
        Object.fromEntries(keybindings.keys)
      )
    })

    ipcMain.on('mt::open-keybindings-config', () => {
      const { keybindings } = this._accessor
      keybindings.openConfigInFileManager()
    })

    ipcMain.handle('mt::keybinding-get-pref-keybindings', () => {
      const { keybindings } = this._accessor
      const defaultKeybindings = keybindings.getDefaultKeybindings()
      const userKeybindings = keybindings.getUserKeybindings()
      return { defaultKeybindings, userKeybindings }
    })

    ipcMain.handle(
      'mt::keybinding-save-user-keybindings',
      async (event: IpcMainInvokeEvent, userKeybindings: any) => {
        const { keybindings } = this._accessor
        return keybindings.setUserKeybindings(userKeybindings)
      }
    )

    ipcMain.handle('mt::fs-trash-item', async (event: IpcMainInvokeEvent, fullPath: string) => {
      return shell.trashItem(fullPath)
    })

    // Font manager IPC handler for contextIsolation
    ipcMain.handle('mt::get-available-fonts', async (event: IpcMainInvokeEvent, onlyMonospace: boolean) => {
      try {
        const fontmanager = require('fontmanager-redux')
        const fonts = fontmanager.getAvailableFontsSync()
        const families = [...new Set(fonts.map((f: any) => f.family))].sort()
        return families
      } catch (err) {
        log.error('Failed to get available fonts:', err)
        return []
      }
    })

    // Context menu IPC handler for contextIsolation
    ipcMain.on('mt::show-context-menu', (e: IpcMainEvent, data: ContextMenuData) => {
      const { type, x, y, menuTemplate, tabId, pathname } = data
      const win = BrowserWindow.fromWebContents(e.sender)
      if (!win) return

      const template: MenuItemConstructorOptions[] = menuTemplate.map(item => {
        if (item.type === 'separator') {
          return { type: 'separator' as const }
        }
        return {
          label: item.label,
          enabled: item.enabled !== false,
          click: () => {
            // Send action back to renderer process
            win.webContents.send('mt::context-menu-clicked', {
              type,
              actionId: item.id,
              tabId,
              pathname
            })
          }
        }
      })

      const menu = Menu.buildFromTemplate(template)
      menu.popup({ window: win, x, y })
    })
  }
}

export default App
