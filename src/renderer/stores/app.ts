import { defineStore } from 'pinia'
import { ipcRenderer, processInfo } from '../util/tauri'

export const useAppStore = defineStore('app', {
  state: () => ({
    platform: processInfo.platform as string,
    appVersion: processInfo.versions.MARKTEXT_VERSION_STRING as string,
    windowActive: true,
    init: false
  }),

  actions: {
    SET_WIN_STATUS (status: boolean) {
      this.windowActive = status
    },

    SET_INITIALIZED () {
      this.init = true
    },

    LINTEN_WIN_STATUS () {
      ipcRenderer.on('mt::window-active-status', (e: any, { status }: { status: boolean }) => {
        this.SET_WIN_STATUS(status)
      })
    },

    SEND_INITIALIZED () {
      this.SET_INITIALIZED()
    }
  }
})
