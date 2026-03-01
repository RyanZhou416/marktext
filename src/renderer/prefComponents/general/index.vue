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
          :on-change="value => onSelectChange('autoSave', value)"
        ></bool>
        <range
          :description="$t('settings.general.autoSaveDelay')"
          :value="autoSaveDelay"
          :min="1000"
          :max="10000"
          unit="ms"
          :step="100"
          :on-change="value => onSelectChange('autoSaveDelay', value)"
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
          :on-change="value => onSelectChange('titleBarStyle', value)"
        ></cur-select>
        <bool
          :description="$t('settings.general.hideScrollbar')"
          :bool="hideScrollbar"
          :on-change="value => onSelectChange('hideScrollbar', value)"
        ></bool>
        <bool
          :description="$t('settings.general.openFilesInNewWindow')"
          :bool="openFilesInNewWindow"
          :on-change="value => onSelectChange('openFilesInNewWindow', value)"
        ></bool>
        <bool
          :description="$t('settings.general.openFoldersInNewWindow')"
          :bool="openFolderInNewWindow"
          :on-change="value => onSelectChange('openFolderInNewWindow', value)"
        ></bool>
        <cur-select
          :description="$t('settings.general.zoom')"
          :value="zoom"
          :options="zoomOptions"
          :on-change="value => onSelectChange('zoom', value)"
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
          :on-change="value => onSelectChange('wordWrapInToc', value)"
        ></bool>

        <!-- TODO: The description is very bad and the entry isn't used by the editor. -->
        <cur-select
          :description="$t('settings.general.fileSortBy')"
          :value="fileSortBy"
          :options="fileSortByOpts"
          :on-change="value => onSelectChange('fileSortBy', value)"
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
              <input v-model="startUpAction" type="radio" value="blank" />
              {{ $t('settings.general.startupNone') }}
            </label>
            <label class="radio-label">
              <input v-model="startUpAction" type="radio" value="newDocument" />
              {{ $t('settings.general.startupNewDocument') }}
            </label>
            <label class="radio-label">
              <input v-model="startUpAction" type="radio" value="lastClosedDocument" />
              {{ $t('settings.general.startupLastDocument') }}
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
          :on-change="value => onLanguageChange(value)"
        ></cur-select>
        <cur-select
          :description="$t('settings.general.editorEngine')"
          :value="editorEngine"
          :options="editorEngineOpts"
          :on-change="value => onSelectChange('editorEngine', value)"
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

import { titleBarStyleOptions, zoomOptions, fileSortByOptions, editorEngineOptions } from './config'
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
      'openFilesInNewWindow',
      'openFolderInNewWindow',
      'zoom',
      'hideScrollbar',
      'wordWrapInToc',
      'fileSortBy',
      'language',
      'editorEngine'
    ]),
    titleBarStyleOpts() {
      return titleBarStyleOptions(this.$t)
    },
    fileSortByOpts() {
      return fileSortByOptions(this.$t)
    },
    editorEngineOpts() {
      return editorEngineOptions(this.$t)
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
      if (isTauriAvailable()) {
        import('@tauri-apps/api/core').then(({ invoke }) => {
          invoke('rebuild_menu', { locale: value }).catch(e => {
            console.error('Failed to rebuild menu:', e)
          })
        })
      }
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
