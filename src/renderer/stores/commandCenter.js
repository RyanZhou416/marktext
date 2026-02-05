import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ipcRenderer } from '../util/electron'
import log from '../util/logger'
import bus from '../bus'
import staticCommands, { RootCommand } from '../commands'

export const useCommandCenterStore = defineStore('commandCenter', () => {
  // State
  const rootCommand = ref(new RootCommand(staticCommands))

  // Actions
  function registerCommand (command) {
    rootCommand.value.subcommands.push(command)
  }

  function sortCommands () {
    rootCommand.value.subcommands.sort((a, b) =>
      a.description.localeCompare(b.description)
    )
  }

  function executeCommand (commandId) {
    const { subcommands } = rootCommand.value
    const command = subcommands.find((c) => c.id === commandId)
    if (!command) {
      const errorMsg = `Cannot execute command "${commandId}" because it's missing.`
      log.error(errorMsg)
      throw new Error(errorMsg)
    }
    command.execute()
  }

  function normalizeAccelerator (acc) {
    try {
      return acc
        .replace(/cmdorctrl|cmd/i, 'Cmd')
        .replace(/ctrl/i, 'Ctrl')
        .split('+')
    } catch (_) {
      return [acc]
    }
  }

  function listenCommandCenterBus () {
    // Init stuff
    bus.$on('cmd::sort-commands', () => {
      sortCommands()
    })
    ipcRenderer.on('mt::keybindings-response', (e, keybindingMap) => {
      const { subcommands } = rootCommand.value
      for (const entry of subcommands) {
        const value = keybindingMap[entry.id]
        if (value) {
          entry.shortcut = normalizeAccelerator(value)
        }
      }
    })

    // Register commands that are created at runtime.
    bus.$on('cmd::register-command', (command) => {
      registerCommand(command)
    })

    // Allow other components to execute commands with predefined values.
    bus.$on('cmd::execute', (commandId) => {
      executeCommand(commandId)
    })
    ipcRenderer.on('mt::execute-command-by-id', (e, commandId) => {
      executeCommand(commandId)
    })
  }

  return {
    // State
    rootCommand,
    // Actions
    registerCommand,
    sortCommands,
    executeCommand,
    listenCommandCenterBus
  }
})
