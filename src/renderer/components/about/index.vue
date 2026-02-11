<template>
  <div class="about-dialog">
    <AppDialog v-model:open="showAboutDialog" width="400px">
      <img class="logo" :src="logo" />
      <div class="about-content">
        <h3 class="title">{{ name }}</h3>
        <div class="text">{{ appVersion }}</div>
        <div class="text" style="min-height: auto">{{ copyright }}</div>
        <div class="text">{{ copyrightContributors }}</div>
      </div>
    </AppDialog>
  </div>
</template>

<script lang="ts">
import AppDialog from '@/components/common/AppDialog.vue'
import { mapState } from 'pinia'
import { useAppStore } from '@/stores/app'
import bus from '../../bus'
import MarkTextLogo from '../../assets/images/logo.png'

export default {
  components: { AppDialog },
  data() {
    this.name = 'MarkText'
    this.logo = MarkTextLogo
    return {
      showAboutDialog: false
    }
  },
  computed: {
    ...mapState(useAppStore, ['appVersion']),
    copyright() {
      return this.$t('about.copyright', { year: new Date().getFullYear() })
    },
    copyrightContributors() {
      return this.$t('about.contributorsCopyright', { year: new Date().getFullYear() })
    }
  },
  created() {
    bus.$on('aboutDialog', this.showDialog)
  },
  beforeUnmount() {
    bus.$off('aboutDialog', this.showDialog)
  },
  methods: {
    showDialog() {
      this.showAboutDialog = true
      bus.$emit('editor-blur')
    }
  }
}
</script>

<style>
.about-dialog .about-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.about-dialog img.logo {
  width: 80px;
  height: 80px;
  display: inherit;
  margin: 0 auto;
}

.about-dialog .title,
.about-dialog .text {
  min-height: 32px;
  text-align: center;
}

.about-dialog .title {
  color: var(--floatFontColor);
}

.about-dialog .text {
  color: var(--floatFontColor);
}
</style>
