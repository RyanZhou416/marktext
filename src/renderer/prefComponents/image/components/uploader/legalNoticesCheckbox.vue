<template>
  <div class="pref-cb-legal-notices">
    <label class="pref-checkbox-label">
      <input
        type="checkbox"
        class="pref-checkbox"
        :checked="uploaderService.agreedToLegalNotices"
        @change="onCheckChange"
      />
      <span>
        {{ $t('settings.image.legalAgree', { name: uploaderService.name }) }}
        <span class="link" @click.stop="openUrl(uploaderService.privacyUrl)">{{
          $t('settings.image.privacyStatement')
        }}</span>
        {{ $t('settings.image.and') }}
        <span class="link" @click.stop="openUrl(uploaderService.tosUrl)">{{
          $t('settings.image.termsOfService')
        }}</span
        >.
        <span v-if="!uploaderService.isGdprCompliant">{{ $t('settings.image.gdprWarning') }}</span>
      </span>
    </label>
  </div>
</template>

<script lang="ts">
import { shell } from '../../../../util/tauri'

export default {
  props: {
    uploaderService: Object
  },
  data() {
    return {}
  },
  methods: {
    onCheckChange(e: Event) {
      const target = e.target as HTMLInputElement
      this.uploaderService.agreedToLegalNotices = target.checked
    },
    openUrl(link) {
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
  & .pref-checkbox-label {
    display: inline-flex;
    align-items: flex-start;
    gap: 8px;
    cursor: pointer;
  }
  & .pref-checkbox {
    accent-color: var(--themeColor);
    margin-top: 2px;
    flex-shrink: 0;
  }
}
</style>
