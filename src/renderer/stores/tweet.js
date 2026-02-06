import { defineStore } from 'pinia'
import { ipcRenderer } from '../util/tauri'
import bus from '../bus'

export const useTweetStore = defineStore('tweet', () => {
  // Actions
  function listenForTweet () {
    ipcRenderer.on('mt::tweet', (e, type) => {
      if (type === 'twitter') {
        bus.$emit('tweetDialog')
      }
    })
  }

  return {
    listenForTweet
  }
})
