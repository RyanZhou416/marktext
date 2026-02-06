/**
 * Unified Backend Abstraction Layer
 *
 * This module provides a unified API that automatically detects and switches
 * between Electron and Tauri backends at runtime.
 *
 * Usage:
 *   import { ipcRenderer, fs, path } from '@/util/backend'
 *
 * The module will automatically use Electron APIs when running in Electron,
 * and Tauri APIs when running in Tauri.
 */

import * as electronApi from './electron'
import * as tauriApi from './tauri'

// Detect which backend is available
const detectBackend = () => {
  // Check for Tauri first (more specific)
  if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
    return 'tauri'
  }
  // Check for Electron
  if (typeof window !== 'undefined' && window.__ELECTRON_PRELOAD_LOADED__) {
    return 'electron'
  }
  // Default to electron for compatibility
  return 'electron'
}

const currentBackend = detectBackend()

console.log(`[Backend] Using ${currentBackend} backend`)

// Select the appropriate API based on the detected backend
const api = currentBackend === 'tauri' ? tauriApi : electronApi

// Re-export all APIs from the detected backend
export const ipcRenderer = api.ipcRenderer
export const shell = api.shell
export const clipboard = api.clipboard
export const nativeImage = api.nativeImage
export const webFrame = api.webFrame
export const webUtils = api.webUtils
export const fs = api.fs
export const path = api.path
export const os = api.os
export const processInfo = api.processInfo
export const crypto = api.crypto
export const childProcess = api.childProcess

// Platform detection
export const isOsx = api.isOsx
export const isWindows = api.isWindows
export const isLinux = api.isLinux
export const isMas = api.isMas

// Static path
export const getStaticPath = api.getStaticPath

// Backend info helpers
export const getBackendType = () => currentBackend
export const isElectron = () => currentBackend === 'electron'
export const isTauri = () => currentBackend === 'tauri'

// Export the raw API objects for advanced use cases
export const electronBackend = electronApi
export const tauriBackend = tauriApi

// Default export
export default {
  ipcRenderer,
  shell,
  clipboard,
  nativeImage,
  webFrame,
  webUtils,
  fs,
  path,
  os,
  process: processInfo,
  crypto,
  childProcess,
  isOsx,
  isWindows,
  isLinux,
  isMas,
  getStaticPath,
  getBackendType,
  isElectron,
  isTauri
}
