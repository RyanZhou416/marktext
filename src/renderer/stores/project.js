import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ipcRenderer, shell, path, processInfo } from '../util/electron'
import { addFile, unlinkFile, addDirectory, unlinkDirectory } from '../store/treeCtrl'
import bus from '../bus'
import { create, paste, rename } from '../util/fileSystem'
import { PATH_SEPARATOR } from '../config'
import notice from '../services/notification'
import { getFileStateFromData } from '../store/help'
import { hasMarkdownExtension } from '../../common/filesystem/paths'
import { useLayoutStore } from './layout'
import { useEditorStore } from './editor'

export const useProjectStore = defineStore('project', () => {
  // State
  const activeItem = ref({})
  const createCache = ref({})
  const newFileNameCache = ref('')
  const renameCache = ref(null)
  const clipboard = ref(null)
  const projectTree = ref(null)

  // Actions
  function setRootDirectory (pathname) {
    let name = path.basename(pathname)
    if (!name) {
      name = pathname
    }

    projectTree.value = {
      pathname: path.normalize(pathname),
      name,
      isDirectory: true,
      isFile: false,
      isMarkdown: false,
      folders: [],
      files: []
    }
  }

  function setNewFilename (name) {
    newFileNameCache.value = name
  }

  function addFileToTree (change) {
    if (projectTree.value) {
      addFile(projectTree.value, change)
    }
  }

  function unlinkFileFromTree (change) {
    if (projectTree.value) {
      unlinkFile(projectTree.value, change)
    }
  }

  function addDirectoryToTree (change) {
    if (projectTree.value) {
      addDirectory(projectTree.value, change)
    }
  }

  function unlinkDirectoryFromTree (change) {
    if (projectTree.value) {
      unlinkDirectory(projectTree.value, change)
    }
  }

  function setActiveItem (item) {
    activeItem.value = item
  }

  function setClipboard (data) {
    clipboard.value = data
  }

  function setCreateCache (cache) {
    createCache.value = cache
  }

  function setRenameCache (cache) {
    renameCache.value = cache
  }

  function listenForLoadProject () {
    const layoutStore = useLayoutStore()

    ipcRenderer.on('mt::open-directory', (e, pathname) => {
      setRootDirectory(pathname)
      layoutStore.setLayout({
        rightColumn: 'files',
        showSideBar: true,
        showTabBar: true
      })
      layoutStore.dispatchLayoutMenuItems()
    })
  }

  function listenForUpdateProject () {
    const editorStore = useEditorStore()

    ipcRenderer.on('mt::update-object-tree', (e, { type, change }) => {
      switch (type) {
        case 'add': {
          const { pathname, data, isMarkdown } = change
          addFileToTree(change)
          if (
            isMarkdown &&
            newFileNameCache.value &&
            pathname === newFileNameCache.value
          ) {
            const fileState = getFileStateFromData(data)
            editorStore.updateCurrentFile(fileState)
            setNewFilename('')
          }
          break
        }
        case 'unlink':
          unlinkFileFromTree(change)
          editorStore.setSaveStatusWhenRemove(change)
          break
        case 'addDir':
          addDirectoryToTree(change)
          break
        case 'unlinkDir':
          unlinkDirectoryFromTree(change)
          break
        case 'change':
          break
        default:
          if (processInfo.env.NODE_ENV === 'development') {
            console.log(`Unknown directory watch type: "${type}"`)
          }
          break
      }
    })
  }

  function changeActiveItem (item) {
    setActiveItem(item)
  }

  function changeClipboard (data) {
    setClipboard(data)
  }

  function askForOpenProject () {
    ipcRenderer.send('mt::ask-for-open-project-in-sidebar')
  }

  function listenForSidebarContextMenu () {
    bus.$on('SIDEBAR::show-in-folder', () => {
      const { pathname } = activeItem.value
      shell.showItemInFolder(pathname)
    })

    bus.$on('SIDEBAR::new', (type) => {
      const { pathname, isDirectory } = activeItem.value
      const dirname = isDirectory ? pathname : path.dirname(pathname)
      setCreateCache({ dirname, type })
      bus.$emit('SIDEBAR::show-new-input')
    })

    bus.$on('SIDEBAR::remove', () => {
      const { pathname } = activeItem.value
      ipcRenderer.invoke('mt::fs-trash-item', pathname).catch((err) => {
        notice.notify({
          title: 'Error while deleting',
          type: 'error',
          message: err.message
        })
      })
    })

    bus.$on('SIDEBAR::copy-cut', (type) => {
      const { pathname: src } = activeItem.value
      setClipboard({ type, src })
    })

    bus.$on('SIDEBAR::paste', () => {
      const clipboardData = clipboard.value
      const { pathname, isDirectory } = activeItem.value
      const dirname = isDirectory ? pathname : path.dirname(pathname)
      if (clipboardData && clipboardData.src) {
        clipboardData.dest = dirname + PATH_SEPARATOR + path.basename(clipboardData.src)

        if (path.normalize(clipboardData.src) === path.normalize(clipboardData.dest)) {
          notice.notify({
            title: 'Paste Forbidden',
            type: 'warning',
            message: 'Source and destination must not be the same.'
          })
          return
        }

        paste(clipboardData)
          .then(() => {
            setClipboard(null)
          })
          .catch((err) => {
            notice.notify({
              title: 'Error while pasting',
              type: 'error',
              message: err.message
            })
          })
      }
    })

    bus.$on('SIDEBAR::rename', () => {
      const { pathname } = activeItem.value
      setRenameCache(pathname)
      bus.$emit('SIDEBAR::show-rename-input')
    })
  }

  function createFileDirectory (name) {
    const { dirname, type } = createCache.value

    if (type === 'file' && !hasMarkdownExtension(name)) {
      name += '.md'
    }

    const fullName = `${dirname}/${name}`

    create(fullName, type)
      .then(() => {
        setCreateCache({})
        if (type === 'file') {
          setNewFilename(fullName)
        }
      })
      .catch((err) => {
        notice.notify({
          title: 'Error in Side Bar',
          type: 'error',
          message: err.message
        })
      })
  }

  function renameInSidebar (name) {
    const editorStore = useEditorStore()
    const src = renameCache.value
    const dirname = path.dirname(src)
    const dest = dirname + PATH_SEPARATOR + name
    rename(src, dest).then(() => {
      editorStore.renameIfNeeded({ src, dest })
    })
  }

  function openSettingWindow () {
    ipcRenderer.send('mt::open-setting-window')
  }

  return {
    // State
    activeItem,
    createCache,
    newFileNameCache,
    renameCache,
    clipboard,
    projectTree,
    // Actions
    setRootDirectory,
    setNewFilename,
    addFileToTree,
    unlinkFileFromTree,
    addDirectoryToTree,
    unlinkDirectoryFromTree,
    setActiveItem,
    setClipboard,
    setCreateCache,
    setRenameCache,
    listenForLoadProject,
    listenForUpdateProject,
    changeActiveItem,
    changeClipboard,
    askForOpenProject,
    listenForSidebarContextMenu,
    createFileDirectory,
    renameInSidebar,
    openSettingWindow
  }
})
