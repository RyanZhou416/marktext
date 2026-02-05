import { ipcRenderer } from '../../util/electron'
import {
  CLOSE_THIS,
  CLOSE_OTHERS,
  CLOSE_SAVED,
  CLOSE_ALL,
  SEPARATOR,
  RENAME,
  COPY_PATH,
  SHOW_IN_FOLDER
} from './menuItems'

export const showContextMenu = (event, tab) => {
  const { pathname } = tab
  const CONTEXT_ITEMS = [
    CLOSE_THIS,
    CLOSE_OTHERS,
    CLOSE_SAVED,
    CLOSE_ALL,
    SEPARATOR,
    RENAME,
    COPY_PATH,
    SHOW_IN_FOLDER
  ]
  const FILE_CONTEXT_ITEMS = [RENAME, COPY_PATH, SHOW_IN_FOLDER]

  FILE_CONTEXT_ITEMS.forEach((item) => {
    item.enabled = !!pathname
  })

  // Convert menu items to serializable format for IPC
  const menuTemplate = CONTEXT_ITEMS.map((item) => ({
    ...item,
    _tabId: tab.id,
    click: item.id // Use id to identify the action in main process
  }))

  ipcRenderer.send('mt::show-context-menu', {
    type: 'tabs',
    x: event.clientX,
    y: event.clientY,
    tabId: tab.id,
    pathname: tab.pathname,
    menuTemplate
  })
}
