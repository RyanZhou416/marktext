<template>
  <div>
    <div class="title-bar-editor-bg" :class="{ 'tabs-visible': showTabBar }"></div>
    <div
      class="title-bar"
      :class="[
        { active: active },
        { 'tabs-visible': showTabBar },
        { frameless: titleBarStyle === 'custom' },
        { isOsx: isOsx }
      ]"
    >
      <div class="title" @dblclick.stop="toggleMaxmizeOnMacOS">
        <span v-if="!filename">MarkText</span>
        <span v-else>
          <span v-for="(path, index) of paths" :key="index">
            {{ path }}
            <svg class="icon" aria-hidden="true">
              <use xlink:href="#icon-arrow-right"></use>
            </svg>
          </span>
          <span class="filename" :class="{ isOsx: platform === 'darwin' }" @click="rename">
            {{ localizedFilename }}
          </span>
          <span class="save-dot" :class="saveStateClass"></span>
        </span>
      </div>
      <div :class="showCustomTitleBar ? 'left-toolbar title-no-drag' : 'right-toolbar'">
        <AppMenu v-if="showCustomTitleBar" :checked-ids="menuCheckedIds" @action="onMenuAction">
          <div class="frameless-titlebar-menu title-no-drag toolbar-chip">
            <span class="text-center-vertical">&#9776;</span>
          </div>
        </AppMenu>
        <AppTooltip v-if="wordCount" class="item" side="bottom">
          <template #content>
            <div class="title-item">
              <span class="front">{{ $t('titleBar.words') }}:</span
              ><span class="text">{{ wordCount['word'] }}</span>
            </div>
            <div class="title-item">
              <span class="front">{{ $t('titleBar.characters') }}:</span
              ><span class="text">{{ wordCount['character'] }}</span>
            </div>
            <div class="title-item">
              <span class="front">{{ $t('titleBar.paragraphs') }}:</span
              ><span class="text">{{ wordCount['paragraph'] }}</span>
            </div>
          </template>
          <div
            class="word-count toolbar-chip"
            :class="[{ 'title-no-drag': platform !== 'darwin' }]"
            @click.stop="handleWordClick"
          >
            <span class="text-center-vertical">{{ `${HASH[show].short} ${wordCount[show]}` }}</span>
          </div>
        </AppTooltip>
      </div>
      <div
        v-if="titleBarStyle === 'custom' && !isFullScreen && !isOsx"
        class="right-toolbar"
        :class="[{ 'title-no-drag': titleBarStyle === 'custom' }]"
      >
        <div
          class="frameless-titlebar-button frameless-titlebar-close"
          @click.stop="handleCloseClick"
        >
          <div>
            <svg width="10" height="10">
              <path :d="windowIconClose" />
            </svg>
          </div>
        </div>
        <div
          class="frameless-titlebar-button frameless-titlebar-toggle"
          @click.stop="handleMaximizeClick"
        >
          <div>
            <svg width="10" height="10">
              <path v-show="!isMaximized" :d="windowIconMaximize" />
              <path v-show="isMaximized" :d="windowIconRestore" />
            </svg>
          </div>
        </div>
        <div
          class="frameless-titlebar-button frameless-titlebar-minimize"
          @click.stop="handleMinimizeClick"
        >
          <div>
            <svg width="10" height="10">
              <path :d="windowIconMinimize" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ipcRenderer, handleMenuAction } from '../../util/tauri'
import { mapState } from 'pinia'
import { usePreferencesStore } from '@/stores/preferences'
import { useLayoutStore } from '@/stores/layout'
import { useEditorStore } from '@/stores/editor'
import { minimizePath, restorePath, maximizePath, closePath } from '../../assets/window-controls.js'
import { PATH_SEPARATOR } from '../../config'
import { isOsx } from '@/util'
import { useTitle } from '@vueuse/core'
import { computed } from 'vue'
import AppMenu from '../appMenu/index.vue'
import AppTooltip from '@/components/common/AppTooltip.vue'
import i18n from '@/i18n'
import { localizeUntitledFilename } from '@/util/displayName'

export default {
  components: {
    AppMenu,
    AppTooltip
  },
  props: {
    project: Object,
    filename: String,
    pathname: String,
    active: Boolean,
    wordCount: Object,
    platform: String,
    isSaved: Boolean
  },
  setup(props: any) {
    const localizedFilename = computed(() => {
      return localizeUntitledFilename(props.filename, props.pathname, (key: string) =>
        i18n.global.t(key)
      )
    })
    const windowTitle = computed(() => {
      const hasOpenFolder = props.project && props.project.name
      if (localizedFilename.value) {
        return hasOpenFolder
          ? `${localizedFilename.value} - ${props.project.name}`
          : `${localizedFilename.value} - MarkText`
      }
      return hasOpenFolder ? props.project.name : 'MarkText'
    })
    useTitle(windowTitle)
    return {
      localizedFilename
    }
  },
  data() {
    this.isOsx = isOsx
    this.HASH = {
      word: {
        short: 'W',
        full: 'word'
      },
      character: {
        short: 'C',
        full: 'character'
      },
      paragraph: {
        short: 'P',
        full: 'paragraph'
      },
      all: {
        short: 'A',
        full: '(with space)character'
      }
    }
    this.windowIconMinimize = minimizePath
    this.windowIconRestore = restorePath
    this.windowIconMaximize = maximizePath
    this.windowIconClose = closePath
    return {
      isFullScreen: false,
      isMaximized: false,
      show: 'word',
      syncWindowStateTimer: null as ReturnType<typeof setTimeout> | null
    }
  },
  computed: {
    ...mapState(usePreferencesStore, [
      'titleBarStyle',
      'theme',
      'autoSave',
      'sourceCode',
      'typewriter',
      'focus'
    ]),
    ...mapState(useLayoutStore, ['showTabBar', 'showSideBar']),
    ...mapState(useEditorStore, ['currentFile']),
    paths() {
      if (!this.pathname) return []
      const pathnameToken = this.pathname.split(PATH_SEPARATOR).filter(i => i)
      return pathnameToken.slice(0, pathnameToken.length - 1).slice(-3)
    },
    showCustomTitleBar() {
      return this.titleBarStyle === 'custom' && !this.isOsx
    },
    saveStateClass() {
      // 三态规则：
      // 1) 未保存(红): 新建未落盘文档（无 pathname）
      // 2) 有修改(橙): 已落盘但当前有未保存改动
      // 3) 已保存(绿): 已落盘且当前无未保存改动
      if (!this.filename) return ''
      if (!this.pathname) return 'unsaved'
      const current = this.currentFile || {}
      const hasSnapshot =
        current.pathname === this.pathname &&
        typeof current.markdown === 'string' &&
        typeof current.savedMarkdown === 'string'
      if (hasSnapshot) {
        return current.markdown === current.savedMarkdown ? 'saved' : 'modified'
      }
      return this.isSaved ? 'saved' : 'modified'
    },
    menuCheckedIds() {
      const ids = new Set<string>()
      // Check-type toggles
      if (this.autoSave) ids.add('file.auto-save')
      if (this.sourceCode) ids.add('view.source-code-mode')
      if (this.typewriter) ids.add('view.typewriter-mode')
      if (this.focus) ids.add('view.focus-mode')
      if (this.showSideBar) ids.add('view.toggle-sidebar')
      if (this.showTabBar) ids.add('view.toggle-tabbar')
      // Radio-type: theme
      const themeMap: Record<string, string> = {
        light: 'theme.cadmium-light',
        dark: 'theme.dark',
        graphite: 'theme.graphite-light',
        'material-dark': 'theme.material-dark',
        'one-dark': 'theme.one-dark',
        ulysses: 'theme.ulysses-light',
        'everforest-light': 'theme.everforest-light',
        'everforest-dark': 'theme.everforest-dark'
      }
      if (this.theme && themeMap[this.theme]) {
        ids.add(themeMap[this.theme])
      }
      // Radio-type: line ending
      const le = this.currentFile && this.currentFile.lineEnding
      if (le === 'crlf') ids.add('edit.line-ending-crlf')
      else if (le === 'lf') ids.add('edit.line-ending-lf')
      return ids
    }
  },
  created() {
    ipcRenderer.on('mt::window-maximize', this.onMaximize)
    ipcRenderer.on('mt::window-unmaximize', this.onUnmaximize)
    ipcRenderer.on('mt::window-enter-full-screen', this.onEnterFullScreen)
    ipcRenderer.on('mt::window-leave-full-screen', this.onLeaveFullScreen)
    this.syncWindowState()
  },
  mounted() {
    // Native maximize/restore (e.g. double-click on drag region) may not always
    // emit a reliable app-level event in time, but it always resizes viewport.
    window.addEventListener('resize', this.onWindowResize, { passive: true })
  },
  beforeUnmount() {
    ipcRenderer.off('mt::window-maximize', this.onMaximize)
    ipcRenderer.off('mt::window-unmaximize', this.onUnmaximize)
    ipcRenderer.off('mt::window-enter-full-screen', this.onEnterFullScreen)
    ipcRenderer.off('mt::window-leave-full-screen', this.onLeaveFullScreen)
    window.removeEventListener('resize', this.onWindowResize)
    if (this.syncWindowStateTimer) {
      clearTimeout(this.syncWindowStateTimer)
      this.syncWindowStateTimer = null
    }
  },

  methods: {
    handleWordClick() {
      const ITEMS = ['word', 'paragraph', 'character', 'all']
      const len = ITEMS.length
      let index = ITEMS.indexOf(this.show)
      index += 1
      if (index >= len) index = 0
      this.show = ITEMS[index]
    },

    handleCloseClick() {
      ipcRenderer.send('mt::window-close')
    },

    handleMaximizeClick() {
      if (this.isFullScreen) {
        ipcRenderer.send('mt::window-set-fullscreen', false)
      } else if (this.isMaximized) {
        ipcRenderer.send('mt::window-unmaximize')
      } else {
        ipcRenderer.send('mt::window-maximize')
      }
      setTimeout(() => this.syncWindowState(), 60)
    },

    toggleMaxmizeOnMacOS() {
      if (this.isOsx) {
        this.handleMaximizeClick()
      } else {
        // On Windows/Linux double-click on drag region is handled by the OS.
        // Sync icon state after the native toggle.
        setTimeout(() => this.syncWindowState(), 80)
        setTimeout(() => this.syncWindowState(), 180)
        setTimeout(() => this.syncWindowState(), 320)
      }
    },

    handleMinimizeClick() {
      ipcRenderer.send('mt::window-minimize')
    },

    onMenuAction(id) {
      handleMenuAction(id)
    },

    rename() {
      if (this.platform === 'darwin') {
        useEditorStore().RESPONSE_FOR_RENAME()
      }
    },

    onMaximize() {
      this.isMaximized = true
    },
    onUnmaximize() {
      this.isMaximized = false
    },
    onEnterFullScreen() {
      this.isFullScreen = true
    },
    onLeaveFullScreen() {
      this.isFullScreen = false
    },
    onWindowResize() {
      if (this.syncWindowStateTimer) {
        clearTimeout(this.syncWindowStateTimer)
      }
      this.syncWindowStateTimer = setTimeout(() => {
        this.syncWindowState()
      }, 80)
    },
    async syncWindowState() {
      try {
        const state = await ipcRenderer.invoke('mt::window-get-state')
        this.isMaximized = !!state?.isMaximized
        this.isFullScreen = !!state?.isFullscreen
      } catch {
        // ignore sync errors to avoid breaking title bar interactions
      }
    }
  }
}
</script>

<style scoped>
.title-bar-editor-bg {
  height: var(--titleBarHeight);
  background: var(--editorBgColor);
  position: relative;
  left: 0;
  top: 0;
  right: 0;
}
.title-bar {
  -webkit-app-region: drag;
  user-select: none;
  background: transparent;
  height: var(--titleBarHeight);
  box-sizing: border-box;
  color: var(--editorColor50);
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  z-index: 2;
  transition: color 0.4s ease-in-out;
  cursor: default;
}
.active {
  color: var(--editorColor);
}
img {
  height: 90%;
  margin-top: 1px;
  vertical-align: top;
}
.title {
  padding: 0 142px;
  height: 100%;
  line-height: var(--titleBarHeight);
  font-size: 14px;
  text-align: center;
  transition: all 0.25s ease-in-out;
  & .filename {
    transition: all 0.25s ease-in-out;
  }
  &::after {
    content: '';
    position: absolute;
    top: 0;
    height: 1px;
    width: 100%;
    z-index: 1;
    -webkit-app-region: no-drag;
  }
}
div.title > span {
  /* Workaround for GH#339 */
  display: block;
  direction: rtl;
  overflow: hidden;
  text-overflow: clip;
  white-space: nowrap;
}

.title-bar .title .filename.isOsx:hover {
  color: var(--themeColor);
}

.active .save-dot {
  margin-left: 3px;
  width: 1em;
  height: 1em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  visibility: visible;
}
.active .save-dot::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  opacity: 0.9;
}
.active .save-dot.saved::before {
  background: #22c55e;
}
.active .save-dot.unsaved::before {
  background: #ef4444;
}
.active .save-dot.modified::before {
  background: #f59e0b;
}
.title:hover {
  color: var(sideBarTitleColor);
}

.left-toolbar {
  padding: 0 10px;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  width: 118px; /* + 2*10px padding*/
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
}
.right-toolbar {
  height: 100%;
  position: absolute;
  top: 0;
  right: 0;
  width: 138px;
  display: flex;
  align-items: center;
  flex-direction: row-reverse;
  & .item {
    margin-right: 10px;
  }
}

.toolbar-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  border-radius: 3px;
  padding: 0 6px;
  box-sizing: border-box;
  color: var(--editorColor30);
  transition: all 0.2s ease-in-out;
}

.toolbar-chip:hover {
  background: var(--sideBarBgColor);
  color: var(--sideBarTitleColor);
}

.word-count {
  cursor: pointer;
  font-size: 14px;
  text-align: center;
  line-height: 24px;
  & > .text-center-vertical {
    padding: 0;
    border-radius: 0;
  }
}

.title-no-drag {
  -webkit-app-region: no-drag;
}
/* frameless window controls */
.frameless-titlebar-button {
  position: relative;
  display: block;
  width: 46px;
  height: var(--titleBarHeight);
}
.frameless-titlebar-button > div {
  position: absolute;
  display: inline-flex;
  top: 50%;
  left: 50%;
  transform: translateX(-50%) translateY(-50%);
}
.frameless-titlebar-menu {
  color: inherit;
}
.frameless-titlebar-close:hover {
  background-color: rgb(228, 79, 79);
}
.frameless-titlebar-minimize:hover,
.frameless-titlebar-toggle:hover {
  background-color: rgba(0, 0, 0, 0.1);
}
.frameless-titlebar-button svg {
  fill: #000000;
}
.frameless-titlebar-close:hover svg {
  fill: #ffffff;
}

.text-center-vertical {
  display: inline-block;
  vertical-align: middle;
  line-height: normal;
}
</style>

<style>
.title-item {
  height: 28px;
  line-height: 28px;
  & .front {
    opacity: 0.7;
  }
  & .text {
    margin-left: 10px;
  }
}
</style>
