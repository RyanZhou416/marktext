import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ipcRenderer } from '../util/tauri'
import bus from '../bus'

const width = localStorage.getItem('side-bar-width')
const initialSideBarWidth = typeof +width === 'number' ? Math.max(+width, 220) : 280

export const useLayoutStore = defineStore('layout', () => {
  // State
  const rightColumn = ref('files')
  const showSideBar = ref(false)
  const showTabBar = ref(false)
  const sideBarWidth = ref(initialSideBarWidth)

  // Actions
  function setLayout (layout) {
    if (layout.showSideBar !== undefined) {
      const { windowId } = window.marktext.env
      ipcRenderer.send(
        'mt::update-sidebar-menu',
        windowId,
        !!layout.showSideBar
      )
    }
    if (layout.rightColumn !== undefined) rightColumn.value = layout.rightColumn
    if (layout.showSideBar !== undefined) showSideBar.value = layout.showSideBar
    if (layout.showTabBar !== undefined) showTabBar.value = layout.showTabBar
    if (layout.sideBarWidth !== undefined) sideBarWidth.value = layout.sideBarWidth
  }

  function toggleLayoutEntry (entryName) {
    if (entryName === 'showSideBar') {
      showSideBar.value = !showSideBar.value
    } else if (entryName === 'showTabBar') {
      showTabBar.value = !showTabBar.value
    }
  }

  function setSideBarWidth (width) {
    localStorage.setItem('side-bar-width', Math.max(+width, 220))
    sideBarWidth.value = width
  }

  function dispatchLayoutMenuItems () {
    const { windowId } = window.marktext.env
    ipcRenderer.send('mt::view-layout-changed', windowId, {
      showTabBar: showTabBar.value,
      showSideBar: showSideBar.value
    })
  }

  function listenForLayout () {
    ipcRenderer.on('mt::set-view-layout', (e, layout) => {
      if (layout.rightColumn) {
        setLayout({
          ...layout,
          rightColumn: layout.rightColumn === rightColumn.value ? '' : layout.rightColumn,
          showSideBar: true
        })
      } else {
        setLayout(layout)
      }
      dispatchLayoutMenuItems()
    })

    ipcRenderer.on('mt::toggle-view-layout-entry', (event, entryName) => {
      toggleLayoutEntry(entryName)
      dispatchLayoutMenuItems()
    })

    bus.$on('view:toggle-layout-entry', (entryName) => {
      toggleLayoutEntry(entryName)
      const { windowId } = window.marktext.env
      ipcRenderer.send('mt::view-layout-changed', windowId, {
        [entryName]: entryName === 'showSideBar' ? showSideBar.value : showTabBar.value
      })
    })
  }

  function changeSideBarWidth (width) {
    setSideBarWidth(width)
  }

  return {
    // State
    rightColumn,
    showSideBar,
    showTabBar,
    sideBarWidth,
    // Actions
    setLayout,
    toggleLayoutEntry,
    setSideBarWidth,
    dispatchLayoutMenuItems,
    listenForLayout,
    changeSideBarWidth
  }
})
