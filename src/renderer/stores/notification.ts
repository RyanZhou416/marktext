import { defineStore } from 'pinia'
import { ipcRenderer, shell } from '../util/tauri'
import notice from '../services/notification'

export const useNotificationStore = defineStore('notification', {
  actions: {
    LISTEN_FOR_NOTIFICATION () {
      const DEFAULT_OPTS = {
        title: 'Infomation',
        type: 'primary' as const,
        time: 10000,
        message: 'You should never see this message'
      }

      ipcRenderer.on('mt::show-notification', (e: any, opts: any) => {
        const options = Object.assign({}, DEFAULT_OPTS, opts)
        notice.notify(options)
      })

      ipcRenderer.on('mt::pandoc-not-exists', async (e: any, opts: any) => {
        const options = Object.assign({}, DEFAULT_OPTS, opts)
        options.showConfirm = true
        await notice.notify(options)
        shell.openExternal('http://pandoc.org')
      })
    }
  }
})
