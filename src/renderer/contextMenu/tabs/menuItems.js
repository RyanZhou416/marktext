import * as contextMenu from './actions'
import i18n from '@/i18n'

const t = key => i18n.global.t(key)

// NOTE: This are mutable fields that may change at runtime.

export const SEPARATOR = {
  type: 'separator'
}

export const CLOSE_THIS = {
  get label() {
    return t('contextMenu.tabs.close')
  },
  id: 'closeThisTab',
  click(menuItem) {
    contextMenu.closeThis(menuItem._tabId)
  }
}

export const CLOSE_OTHERS = {
  get label() {
    return t('contextMenu.tabs.closeOthers')
  },
  id: 'closeOtherTabs',
  click(menuItem) {
    contextMenu.closeOthers(menuItem._tabId)
  }
}

export const CLOSE_SAVED = {
  get label() {
    return t('contextMenu.tabs.closeSaved')
  },
  id: 'closeSavedTabs',
  click() {
    contextMenu.closeSaved()
  }
}

export const CLOSE_ALL = {
  get label() {
    return t('contextMenu.tabs.closeAll')
  },
  id: 'closeAllTabs',
  click() {
    contextMenu.closeAll()
  }
}

export const RENAME = {
  get label() {
    return t('contextMenu.tabs.rename')
  },
  id: 'renameFile',
  click(menuItem) {
    contextMenu.rename(menuItem._tabId)
  }
}

export const COPY_PATH = {
  get label() {
    return t('contextMenu.tabs.copyPath')
  },
  id: 'copyPath',
  click(menuItem) {
    contextMenu.copyPath(menuItem._tabId)
  }
}

export const SHOW_IN_FOLDER = {
  get label() {
    return t('contextMenu.tabs.showInFolder')
  },
  id: 'showInFolder',
  click(menuItem) {
    contextMenu.showInFolder(menuItem._tabId)
  }
}
