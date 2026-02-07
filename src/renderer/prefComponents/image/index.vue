<template>
  <div class="pref-image">
    <h4>Image</h4>
    <section class="image-ctrl">
      <div>Default action after an image is inserted from local folder or clipboard
        <el-tooltip class='item' effect='dark'
          content='Clipboard handling is only fully supported on macOS and Windows.'
          placement='top-start'>
          <i class="el-icon-info"></i>
        </el-tooltip>
      </div>
      <CurSelect :value="imageInsertAction" :options="imageActions"
        :onChange="value => onSelectChange('imageInsertAction', value)"></CurSelect>
    </section>
    <Separator />
    <FolderSetting v-if="imageInsertAction === 'folder' || imageInsertAction === 'path'" />
    <Uploader v-if="imageInsertAction === 'upload'" />
  </div>
</template>

<script lang="ts">
import Separator from '../common/separator'
import Uploader from './components/uploader'
import CurSelect from '@/prefComponents/common/select'
import FolderSetting from './components/folderSetting'
import { imageActions } from './config'
import { usePreferencesStore } from '@/stores/preferences'

export default {
  components: {
    Separator,
    CurSelect,
    FolderSetting,
    Uploader
  },
  data () {
    this.imageActions = imageActions

    return {}
  },
  computed: {
    imageInsertAction: {
      get: function () {
        return usePreferencesStore().imageInsertAction
      }
    }
  },
  methods: {
    onSelectChange (type, value) {
      const preferencesStore = usePreferencesStore()
      preferencesStore.SET_SINGLE_PREFERENCE({ type, value })
    }
  }
}
</script>

<style>
.pref-image {
  & .image-ctrl {
    font-size: 14px;
    margin: 20px 0;
    color: var(--editorColor);
    & label {
      display: block;
      margin: 20px 0;
    }
  }
}
</style>
