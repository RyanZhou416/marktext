<template>
  <section class="image-folder">
    <h5>{{ $t('settings.image.globalFolder') }}</h5>
    <text-box
      :description="$t('settings.image.globalImageFolder')"
      :input="imageFolderPath"
      :regexValidator="/^(?:$|([a-zA-Z]:)?[\/\\].*$)/"
      :defaultValue="folderPathPlaceholder"
      :onChange="(value) => modifyImageFolderPath(value)"
    ></text-box>
    <div>
      <el-button size="mini" @click="modifyImageFolderPath(undefined)"
        >{{ $t('settings.image.open') }}</el-button
      >
      <el-button size="mini" @click="openImageFolder">{{ $t('settings.image.showInFolder') }}</el-button>
    </div>
    <compound>
      <template #head>
        <bool
          :description="$t('settings.image.preferRelative')"
          more="https://github.com/marktext/marktext/blob/develop/docs/IMAGES.md"
          :bool="imagePreferRelativeDirectory"
          :onChange="
            (value) => onSelectChange('imagePreferRelativeDirectory', value)
          "
        ></bool>
      </template>
      <template #children>
        <text-box
          :description="$t('settings.image.relativeFolderName')"
          :input="imageRelativeDirectoryName"
          :regexValidator="/^(?:$|(?![a-zA-Z]:)[^\/\\].*$)/"
          :defaultValue="relativeDirectoryNamePlaceholder"
          :onChange="
            (value) => onSelectChange('imageRelativeDirectoryName', value)
          "
        ></text-box>
        <div class="footnote">
          {{ $t('settings.image.filenameNote') }}
        </div>
      </template>
    </compound>
  </section>
</template>

<script lang="ts">
import { mapState } from 'pinia'
import { usePreferencesStore } from '@/stores/preferences'
import { shell } from '../../../../util/tauri'
import Bool from '@/prefComponents/common/bool'
import Compound from '@/prefComponents/common/compound'
import TextBox from '@/prefComponents/common/textBox'

export default {
  components: {
    Bool,
    Compound,
    TextBox
  },
  data () {
    return {}
  },
  computed: {
    ...mapState(usePreferencesStore, [
      'imageFolderPath',
      'imagePreferRelativeDirectory',
      'imageRelativeDirectoryName'
    ]),
    imageInsertAction: {
      get: function () {
        return usePreferencesStore().imageInsertAction
      }
    },
    folderPathPlaceholder: {
      get: function () {
        return usePreferencesStore().imageFolderPath || ''
      }
    },
    relativeDirectoryNamePlaceholder: {
      get: function () {
        return (
          usePreferencesStore().imageRelativeDirectoryName || 'assets'
        )
      }
    }
  },
  methods: {
    openImageFolder () {
      shell.openPath(this.imageFolderPath)
    },
    modifyImageFolderPath (value) {
      const preferencesStore = usePreferencesStore()
      return preferencesStore.SET_IMAGE_FOLDER_PATH(value)
    },
    onSelectChange (type, value) {
      const preferencesStore = usePreferencesStore()
      preferencesStore.SET_SINGLE_PREFERENCE({ type, value })
    }
  }
}
</script>

<style scoped>
.image-folder .footnote {
  font-size: 13px;
  & code {
    font-size: 13px;
  }
}
</style>
