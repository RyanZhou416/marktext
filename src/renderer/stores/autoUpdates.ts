import { defineStore } from 'pinia'
import { ipcRenderer } from '../util/tauri'
import notice from '../services/notification'

export const useAutoUpdatesStore = defineStore('autoUpdates', {
  actions: {
    LISTEN_FOR_UPDATE() {
      ipcRenderer.on('mt::UPDATE_ERROR', (e: any, message: string) => {
        notice.notify({
          title: 'Update',
          type: 'error',
          time: 10000,
          message
        })
      })
      ipcRenderer.on('mt::UPDATE_NOT_AVAILABLE', (e: any, message: string) => {
        notice.notify({
          title: 'Update not Available',
          type: 'primary',
          message
        })
      })
      ipcRenderer.on('mt::UPDATE_DOWNLOADED', (e: any, message: string) => {
        notice.notify({
          title: 'Update Downloaded',
          type: 'info',
          message
        })
      })
      ipcRenderer.on('mt::UPDATE_AVAILABLE', (e: any, message: string) => {
        notice
          .notify({
            title: 'Update Available',
            type: 'primary',
            message,
            showConfirm: true
          })
          .then(() => {
            ipcRenderer.send('mt::NEED_UPDATE', { needUpdate: true })
          })
          .catch(() => {
            ipcRenderer.send('mt::NEED_UPDATE', { needUpdate: false })
          })
      })
    }
  }
})
