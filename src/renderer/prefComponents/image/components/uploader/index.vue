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
        :onChange="(value) => setCurrentUploader(value)"
      ></cur-select>
      <div class="picgo" v-if="currentUploader === 'picgo'">
        <div v-if="!picgoExists" class="warning">
          {{ $t('settings.image.noPicgo') }}
          <span
            class="link"
            @click="open('https://github.com/PicGo/PicGo-Core')"
            >picgo</span
          >
        </div>
      </div>
      <div class="github" v-if="currentUploader === 'github'">
        <div class="warning">
          {{ $t('settings.image.githubDeprecation') }}
        </div>
        <div class="form-group">
          <div class="label">
            {{ $t('settings.image.githubToken') }}
            <el-tooltip
              class="item"
              effect="dark"
              :content="$t('settings.image.tokenStorageNote')"
              placement="top-start"
            >
              <i class="el-icon-info"></i>
            </el-tooltip>
          </div>
          <el-input
            v-model="githubToken"
            :placeholder="$t('settings.image.inputToken')"
            size="mini"
          ></el-input>
        </div>
        <div class="form-group">
          <div class="label">{{ $t('settings.image.ownerName') }}</div>
          <el-input
            v-model="github.owner"
            :placeholder="$t('settings.image.owner')"
            size="mini"
          ></el-input>
        </div>
        <div class="form-group">
          <div class="label">{{ $t('settings.image.repoName') }}</div>
          <el-input
            v-model="github.repo"
            :placeholder="$t('settings.image.repo')"
            size="mini"
          ></el-input>
        </div>
        <div class="form-group">
          <div class="label">{{ $t('settings.image.branchName') }}</div>
          <el-input
            v-model="github.branch"
            :placeholder="$t('settings.image.branch')"
            size="mini"
          ></el-input>
        </div>
        <legal-notices-checkbox
          class="github"
          :class="[{ error: legalNoticesErrorStates.github }]"
          :uploaderService="uploadServices.github"
        ></legal-notices-checkbox>
        <div class="form-group">
          <el-button
            size="mini"
            :disabled="githubDisable"
            @click="save('github')"
            >{{ $t('settings.image.saveConfig') }}
          </el-button>
        </div>
      </div>
      <div class="script" v-else-if="currentUploader === 'cliScript'">
        <div class="description">
          {{ $t('settings.image.scriptNote') }}
        </div>
        <div class="form-group">
          <div class="label">{{ $t('settings.image.shellScriptLocation') }}</div>
          <el-input
            v-model="cliScript"
            :placeholder="$t('settings.image.scriptPath')"
            size="mini"
          ></el-input>
        </div>
        <div class="form-group">
          <el-button
            size="mini"
            :disabled="cliScriptDisable"
            @click="save('cliScript')"
            >{{ $t('settings.image.saveConfig') }}
          </el-button>
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
// commandExists was a Node.js module - in Tauri we use Rust backend
const commandExists = { sync: () => false }
import notice from '@/services/notification'
import { usePreferencesStore } from '@/stores/preferences'

export default {
  components: {
    legalNoticesCheckbox,
    CurSelect
  },
  data () {
    this.uploaderOptions = Object.keys(services).map((name) => {
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
    githubDisable () {
      return !this.githubToken || !this.github.owner || !this.github.repo
    },
    cliScriptDisable () {
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
  created () {
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
    isValidUploaderService (name) {
      return isValidService(name)
    },

    getServiceNameById (id) {
      const service = services[id]
      return service ? service.name : id
    },

    open (link) {
      shell.openExternal(link)
    },

    save (type) {
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

    setCurrentUploader (value) {
      const type = 'currentUploader'
      const preferencesStore = usePreferencesStore()
      preferencesStore.SET_USER_DATA({ type, value })
    },

    testPicgo () {
      this.picgoExists = commandExists.sync('picgo')
    },

    validate (value) {
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
  & .el-input__inner {
    background: var(--inputBgColor);
  }
  & .el-input__wrapper {
    background-color: var(--inputBgColor);
  }
  & .el-button.btn-reset,
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
