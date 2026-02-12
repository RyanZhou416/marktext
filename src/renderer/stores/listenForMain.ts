import { defineStore } from 'pinia'
import { ipcRenderer } from '../util/tauri'
import bus from '../bus'
import { useLayoutStore } from './layout'

export const useListenForMainStore = defineStore('listenForMain', {
  actions: {
    LISTEN_FOR_EDIT() {
      ipcRenderer.on('mt::editor-edit-action', (e: any, type: string) => {
        if (type === 'findInFolder') {
          const layout = useLayoutStore()
          layout.SET_LAYOUT({
            rightColumn: 'search',
            showSideBar: true
          })
        }
        bus.$emit(type, type)
      })
    },

    LISTEN_FOR_SHOW_DIALOG() {
      ipcRenderer.on('mt::about-dialog', () => {
        bus.$emit('aboutDialog')
      })
      ipcRenderer.on('mt::show-export-dialog', (e: any, type: string) => {
        bus.$emit('showExportDialog', type)
      })
    },

    LISTEN_FOR_PARAGRAPH_INLINE_STYLE() {
      ipcRenderer.on('mt::editor-paragraph-action', (e: any, { type }: { type: string }) => {
        bus.$emit('paragraph', type)
      })
      ipcRenderer.on('mt::editor-format-action', (e: any, { type }: { type: string }) => {
        bus.$emit('format', type)
      })
    }
  }
})
