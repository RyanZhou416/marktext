import COMMAND_CONSTANTS from 'common/commands/constants'
import { loadFileCommands } from './file'
import { loadTabCommands } from './tab'

export const COMMANDS = COMMAND_CONSTANTS

export const loadDefaultCommands = (commandManager: CommandManager): void => {
  loadFileCommands(commandManager)
  loadTabCommands(commandManager)
}

type CommandCallback = (...args: any[]) => any

class CommandManager {
  private _commands: Map<string, CommandCallback>

  constructor() {
    this._commands = new Map()
  }

  add(id: string, callback: CommandCallback): void {
    const { _commands } = this
    if (_commands.has(id)) {
      throw new Error(`Command with id="${id}" already exists.`)
    }
    _commands.set(id, callback)
  }

  remove(id: string): boolean {
    return this._commands.delete(id)
  }

  has(id: string): boolean {
    return this._commands.has(id)
  }

  execute(id: string, ...args: any[]): any {
    const command = this._commands.get(id)
    if (!command) {
      throw new Error(`No command found with id="${id}".`)
    }
    return command(...args)
  }

  __verifyDefaultCommands(): void {
    const { _commands } = this
    Object.keys(COMMANDS).forEach(propertyName => {
      const id = (COMMANDS as Record<string, string>)[propertyName]
      if (!_commands.has(id)) {
        console.error(`[DEBUG] Default command with id="${id}" isn't available!`)
      }
    })
  }
}

const commandManagerInstance = new CommandManager()
export { commandManagerInstance as CommandManager }
