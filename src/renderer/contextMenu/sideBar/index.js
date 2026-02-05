import { ipcRenderer } from '../../util/electron'
import {
  SEPARATOR,
  NEW_FILE,
  NEW_DIRECTORY,
  COPY,
  CUT,
  PASTE,
  RENAME,
  DELETE,
  SHOW_IN_FOLDER
} from './menuItems'

export const showContextMenu = (event, hasPathCache) => {
  const CONTEXT_ITEMS = [
    NEW_FILE,
    NEW_DIRECTORY,
    SEPARATOR,
    COPY,
    CUT,
    PASTE,
    SEPARATOR,
    RENAME,
    DELETE,
    SEPARATOR,
    SHOW_IN_FOLDER
  ]

  PASTE.enabled = hasPathCache

  // Convert menu items to serializable format for IPC
  const menuTemplate = CONTEXT_ITEMS.map((item) => ({
    ...item,
    click: item.id // Use id to identify the action in main process
  }))

  ipcRenderer.send('mt::show-context-menu', {
    type: 'sideBar',
    x: event.clientX,
    y: event.clientY,
    menuTemplate
  })
}
