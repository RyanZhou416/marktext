import { defineStore } from 'pinia'
import { ipcRenderer } from '../util/tauri'
import log from '../util/logger'
import bus from '../bus'
import staticCommands, { RootCommand } from '../commands'

const executeCommand = (rootCommand: any, commandId: string) => {
  const { subcommands } = rootCommand
  const command = subcommands.find((c: any) => c.id === commandId)
  if (!command) {
    const errorMsg = `Cannot execute command "${commandId}" because it's missing.`
    log.error(errorMsg)
    throw new Error(errorMsg)
  }
  command.execute()
}

const normalizeAccelerator = (acc: string): string[] => {
  try {
    return acc
      .replace(/cmdorctrl|cmd/i, 'Cmd')
      .replace(/ctrl/i, 'Ctrl')
      .split('+')
  } catch (_) {
    return [acc]
  }
}

export const useCommandCenterStore = defineStore('commandCenter', {
  state: () => ({
    rootCommand: new RootCommand(staticCommands) as any
  }),

  actions: {
    REGISTER_COMMAND(command: any) {
      this.rootCommand.subcommands.push(command)
    },

    SORT_COMMANDS() {
      this.rootCommand.subcommands.sort((a: any, b: any) =>
        a.description.localeCompare(b.description)
      )
    },

    LISTEN_COMMAND_CENTER_BUS() {
      bus.$on('cmd::sort-commands', () => {
        this.SORT_COMMANDS()
      })

      ipcRenderer.on(
        'mt::keybindings-response',
        (e: any, keybindingMap: Record<string, string>) => {
          const { subcommands } = this.rootCommand
          for (const entry of subcommands) {
            const value = keybindingMap[entry.id]
            if (value) {
              entry.shortcut = normalizeAccelerator(value)
            }
          }
        }
      )

      bus.$on('cmd::register-command', (command: any) => {
        this.REGISTER_COMMAND(command)
      })

      bus.$on('cmd::execute', (commandId: any) => {
        executeCommand(this.rootCommand, commandId)
      })

      ipcRenderer.on('mt::execute-command-by-id', (e: any, commandId: string) => {
        executeCommand(this.rootCommand, commandId)
      })
    }
  }
})
