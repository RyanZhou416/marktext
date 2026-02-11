import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { ipcRenderer } from '../util/tauri'
import bus from '../bus'

const storedSideBarWidth = useStorage('side-bar-width', 280)

export const useLayoutStore = defineStore('layout', {
  state: () => ({
    rightColumn: 'files' as string,
    showSideBar: false,
    showTabBar: false,
    sideBarWidth: Math.max(storedSideBarWidth.value, 220)
  }),

  actions: {
    SET_LAYOUT(layout: Record<string, any>) {
      if (layout.showSideBar !== undefined) {
        const { windowId } = (window as any).marktext.env
        ipcRenderer.send('mt::update-sidebar-menu', windowId, !!layout.showSideBar)
      }
      Object.assign(this, layout)
    },

    TOGGLE_LAYOUT_ENTRY(entryName: string) {
      ;(this as any)[entryName] = !(this as any)[entryName]
    },

    SET_SIDE_BAR_WIDTH(width: number) {
      const clamped = Math.max(+width, 220)
      storedSideBarWidth.value = clamped
      this.sideBarWidth = width
    },

    LISTEN_FOR_LAYOUT() {
      ipcRenderer.on('mt::set-view-layout', (e: any, layout: any) => {
        if (layout.rightColumn) {
          this.SET_LAYOUT({
            ...layout,
            rightColumn: layout.rightColumn === this.rightColumn ? '' : layout.rightColumn,
            showSideBar: true
          })
        } else {
          this.SET_LAYOUT(layout)
        }
        this.DISPATCH_LAYOUT_MENU_ITEMS()
      })

      ipcRenderer.on('mt::toggle-view-layout-entry', (event: any, entryName: string) => {
        this.TOGGLE_LAYOUT_ENTRY(entryName)
        this.DISPATCH_LAYOUT_MENU_ITEMS()
      })

      bus.$on('view:toggle-layout-entry', (entryName: any) => {
        this.TOGGLE_LAYOUT_ENTRY(entryName)
        const { windowId } = (window as any).marktext.env
        ipcRenderer.send('mt::view-layout-changed', windowId, {
          [entryName]: (this as any)[entryName]
        })
      })
    },

    DISPATCH_LAYOUT_MENU_ITEMS() {
      const { windowId } = (window as any).marktext.env
      const { showTabBar, showSideBar } = this
      ipcRenderer.send('mt::view-layout-changed', windowId, {
        showTabBar,
        showSideBar
      })
    },

    CHANGE_SIDE_BAR_WIDTH(width: number) {
      this.SET_SIDE_BAR_WIDTH(width)
    }
  }
})
