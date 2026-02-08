import * as contextMenu from './actions'
import i18n from '@/i18n'

const t = (key) => i18n.global.t(key)

// NOTE: This are mutable fields that may change at runtime.

export const SEPARATOR = {
  type: 'separator'
}

export const NEW_FILE = {
  get label () { return t('contextMenu.sidebar.newFile') },
  id: 'newFileMenuItem',
  click (menuItem, browserWindow) {
    contextMenu.newFile()
  }
}

export const NEW_DIRECTORY = {
  get label () { return t('contextMenu.sidebar.newDirectory') },
  id: 'newDirectoryMenuItem',
  click (menuItem, browserWindow) {
    contextMenu.newDirectory()
  }
}

export const COPY = {
  get label () { return t('contextMenu.sidebar.copy') },
  id: 'copyMenuItem',
  click (menuItem, browserWindow) {
    contextMenu.copy()
  }
}

export const CUT = {
  get label () { return t('contextMenu.sidebar.cut') },
  id: 'cutMenuItem',
  click (menuItem, browserWindow) {
    contextMenu.cut()
  }
}

export const PASTE = {
  get label () { return t('contextMenu.sidebar.paste') },
  id: 'pasteMenuItem',
  click (menuItem, browserWindow) {
    contextMenu.paste()
  }
}

export const RENAME = {
  get label () { return t('contextMenu.sidebar.rename') },
  id: 'renameMenuItem',
  click (menuItem, browserWindow) {
    contextMenu.rename()
  }
}

export const DELETE = {
  get label () { return t('contextMenu.sidebar.moveToTrash') },
  id: 'deleteMenuItem',
  click (menuItem, browserWindow) {
    contextMenu.remove()
  }
}

export const SHOW_IN_FOLDER = {
  get label () { return t('contextMenu.sidebar.showInFolder') },
  id: 'showInFolderMenuItem',
  click (menuItem, browserWindow) {
    contextMenu.showInFolder()
  }
}
