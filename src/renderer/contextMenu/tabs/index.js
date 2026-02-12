import { ipcRenderer } from '../../util/tauri'
import * as contextMenu from './actions'

// Menu item definitions (serializable)
const SEPARATOR = { type: 'separator' }

const CLOSE_THIS = { label: 'Close', id: 'closeThisTab' }
const CLOSE_OTHERS = { label: 'Close others', id: 'closeOtherTabs' }
const CLOSE_SAVED = { label: 'Close saved tabs', id: 'closeSavedTabs' }
const CLOSE_ALL = { label: 'Close all tabs', id: 'closeAllTabs' }
const RENAME = { label: 'Rename', id: 'renameFile', enabled: true }
const COPY_PATH = { label: 'Copy path', id: 'copyPath', enabled: true }
const SHOW_IN_FOLDER = { label: 'Show in folder', id: 'showInFolder', enabled: true }

// Action handlers map
const actionHandlers = {
  closeThisTab: tabId => contextMenu.closeThis(tabId),
  closeOtherTabs: tabId => contextMenu.closeOthers(tabId),
  closeSavedTabs: () => contextMenu.closeSaved(),
  closeAllTabs: () => contextMenu.closeAll(),
  renameFile: tabId => contextMenu.rename(tabId),
  copyPath: tabId => contextMenu.copyPath(tabId),
  showInFolder: tabId => contextMenu.showInFolder(tabId)
}

// Listen for context menu action from main process
let listenerRegistered = false
const registerActionListener = () => {
  if (listenerRegistered) return
  listenerRegistered = true

  ipcRenderer.on('mt::context-menu-clicked', (event, { type, actionId, tabId }) => {
    if (type !== 'tabs') return
    const handler = actionHandlers[actionId]
    if (handler) {
      handler(tabId)
    }
  })
}

export const showContextMenu = (event, tab) => {
  // Ensure listener is registered
  registerActionListener()

  const { pathname } = tab
  const hasPathname = !!pathname

  // Build menu template with current state
  const menuTemplate = [
    { ...CLOSE_THIS },
    { ...CLOSE_OTHERS },
    { ...CLOSE_SAVED },
    { ...CLOSE_ALL },
    { ...SEPARATOR },
    { ...RENAME, enabled: hasPathname },
    { ...COPY_PATH, enabled: hasPathname },
    { ...SHOW_IN_FOLDER, enabled: hasPathname }
  ]

  ipcRenderer.send('mt::show-context-menu', {
    type: 'tabs',
    x: event.clientX,
    y: event.clientY,
    tabId: tab.id,
    pathname: tab.pathname,
    menuTemplate
  })
}
