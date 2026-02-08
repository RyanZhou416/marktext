<template>
  <div class="pref-image">
    <h4>{{ $t('settings.image.title') }}</h4>
    <section class="image-ctrl">
      <div>{{ $t('settings.image.defaultAction') }}
        <el-tooltip class='item' effect='dark'
          :content="$t('settings.image.clipboardNote')"
          placement='top-start'>
          <i class="el-icon-info"></i>
        </el-tooltip>
      </div>
      <CurSelect :value="imageInsertAction" :options="imageActionOpts"
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
    return {}
  },
  computed: {
    imageInsertAction: {
      get: function () {
        return usePreferencesStore().imageInsertAction
      }
    },
    imageActionOpts () {
      return imageActions(this.$t)
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
