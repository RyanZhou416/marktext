<template>
  <div class="pref-cb-legal-notices">
    <el-checkbox v-model="uploaderService.agreedToLegalNotices"></el-checkbox>
    <span>
      {{ $t('settings.image.legalAgree', { name: uploaderService.name }) }}
      <span class="link" @click="openUrl(uploaderService.privacyUrl)"
        >{{ $t('settings.image.privacyStatement') }}</span
      >
      {{ $t('settings.image.and') }}
      <span class="link" @click="openUrl(uploaderService.tosUrl)"
        >{{ $t('settings.image.termsOfService') }}</span
      >.
      <span v-if="!uploaderService.isGdprCompliant"
        >{{ $t('settings.image.gdprWarning') }}</span
      >
    </span>
  </div>
</template>

<script lang="ts">
import { shell } from '../../../../util/tauri'

export default {
  data () {
    return {}
  },
  props: {
    uploaderService: Object
  },
  methods: {
    openUrl (link) {
      if (link) {
        shell.openExternal(link)
      }
    }
  }
}
</script>

<style>
.pref-cb-legal-notices {
  border: 1px solid transparent;
  padding: 3px 5px;
  & .el-checkbox {
    margin-right: 0;
  }
}
</style>
