import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ipcRenderer, path } from '../util/tauri'
import equal from 'fast-deep-equal'
import { isSamePathSync } from 'common/filesystem/paths'
import bus from '../bus'
import { hasKeys } from '../util'
import listToTree from '../util/listToTree'
import {
  createDocumentState,
  getOptionsFromState,
  getBlankFileState
} from '../store/help'
import notice from '../services/notification'
import { useLayoutStore } from './layout'
import { usePreferencesStore } from './preferences'
import { useProjectStore } from './project'

const autoSaveTimers = new Map()

export const useEditorStore = defineStore('editor', () => {
  // State
  const currentFile = ref({})
  const tabs = ref([])
  const listToc = ref([])
  const toc = ref([])

  // Getters
  const hasCurrentFile = computed(() => hasKeys(currentFile.value))

  // Helper functions
  function getRootFolderFromState () {
    const projectStore = useProjectStore()
    const openedFolder = projectStore.projectTree
    if (openedFolder) {
      return openedFolder.pathname
    }
    return ''
  }

  function adjustTrailingNewlines (markdown, trimTrailingNewlineOption) {
    if (!markdown) return ''

    switch (trimTrailingNewlineOption) {
      case 0:
        return markdown.replace(/[\r?\n]+$/, '')
      case 1: {
        const lastIndex = markdown.length - 1
        if (markdown[lastIndex] === '\n') {
          if (markdown.length === 1) return ''
          else if (markdown[lastIndex - 1] !== '\n') return markdown
        }
        markdown = markdown.replace(/[\r?\n]+$/, '')
        if (markdown.length === 0) return ''
        return markdown + '\n'
      }
      default:
        return markdown
    }
  }

  // Actions
  function setSearch (value) {
    currentFile.value.searchMatches = value
  }

  function setToc (tocList) {
    listToc.value = tocList
    toc.value = listToTree(tocList)
  }

  function setCurrentFile (file) {
    const oldCurrentFile = currentFile.value
    if (!oldCurrentFile.id || oldCurrentFile.id !== file.id) {
      const { id, markdown, cursor, history, pathname } = file
      window.DIRNAME = pathname ? path.dirname(pathname) : ''
      currentFile.value = file
      bus.$emit('file-changed', {
        id,
        markdown,
        cursor,
        renderCursor: true,
        history
      })
    }
  }

  function addFileToTabs (file) {
    tabs.value.push(file)
  }

  function removeFileWithinTabs (file) {
    const index = tabs.value.indexOf(file)
    tabs.value.splice(index, 1)

    if (file.id && autoSaveTimers.has(file.id)) {
      const timer = autoSaveTimers.get(file.id)
      clearTimeout(timer)
      autoSaveTimers.delete(file.id)
    }

    if (file.id === currentFile.value.id) {
      const fileState = tabs.value[index] || tabs.value[index - 1] || tabs.value[0] || {}
      currentFile.value = fileState
      if (typeof fileState.markdown === 'string') {
        const { id, markdown, cursor, history, pathname } = fileState
        window.DIRNAME = pathname ? path.dirname(pathname) : ''
        bus.$emit('file-changed', {
          id,
          markdown,
          cursor,
          renderCursor: true,
          history
        })
      }
    }

    if (tabs.value.length === 0) {
      listToc.value = []
      toc.value = []
    }
  }

  function exchangeTabsById (tabIDs) {
    const { fromId } = tabIDs
    const toId = tabIDs.toId

    const moveItem = (arr, from, to) => {
      if (from === to) return true
      const len = arr.length
      const item = arr.splice(from, 1)
      if (item.length === 0) return false
      arr.splice(to, 0, item[0])
      return arr.length === len
    }

    const fromIndex = tabs.value.findIndex((t) => t.id === fromId)
    if (!toId) {
      moveItem(tabs.value, fromIndex, tabs.value.length - 1)
    } else {
      const toIndex = tabs.value.findIndex((t) => t.id === toId)
      const realToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex
      moveItem(tabs.value, fromIndex, realToIndex)
    }
  }

  function setSaveStatus (status) {
    if (hasKeys(currentFile.value)) {
      currentFile.value.isSaved = status
    }
  }

  function setSaveStatusByTab ({ tab, status }) {
    if (hasKeys(tab)) {
      tab.isSaved = status
    }
  }

  function setSaveStatusWhenRemove ({ pathname }) {
    tabs.value.forEach((f) => {
      if (f.pathname === pathname) {
        f.isSaved = false
      }
    })
  }

  function setMarkdown (markdown) {
    if (hasKeys(currentFile.value)) {
      currentFile.value.markdown = markdown
    }
  }

  function setLineEnding (lineEnding) {
    if (hasKeys(currentFile.value)) {
      currentFile.value.lineEnding = lineEnding
    }
  }

  function setWordCount (wordCount) {
    if (hasKeys(currentFile.value)) {
      currentFile.value.wordCount = wordCount
    }
  }

  function setCursor (cursor) {
    if (hasKeys(currentFile.value)) {
      currentFile.value.cursor = cursor
    }
  }

  function setHistory (history) {
    if (hasKeys(currentFile.value)) {
      currentFile.value.history = history
    }
  }

  function closeTabs (tabIdList) {
    if (!tabIdList || tabIdList.length === 0) return

    let tabIndex = 0
    tabIdList.forEach((id) => {
      const index = tabs.value.findIndex((f) => f.id === id)
      const { pathname } = tabs.value[index]

      if (pathname) {
        ipcRenderer.send('mt::window-tab-closed', pathname)
      }

      tabs.value.splice(index, 1)
      if (currentFile.value.id === id) {
        currentFile.value = {}
        window.DIRNAME = ''
        if (tabIdList.length === 1) {
          tabIndex = index
        }
      }
    })

    if (!currentFile.value.id && tabs.value.length) {
      currentFile.value = tabs.value[tabIndex] || tabs.value[tabIndex - 1] || tabs.value[0] || {}
      if (typeof currentFile.value.markdown === 'string') {
        const { id, markdown, cursor, history, pathname } = currentFile.value
        window.DIRNAME = pathname ? path.dirname(pathname) : ''
        bus.$emit('file-changed', {
          id,
          markdown,
          cursor,
          renderCursor: true,
          history
        })
      }
    }

    if (tabs.value.length === 0) {
      listToc.value = []
      toc.value = []
    }
  }

  function renameIfNeeded ({ src, dest }) {
    tabs.value.forEach((f) => {
      if (f.pathname === src) {
        f.pathname = dest
        f.filename = path.basename(dest)
      }
    })
  }

  function updateCurrentFile (file) {
    setCurrentFile(file)
    if (!tabs.value.some((f) => f.id === file.id)) {
      addFileToTabs(file)
    }
    updateLineEndingMenu()
  }

  function updateLineEndingMenu () {
    const { lineEnding } = currentFile.value
    if (lineEnding) {
      const { windowId } = window.marktext.env
      ipcRenderer.send('mt::update-line-ending-menu', windowId, lineEnding)
    }
  }

  function forceCloseTab (file) {
    removeFileWithinTabs(file)
    const { pathname } = file
    if (pathname) {
      ipcRenderer.send('mt::window-tab-closed', pathname)
    }
  }

  function closeTab (file) {
    const { isSaved } = file
    if (isSaved) {
      forceCloseTab(file)
    } else {
      closeUnsavedTab(file)
    }
  }

  function closeUnsavedTab (file) {
    const { id, pathname, filename, markdown } = file
    const options = getOptionsFromState(file)
    ipcRenderer.send('mt::save-and-close-tabs', [
      { id, pathname, filename, markdown, options }
    ])
  }

  function newUntitledTab ({ markdown: markdownString, selected }) {
    const preferencesStore = usePreferencesStore()

    if (selected == null) {
      selected = true
    }

    showTabView(false)

    const { defaultEncoding, endOfLine } = preferencesStore
    const fileState = getBlankFileState(
      tabs.value,
      defaultEncoding,
      endOfLine,
      markdownString
    )

    if (selected) {
      const { id, markdown } = fileState
      updateCurrentFile(fileState)
      bus.$emit('file-loaded', { id, markdown })
    } else {
      addFileToTabs(fileState)
    }
  }

  function showTabView (always) {
    const layoutStore = useLayoutStore()
    if (always || tabs.value.length === 1) {
      layoutStore.setLayout({ showTabBar: true })
      layoutStore.dispatchLayoutMenuItems()
    }
  }

  function cycleTabs (direction) {
    if (tabs.value.length <= 1) return

    const currentIndex = tabs.value.findIndex((t) => t.id === currentFile.value.id)
    if (currentIndex === -1) return

    let nextTabIndex = 0
    if (!direction) {
      nextTabIndex = currentIndex === 0 ? tabs.value.length - 1 : currentIndex - 1
    } else {
      nextTabIndex = (currentIndex + 1) % tabs.value.length
    }

    const nextTab = tabs.value[nextTabIndex]
    if (!nextTab || !nextTab.id) return

    setCurrentFile(nextTab)
    updateLineEndingMenu()
  }

  // IPC Listeners
  function listenForSave () {
    ipcRenderer.on('mt::editor-ask-file-save', () => {
      const { id, filename, pathname, markdown } = currentFile.value
      const options = getOptionsFromState(currentFile.value)
      const defaultPath = getRootFolderFromState()
      if (id) {
        ipcRenderer.send('mt::response-file-save', {
          id, filename, pathname, markdown, options, defaultPath
        })
      }
    })
  }

  function listenForSaveAs () {
    ipcRenderer.on('mt::editor-ask-file-save-as', () => {
      const { id, filename, pathname, markdown } = currentFile.value
      const options = getOptionsFromState(currentFile.value)
      const defaultPath = getRootFolderFromState()
      if (id) {
        ipcRenderer.send('mt::response-file-save-as', {
          id, filename, pathname, markdown, options, defaultPath
        })
      }
    })
  }

  function listenForSetPathname () {
    ipcRenderer.on('mt::set-pathname', (e, fileInfo) => {
      const { pathname, id } = fileInfo
      const tab = tabs.value.find((f) => f.id === id)
      if (!tab) return

      const existingTab = tabs.value.find(
        (t) => t.id !== id && isSamePathSync(t.pathname, pathname)
      )
      if (existingTab) {
        closeTab(existingTab)
      }

      const { filename } = fileInfo
      if (id === currentFile.value.id && pathname) {
        window.DIRNAME = path.dirname(pathname)
      }
      if (tab) {
        Object.assign(tab, { filename, pathname, isSaved: true })
      }
    })

    ipcRenderer.on('mt::tab-saved', (e, tabId) => {
      const tab = tabs.value.find((f) => f.id === tabId)
      if (tab) {
        Object.assign(tab, { isSaved: true })
      }
    })

    ipcRenderer.on('mt::tab-save-failure', (e, tabId, msg) => {
      const tab = tabs.value.find((t) => t.id === tabId)
      if (!tab) {
        notice.notify({
          title: 'Save failure',
          message: msg,
          type: 'error',
          time: 20000,
          showConfirm: false
        })
        return
      }
      setSaveStatusByTab({ tab, status: false })
    })
  }

  function listenForClose () {
    ipcRenderer.on('mt::ask-for-close', () => {
      const unsavedFiles = tabs.value
        .filter((file) => !file.isSaved)
        .map((file) => {
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
  }

  function listenForSaveClose () {
    ipcRenderer.on('mt::force-close-tabs-by-id', (e, tabIdList) => {
      if (Array.isArray(tabIdList) && tabIdList.length) {
        closeTabs(tabIdList)
      }
    })
  }

  function listenForNewTab () {
    ipcRenderer.on('mt::open-new-tab', (e, markdownDocument, options = {}, selected = true) => {
      if (markdownDocument) {
        newTabWithContent({ markdownDocument, options, selected })
      } else {
        newUntitledTab({})
      }
    })

    ipcRenderer.on('mt::new-untitled-tab', (e, selected = true, markdown = '') => {
      newUntitledTab({ markdown, selected })
    })
  }

  function listenForCloseTab () {
    ipcRenderer.on('mt::editor-close-tab', () => {
      const file = currentFile.value
      if (!hasKeys(file)) return
      closeTab(file)
    })
  }

  function listenForTabCycle () {
    ipcRenderer.on('mt::tabs-cycle-left', () => {
      cycleTabs(false)
    })
    ipcRenderer.on('mt::tabs-cycle-right', () => {
      cycleTabs(true)
    })
  }

  function newTabWithContent ({ markdownDocument, options = {}, selected }) {
    if (!markdownDocument) {
      newUntitledTab({})
      return
    }

    if (typeof selected === 'undefined') {
      selected = true
    }

    const { pathname } = markdownDocument
    const existingTab = tabs.value.find((t) => isSamePathSync(t.pathname, pathname))
    if (existingTab) {
      updateCurrentFile(existingTab)
      return
    }

    let keepTabBarState = false
    if (currentFile.value) {
      const { isSaved, pathname } = currentFile.value
      if (isSaved && !pathname) {
        keepTabBarState = true
        forceCloseTab(currentFile.value)
      }
    }

    if (!keepTabBarState) {
      showTabView(false)
    }

    const { markdown } = markdownDocument
    const docState = createDocumentState(Object.assign(markdownDocument, options))
    const { id, cursor } = docState

    if (selected) {
      updateCurrentFile(docState)
      bus.$emit('file-loaded', { id, markdown, cursor })
    } else {
      addFileToTabs(docState)
    }
  }

  function listenForContentChange ({ id, markdown, wordCount, cursor, history, toc: tocData }) {
    const preferencesStore = usePreferencesStore()
    const { autoSave } = preferencesStore
    const {
      id: currentId,
      filename,
      pathname,
      markdown: oldMarkdown,
      trimTrailingNewline
    } = currentFile.value

    if (!id) {
      throw new Error('Listen for document change but id was not set!')
    } else if (!currentId || tabs.value.length === 0) {
      return
    } else if (id !== 'muya' && currentId !== id) {
      for (const tab of tabs.value) {
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
    setMarkdown(markdown)

    if (oldMarkdown.length === 0 && markdown.length === 1 && markdown[0] === '\n') {
      return
    }

    if (wordCount) setWordCount(wordCount)
    if (cursor) setCursor(cursor)
    if (history) setHistory(history)
    if (tocData && !equal(tocData, listToc.value)) {
      setToc(tocData)
    }

    if (markdown !== oldMarkdown) {
      setSaveStatus(false)

      if (pathname && autoSave) {
        const options = getOptionsFromState(currentFile.value)
        handleAutoSave({
          id: currentId,
          filename,
          pathname,
          markdown,
          options
        })
      }
    }
  }

  function handleAutoSave ({ id, filename, pathname, markdown, options }) {
    if (!id || !pathname) {
      throw new Error('HANDLE_AUTO_SAVE: Invalid tab.')
    }

    const preferencesStore = usePreferencesStore()
    const { autoSaveDelay } = preferencesStore

    if (autoSaveTimers.has(id)) {
      const timer = autoSaveTimers.get(id)
      clearTimeout(timer)
      autoSaveTimers.delete(id)
    }

    const timer = setTimeout(() => {
      autoSaveTimers.delete(id)
      const tab = tabs.value.find((t) => t.id === id)
      if (tab && !tab.isSaved) {
        const defaultPath = getRootFolderFromState()
        ipcRenderer.send('mt::response-file-save', {
          id, filename, pathname, markdown, options, defaultPath
        })
      }
    }, autoSaveDelay)
    autoSaveTimers.set(id, timer)
  }

  function listenForBootstrapWindow () {
    const preferencesStore = usePreferencesStore()
    const layoutStore = useLayoutStore()

    setTimeout(() => {
      // Commands will be registered via the Vuex store for now
      setTimeout(() => {
        ipcRenderer.send('mt::request-keybindings')
        bus.$emit('cmd::sort-commands')
      }, 100)
    }, 400)

    ipcRenderer.on('mt::bootstrap-editor', (e, config) => {
      const {
        addBlankTab,
        markdownList,
        lineEnding,
        sideBarVisibility,
        tabBarVisibility,
        sourceCodeModeEnabled
      } = config

      ipcRenderer.send('mt::window-initialized')
      preferencesStore.setUserPreference({ endOfLine: lineEnding })
      layoutStore.setLayout({
        rightColumn: 'files',
        showSideBar: !!sideBarVisibility,
        showTabBar: !!tabBarVisibility
      })
      layoutStore.dispatchLayoutMenuItems()

      preferencesStore.setMode({
        type: 'sourceCode',
        checked: !!sourceCodeModeEnabled
      })

      if (addBlankTab) {
        newUntitledTab({})
      } else if (markdownList.length) {
        let isFirst = true
        for (const markdown of markdownList) {
          isFirst = false
          newUntitledTab({ markdown, selected: isFirst })
        }
      }
    })
  }

  function exportFile ({ type, content, pageOptions }) {
    if (!hasKeys(currentFile.value)) return

    let title = ''
    if (listToc.value && listToc.value.length > 0) {
      let headerRef = listToc.value[0]
      const len = Math.min(listToc.value.length, 6)
      for (let i = 1; i < len; ++i) {
        if (headerRef.lvl === 1) break
        const header = listToc.value[i]
        if (headerRef.lvl > header.lvl) {
          headerRef = header
        }
      }
      title = headerRef.content
    }

    const { filename, pathname } = currentFile.value
    ipcRenderer.send('mt::response-export', {
      type, title, content, filename, pathname, pageOptions
    })
  }

  return {
    // State
    currentFile,
    tabs,
    listToc,
    toc,
    // Getters
    hasCurrentFile,
    // Actions
    setSearch,
    setToc,
    setCurrentFile,
    addFileToTabs,
    removeFileWithinTabs,
    exchangeTabsById,
    setSaveStatus,
    setSaveStatusByTab,
    setSaveStatusWhenRemove,
    setMarkdown,
    setLineEnding,
    setWordCount,
    setCursor,
    setHistory,
    closeTabs,
    renameIfNeeded,
    updateCurrentFile,
    updateLineEndingMenu,
    forceCloseTab,
    closeTab,
    closeUnsavedTab,
    newUntitledTab,
    newTabWithContent,
    showTabView,
    cycleTabs,
    listenForContentChange,
    handleAutoSave,
    exportFile,
    // IPC Listeners
    listenForSave,
    listenForSaveAs,
    listenForSetPathname,
    listenForClose,
    listenForSaveClose,
    listenForNewTab,
    listenForCloseTab,
    listenForTabCycle,
    listenForBootstrapWindow
  }
})
