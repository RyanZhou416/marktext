import { defineStore } from 'pinia'
import { ipcRenderer } from '../util/tauri'
import bus from '../bus'

const storedWidth = localStorage.getItem('side-bar-width')
const initialSideBarWidth = typeof +storedWidth! === 'number' ? Math.max(+storedWidth!, 220) : 280

export const useLayoutStore = defineStore('layout', {
  state: () => ({
    rightColumn: 'files' as string,
    showSideBar: false,
    showTabBar: false,
    sideBarWidth: initialSideBarWidth
  }),

  actions: {
    SET_LAYOUT (layout: Record<string, any>) {
      if (layout.showSideBar !== undefined) {
        const { windowId } = (window as any).marktext.env
        ipcRenderer.send(
          'mt::update-sidebar-menu',
          windowId,
          !!layout.showSideBar
        )
      }
      Object.assign(this, layout)
    },

    TOGGLE_LAYOUT_ENTRY (entryName: string) {
      (this as any)[entryName] = !(this as any)[entryName]
    },

    SET_SIDE_BAR_WIDTH (width: number) {
      localStorage.setItem('side-bar-width', String(Math.max(+width, 220)))
      this.sideBarWidth = width
    },

    LISTEN_FOR_LAYOUT () {
      ipcRenderer.on('mt::set-view-layout', (e: any, layout: any) => {
        if (layout.rightColumn) {
          this.SET_LAYOUT({
            ...layout,
            rightColumn:
              layout.rightColumn === this.rightColumn ? '' : layout.rightColumn,
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

    DISPATCH_LAYOUT_MENU_ITEMS () {
      const { windowId } = (window as any).marktext.env
      const { showTabBar, showSideBar } = this
      ipcRenderer.send('mt::view-layout-changed', windowId, {
        showTabBar,
        showSideBar
      })
    },

    CHANGE_SIDE_BAR_WIDTH (width: number) {
      this.SET_SIDE_BAR_WIDTH(width)
    }
  }
})
