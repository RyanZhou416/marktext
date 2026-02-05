import WindowManager from '../app/windowManager'
import Preference from '../preferences'
import DataCenter from '../dataCenter'
import Keybindings from '../keyboard/shortcutHandler'
import AppMenu from '../menu'
import { loadMenuCommands } from '../menu/actions'
import { CommandManager, loadDefaultCommands } from '../commands'
import type { AppEnvironment } from './env'

class Accessor {
  env: AppEnvironment
  paths: AppEnvironment['paths']
  preferences: Preference
  dataCenter: DataCenter
  commandManager: typeof CommandManager
  keybindings: Keybindings
  menu: AppMenu
  windowManager: WindowManager

  /**
   * @param appEnvironment The application environment instance.
   */
  constructor(appEnvironment: AppEnvironment) {
    const userDataPath = appEnvironment.paths.userDataPath

    this.env = appEnvironment
    this.paths = appEnvironment.paths // export paths to make it better accessible

    this.preferences = new Preference(this.paths)
    this.dataCenter = new DataCenter(this.paths)

    this.commandManager = CommandManager
    this._loadCommands()

    this.keybindings = new Keybindings(this.commandManager, appEnvironment)
    this.menu = new AppMenu(this.preferences, this.keybindings, userDataPath)
    this.windowManager = new WindowManager(this.menu, this.preferences)
  }

  _loadCommands(): void {
    const { commandManager } = this
    loadDefaultCommands(commandManager)
    loadMenuCommands(commandManager)

    if (this.env.isDevMode) {
      (commandManager as any).__verifyDefaultCommands()
    }
  }
}

export default Accessor
