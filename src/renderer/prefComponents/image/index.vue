<template>
  <div class="pref-image">
    <h4>{{ $t('settings.image.title') }}</h4>
    <section class="image-ctrl">
      <div>
        {{ $t('settings.image.defaultAction') }}
        <AppTooltip class="item" :content="$t('settings.image.clipboardNote')" side="top">
          <i class="el-icon-info"></i>
        </AppTooltip>
      </div>
      <CurSelect
        :value="imageInsertAction"
        :options="imageActionOpts"
        :on-change="value => onSelectChange('imageInsertAction', value)"
      ></CurSelect>
    </section>
    <Separator />
    <FolderSetting v-if="imageInsertAction === 'folder' || imageInsertAction === 'path'" />
    <Uploader v-if="imageInsertAction === 'upload'" />
    <Separator />
    <section class="image-asset-extra">
      <label class="field">
        <span>{{ $t('settings.image.localAssetFolder') }}</span>
        <input
          :value="localAssetDefaultFolder"
          type="text"
          @change="
            event => onSelectChange('localAssetDefaultFolder', event.target.value || 'images')
          "
        />
      </label>
      <button
        type="button"
        class="pref-btn pref-btn-default"
        @click="enableLocalAssetsForCurrentFile"
      >
        {{ $t('settings.image.enableLocalAssetForCurrentFile') }}
      </button>
      <button type="button" class="pref-btn pref-btn-default" @click="migrateAssetFolder">
        {{ $t('settings.image.migrateAssetFolder') }}
      </button>
    </section>
    <Separator />
    <section class="image-asset-extra">
      <label class="field">
        <span>{{ $t('settings.image.borderRadius') }}</span>
        <input
          :value="imageBorderRadius"
          type="number"
          min="0"
          max="64"
          @change="event => onSelectChange('imageBorderRadius', Number(event.target.value || 8))"
        />
      </label>
    </section>
  </div>
</template>

<script lang="ts">
import Separator from '../common/separator'
import Uploader from './components/uploader'
import CurSelect from '@/prefComponents/common/select'
import FolderSetting from './components/folderSetting'
import AppTooltip from '@/components/common/AppTooltip.vue'
import { imageActions } from './config'
import { usePreferencesStore } from '@/stores/preferences'
import bus from '@/bus'

export default {
  components: {
    Separator,
    CurSelect,
    FolderSetting,
    Uploader,
    AppTooltip
  },
  data() {
    return {}
  },
  computed: {
    imageInsertAction: {
      get: function () {
        return usePreferencesStore().imageInsertAction
      }
    },
    localAssetDefaultFolder: {
      get: function () {
        return usePreferencesStore().localAssetDefaultFolder
      }
    },
    imageBorderRadius: {
      get: function () {
        return usePreferencesStore().imageBorderRadius
      }
    },
    imageActionOpts() {
      return imageActions(this.$t)
    }
  },
  methods: {
    onSelectChange(type, value) {
      const preferencesStore = usePreferencesStore()
      preferencesStore.SET_SINGLE_PREFERENCE({ type, value })
    },
    enableLocalAssetsForCurrentFile() {
      bus.$emit('enable-local-assets-for-current-file', this.localAssetDefaultFolder || 'images')
    },
    migrateAssetFolder() {
      bus.$emit('migrate-asset-folder-request')
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
  & .image-asset-extra {
    margin: 16px 0;
  }
  & .field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    gap: 10px;
  }
  & input {
    width: 180px;
    border: 1px solid var(--floatBorderColor);
    border-radius: 4px;
    padding: 6px 8px;
    background: var(--inputBgColor);
    color: var(--editorColor);
  }
  & .pref-btn {
    margin-right: 8px;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
  }
  & .pref-btn-default {
    background: transparent;
    border: 1px solid var(--floatBorderColor);
    color: var(--editorColor);
  }
}
</style>
