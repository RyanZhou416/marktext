import { defineStore } from 'pinia'
import { ipcRenderer } from '../util/tauri'
import bus from '../bus'

export const useTweetStore = defineStore('tweet', {
  actions: {
    LISTEN_FOR_TWEET() {
      ipcRenderer.on('mt::tweet', (e: any, type: string) => {
        if (type === 'twitter') {
          bus.$emit('tweetDialog')
        }
      })
    }
  }
})
