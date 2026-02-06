import { defineStore } from 'pinia'
import { ipcRenderer } from '../util/tauri'
import notice from '../services/notification'

export const useAutoUpdatesStore = defineStore('autoUpdates', () => {
  // Actions
  function listenForUpdate () {
    ipcRenderer.on('mt::UPDATE_ERROR', (e, message) => {
      notice.notify({
        title: 'Update',
        type: 'error',
        time: 10000,
        message
      })
    })
    ipcRenderer.on('mt::UPDATE_NOT_AVAILABLE', (e, message) => {
      notice.notify({
        title: 'Update not Available',
        type: 'primary',
        message
      })
    })
    ipcRenderer.on('mt::UPDATE_DOWNLOADED', (e, message) => {
      notice.notify({
        title: 'Update Downloaded',
        type: 'info',
        message
      })
    })
    ipcRenderer.on('mt::UPDATE_AVAILABLE', (e, message) => {
      notice
        .notify({
          title: 'Update Available',
          type: 'primary',
          message,
          showConfirm: true
        })
        .then(() => {
          const needUpdate = true
          ipcRenderer.send('mt::NEED_UPDATE', { needUpdate })
        })
        .catch(() => {
          const needUpdate = false
          ipcRenderer.send('mt::NEED_UPDATE', { needUpdate })
        })
    })
  }

  return {
    listenForUpdate
  }
})
