<template>
  <div class="pref-keybindings">
    <h4>{{ $t('settings.keybindings.title') }}</h4>
    <section class="keybindings">
      <div class="text">
        {{ $t('settings.keybindings.description') }}
        <a class="link" @click="openKeybindingWiki">{{
          $t('settings.keybindings.descriptionLink')
        }}</a
        >.
      </div>
      <table class="pref-table">
        <thead>
          <tr>
            <th>{{ $t('settings.keybindings.colDescription') }}</th>
            <th>{{ $t('settings.keybindings.colKeyCombination') }}</th>
            <th>{{ $t('settings.keybindings.colOptions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(entry, index) in keybindingList" :key="entry.id">
            <td>{{ entry.description }}</td>
            <td>{{ entry.accelerator }}</td>
            <td>
              <button
                type="button"
                class="btn-icon"
                @click="handleEditClick(index, entry)"
                :title="$t('common.edit')"
              >
                <i class="el-icon-edit"></i>
              </button>
              <button
                type="button"
                class="btn-icon"
                @click="handleResetClick(index, entry)"
                :title="$t('common.reset')"
              >
                <i class="el-icon-refresh-right"></i>
              </button>
              <button
                type="button"
                class="btn-icon"
                @click="handleUnbindClick(index, entry)"
                :title="$t('common.unbind')"
              >
                <i class="el-icon-delete"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
    <section class="footer">
      <separator></separator>
      <button type="button" class="btn-default" @click="saveKeybindings">
        {{ $t('common.save') }}
      </button>
      <button type="button" class="btn-default" @click="restoreDefaults">
        {{ $t('settings.keybindings.restoreDefaults') }}
      </button>
    </section>
    <section v-if="showDebugTools" class="keyboard-debug">
      <separator></separator>
      <div>
        <strong>{{ $t('settings.keybindings.debugOptions') }}</strong>
      </div>
      <button type="button" class="btn-default" @click="dumpKeyboardInformation">
        {{ $t('settings.keybindings.dumpKeyboard') }}
      </button>
    </section>
    <key-input-dialog :showWithId="selectedShortcutId" :onCommit="onKeybinding"></key-input-dialog>
  </div>
</template>

<script lang="ts">
import { ipcRenderer, shell } from '../../util/tauri'
import log from '../../util/logger'
import Compound from '../common/compound'
import Separator from '../common/separator'
import KeyInputDialog from './key-input-dialog.vue'
import KeybindingConfigurator from './KeybindingConfigurator'
import notice from '@/services/notification'
// setKeyboardLayout was from @hfelix/electron-localshortcut (Electron-only)
// In Tauri, keyboard layout is handled by the OS/WebView natively
const setKeyboardLayout = () => {}

export default {
  components: {
    Compound,
    Separator,
    KeyInputDialog
  },
  data() {
    return {
      showDebugTools: false,
      keybindingConfigurator: null,
      selectedShortcutId: null,
      keybindingList: []
    }
  },

  mounted() {
    ipcRenderer
      .invoke('mt::keybinding-get-keyboard-info')
      .then(({ layout, keymap }) => {
        // Update the key mapper to prevent problems on non-US keyboards.
        setKeyboardLayout(layout, keymap)
      })
      .catch(error => log.error('Error while loading keyboard information for settings:', error))

    ipcRenderer
      .invoke('mt::keybinding-get-pref-keybindings')
      .then(({ defaultKeybindings, userKeybindings }) => {
        this.keybindingConfigurator = new KeybindingConfigurator(
          defaultKeybindings,
          userKeybindings
        )
        this.keybindingList = this.keybindingConfigurator.getKeybindings()
      })
      .catch(error => log.error('Error while loading keyboard information for settings:', error))

    // Show keyboard debugging tools which has been moved from CLI because we
    // need an active window on Windows.
    this.showDebugTools = window.marktext.env.debug
  },

  unmounted() {
    this.keybindingList = []
    this.keybindingConfigurator = null
  },

  methods: {
    openKeybindingWiki() {
      shell.openExternal('https://github.com/marktext/marktext/blob/master/docs/KEYBINDINGS.md')
    },
    saveKeybindings() {
      if (this.keybindingConfigurator && this.keybindingList.length > 0) {
        this.keybindingConfigurator
          .save()
          .then(success => {
            if (!success) {
              notice.notify({
                title: this.$t('settings.keybindings.failedSave'),
                type: 'error',
                message: this.$t('settings.keybindings.saveError')
              })
            }
          })
          .catch(error => log.error(error))
      }
    },
    restoreDefaults() {
      this.keybindingConfigurator
        .resetAll()
        .then(success => {
          if (!success) {
            notice.notify({
              title: this.$t('settings.keybindings.failedSave'),
              type: 'error',
              message: this.$t('settings.keybindings.saveError')
            })
          }
        })
        .catch(error => log.error(error))
    },
    handleEditClick(index, entry) {
      if (index >= 0 && entry) {
        this.selectedShortcutId = entry.id
      }
    },
    handleResetClick(index, entry) {
      const { keybindingConfigurator } = this
      const { id } = entry
      const success = keybindingConfigurator.resetToDefault(id)
      if (!success) {
        this.handleDuplicateShortcut(id, keybindingConfigurator.getDefaultAccelerator(id))
      }
    },
    handleUnbindClick(index, entry) {
      this.keybindingConfigurator.unbind(entry.id)
    },
    onKeybinding(value) {
      const selectedId = this.selectedShortcutId
      if (value && selectedId) {
        const success = this.keybindingConfigurator.change(selectedId, value)
        if (!success) {
          this.handleDuplicateShortcut(selectedId, value)
        }
      }
      this.selectedShortcutId = null
    },
    handleDuplicateShortcut(id, accelerator) {
      notice.notify({
        title: this.$t('settings.keybindings.shortcutInUse'),
        type: 'warning',
        message: this.$t('settings.keybindings.shortcutInUseMsg', { accelerator })
      })
    },
    dumpKeyboardInformation() {
      ipcRenderer.send('mt::keybinding-debug-dump-keyboard-info')
    }
  }
}
</script>

<style scoped>
.pref-keybindings {
  & .keyboard-debug,
  & .keybindings {
    font-size: 14px;
    margin: 20px 0;
    color: var(--editorColor);
    & .link {
      cursor: pointer;
    }
  }
  & .keybindings > div.text {
    margin-bottom: 10px;
  }
  & .link {
    color: var(--themeColor);
    cursor: pointer;
  }
  & .btn-default {
    padding: 6px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    background: transparent;
    border: 1px solid var(--floatBorderColor);
    color: var(--editorColor);
  }
}
.pref-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.pref-table th {
  background: var(--itemBgColor);
  color: var(--editorColor);
  font-weight: 600;
  padding: 8px 12px;
  text-align: left;
  border-bottom: 2px solid var(--floatBorderColor);
}
.pref-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--floatBorderColor);
  color: var(--editorColor);
}
.pref-table tbody tr:hover {
  background: var(--floatHoverColor);
}
.pref-table .btn-icon {
  padding: 2px;
  margin: 4px 0;
  color: var(--themeColor);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
}
.pref-table .btn-icon:not(:last-child) {
  margin-right: 4px;
}
.pref-table .btn-icon:hover,
.pref-table .btn-icon:active {
  opacity: 0.9;
  background: none;
}
</style>
