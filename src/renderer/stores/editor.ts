import { defineStore } from 'pinia'
import { clipboard, ipcRenderer, shell, webFrame, path } from '../util/tauri'
import equal from 'fast-deep-equal'
import { isSamePathSync } from 'common/filesystem/paths'
import bus from '../bus'
import { hasKeys, getUniqueId } from '../util'
import listToTree from '../util/listToTree'
import {
  createDocumentState,
  getOptionsFromState,
  getSingleFileState,
  getBlankFileState
} from './help'
import notice from '../services/notification'
import {
  FileEncodingCommand,
  LineEndingCommand,
  QuickOpenCommand,
  TrailingNewlineCommand
} from '../commands'
import { usePreferencesStore } from './preferences'
import { useLayoutStore } from './layout'
import { useProjectStore } from './project'
import { useAppStore } from './app'
import i18n from '../i18n'
import { mergeThreeWayText } from '@/services/merge/threeWayMerge'

const t = (key: string, params?: Record<string, any>) => (i18n.global as any).t(key, params)

const autoSaveTimers = new Map<string, ReturnType<typeof setTimeout>>()
const externalMergeTimers = new Map<string, ReturnType<typeof setTimeout>>()
const watchedPathRefs = new Map<string, number>()

const getRootFolderFromState = (): string => {
  const project = useProjectStore()
  const openedFolder = project.projectTree
  if (openedFolder) {
    return openedFolder.pathname
  }
  return ''
}

const adjustTrailingNewlines = (markdown: string, trimTrailingNewlineOption: number): string => {
  if (!markdown) return ''
  switch (trimTrailingNewlineOption) {
    case 0:
      return trimTrailingNewlines(markdown)
    case 1: {
      const lastIndex = markdown.length - 1
      if (markdown[lastIndex] === '\n') {
        if (markdown.length === 1) return ''
        else if (markdown[lastIndex - 1] !== '\n') return markdown
      }
      markdown = trimTrailingNewlines(markdown)
      if (markdown.length === 0) return ''
      return markdown + '\n'
    }
    default:
      return markdown
  }
}

const trimTrailingNewlines = (text: string): string => {
  return text.replace(/[\r?\n]+$/, '')
}

const createApplicationMenuState = ({ start, end, affiliation }: any) => {
  const state: any = {
    isDisabled: false,
    isMultiline: start.key !== end.key,
    isLooseListItem: false,
    isTaskList: false,
    isCodeFences: false,
    isCodeContent: false,
    isTable: false,
    affiliation: {}
  }
  const { isMultiline } = state

  if (
    (start.block.functionType === 'cellContent' && end.block.functionType === 'cellContent') ||
    (start.type === 'span' && start.block.functionType === 'codeContent') ||
    (end.type === 'span' && end.block.functionType === 'codeContent')
  ) {
    state.isCodeFences = true
    if (start.block.functionType === 'codeContent' || end.block.functionType === 'codeContent') {
      state.isCodeContent = true
    }
  }

  if (affiliation.length >= 1 && /ul|ol/.test(affiliation[0].type)) {
    const listBlock = affiliation[0]
    state.affiliation[listBlock.type] = true
    state.isLooseListItem = listBlock.children[0].isLooseListItem
    state.isTaskList = listBlock.listType === 'task'
  } else if (affiliation.length >= 3 && affiliation[1].type === 'li') {
    const listItem = affiliation[1]
    const listType = listItem.listItemType === 'order' ? 'ol' : 'ul'
    state.affiliation[listType] = true
    state.isLooseListItem = listItem.isLooseListItem
    state.isTaskList = listItem.listItemType === 'task'
  }

  for (const b of affiliation.slice(0, 3)) {
    if (b.type === 'pre' && b.functionType) {
      if (/frontmatter|html|multiplemath|code$/.test(b.functionType)) {
        state.isCodeFences = true
        state.affiliation[b.functionType] = true
      }
      break
    } else if (b.type === 'figure' && b.functionType) {
      if (b.functionType === 'table') {
        state.isTable = true
        state.isDisabled = true
      }
      break
    } else if (isMultiline && /^h{1,6}$/.test(b.type)) {
      state.affiliation = {}
      break
    } else {
      if (!state.affiliation[b.type]) {
        state.affiliation[b.type] = true
      }
    }
  }

  if (Object.getOwnPropertyNames(state.affiliation).length >= 2 && state.affiliation.p) {
    delete state.affiliation.p
  }
  if ((state.affiliation.ul || state.affiliation.ol) && state.affiliation.li) {
    delete state.affiliation.li
  }
  return state
}

const createSelectionFormatState = (formats: any[]) => {
  const state: Record<string, boolean> = {}
  for (const item of formats) {
    state[item.type] = true
  }
  return state
}

export const useEditorStore = defineStore('editor', {
  state: () => ({
    currentFile: {} as any,
    tabs: [] as any[],
    listToc: [] as any[],
    toc: [] as any[],
    externalConflictDialog: {
      open: false,
      tabId: '',
      pathname: '',
      ours: '',
      theirs: '',
      merged: ''
    } as any
  }),

  actions: {
    SET_SEARCH(value: any) {
      this.currentFile.searchMatches = value
    },

    SET_TOC(toc: any[]) {
      this.listToc = toc
      this.toc = listToTree(toc)
    },

    SET_CURRENT_FILE(currentFile: any) {
      const oldCurrentFile = this.currentFile
      if (!oldCurrentFile.id || oldCurrentFile.id !== currentFile.id) {
        const { id, markdown, cursor, history, pathname } = currentFile
        ;(window as any).DIRNAME = pathname ? path.dirname(pathname) : ''
        this.currentFile = currentFile
        bus.$emit('file-changed', {
          id,
          markdown,
          cursor,
          renderCursor: true,
          history
        })
      }
    },

    ADD_FILE_TO_TABS(currentFile: any) {
      this.tabs.push(currentFile)
      this.REGISTER_WATCH_FOR_TAB(currentFile)
    },

    REMOVE_FILE_WITHIN_TABS(file: any) {
      const { tabs, currentFile } = this
      const index = tabs.indexOf(file)
      this.UNREGISTER_WATCH_FOR_TAB(file)
      tabs.splice(index, 1)

      if (file.id && autoSaveTimers.has(file.id)) {
        const timer = autoSaveTimers.get(file.id)!
        clearTimeout(timer)
        autoSaveTimers.delete(file.id)
      }
      if (file.id && externalMergeTimers.has(file.id)) {
        const timer = externalMergeTimers.get(file.id)!
        clearTimeout(timer)
        externalMergeTimers.delete(file.id)
      }

      if (file.id === currentFile.id) {
        const fileState = this.tabs[index] || this.tabs[index - 1] || this.tabs[0] || {}
        this.currentFile = fileState
        if (typeof fileState.markdown === 'string') {
          const { id, markdown, cursor, history, pathname } = fileState
          ;(window as any).DIRNAME = pathname ? path.dirname(pathname) : ''
          bus.$emit('file-changed', {
            id,
            markdown,
            cursor,
            renderCursor: true,
            history
          })
        }
      }

      if (this.tabs.length === 0) {
        this.listToc = []
        this.toc = []
      }
    },

    EXCHANGE_TABS_BY_ID(tabIDs: { fromId: string; toId?: string }) {
      const { fromId } = tabIDs
      const toId = tabIDs.toId

      const { tabs } = this
      const moveItem = (arr: any[], from: number, to: number) => {
        if (from === to) return true
        const len = arr.length
        const item = arr.splice(from, 1)
        if (item.length === 0) return false
        arr.splice(to, 0, item[0])
        return arr.length === len
      }

      const fromIndex = tabs.findIndex((t: any) => t.id === fromId)
      if (!toId) {
        moveItem(tabs, fromIndex, tabs.length - 1)
      } else {
        const toIndex = tabs.findIndex((t: any) => t.id === toId)
        const realToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex
        moveItem(tabs, fromIndex, realToIndex)
      }
    },

    LOAD_CHANGE(change: any) {
      const { tabs, currentFile } = this
      const { data, pathname } = change
      const {
        isMixedLineEndings,
        lineEnding,
        adjustLineEndingOnSave,
        trimTrailingNewline,
        encoding,
        markdown,
        filename
      } = data
      const options = {
        encoding,
        lineEnding,
        adjustLineEndingOnSave,
        trimTrailingNewline
      }

      const newFileState = getSingleFileState({
        markdown,
        filename,
        pathname,
        options
      })

      const tab = tabs.find((t: any) => isSamePathSync(t.pathname, pathname))
      if (!tab) {
        console.error('LOAD_CHANGE: Cannot find tab in tab list.')
        notice.notify({
          title: t('notification.errorLoadingTab'),
          message: t('notification.errorLoadingTabMsg'),
          type: 'error',
          time: 20000,
          showConfirm: false
        })
        return
      }

      const oldId = tab.id
      const oldNotifications = tab.notifications
      let oldHistory: any = null
      if (tab.history.index >= 0 && tab.history.stack.length >= 1) {
        oldHistory = {
          stack: [tab.history.stack[tab.history.index]],
          index: 0
        }
        tab.history.index--
        tab.history.stack.pop()
      }

      Object.assign(tab, newFileState)
      tab.id = oldId
      tab.notifications = oldNotifications
      this.SYNC_TAB_SNAPSHOT(tab, tab.markdown)
      if (oldHistory) {
        tab.history = oldHistory
      }

      if (isMixedLineEndings) {
        tab.notifications.push({
          msg: `"${filename}" has mixed line endings which are automatically normalized to ${lineEnding.toUpperCase()}.`,
          showConfirm: false,
          style: 'info',
          exclusiveType: '',
          action: () => {}
        })
      }

      if (pathname === currentFile.pathname) {
        this.currentFile = tab
        const { id, cursor, history } = tab
        bus.$emit('file-changed', {
          id,
          markdown,
          cursor,
          renderCursor: true,
          history
        })
      }
    },

    SET_PATHNAME({ tab, fileInfo }: { tab: any; fileInfo: any }) {
      const { currentFile } = this
      const { filename, pathname, id } = fileInfo
      const oldPathname = tab ? tab.pathname : ''

      if (id === currentFile.id && pathname) {
        ;(window as any).DIRNAME = path.dirname(pathname)
      }

      if (tab) {
        Object.assign(tab, {
          filename,
          pathname,
          isSaved: true,
          savedMarkdown: typeof tab.markdown === 'string' ? tab.markdown : ''
        })
        tab.externalMarkdown = tab.savedMarkdown
        tab.pendingExternal = null
        tab.lastExternalAt = Date.now()
        if (oldPathname && oldPathname !== pathname) {
          this.UNWATCH_PATH(oldPathname)
        }
        this.WATCH_PATH(pathname)
      }
    },

    SET_SAVE_STATUS_BY_TAB({ tab, status }: { tab: any; status: boolean }) {
      if (hasKeys(tab)) {
        tab.isSaved = status
      }
    },

    SET_SAVE_STATUS(status: boolean) {
      if (hasKeys(this.currentFile)) {
        this.currentFile.isSaved = status
      }
    },

    SET_SAVE_STATUS_WHEN_REMOVE({ pathname }: { pathname: string }) {
      this.tabs.forEach((f: any) => {
        if (f.pathname === pathname) {
          f.isSaved = false
        }
      })
    },

    SET_MARKDOWN(markdown: string) {
      if (hasKeys(this.currentFile)) {
        this.currentFile.markdown = markdown
      }
    },

    SET_DOCUMENT_ENCODING(encoding: string) {
      if (hasKeys(this.currentFile)) {
        this.currentFile.encoding = encoding
      }
    },

    SET_LINE_ENDING(lineEnding: string) {
      if (hasKeys(this.currentFile)) {
        this.currentFile.lineEnding = lineEnding
      }
    },

    SET_FILE_ENCODING_BY_NAME(encodingName: string) {
      if (hasKeys(this.currentFile)) {
        const { encoding: encodingObj } = this.currentFile
        encodingObj.encoding = encodingName
        encodingObj.isBom = false
      }
    },

    SET_FINAL_NEWLINE(value: number) {
      if (hasKeys(this.currentFile) && value >= 0 && value <= 3) {
        this.currentFile.trimTrailingNewline = value
      }
    },

    SET_ADJUST_LINE_ENDING_ON_SAVE(adjustLineEndingOnSave: boolean) {
      if (hasKeys(this.currentFile)) {
        this.currentFile.adjustLineEndingOnSave = adjustLineEndingOnSave
      }
    },

    SET_WORD_COUNT(wordCount: any) {
      if (hasKeys(this.currentFile)) {
        this.currentFile.wordCount = wordCount
      }
    },

    SET_CURSOR(cursor: any) {
      if (hasKeys(this.currentFile)) {
        this.currentFile.cursor = cursor
      }
    },

    SET_HISTORY(history: any) {
      if (hasKeys(this.currentFile)) {
        this.currentFile.history = history
      }
    },

    SET_EXTERNAL_CONFLICT_DIALOG(payload: any) {
      this.externalConflictDialog = Object.assign(
        {
          open: false,
          tabId: '',
          pathname: '',
          ours: '',
          theirs: '',
          merged: ''
        },
        payload || {}
      )
    },

    WATCH_PATH(pathname: string) {
      if (!pathname) return
      const count = watchedPathRefs.get(pathname) || 0
      watchedPathRefs.set(pathname, count + 1)
      if (count === 0) {
        ipcRenderer.send('mt::watch-file', pathname)
      }
    },

    UNWATCH_PATH(pathname: string) {
      if (!pathname) return
      const count = watchedPathRefs.get(pathname) || 0
      if (count <= 1) {
        watchedPathRefs.delete(pathname)
        ipcRenderer.send('mt::unwatch', pathname)
      } else {
        watchedPathRefs.set(pathname, count - 1)
      }
    },

    REGISTER_WATCH_FOR_TAB(tab: any) {
      if (tab && tab.pathname) {
        this.WATCH_PATH(tab.pathname)
      }
    },

    UNREGISTER_WATCH_FOR_TAB(tab: any) {
      if (tab && tab.pathname) {
        this.UNWATCH_PATH(tab.pathname)
      }
    },

    SYNC_TAB_SNAPSHOT(tab: any, markdown?: string) {
      if (!tab) return
      const currentMarkdown = typeof markdown === 'string' ? markdown : tab.markdown || ''
      tab.savedMarkdown = currentMarkdown
      tab.externalMarkdown = currentMarkdown
      tab.pendingExternal = null
      tab.lastExternalAt = Date.now()
    },

    APPLY_EXTERNAL_MARKDOWN_TO_TAB({ tab, markdown, markAsSaved }: any) {
      if (!tab || typeof markdown !== 'string') return
      tab.markdown = markdown
      tab.isSaved = !!markAsSaved
      const { currentFile } = this
      if (currentFile && currentFile.id === tab.id) {
        const { id, cursor, history } = tab
        bus.$emit('file-changed', {
          id,
          markdown,
          cursor,
          renderCursor: false,
          history
        })
      }
    },

    CLOSE_TABS(tabIdList: string[]) {
      if (!tabIdList || tabIdList.length === 0) return

      let tabIndex = 0
      tabIdList.forEach(id => {
        const index = this.tabs.findIndex((f: any) => f.id === id)
        if (index === -1) return
        const { pathname } = this.tabs[index]
        this.UNREGISTER_WATCH_FOR_TAB(this.tabs[index])

        if (pathname) {
          ipcRenderer.send('mt::window-tab-closed', pathname)
        }

        this.tabs.splice(index, 1)
        if (this.currentFile.id === id) {
          this.currentFile = {}
          ;(window as any).DIRNAME = ''
          if (tabIdList.length === 1) {
            tabIndex = index
          }
        }
      })

      if (!this.currentFile.id && this.tabs.length) {
        this.currentFile = this.tabs[tabIndex] || this.tabs[tabIndex - 1] || this.tabs[0] || {}
        if (typeof this.currentFile.markdown === 'string') {
          const { id, markdown, cursor, history, pathname } = this.currentFile
          ;(window as any).DIRNAME = pathname ? path.dirname(pathname) : ''
          bus.$emit('file-changed', {
            id,
            markdown,
            cursor,
            renderCursor: true,
            history
          })
        }
      }

      if (this.tabs.length === 0) {
        this.listToc = []
        this.toc = []
      }
    },

    RENAME_IF_NEEDED({ src, dest }: { src: string; dest: string }) {
      const { tabs } = this
      tabs.forEach((f: any) => {
        if (f.pathname === src) {
          f.pathname = dest
          f.filename = path.basename(dest)
        }
      })
    },

    PUSH_TAB_NOTIFICATION(data: any) {
      const defaultAction = () => {}
      const { tabId, msg } = data
      const action = data.action || defaultAction
      const showConfirm = data.showConfirm || false
      const style = data.style || 'info'
      const exclusiveType = data.exclusiveType || ''

      const { tabs } = this
      const tab = tabs.find((t: any) => t.id === tabId)
      if (!tab) {
        console.error('PUSH_TAB_NOTIFICATION: Cannot find tab in tab list.')
        return
      }

      const { notifications } = tab

      if (exclusiveType) {
        const index = notifications.findIndex((n: any) => n.exclusiveType === exclusiveType)
        if (index >= 0) {
          notifications.splice(index, 1)
        }
      }

      notifications.push({
        msg,
        showConfirm,
        style,
        exclusiveType,
        action
      })
    },

    // ---- Actions ----

    FORMAT_LINK_CLICK({ data, dirname }: { data: any; dirname: string }) {
      ipcRenderer.send('mt::format-link-click', { data, dirname })
    },

    LISTEN_SCREEN_SHOT() {
      ipcRenderer.on('mt::screenshot-captured', () => {
        bus.$emit('screenshot-captured')
      })
    },

    ASK_FOR_IMAGE_AUTO_PATH(src: string) {
      const { pathname } = this.currentFile
      if (pathname) {
        let rs: (value: any) => void
        const promise = new Promise(resolve => {
          rs = resolve
        })
        const id = getUniqueId()
        ipcRenderer.once(`mt::response-of-image-path-${id}`, (e: any, files: any) => {
          rs(files)
        })
        ipcRenderer.send('mt::ask-for-image-auto-path', { pathname, src, id })
        return promise
      } else {
        return []
      }
    },

    SEARCH(value: any) {
      this.SET_SEARCH(value)
    },

    SHOW_IMAGE_DELETION_URL(deletionUrl: string) {
      notice
        .notify({
          title: t('notification.imageDeletionUrl'),
          message: t('notification.imageDeletionUrlMsg', { url: deletionUrl }),
          showConfirm: true,
          time: 20000
        })
        .then(() => {
          clipboard.writeText(deletionUrl)
        })
    },

    FORCE_CLOSE_TAB(file: any) {
      this.REMOVE_FILE_WITHIN_TABS(file)
      const { pathname } = file
      if (pathname) {
        ipcRenderer.send('mt::window-tab-closed', pathname)
      }
    },

    UPDATE_LINE_ENDING_MENU() {
      const { lineEnding } = this.currentFile
      if (lineEnding) {
        const { windowId } = (window as any).marktext.env
        ipcRenderer.send('mt::update-line-ending-menu', windowId, lineEnding)
      }
    },

    CLOSE_UNSAVED_TAB(file: any) {
      const { id, pathname, filename, markdown } = file
      const options = getOptionsFromState(file)
      ipcRenderer.send('mt::save-and-close-tabs', [{ id, pathname, filename, markdown, options }])
    },

    LISTEN_FOR_SAVE() {
      ipcRenderer.on('mt::editor-ask-file-save', () => {
        const { id, filename, pathname, markdown } = this.currentFile
        const options = getOptionsFromState(this.currentFile)
        const defaultPath = getRootFolderFromState()
        if (id) {
          ipcRenderer.send('mt::response-file-save', {
            id,
            filename,
            pathname,
            markdown,
            options,
            defaultPath
          })
        }
      })
    },

    LISTEN_FOR_SAVE_AS() {
      ipcRenderer.on('mt::editor-ask-file-save-as', () => {
        const { id, filename, pathname, markdown } = this.currentFile
        const options = getOptionsFromState(this.currentFile)
        const defaultPath = getRootFolderFromState()
        if (id) {
          ipcRenderer.send('mt::response-file-save-as', {
            id,
            filename,
            pathname,
            markdown,
            options,
            defaultPath
          })
        }
      })
    },

    LISTEN_FOR_SET_PATHNAME() {
      ipcRenderer.on('mt::set-pathname', (e: any, fileInfo: any) => {
        const { tabs } = this
        const { pathname, id } = fileInfo
        const tab = tabs.find((f: any) => f.id === id)
        if (!tab) {
          console.error('[ERROR] Cannot change file path from unknown tab.')
          return
        }
        const existingTab = tabs.find(
          (t: any) => t.id !== id && isSamePathSync(t.pathname, pathname)
        )
        if (existingTab) {
          this.CLOSE_TAB(existingTab)
        }
        this.SET_PATHNAME({ tab, fileInfo })
      })

      ipcRenderer.on('mt::tab-saved', (e: any, tabId: string) => {
        const { tabs } = this
        const tab = tabs.find((f: any) => f.id === tabId)
        if (tab) {
          Object.assign(tab, {
            isSaved: true,
            savedMarkdown: typeof tab.markdown === 'string' ? tab.markdown : ''
          })
          tab.externalMarkdown = tab.savedMarkdown
          tab.pendingExternal = null
          tab.lastExternalAt = Date.now()
        }
      })

      ipcRenderer.on('mt::tab-save-failure', (e: any, tabId: string, msg: string) => {
        const { tabs } = this
        const tab = tabs.find((t: any) => t.id === tabId)
        if (!tab) {
          notice.notify({
            title: t('notification.saveFailure'),
            message: msg,
            type: 'error',
            time: 20000,
            showConfirm: false
          })
          return
        }
        this.SET_SAVE_STATUS_BY_TAB({ tab, status: false })
        this.PUSH_TAB_NOTIFICATION({
          tabId,
          msg: t('notification.saveFailureMsg', { msg }),
          style: 'crit'
        })
      })
    },

    LISTEN_FOR_CLOSE() {
      ipcRenderer.on('mt::ask-for-close', () => {
        const unsavedFiles = this.tabs
          .filter((file: any) => !file.isSaved)
          .map((file: any) => {
            const { id, filename, pathname, markdown } = file
            const options = getOptionsFromState(file)
            return { id, filename, pathname, markdown, options }
          })

        if (unsavedFiles.length) {
          ipcRenderer.send('mt::close-window-confirm', unsavedFiles)
        } else {
          ipcRenderer.send('mt::close-window')
        }
      })
    },

    LISTEN_FOR_SAVE_CLOSE() {
      ipcRenderer.on('mt::force-close-tabs-by-id', (e: any, tabIdList: string[]) => {
        if (Array.isArray(tabIdList) && tabIdList.length) {
          this.CLOSE_TABS(tabIdList)
        }
      })
    },

    ASK_FOR_SAVE_ALL(closeTabs: boolean) {
      const { tabs } = this
      const unsavedFiles = tabs
        .filter((file: any) => !(file.isSaved && /[^\n]/.test(file.markdown)))
        .map((file: any) => {
          const { id, filename, pathname, markdown } = file
          const options = getOptionsFromState(file)
          return { id, filename, pathname, markdown, options }
        })

      if (closeTabs) {
        if (unsavedFiles.length) {
          this.CLOSE_TABS(tabs.filter((f: any) => f.isSaved).map((f: any) => f.id))
          ipcRenderer.send('mt::save-and-close-tabs', unsavedFiles)
        } else {
          this.CLOSE_TABS(tabs.map((f: any) => f.id))
        }
      } else {
        ipcRenderer.send('mt::save-tabs', unsavedFiles)
      }
    },

    LISTEN_FOR_MOVE_TO() {
      ipcRenderer.on('mt::editor-move-file', () => {
        const { id, filename, pathname, markdown } = this.currentFile
        const options = getOptionsFromState(this.currentFile)
        const defaultPath = getRootFolderFromState()
        if (!id) return
        if (!pathname) {
          ipcRenderer.send('mt::response-file-save', {
            id,
            filename,
            pathname,
            markdown,
            options,
            defaultPath
          })
        } else {
          ipcRenderer.send('mt::response-file-move-to', { id, pathname })
        }
      })
    },

    LISTEN_FOR_RENAME() {
      ipcRenderer.on('mt::editor-rename-file', () => {
        this.RESPONSE_FOR_RENAME()
      })
    },

    RESPONSE_FOR_RENAME() {
      const { id, filename, pathname, markdown } = this.currentFile
      const options = getOptionsFromState(this.currentFile)
      const defaultPath = getRootFolderFromState()
      if (!id) return
      if (!pathname) {
        ipcRenderer.send('mt::response-file-save', {
          id,
          filename,
          pathname,
          markdown,
          options,
          defaultPath
        })
      } else {
        bus.$emit('rename')
      }
    },

    RENAME(newFilename: string) {
      const { id, pathname, filename } = this.currentFile
      if (typeof filename === 'string' && filename !== newFilename) {
        const newPathname = path.join(path.dirname(pathname), newFilename)
        ipcRenderer.send('mt::rename', { id, pathname, newPathname })
      }
    },

    UPDATE_CURRENT_FILE(currentFile: any) {
      this.SET_CURRENT_FILE(currentFile)
      const { tabs } = this
      if (!tabs.some((file: any) => file.id === currentFile.id)) {
        this.ADD_FILE_TO_TABS(currentFile)
      }
      this.UPDATE_LINE_ENDING_MENU()
    },

    LISTEN_FOR_BOOTSTRAP_WINDOW() {
      const preferences = usePreferencesStore()
      const layout = useLayoutStore()
      const appStore = useAppStore()

      setTimeout(() => {
        bus.$emit('cmd::register-command', new FileEncodingCommand(this))
        bus.$emit(
          'cmd::register-command',
          new QuickOpenCommand({ editor: this, project: useProjectStore() })
        )
        bus.$emit('cmd::register-command', new LineEndingCommand(this))
        bus.$emit('cmd::register-command', new TrailingNewlineCommand(this))

        setTimeout(() => {
          ipcRenderer.send('mt::request-keybindings')
          bus.$emit('cmd::sort-commands')
        }, 100)
      }, 400)

      ipcRenderer.on('mt::bootstrap-editor', (e: any, config: any) => {
        const {
          addBlankTab,
          markdownList,
          lineEnding,
          sideBarVisibility,
          tabBarVisibility,
          sourceCodeModeEnabled
        } = config

        appStore.SEND_INITIALIZED()
        preferences.SET_USER_PREFERENCE({ endOfLine: lineEnding })
        layout.SET_LAYOUT({
          rightColumn: 'files',
          showSideBar: !!sideBarVisibility,
          showTabBar: !!tabBarVisibility
        })
        layout.DISPATCH_LAYOUT_MENU_ITEMS()

        preferences.SET_MODE({
          type: 'sourceCode',
          checked: !!sourceCodeModeEnabled
        })

        if (addBlankTab) {
          this.NEW_UNTITLED_TAB({})
        } else if (markdownList.length) {
          let isFirst = true
          for (const markdown of markdownList) {
            isFirst = false
            this.NEW_UNTITLED_TAB({ markdown, selected: isFirst })
          }
        }
      })
    },

    LISTEN_FOR_NEW_TAB() {
      ipcRenderer.on(
        'mt::open-new-tab',
        (e: any, markdownDocument: any, options: any = {}, selected: boolean = true) => {
          if (markdownDocument) {
            this.NEW_TAB_WITH_CONTENT({
              markdownDocument,
              options,
              selected
            })
          } else {
            this.NEW_UNTITLED_TAB({})
          }
        }
      )

      ipcRenderer.on(
        'mt::new-untitled-tab',
        (e: any, selected: boolean = true, markdown: string = '') => {
          this.NEW_UNTITLED_TAB({ markdown, selected })
        }
      )
    },

    LISTEN_FOR_CLOSE_TAB() {
      ipcRenderer.on('mt::editor-close-tab', () => {
        const file = this.currentFile
        if (!hasKeys(file)) return
        this.CLOSE_TAB(file)
      })
    },

    LISTEN_FOR_TAB_CYCLE() {
      ipcRenderer.on('mt::tabs-cycle-left', () => {
        this.CYCLE_TABS(false)
      })
      ipcRenderer.on('mt::tabs-cycle-right', () => {
        this.CYCLE_TABS(true)
      })
    },

    LISTEN_FOR_SWITCH_TABS() {
      ipcRenderer.on('mt::switch-tab-by-index', (event: any, index: number) => {
        this.SWITCH_TAB_BY_INDEX(index)
      })
    },

    CLOSE_TAB(file: any) {
      const { isSaved } = file
      if (isSaved) {
        this.FORCE_CLOSE_TAB(file)
      } else {
        this.CLOSE_UNSAVED_TAB(file)
      }
    },

    CLOSE_OTHER_TABS(file: any) {
      const { tabs } = this
      tabs
        .filter((f: any) => f.id !== file.id)
        .forEach((tab: any) => {
          this.CLOSE_TAB(tab)
        })
    },

    CLOSE_SAVED_TABS() {
      const { tabs } = this
      tabs
        .filter((f: any) => f.isSaved)
        .forEach((tab: any) => {
          this.CLOSE_TAB(tab)
        })
    },

    CLOSE_ALL_TABS() {
      const { tabs } = this
      tabs.slice().forEach((tab: any) => {
        this.CLOSE_TAB(tab)
      })
    },

    RENAME_FILE(file: any) {
      this.SET_CURRENT_FILE(file)
      this.UPDATE_LINE_ENDING_MENU()
      bus.$emit('rename')
    },

    CYCLE_TABS(direction: boolean) {
      const { tabs, currentFile } = this
      if (tabs.length <= 1) return

      const currentIndex = tabs.findIndex((t: any) => t.id === currentFile.id)
      if (currentIndex === -1) {
        console.error('CYCLE_TABS: Cannot find current tab index.')
        return
      }

      let nextTabIndex = 0
      if (!direction) {
        nextTabIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1
      } else {
        nextTabIndex = (currentIndex + 1) % tabs.length
      }

      const nextTab = tabs[nextTabIndex]
      if (!nextTab || !nextTab.id) {
        console.error(`CYCLE_TABS: Cannot find next tab (index="${nextTabIndex}").`)
        return
      }

      this.SET_CURRENT_FILE(nextTab)
      this.UPDATE_LINE_ENDING_MENU()
    },

    SWITCH_TAB_BY_INDEX(nextTabIndex: number) {
      const { tabs, currentFile } = this
      if (nextTabIndex < 0 || nextTabIndex >= tabs.length) {
        console.warn('Invalid tab index:', nextTabIndex)
        return
      }

      const currentIndex = tabs.findIndex((t: any) => t.id === currentFile.id)
      if (currentIndex === -1) {
        console.error('Cannot find current tab index.')
        return
      }

      const nextTab = tabs[nextTabIndex]
      if (!nextTab || !nextTab.id) {
        console.error(`Cannot find tab by index="${nextTabIndex}".`)
        return
      }

      this.SET_CURRENT_FILE(nextTab)
      this.UPDATE_LINE_ENDING_MENU()
    },

    NEW_UNTITLED_TAB({
      markdown: markdownString,
      selected
    }: {
      markdown?: string
      selected?: boolean
    }) {
      if (selected == null) {
        selected = true
      }

      this.SHOW_TAB_VIEW(false)

      const preferences = usePreferencesStore()
      const { defaultEncoding, endOfLine } = preferences
      const { tabs } = this
      const fileState = getBlankFileState(tabs, defaultEncoding, endOfLine, markdownString)
      fileState.savedMarkdown = ''
      fileState.externalMarkdown = ''
      fileState.pendingExternal = null
      fileState.lastExternalAt = Date.now()

      if (selected) {
        const { id, markdown } = fileState
        this.UPDATE_CURRENT_FILE(fileState)
        bus.$emit('file-loaded', { id, markdown })
      } else {
        this.ADD_FILE_TO_TABS(fileState)
      }
    },

    NEW_TAB_WITH_CONTENT({
      markdownDocument,
      options = {},
      selected
    }: {
      markdownDocument: any
      options?: any
      selected?: boolean
    }) {
      if (!markdownDocument) {
        console.warn('Cannot create a file tab without a markdown document!')
        this.NEW_UNTITLED_TAB({})
        return
      }

      if (typeof selected === 'undefined') {
        selected = true
      }

      const { currentFile, tabs } = this
      const { pathname } = markdownDocument
      const existingTab = tabs.find((t: any) => isSamePathSync(t.pathname, pathname))
      if (existingTab) {
        this.UPDATE_CURRENT_FILE(existingTab)
        return
      }

      let keepTabBarState = false
      if (currentFile) {
        const { isSaved, pathname } = currentFile
        if (isSaved && !pathname) {
          keepTabBarState = true
          this.FORCE_CLOSE_TAB(currentFile)
        }
      }

      if (!keepTabBarState) {
        this.SHOW_TAB_VIEW(false)
      }

      const { markdown, isMixedLineEndings } = markdownDocument
      const docState = createDocumentState(Object.assign(markdownDocument, options))
      const normalizedMarkdown = adjustTrailingNewlines(
        typeof markdown === 'string' ? markdown : '',
        docState.trimTrailingNewline
      )
      docState.markdown = normalizedMarkdown
      docState.savedMarkdown = normalizedMarkdown
      docState.externalMarkdown = docState.savedMarkdown
      docState.pendingExternal = null
      docState.lastExternalAt = Date.now()
      const { id, cursor } = docState

      if (selected) {
        this.UPDATE_CURRENT_FILE(docState)
        bus.$emit('file-loaded', { id, markdown: normalizedMarkdown, cursor })
      } else {
        this.ADD_FILE_TO_TABS(docState)
      }

      if (isMixedLineEndings) {
        const { filename, lineEnding } = markdownDocument
        this.PUSH_TAB_NOTIFICATION({
          tabId: id,
          msg: `${filename}" has mixed line endings which are automatically normalized to ${lineEnding.toUpperCase()}.`
        })
      }
    },

    SHOW_TAB_VIEW(always: boolean) {
      const { tabs } = this
      if (always || tabs.length === 1) {
        const layout = useLayoutStore()
        layout.SET_LAYOUT({ showTabBar: true })
        layout.DISPATCH_LAYOUT_MENU_ITEMS()
      }
    },

    LISTEN_FOR_CONTENT_CHANGE({ id, markdown, wordCount, cursor, history, toc }: any) {
      const preferences = usePreferencesStore()
      const { autoSave } = preferences
      const {
        id: currentId,
        filename,
        pathname,
        markdown: oldMarkdown,
        trimTrailingNewline
      } = this.currentFile
      const { listToc } = this

      if (!id) {
        throw new Error('Listen for document change but id was not set!')
      } else if (!currentId || this.tabs.length === 0) {
        return
      } else if (id !== 'muya' && currentId !== id) {
        for (const tab of this.tabs) {
          if (tab.id && tab.id === id) {
            tab.markdown = adjustTrailingNewlines(markdown, tab.trimTrailingNewline)
            if (cursor) tab.cursor = cursor
            if (history) tab.history = history
            break
          }
        }
        return
      }

      markdown = adjustTrailingNewlines(markdown, trimTrailingNewline)
      this.SET_MARKDOWN(markdown)

      if (oldMarkdown.length === 0 && markdown.length === 1 && markdown[0] === '\n') {
        return
      }

      if (wordCount) this.SET_WORD_COUNT(wordCount)
      if (cursor) this.SET_CURSOR(cursor)
      if (history) this.SET_HISTORY(history)
      if (toc && !equal(toc, listToc)) this.SET_TOC(toc)

      if (markdown !== oldMarkdown) {
        const savedMarkdown =
          typeof this.currentFile.savedMarkdown === 'string' ? this.currentFile.savedMarkdown : ''
        this.SET_SAVE_STATUS(markdown === savedMarkdown)

        if (pathname && autoSave) {
          const options = getOptionsFromState(this.currentFile)
          this.HANDLE_AUTO_SAVE({
            id: currentId,
            filename,
            pathname,
            markdown,
            options
          })
        }
      }
    },

    HANDLE_AUTO_SAVE({ id, filename, pathname, markdown, options }: any) {
      if (!id || !pathname) {
        throw new Error('HANDLE_AUTO_SAVE: Invalid tab.')
      }

      const { tabs } = this
      const preferences = usePreferencesStore()
      const { autoSaveDelay } = preferences

      if (autoSaveTimers.has(id)) {
        const timer = autoSaveTimers.get(id)!
        clearTimeout(timer)
        autoSaveTimers.delete(id)
      }

      const timer = setTimeout(() => {
        autoSaveTimers.delete(id)
        const tab = tabs.find((t: any) => t.id === id)
        if (tab && !tab.isSaved) {
          const defaultPath = getRootFolderFromState()
          ipcRenderer.send('mt::response-file-save', {
            id,
            filename,
            pathname,
            markdown,
            options,
            defaultPath
          })
        }
      }, autoSaveDelay)
      autoSaveTimers.set(id, timer)
    },

    SELECTION_CHANGE(changes: any) {
      if (!changes || !changes.start || !changes.end) return
      const { start, end } = changes
      if (start.key === end.key && start.block && start.block.text) {
        const value = start.block.text.substring(start.offset, end.offset)
        this.SET_SEARCH({
          matches: [],
          index: -1,
          value
        })
      }

      const { windowId } = (window as any).marktext.env
      ipcRenderer.send(
        'mt::editor-selection-changed',
        windowId,
        createApplicationMenuState(changes)
      )
    },

    SELECTION_FORMATS(formats: any[]) {
      const { windowId } = (window as any).marktext.env
      ipcRenderer.send('mt::update-format-menu', windowId, createSelectionFormatState(formats))
    },

    EXPORT({ type, content, pageOptions }: { type: string; content: string; pageOptions?: any }) {
      if (!hasKeys(this.currentFile)) return

      let title = ''
      const { listToc } = this
      if (listToc && listToc.length > 0) {
        let headerRef = listToc[0]
        const len = Math.min(listToc.length, 6)
        for (let i = 1; i < len; ++i) {
          if (headerRef.lvl === 1) break
          const header = listToc[i]
          if (headerRef.lvl > header.lvl) {
            headerRef = header
          }
        }
        title = headerRef.content
      }

      const { filename, pathname } = this.currentFile
      ipcRenderer.send('mt::response-export', {
        type,
        title,
        content,
        filename,
        pathname,
        pageOptions
      })
    },

    LINTEN_FOR_EXPORT_SUCCESS() {
      ipcRenderer.on('mt::export-success', (e: any, { type, filePath }: any) => {
        notice
          .notify({
            title: t('notification.exportSuccess'),
            message: t('notification.exportSuccessMsg', { filename: path.basename(filePath) }),
            showConfirm: true
          })
          .then(() => {
            shell.showItemInFolder(filePath)
          })
      })
    },

    PRINT_RESPONSE() {
      ipcRenderer.send('mt::response-print')
    },

    LINTEN_FOR_PRINT_SERVICE_CLEARUP() {
      ipcRenderer.on('mt::print-service-clearup', () => {
        bus.$emit('print-service-clearup')
      })
    },

    LINTEN_FOR_SET_LINE_ENDING() {
      ipcRenderer.on('mt::set-line-ending', (e: any, lineEnding: string) => {
        const { lineEnding: oldLineEnding } = this.currentFile
        if (lineEnding !== oldLineEnding) {
          this.SET_LINE_ENDING(lineEnding)
          this.SET_ADJUST_LINE_ENDING_ON_SAVE(lineEnding !== 'lf')
          this.SET_SAVE_STATUS(true)

          if (!e) {
            this.UPDATE_LINE_ENDING_MENU()
          }
        }
      })
    },

    LINTEN_FOR_SET_ENCODING() {
      ipcRenderer.on('mt::set-file-encoding', (e: any, encodingName: string) => {
        const { encoding } = this.currentFile.encoding
        if (encoding !== encodingName) {
          this.SET_FILE_ENCODING_BY_NAME(encodingName)
          this.SET_SAVE_STATUS(true)
        }
      })
    },

    LINTEN_FOR_SET_FINAL_NEWLINE() {
      ipcRenderer.on('mt::set-final-newline', (e: any, value: number) => {
        const { trimTrailingNewline } = this.currentFile
        if (trimTrailingNewline !== value) {
          this.SET_FINAL_NEWLINE(value)
          this.SET_SAVE_STATUS(true)
        }
      })
    },

    APPLY_EXTERNAL_CONFLICT_DECISION({ tabId, strategy, text }: any) {
      const tab = this.tabs.find((t: any) => t.id === tabId)
      if (!tab) return
      const theirs = typeof tab.externalMarkdown === 'string' ? tab.externalMarkdown : ''
      if (strategy === 'theirs') {
        this.APPLY_EXTERNAL_MARKDOWN_TO_TAB({ tab, markdown: theirs, markAsSaved: true })
      } else if (strategy === 'manual' && typeof text === 'string') {
        this.APPLY_EXTERNAL_MARKDOWN_TO_TAB({
          tab,
          markdown: text,
          markAsSaved: text === theirs
        })
      } else {
        // ours: keep current editor content, still align snapshot to disk.
        tab.isSaved = tab.markdown === theirs
      }
      this.SET_EXTERNAL_CONFLICT_DIALOG({ open: false })
    },

    QUEUE_EXTERNAL_CHANGE(tab: any, change: any) {
      if (!tab || !change) return
      tab.pendingExternal = change
      tab.lastExternalAt = Date.now()
      if (externalMergeTimers.has(tab.id)) {
        clearTimeout(externalMergeTimers.get(tab.id)!)
        externalMergeTimers.delete(tab.id)
      }
      const timer = setTimeout(() => {
        externalMergeTimers.delete(tab.id)
        this.PROCESS_PENDING_EXTERNAL_CHANGE(tab.id)
      }, 1500)
      externalMergeTimers.set(tab.id, timer)
    },

    PROCESS_PENDING_EXTERNAL_CHANGE(tabId: string) {
      const tab = this.tabs.find((t: any) => t.id === tabId)
      if (!tab || !tab.pendingExternal) return

      const pending = tab.pendingExternal
      tab.pendingExternal = null

      const theirs = typeof pending.markdown === 'string' ? pending.markdown : ''
      const ours = typeof tab.markdown === 'string' ? tab.markdown : ''
      const base = typeof tab.savedMarkdown === 'string' ? tab.savedMarkdown : ''
      tab.externalMarkdown = theirs
      tab.savedMarkdown = theirs
      tab.lastExternalAt = Date.now()

      const merged = mergeThreeWayText(base, ours, theirs)
      if (!merged.hasConflict) {
        const mergedMarkdown = merged.merged
        this.APPLY_EXTERNAL_MARKDOWN_TO_TAB({
          tab,
          markdown: mergedMarkdown,
          markAsSaved: mergedMarkdown === theirs
        })
        this.PUSH_TAB_NOTIFICATION({
          tabId,
          msg: t('notification.externalSynced'),
          style: 'info',
          showConfirm: false,
          exclusiveType: 'external_sync'
        })
        return
      }

      this.SET_EXTERNAL_CONFLICT_DIALOG({
        open: true,
        tabId: tab.id,
        pathname: tab.pathname,
        ours,
        theirs,
        merged: merged.merged
      })
      this.PUSH_TAB_NOTIFICATION({
        tabId: tab.id,
        msg: t('notification.externalConflict'),
        style: 'warn',
        showConfirm: true,
        exclusiveType: 'external_conflict',
        action: (status: boolean) => {
          if (status) {
            this.SET_EXTERNAL_CONFLICT_DIALOG({
              open: true,
              tabId: tab.id,
              pathname: tab.pathname,
              ours,
              theirs,
              merged: merged.merged
            })
          }
        }
      })
    },

    LISTEN_FOR_FILE_CHANGE() {
      const preferences = usePreferencesStore()
      ipcRenderer.on('mt::update-file', (e: any, { type, change }: any) => {
        const { tabs } = this
        const { pathname } = change
        const tab = tabs.find((t: any) => isSamePathSync(t.pathname, pathname))
        if (tab) {
          const { id, isSaved, filename } = tab
          switch (type) {
            case 'unlink': {
              this.SET_SAVE_STATUS_BY_TAB({ tab, status: false })
              this.PUSH_TAB_NOTIFICATION({
                tabId: id,
                msg: `"${filename}" has been removed on disk.`,
                style: 'warn',
                showConfirm: false,
                exclusiveType: 'file_changed'
              })
              break
            }
            case 'add':
            case 'change': {
              const incomingRaw = typeof change.markdown === 'string' ? change.markdown : ''
              const incoming = adjustTrailingNewlines(incomingRaw, tab.trimTrailingNewline)
              const savedMarkdown =
                typeof tab.savedMarkdown === 'string'
                  ? adjustTrailingNewlines(tab.savedMarkdown, tab.trimTrailingNewline)
                  : ''
              const currentMarkdown =
                typeof tab.markdown === 'string'
                  ? adjustTrailingNewlines(tab.markdown, tab.trimTrailingNewline)
                  : ''

              tab.externalMarkdown = incoming
              tab.lastExternalAt = Date.now()

              // Ignore watcher noise (common right after watch registration/open):
              // if disk content is identical to both saved snapshot and editor state,
              // reloading would only cause flicker and potentially a false dirty state.
              if (incoming === savedMarkdown && incoming === currentMarkdown) {
                tab.pendingExternal = null
                tab.isSaved = true
                return
              }

              const { autoSave } = preferences
              if (autoSave) {
                if (autoSaveTimers.has(id)) {
                  const timer = autoSaveTimers.get(id)!
                  clearTimeout(timer)
                  autoSaveTimers.delete(id)
                }
                if (isSaved) {
                  this.LOAD_CHANGE(change)
                  return
                }
              }

              if (isSaved) {
                this.LOAD_CHANGE(change)
                return
              }
              this.QUEUE_EXTERNAL_CHANGE(tab, change)
              break
            }
            default:
              console.error(`LISTEN_FOR_FILE_CHANGE: Invalid type "${type}"`)
          }
        }
      })
    },

    ASK_FOR_IMAGE_PATH() {
      return ipcRenderer.sendSync('mt::ask-for-image-path')
    },

    LISTEN_WINDOW_ZOOM() {
      const preferences = usePreferencesStore()
      ipcRenderer.on('mt::window-zoom', (e: any, zoomFactor: number) => {
        zoomFactor = Number.parseFloat(zoomFactor.toFixed(3))
        const { zoom } = preferences
        if (zoom !== zoomFactor) {
          preferences.SET_SINGLE_PREFERENCE({ type: 'zoom', value: zoomFactor })
        }
        webFrame.setZoomFactor(zoomFactor)
      })
    },

    LISTEN_FOR_RELOAD_IMAGES() {
      ipcRenderer.on('mt::invalidate-image-cache', () => {
        bus.$emit('invalidate-image-cache')
      })
    },

    LISTEN_FOR_CONTEXT_MENU() {
      ipcRenderer.on('mt::cm-copy-as-markdown', () => {
        bus.$emit('copyAsMarkdown', 'copyAsMarkdown')
      })
      ipcRenderer.on('mt::cm-copy-as-html', () => {
        bus.$emit('copyAsHtml', 'copyAsHtml')
      })
      ipcRenderer.on('mt::cm-paste-as-plain-text', () => {
        bus.$emit('pasteAsPlainText', 'pasteAsPlainText')
      })
      ipcRenderer.on('mt::cm-insert-paragraph', (e: any, location: any) => {
        bus.$emit('insertParagraph', location)
      })
      ipcRenderer.on('mt::spelling-replace-misspelling', (e: any, info: any) => {
        bus.$emit('replace-misspelling', info)
      })
      ipcRenderer.on('mt::spelling-show-switch-language', () => {
        bus.$emit('open-command-spellchecker-switch-language')
      })
    }
  }
})
