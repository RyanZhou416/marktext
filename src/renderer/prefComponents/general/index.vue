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
          :notes="$t('common.requiresRestart')"
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
          <el-radio-group v-model="startUpAction">
            <!--
              Hide "lastState" for now (#2064).
            <el-radio class="ag-underdevelop" label="lastState">Restore last editor session</el-radio>
            -->
            <el-radio label="folder" style="margin-bottom: 10px;">{{ $t('settings.general.openDefaultDir') }}<span>: {{defaultDirectoryToOpen}}</span></el-radio>
            <el-button size="small" @click="selectDefaultDirectoryToOpen">{{ $t('settings.general.selectFolder') }}</el-button>
            <el-radio label="blank">{{ $t('settings.general.openBlankPage') }}</el-radio>
          </el-radio-group>
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

import {
  titleBarStyleOptions,
  zoomOptions,
  fileSortByOptions
} from './config'
import meta from '../../../locales/_meta.json'
import i18n from '@/i18n'
import { loadLocale } from '@/i18n/loader'
import { ElMessage } from 'element-plus'

export default {
  components: {
    Compound,
    Bool,
    Range,
    CurSelect,
    Separator
  },
  data () {
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
    titleBarStyleOpts () {
      return titleBarStyleOptions(this.$t)
    },
    fileSortByOpts () {
      return fileSortByOptions(this.$t)
    },
    languageOptions () {
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
    onSelectChange (type, value) {
      const preferencesStore = usePreferencesStore()
      preferencesStore.SET_SINGLE_PREFERENCE({ type, value })
    },
    async onLanguageChange (value) {
      const preferencesStore = usePreferencesStore()
      preferencesStore.SET_SINGLE_PREFERENCE({ type: 'language', value })
      await loadLocale(i18n, value)
      // Native menus require restart to update
      ElMessage.info({
        message: this.$t('common.requiresRestart'),
        duration: 5000
      })
    },
    selectDefaultDirectoryToOpen () {
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
      & .el-button--small {
        margin-left: 25px;
      }
      & label {
        display: block;
        margin: 20px 0;
      }
    }
  }
</style>
