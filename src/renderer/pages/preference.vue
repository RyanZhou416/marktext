<template>
  <div v-if="init" class="pref-container">
    <title-bar v-if="showCustomTitleBar"></title-bar>
    <side-bar></side-bar>
    <div class="pref-content" :class="{ frameless: titleBarStyle === 'custom' || isOsx }">
      <div v-if="!showCustomTitleBar" class="title-bar"></div>
      <router-view class="pref-setting"></router-view>
    </div>
  </div>
  <div v-else class="pref-placeholder"></div>
</template>

<script lang="ts">
import { mapState } from 'pinia'
import { usePreferencesStore } from '@/stores/preferences'
import TitleBar from '@/prefComponents/common/titlebar'
import SideBar from '@/prefComponents/sideBar'
import { useLoadingPage } from '@/composables/useLoadingPage'
import { addThemeStyle } from '@/util/theme'
import { DEFAULT_STYLE } from '@/config'
import { isOsx } from '@/util'

export default {
  components: {
    TitleBar,
    SideBar
  },
  setup() {
    const { hideLoadingPage } = useLoadingPage()
    return { hideLoadingPage }
  },
  data() {
    this.isOsx = isOsx
    return {
      init: false
    }
  },
  computed: {
    ...mapState(usePreferencesStore, ['theme', 'titleBarStyle']),
    showCustomTitleBar() {
      return this.titleBarStyle === 'custom' && !this.isOsx
    }
  },
  watch: {
    theme: function (value, oldValue) {
      if (value !== oldValue) {
        addThemeStyle(value)
      }
    }
  },
  created() {
    this.$nextTick(async () => {
      const state = window.marktext.initialState || DEFAULT_STYLE
      addThemeStyle(state.theme)

      usePreferencesStore().ASK_FOR_USER_PREFERENCE()

      // Set init flag to render content
      this.init = true

      // Wait for next tick so DOM is ready, then show window and hide loading page
      this.$nextTick(async () => {
        this.hideLoadingPage()
        // Show the window now that UI is ready (avoids startup flash)
        try {
          const { invoke } = await import('@tauri-apps/api/core')
          await invoke('show_settings_window')
        } catch (e) {
          console.error('Failed to show settings window:', e)
        }
      })
    })
  }
}
</script>

<style>
.pref-placeholder {
  width: 100%;
  height: 100%;
  background: var(--editorBgColor);
}
.pref-container {
  --prefSideBarWidth: 280px;

  width: 100%;
  height: 100%;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  background: var(--editorBgColor);

  & h4 {
    margin: 0;
    font-weight: normal;
  }

  & h5 {
    font-weight: normal;
  }

  & .pref-content {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    max-width: calc(100% - var(--prefSideBarWidth));
    & .title-bar {
      width: 100%;
      height: var(--titleBarHeight);
      position: fixed;
      top: 0;
      right: 0;
      -webkit-app-region: drag;
    }
    & .pref-setting {
      padding: 50px 20px;
      padding-top: var(--titleBarHeight);
      flex: 1;
      height: calc(100vh - var(--titleBarHeight));
      overflow: auto;
    }
    & span,
    & div,
    & h1,
    & h2,
    & h3,
    & h4,
    & h5 {
      user-select: none;
    }
  }
  & .pref-content.frameless .pref-setting {
    /* Move the scrollbar below the titlebar */
    margin-top: var(--titleBarHeight);
    padding-top: 0;
  }
}
</style>
