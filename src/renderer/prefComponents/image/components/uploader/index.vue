<template>
  <div class="pref-image-uploader">
    <h5>{{ $t('settings.image.uploader') }}</h5>
    <section class="current-uploader">
      <div v-if="isValidUploaderService(currentUploader)">
        {{ $t('settings.image.currentUploader', { name: getServiceNameById(currentUploader) }) }}
      </div>
      <span v-else>{{ $t('settings.image.noUploader') }}</span>
    </section>
    <section class="configration">
      <cur-select
        :value="currentUploader"
        :options="uploaderOptions"
        :onChange="value => setCurrentUploader(value)"
      ></cur-select>
      <div class="picgo" v-if="currentUploader === 'picgo'">
        <div v-if="!picgoExists" class="warning">
          {{ $t('settings.image.noPicgo') }}
          <span class="link" @click="open('https://github.com/PicGo/PicGo-Core')">picgo</span>
        </div>
      </div>
      <div class="github" v-if="currentUploader === 'github'">
        <div class="warning">
          {{ $t('settings.image.githubDeprecation') }}
        </div>
        <div class="form-group">
          <div class="label">
            {{ $t('settings.image.githubToken') }}
            <AppTooltip class="item" :content="$t('settings.image.tokenStorageNote')" side="top">
              <i class="el-icon-info"></i>
            </AppTooltip>
          </div>
          <input
            v-model="githubToken"
            type="text"
            class="pref-input"
            :placeholder="$t('settings.image.inputToken')"
          />
        </div>
        <div class="form-group">
          <div class="label">{{ $t('settings.image.ownerName') }}</div>
          <input
            v-model="github.owner"
            type="text"
            class="pref-input"
            :placeholder="$t('settings.image.owner')"
          />
        </div>
        <div class="form-group">
          <div class="label">{{ $t('settings.image.repoName') }}</div>
          <input
            v-model="github.repo"
            type="text"
            class="pref-input"
            :placeholder="$t('settings.image.repo')"
          />
        </div>
        <div class="form-group">
          <div class="label">{{ $t('settings.image.branchName') }}</div>
          <input
            v-model="github.branch"
            type="text"
            class="pref-input"
            :placeholder="$t('settings.image.branch')"
          />
        </div>
        <legal-notices-checkbox
          class="github"
          :class="[{ error: legalNoticesErrorStates.github }]"
          :uploaderService="uploadServices.github"
        ></legal-notices-checkbox>
        <div class="form-group">
          <button
            type="button"
            class="pref-btn pref-btn-primary"
            :disabled="githubDisable"
            @click="save('github')"
          >
            {{ $t('settings.image.saveConfig') }}
          </button>
        </div>
      </div>
      <div class="script" v-else-if="currentUploader === 'cliScript'">
        <div class="description">
          {{ $t('settings.image.scriptNote') }}
        </div>
        <div class="form-group">
          <div class="label">{{ $t('settings.image.shellScriptLocation') }}</div>
          <input
            v-model="cliScript"
            type="text"
            class="pref-input"
            :placeholder="$t('settings.image.scriptPath')"
          />
        </div>
        <div class="form-group">
          <button
            type="button"
            class="pref-btn pref-btn-primary"
            :disabled="cliScriptDisable"
            @click="save('cliScript')"
          >
            {{ $t('settings.image.saveConfig') }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { shell } from '../../../../util/tauri'
import services, { isValidService } from './services.js'
import legalNoticesCheckbox from './legalNoticesCheckbox'
import { isFileExecutableSync } from '@/util/fileSystem'
import CurSelect from '@/prefComponents/common/select'
import AppTooltip from '@/components/common/AppTooltip.vue'
import notice from '@/services/notification'
import { usePreferencesStore } from '@/stores/preferences'
// commandExists was a Node.js module - in Tauri we use Rust backend
const commandExists = { sync: () => false }

export default {
  components: {
    legalNoticesCheckbox,
    CurSelect,
    AppTooltip
  },
  data() {
    this.uploaderOptions = Object.keys(services).map(name => {
      const { name: label } = services[name]
      return {
        label,
        value: name
      }
    })
    return {
      githubToken: '',
      github: {
        owner: '',
        repo: '',
        branch: ''
      },
      cliScript: '',
      picgoExists: true,
      uploadServices: services,
      legalNoticesErrorStates: {
        github: false
      }
    }
  },
  computed: {
    currentUploader: {
      get: function () {
        return usePreferencesStore().currentUploader
      }
    },
    imageBed: {
      get: function () {
        return usePreferencesStore().imageBed
      }
    },
    prefGithubToken: {
      get: function () {
        return usePreferencesStore().githubToken
      }
    },
    prefCliScript: {
      get: function () {
        return usePreferencesStore().cliScript
      }
    },
    githubDisable() {
      return !this.githubToken || !this.github.owner || !this.github.repo
    },
    cliScriptDisable() {
      if (!this.cliScript) {
        return true
      }
      return !isFileExecutableSync(this.cliScript)
    }
  },
  watch: {
    imageBed: function (value, oldValue) {
      if (value !== oldValue) {
        this.github = value.github
      }
    }
  },
  created() {
    this.$nextTick(() => {
      this.github = this.imageBed.github
      this.githubToken = this.prefGithubToken
      this.cliScript = this.prefCliScript
      this.testPicgo()

      if (services.hasOwnProperty(this.currentUploader)) {
        services[this.currentUploader].agreedToLegalNotices = true
      }
    })
  },
  methods: {
    isValidUploaderService(name) {
      return isValidService(name)
    },

    getServiceNameById(id) {
      const service = services[id]
      return service ? service.name : id
    },

    open(link) {
      shell.openExternal(link)
    },

    save(type) {
      if (!this.validate(type)) {
        return
      }
      const preferencesStore = usePreferencesStore()
      const newImageBedConfig = Object.assign({}, this.imageBed, {
        [type]: this[type]
      })
      preferencesStore.SET_USER_DATA({
        type: 'imageBed',
        value: newImageBedConfig
      })
      if (type === 'github') {
        preferencesStore.SET_USER_DATA({
          type: 'githubToken',
          value: this.githubToken
        })
      }
      if (type === 'cliScript') {
        preferencesStore.SET_USER_DATA({
          type: 'cliScript',
          value: this.cliScript
        })
      }
      notice.notify({
        title: this.$t('settings.image.saveConfig'),
        message:
          type === 'github'
            ? this.$t('settings.image.configSaved')
            : this.$t('settings.image.scriptConfigSaved'),
        type: 'primary'
      })
    },

    setCurrentUploader(value) {
      const type = 'currentUploader'
      const preferencesStore = usePreferencesStore()
      preferencesStore.SET_USER_DATA({ type, value })
    },

    testPicgo() {
      this.picgoExists = commandExists.sync('picgo')
    },

    validate(value) {
      const service = services[value]
      const { agreedToLegalNotices } = service
      if (!agreedToLegalNotices) {
        this.legalNoticesErrorStates[value] = true
        return false
      }
      if (this.legalNoticesErrorStates[value] !== undefined) {
        this.legalNoticesErrorStates[value] = false
      }

      return true
    }
  }
}
</script>

<style>
.pref-image-uploader {
  color: var(--editorColor);
  font-size: 14px;

  & .current-uploader {
    margin: 20px 0;
  }
  & .warning {
    color: var(--deleteColor);
  }
  & .link {
    color: var(--themeColor);
    cursor: pointer;
  }
  & .description {
    margin-top: 20px;
    margin-bottom: 20px;
  }
  & .form-group {
    margin: 20px 0 0 0;
  }
  & .label {
    margin-bottom: 10px;
  }
  & .pref-input {
    height: 30px;
    border: 1px solid var(--floatBorderColor);
    background: var(--inputBgColor);
    color: var(--editorColor);
    border-radius: 4px;
    padding: 0 8px;
    outline: none;
    font-size: 13px;
    width: 100%;
    box-sizing: border-box;
  }
  & .pref-btn {
    padding: 6px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
  }
  & .pref-btn-primary {
    background: var(--themeColor);
    color: #fff;
    border: none;
  }
  & .pref-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  & .button-group {
    margin-top: 30px;
  }
  & .pref-cb-legal-notices {
    &.github {
      margin-top: 30px;
    }
    &.error {
      border: 1px solid var(--deleteColor);
    }
  }
}
</style>
