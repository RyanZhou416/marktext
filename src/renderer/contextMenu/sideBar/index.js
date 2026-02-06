import { ipcRenderer } from '../../util/tauri'
import * as contextMenu from './actions'

// Menu item definitions (serializable)
const SEPARATOR = { type: 'separator' }

const NEW_FILE = { label: 'New File', id: 'newFileMenuItem' }
const NEW_DIRECTORY = { label: 'New Directory', id: 'newDirectoryMenuItem' }
const COPY = { label: 'Copy', id: 'copyMenuItem' }
const CUT = { label: 'Cut', id: 'cutMenuItem' }
const PASTE = { label: 'Paste', id: 'pasteMenuItem', enabled: true }
const RENAME = { label: 'Rename', id: 'renameMenuItem' }
const DELETE = { label: 'Move To Trash', id: 'deleteMenuItem' }
const SHOW_IN_FOLDER = { label: 'Show In Folder', id: 'showInFolderMenuItem' }

// Action handlers map
const actionHandlers = {
  newFileMenuItem: () => contextMenu.newFile(),
  newDirectoryMenuItem: () => contextMenu.newDirectory(),
  copyMenuItem: () => contextMenu.copy(),
  cutMenuItem: () => contextMenu.cut(),
  pasteMenuItem: () => contextMenu.paste(),
  renameMenuItem: () => contextMenu.rename(),
  deleteMenuItem: () => contextMenu.remove(),
  showInFolderMenuItem: () => contextMenu.showInFolder()
}

// Listen for context menu action from main process
let listenerRegistered = false
const registerActionListener = () => {
  if (listenerRegistered) return
  listenerRegistered = true

  ipcRenderer.on('mt::context-menu-clicked', (event, { type, actionId }) => {
    if (type !== 'sideBar') return
    const handler = actionHandlers[actionId]
    if (handler) {
      handler()
    }
  })
}

export const showContextMenu = (event, hasPathCache) => {
  // Ensure listener is registered
  registerActionListener()

  // Build menu template with current state
  const menuTemplate = [
    { ...NEW_FILE },
    { ...NEW_DIRECTORY },
    { ...SEPARATOR },
    { ...COPY },
    { ...CUT },
    { ...PASTE, enabled: hasPathCache },
    { ...SEPARATOR },
    { ...RENAME },
    { ...DELETE },
    { ...SEPARATOR },
    { ...SHOW_IN_FOLDER }
  ]

  ipcRenderer.send('mt::show-context-menu', {
    type: 'sideBar',
    x: event.clientX,
    y: event.clientY,
    menuTemplate
  })
}
