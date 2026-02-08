<template>
  <div class="editor-container">
    <side-bar v-if="init"></side-bar>
    <div class="editor-middle">
      <title-bar
        :project="projectTree"
        :pathname="pathname"
        :filename="filename"
        :active="windowActive"
        :word-count="wordCount"
        :platform="platform"
        :is-saved="isSaved"
      ></title-bar>
      <div class="editor-placeholder" v-if="!init"></div>
      <recent v-if="!hasCurrentFile && init"></recent>
      <editor-with-tabs
        v-if="hasCurrentFile && init"
        :markdown="markdown"
        :cursor="cursor"
        :source-code="sourceCode"
        :show-tab-bar="showTabBar"
        :text-direction="textDirection"
        :platform="platform"
      ></editor-with-tabs>
      <command-palette></command-palette>
      <about-dialog></about-dialog>
      <export-setting-dialog></export-setting-dialog>
      <rename></rename>
      <tweet></tweet>
      <import-modal></import-modal>
    </div>
  </div>
</template>

<script lang="ts">
import { addStyles, addThemeStyle } from '@/util/theme'
import Recent from '@/components/recent'
import EditorWithTabs from '@/components/editorWithTabs'
import TitleBar from '@/components/titleBar'
import SideBar from '@/components/sideBar'
import AboutDialog from '@/components/about'
import CommandPalette from '@/components/commandPalette'
import ExportSettingDialog from '@/components/exportSettings'
import Rename from '@/components/rename'
import Tweet from '@/components/tweet'
import ImportModal from '@/components/import'
import { useLoadingPage } from '@/composables/useLoadingPage'
import { mapState } from 'pinia'
import { useAppStore } from '@/stores/app'
import { useEditorStore } from '@/stores/editor'
import { usePreferencesStore } from '@/stores/preferences'
import { useProjectStore } from '@/stores/project'
import { useLayoutStore } from '@/stores/layout'
import { useCommandCenterStore } from '@/stores/commandCenter'
import { useListenForMainStore } from '@/stores/listenForMain'
import { useTweetStore } from '@/stores/tweet'
import { useAutoUpdatesStore } from '@/stores/autoUpdates'
import { useNotificationStore } from '@/stores/notification'
import bus from '@/bus'
import { DEFAULT_STYLE } from '@/config'
import { ipcRenderer, initMenuEvents, initDragDrop } from '../util/tauri'

export default {
  name: 'marktext',
  components: {
    Recent,
    EditorWithTabs,
    TitleBar,
    SideBar,
    AboutDialog,
    ExportSettingDialog,
    Rename,
    Tweet,
    ImportModal,
    CommandPalette
  },
  setup () {
    const { hideLoadingPage } = useLoadingPage()
    return { hideLoadingPage }
  },
  data () {
    return {}
  },
  computed: {
    ...mapState(useLayoutStore, ['showTabBar']),
    ...mapState(usePreferencesStore, ['sourceCode', 'theme', 'textDirection', 'zoom']),
    ...mapState(useProjectStore, ['projectTree']),
    ...mapState(useEditorStore, {
      pathname: (store) => store.currentFile.pathname,
      filename: (store) => store.currentFile.filename,
      isSaved: (store) => store.currentFile.isSaved,
      markdown: (store) => store.currentFile.markdown,
      cursor: (store) => store.currentFile.cursor,
      wordCount: (store) => store.currentFile.wordCount
    }),
    ...mapState(useAppStore, ['windowActive', 'platform', 'init']),
    hasCurrentFile () {
      return this.markdown !== undefined
    }
  },
  watch: {
    theme: function (value, oldValue) {
      if (value !== oldValue) {
        addThemeStyle(value)
      }
    },
    zoom: function (zoom) {
      ipcRenderer.emit('mt::window-zoom', null, zoom)
    }
  },
  created () {
    const preferencesStore = usePreferencesStore()
    const appStore = useAppStore()
    const commandCenterStore = useCommandCenterStore()
    const tweetStore = useTweetStore()
    const layoutStore = useLayoutStore()
    const listenForMainStore = useListenForMainStore()
    const projectStore = useProjectStore()
    const autoUpdatesStore = useAutoUpdatesStore()
    const editorStore = useEditorStore()
    const notificationStore = useNotificationStore()

    // Apply initial state (theme and titleBarStyle) and delay load other values.
    if (window.marktext.initialState) {
      preferencesStore.SET_USER_PREFERENCE(window.marktext.initialState)
    }

    // store/index.js
    appStore.LINTEN_WIN_STATUS()
    // module: command center
    commandCenterStore.LISTEN_COMMAND_CENTER_BUS()
    // module: tweet
    tweetStore.LISTEN_FOR_TWEET()
    // module: layout
    layoutStore.LISTEN_FOR_LAYOUT()
    // module: listenForMain
    listenForMainStore.LISTEN_FOR_EDIT()
    preferencesStore.LISTEN_FOR_VIEW()
    listenForMainStore.LISTEN_FOR_SHOW_DIALOG()
    listenForMainStore.LISTEN_FOR_PARAGRAPH_INLINE_STYLE()
    // module: project
    projectStore.LISTEN_FOR_UPDATE_PROJECT()
    projectStore.LISTEN_FOR_LOAD_PROJECT()
    projectStore.LISTEN_FOR_SIDEBAR_CONTEXT_MENU()
    // module: autoUpdates
    autoUpdatesStore.LISTEN_FOR_UPDATE()
    // module: editor
    editorStore.LISTEN_SCREEN_SHOT()
    preferencesStore.ASK_FOR_USER_PREFERENCE()
    preferencesStore.LISTEN_TOGGLE_VIEW()
    editorStore.LISTEN_FOR_CLOSE()
    editorStore.LISTEN_FOR_SAVE_AS()
    editorStore.LISTEN_FOR_MOVE_TO()
    editorStore.LISTEN_FOR_SAVE()
    editorStore.LISTEN_FOR_SET_PATHNAME()
    editorStore.LISTEN_FOR_BOOTSTRAP_WINDOW()
    editorStore.LISTEN_FOR_SAVE_CLOSE()
    editorStore.LISTEN_FOR_RENAME()
    editorStore.LINTEN_FOR_SET_LINE_ENDING()
    editorStore.LINTEN_FOR_SET_ENCODING()
    editorStore.LINTEN_FOR_SET_FINAL_NEWLINE()
    editorStore.LISTEN_FOR_NEW_TAB()
    editorStore.LISTEN_FOR_CLOSE_TAB()
    editorStore.LISTEN_FOR_TAB_CYCLE()
    editorStore.LISTEN_FOR_SWITCH_TABS()
    editorStore.LINTEN_FOR_PRINT_SERVICE_CLEARUP()
    editorStore.LINTEN_FOR_EXPORT_SUCCESS()
    editorStore.LISTEN_FOR_FILE_CHANGE()
    editorStore.LISTEN_WINDOW_ZOOM()
    editorStore.LISTEN_FOR_RELOAD_IMAGES()
    editorStore.LISTEN_FOR_CONTEXT_MENU()

    // module: notification
    notificationStore.LISTEN_FOR_NOTIFICATION()

    // Initialize Tauri native menu event handling
    initMenuEvents(bus)

    // Initialize Tauri native drag-and-drop file handling
    initDragDrop(bus)

    // Tauri auto-initialization: Electron sends mt::bootstrap-editor from main process,
    // but in Tauri we need to self-initialize since there's no Electron main process.
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
      this.$nextTick(() => {
        // Set initialized flag (renders editor area)
        appStore.SEND_INITIALIZED()
        // Set default layout
        layoutStore.SET_LAYOUT({
          rightColumn: 'files',
          showSideBar: false,
          showTabBar: false
        })
        // Create a blank editor tab
        editorStore.NEW_UNTITLED_TAB({})
      })
    }

    // prevent Chromium's default behavior and try to open the first file
    window.addEventListener(
      'dragover',
      (e) => {
        // Cancel to allow tab drag&drop.
        if (!e.dataTransfer.types.length) return

        if (e.dataTransfer.types.indexOf('Files') >= 0) {
          if (
            e.dataTransfer.items.length === 1 &&
            e.dataTransfer.items[0].type.indexOf('image') > -1
          ) {
            // Do nothing, because we already drag/drop image in muya.
          } else {
            e.preventDefault()
            if (this.timer) {
              clearTimeout(this.timer)
            }
            this.timer = setTimeout(() => {
              bus.$emit('importDialog', false)
            }, 300)
            bus.$emit('importDialog', true)
          }

          e.dataTransfer.dropEffect = 'copy'
        } else {
          e.stopPropagation()
          e.dataTransfer.dropEffect = 'none'
        }
      },
      false
    )

    this.$nextTick(() => {
      const style = window.marktext.initialState || DEFAULT_STYLE
      addStyles(style)
      this.hideLoadingPage()
    })
  }
}
</script>

<style scoped>
.editor-placeholder,
.editor-container {
  display: flex;
  flex-direction: row;
  position: absolute;
  width: 100vw;
  height: 100vh;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
.editor-container .hide {
  z-index: -1;
  opacity: 0;
  position: absolute;
  left: -10000px;
}
.editor-placeholder {
  background: var(--editorBgColor);
}
.editor-middle {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 100vh;
  position: relative;
  & > .editor {
    flex: 1;
  }
}
</style>
