import { defineStore } from 'pinia'
import { ipcRenderer, shell } from '../util/tauri'
import notice from '../services/notification'

export const useNotificationStore = defineStore('notification', () => {
  // Actions
  function listenForNotification () {
    const DEFAULT_OPTS = {
      title: 'Infomation',
      type: 'primary',
      time: 10000,
      message: 'You should never see this message'
    }

    ipcRenderer.on('mt::show-notification', (e, opts) => {
      const options = Object.assign({}, DEFAULT_OPTS, opts)
      notice.notify(options)
    })

    ipcRenderer.on('mt::pandoc-not-exists', async (e, opts) => {
      const options = Object.assign({}, DEFAULT_OPTS, opts)
      options.showConfirm = true
      await notice.notify(options)
      shell.openExternal('http://pandoc.org')
    })
  }

  return {
    listenForNotification
  }
})
