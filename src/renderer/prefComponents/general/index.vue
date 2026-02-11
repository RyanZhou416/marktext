<template>
  <div class="pref-general">
    <h4>{{ $t('settings.general') }}</h4>
    <compound>
      <template #head>
        <h6 class="title">{{ $t('settings.general.autoSave') }}</h6>
      </template>
      <template #children>
        <bool
          :description="$t('settings.general.autoSaveDesc')"
          :bool="autoSave"
          :onChange="value => onSelectChange('autoSave', value)"
        ></bool>
        <range
          :description="$t('settings.general.autoSaveDelay')"
          :value="autoSaveDelay"
          :min="1000"
          :max="10000"
          unit="ms"
          :step="100"
          :onChange="value => onSelectChange('autoSaveDelay', value)"
        ></range>
      </template>
    </compound>

    <compound>
      <template #head>
        <h6 class="title">{{ $t('settings.general.window') }}</h6>
      </template>
      <template #children>
        <cur-select
          v-if="!isOsx"
          :description="$t('settings.general.titleBarStyle')"
          :value="titleBarStyle"
          :options="titleBarStyleOpts"
          :onChange="value => onSelectChange('titleBarStyle', value)"
        ></cur-select>
        <bool
          :description="$t('settings.general.hideScrollbar')"
          :bool="hideScrollbar"
          :onChange="value => onSelectChange('hideScrollbar', value)"
        ></bool>
        <bool
          :description="$t('settings.general.openFilesInNewWindow')"
          :bool="openFilesInNewWindow"
          :onChange="value => onSelectChange('openFilesInNewWindow', value)"
        ></bool>
        <bool
          :description="$t('settings.general.openFoldersInNewWindow')"
          :bool="openFolderInNewWindow"
          :onChange="value => onSelectChange('openFolderInNewWindow', value)"
        ></bool>
        <cur-select
          :description="$t('settings.general.zoom')"
          :value="zoom"
          :options="zoomOptions"
          :onChange="value => onSelectChange('zoom', value)"
        ></cur-select>
      </template>
    </compound>

    <compound>
      <template #head>
        <h6 class="title">{{ $t('settings.general.sidebar') }}</h6>
      </template>
      <template #children>
        <bool
          :description="$t('settings.general.wordWrapInToc')"
          :bool="wordWrapInToc"
          :onChange="value => onSelectChange('wordWrapInToc', value)"
        ></bool>

        <!-- TODO: The description is very bad and the entry isn't used by the editor. -->
        <cur-select
          :description="$t('settings.general.fileSortBy')"
          :value="fileSortBy"
          :options="fileSortByOpts"
          :onChange="value => onSelectChange('fileSortBy', value)"
          :disable="true"
        ></cur-select>
      </template>
    </compound>

    <compound>
      <template #head>
        <h6 class="title">{{ $t('settings.general.startupAction') }}</h6>
      </template>
      <template #children>
        <section class="startup-action-ctrl">
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" value="folder" v-model="startUpAction" />
              {{ $t('settings.general.openDefaultDir') }}<span>: {{ defaultDirectoryToOpen }}</span>
            </label>
            <button class="btn-default pref-btn" @click="selectDefaultDirectoryToOpen">
              {{ $t('settings.general.selectFolder') }}
            </button>
            <label class="radio-label">
              <input type="radio" value="blank" v-model="startUpAction" />
              {{ $t('settings.general.openBlankPage') }}
            </label>
          </div>
        </section>
      </template>
    </compound>

    <compound>
      <template #head>
        <h6 class="title">{{ $t('settings.general.misc') }}</h6>
      </template>
      <template #children>
        <cur-select
          :description="$t('settings.general.language')"
          :value="language"
          :options="languageOptions"
          :onChange="value => onLanguageChange(value)"
        ></cur-select>
      </template>
    </compound>
  </div>
</template>

<script lang="ts">
import { mapState } from 'pinia'
import { usePreferencesStore } from '@/stores/preferences'
import Compound from '../common/compound'
import Range from '../common/range'
import CurSelect from '../common/select'
import Bool from '../common/bool'
import Separator from '../common/separator'
import { isOsx } from '@/util'

import { titleBarStyleOptions, zoomOptions, fileSortByOptions } from './config'
import meta from '../../../locales/_meta.json'
import i18n from '@/i18n'
import { loadLocale } from '@/i18n/loader'
import { isTauriAvailable } from '@/util/tauri'

export default {
  components: {
    Compound,
    Bool,
    Range,
    CurSelect,
    Separator
  },
  data() {
    this.zoomOptions = zoomOptions
    this.isOsx = isOsx
    return {}
  },
  computed: {
    ...mapState(usePreferencesStore, [
      'autoSave',
      'autoSaveDelay',
      'titleBarStyle',
      'defaultDirectoryToOpen',
      'openFilesInNewWindow',
      'openFolderInNewWindow',
      'zoom',
      'hideScrollbar',
      'wordWrapInToc',
      'fileSortBy',
      'language'
    ]),
    titleBarStyleOpts() {
      return titleBarStyleOptions(this.$t)
    },
    fileSortByOpts() {
      return fileSortByOptions(this.$t)
    },
    languageOptions() {
      return meta.languages.map(lang => ({
        label: lang.nativeName,
        value: lang.code
      }))
    },
    startUpAction: {
      get: function () {
        return usePreferencesStore().startUpAction
      },
      set: function (value) {
        const type = 'startUpAction'
        const preferencesStore = usePreferencesStore()
        preferencesStore.SET_SINGLE_PREFERENCE({ type, value })
      }
    }
  },
  methods: {
    onSelectChange(type, value) {
      const preferencesStore = usePreferencesStore()
      preferencesStore.SET_SINGLE_PREFERENCE({ type, value })
    },
    async onLanguageChange(value) {
      const preferencesStore = usePreferencesStore()
      preferencesStore.SET_SINGLE_PREFERENCE({ type: 'language', value })
      await loadLocale(i18n, value)
      // Rebuild native menu with new locale
      if (isTauriAvailable()) {
        import('@tauri-apps/api/core').then(({ invoke }) => {
          invoke('rebuild_menu', { locale: value }).catch(e => {
            console.error('Failed to rebuild menu:', e)
          })
        })
      }
    },
    selectDefaultDirectoryToOpen() {
      const preferencesStore = usePreferencesStore()
      preferencesStore.SELECT_DEFAULT_DIRECTORY_TO_OPEN()
    }
  }
}
</script>

<style scoped>
.pref-general {
  & .startup-action-ctrl {
    font-size: 14px;
    user-select: none;
    color: var(--editorColor);
    & .radio-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    & .radio-label {
      display: block;
      margin: 10px 0;
      cursor: pointer;
    }
    & .radio-label input {
      margin-right: 8px;
      accent-color: var(--themeColor);
    }
    & .pref-btn {
      padding: 6px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      margin-left: 25px;
      background: transparent;
      border: 1px solid var(--floatBorderColor);
      color: var(--editorColor);
    }
  }
}
</style>
