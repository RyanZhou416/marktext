import { defineStore } from 'pinia'
import { ipcRenderer, shell, path, processInfo } from '../util/tauri'
import { addFile, unlinkFile, addDirectory, unlinkDirectory } from './treeCtrl'
import bus from '../bus'
import { create, paste, rename } from '../util/fileSystem'
import { PATH_SEPARATOR } from '../config'
import notice from '../services/notification'
import { getFileStateFromData } from './help'
import { hasMarkdownExtension } from '../../common/filesystem/paths'
import { useLayoutStore } from './layout'
import { useEditorStore } from './editor'

export const useProjectStore = defineStore('project', {
  state: () => ({
    activeItem: {} as any,
    createCache: {} as any,
    newFileNameCache: '',
    renameCache: null as string | null,
    clipboard: null as any,
    projectTree: null as any
  }),

  actions: {
    SET_ROOT_DIRECTORY(pathname: string) {
      let name = path.basename(pathname)
      if (!name) {
        name = pathname
      }
      this.projectTree = {
        pathname: path.normalize(pathname),
        name,
        isDirectory: true,
        isFile: false,
        isMarkdown: false,
        folders: [],
        files: []
      }
    },

    SET_NEWFILENAME(name: string) {
      this.newFileNameCache = name
    },

    ADD_FILE(change: any) {
      const { projectTree } = this
      addFile(projectTree, change)
    },

    UNLINK_FILE(change: any) {
      const { projectTree } = this
      unlinkFile(projectTree, change)
    },

    ADD_DIRECTORY(change: any) {
      const { projectTree } = this
      addDirectory(projectTree, change)
    },

    UNLINK_DIRECTORY(change: any) {
      const { projectTree } = this
      unlinkDirectory(projectTree, change)
    },

    SET_ACTIVE_ITEM(activeItem: any) {
      this.activeItem = activeItem
    },

    SET_CLIPBOARD(data: any) {
      this.clipboard = data
    },

    CREATE_PATH(cache: any) {
      this.createCache = cache
    },

    SET_RENAME_CACHE(cache: string | null) {
      this.renameCache = cache
    },

    LISTEN_FOR_LOAD_PROJECT() {
      ipcRenderer.on('mt::open-directory', (e: any, pathname: string) => {
        this.SET_ROOT_DIRECTORY(pathname)
        const layout = useLayoutStore()
        layout.SET_LAYOUT({
          rightColumn: 'files',
          showSideBar: true,
          showTabBar: true
        })
        layout.DISPATCH_LAYOUT_MENU_ITEMS()
      })
    },

    LISTEN_FOR_UPDATE_PROJECT() {
      const editor = useEditorStore()
      ipcRenderer.on('mt::update-object-tree', (e: any, { type, change }: any) => {
        switch (type) {
          case 'add': {
            const { pathname, data, isMarkdown } = change
            this.ADD_FILE(change)
            if (isMarkdown && this.newFileNameCache && pathname === this.newFileNameCache) {
              const fileState = getFileStateFromData(data)
              editor.UPDATE_CURRENT_FILE(fileState)
              this.SET_NEWFILENAME('')
            }
            break
          }
          case 'unlink':
            this.UNLINK_FILE(change)
            editor.SET_SAVE_STATUS_WHEN_REMOVE(change)
            break
          case 'addDir':
            this.ADD_DIRECTORY(change)
            break
          case 'unlinkDir':
            this.UNLINK_DIRECTORY(change)
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
    },

    CHANGE_ACTIVE_ITEM(activeItem: any) {
      this.SET_ACTIVE_ITEM(activeItem)
    },

    CHANGE_CLIPBOARD(data: any) {
      this.SET_CLIPBOARD(data)
    },

    ASK_FOR_OPEN_PROJECT() {
      ipcRenderer.send('mt::ask-for-open-project-in-sidebar')
    },

    LISTEN_FOR_SIDEBAR_CONTEXT_MENU() {
      bus.$on('SIDEBAR::show-in-folder', () => {
        const { pathname } = this.activeItem
        shell.showItemInFolder(pathname)
      })
      bus.$on('SIDEBAR::new', (type: any) => {
        const { pathname, isDirectory } = this.activeItem
        const dirname = isDirectory ? pathname : path.dirname(pathname)
        this.CREATE_PATH({ dirname, type })
        bus.$emit('SIDEBAR::show-new-input')
      })
      bus.$on('SIDEBAR::remove', () => {
        const { pathname } = this.activeItem
        ipcRenderer.invoke('mt::fs-trash-item', pathname).catch((err: any) => {
          notice.notify({
            title: 'Error while deleting',
            type: 'error',
            message: err.message
          })
        })
      })
      bus.$on('SIDEBAR::copy-cut', (type: any) => {
        const { pathname: src } = this.activeItem
        this.SET_CLIPBOARD({ type, src })
      })
      bus.$on('SIDEBAR::paste', () => {
        const { clipboard } = this
        const { pathname, isDirectory } = this.activeItem
        const dirname = isDirectory ? pathname : path.dirname(pathname)
        if (clipboard && clipboard.src) {
          clipboard.dest = dirname + PATH_SEPARATOR + path.basename(clipboard.src)

          if (path.normalize(clipboard.src) === path.normalize(clipboard.dest)) {
            notice.notify({
              title: 'Paste Forbidden',
              type: 'warning',
              message: 'Source and destination must not be the same.'
            })
            return
          }

          paste(clipboard)
            .then(() => {
              this.SET_CLIPBOARD(null)
            })
            .catch((err: any) => {
              notice.notify({
                title: 'Error while pasting',
                type: 'error',
                message: err.message
              })
            })
        }
      })
      bus.$on('SIDEBAR::rename', () => {
        const { pathname } = this.activeItem
        this.SET_RENAME_CACHE(pathname)
        bus.$emit('SIDEBAR::show-rename-input')
      })
    },

    CREATE_FILE_DIRECTORY(name: string) {
      const { dirname, type } = this.createCache

      if (type === 'file' && !hasMarkdownExtension(name)) {
        name += '.md'
      }

      const fullName = `${dirname}/${name}`

      create(fullName, type)
        .then(() => {
          this.CREATE_PATH({})
          if (type === 'file') {
            this.SET_NEWFILENAME(fullName)
          }
        })
        .catch((err: any) => {
          notice.notify({
            title: 'Error in Side Bar',
            type: 'error',
            message: err.message
          })
        })
    },

    RENAME_IN_SIDEBAR(name: string) {
      const src = this.renameCache!
      const dirname = path.dirname(src)
      const dest = dirname + PATH_SEPARATOR + name
      const editor = useEditorStore()
      rename(src, dest).then(() => {
        editor.RENAME_IF_NEEDED({ src, dest })
      })
    },

    OPEN_SETTING_WINDOW() {
      ipcRenderer.send('mt::open-setting-window')
    }
  }
})
