/**
 * Simple logger for renderer process with contextIsolation
 *
 * In contextIsolation mode, we cannot use electron-log directly because it
 * tries to require('electron') which is not available. This module provides
 * a simple console-based logger with the same API.
 */

import { ipcRenderer } from './tauri'

// Create logger instance
const log = {
  transports: {
    console: {
      level: 'info'
    },
    file: {
      level: 'info',
      resolvePath: null
    },
    mainConsole: null
  },

  // Log to console
  log: (...args) => {
    console.log(...args)
  },

  error: (...args) => {
    console.error('[ERROR]', ...args)
    // Send to main process for file logging
    try {
      ipcRenderer.send('mt::renderer-log', {
        level: 'error',
        args: args.map(String)
      })
    } catch (e) {
      // Ignore if IPC not available
    }
  },

  warn: (...args) => {
    console.warn('[WARN]', ...args)
    try {
      ipcRenderer.send('mt::renderer-log', {
        level: 'warn',
        args: args.map(String)
      })
    } catch (e) {
      // Ignore
    }
  },

  info: (...args) => {
    console.info('[INFO]', ...args)
    try {
      ipcRenderer.send('mt::renderer-log', {
        level: 'info',
        args: args.map(String)
      })
    } catch (e) {
      // Ignore
    }
  },

  verbose: (...args) => {
    console.log('[VERBOSE]', ...args)
  },

  debug: (...args) => {
    console.debug('[DEBUG]', ...args)
  },

  silly: (...args) => {
    console.log('[SILLY]', ...args)
  }
}

export default log
