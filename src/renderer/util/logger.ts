/**
 * Simple logger for renderer process with contextIsolation
 *
 * In contextIsolation mode, we cannot use electron-log directly because it
 * tries to require('electron') which is not available. This module provides
 * a simple console-based logger with the same API.
 */

import { ipcRenderer } from './tauri'

interface LogTransports {
  console: {
    level: string
  }
  file: {
    level: string
    resolvePath: ((variables: any) => string) | null
  }
  mainConsole: any
}

interface Logger {
  transports: LogTransports
  log: (...args: any[]) => void
  error: (...args: any[]) => void
  warn: (...args: any[]) => void
  info: (...args: any[]) => void
  verbose: (...args: any[]) => void
  debug: (...args: any[]) => void
  silly: (...args: any[]) => void
}

// Create logger instance
const log: Logger = {
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
  log: (...args: any[]): void => {
    console.log(...args)
  },

  error: (...args: any[]): void => {
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

  warn: (...args: any[]): void => {
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

  info: (...args: any[]): void => {
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

  verbose: (...args: any[]): void => {
    console.log('[VERBOSE]', ...args)
  },

  debug: (...args: any[]): void => {
    console.debug('[DEBUG]', ...args)
  },

  silly: (...args: any[]): void => {
    console.log('[SILLY]', ...args)
  }
}

export default log
