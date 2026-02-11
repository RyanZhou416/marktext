<template>
  <div class="pref-spellchecker">
    <h4>{{ $t('settings.spelling.title') }}</h4>
    <compound>
      <template #head>
        <bool
          :description="$t('settings.spelling.enable')"
          :bool="spellcheckerEnabled"
          :onChange="handleSpellcheckerEnabled"
        ></bool>
      </template>
      <template #children>
        <bool
          :description="$t('settings.spelling.hideMarks')"
          :bool="spellcheckerNoUnderline"
          :disable="!spellcheckerEnabled"
          :onChange="value => onSelectChange('spellcheckerNoUnderline', value)"
        ></bool>
        <bool
          v-show="isOsx"
          :description="$t('settings.spelling.autoDetect')"
          :bool="true"
          :disable="true"
        ></bool>
        <cur-select
          v-show="!isOsx"
          :description="$t('settings.spelling.defaultLanguage')"
          :value="spellcheckerLanguage"
          :options="availableDictionaries"
          :disable="!spellcheckerEnabled"
          :onChange="handleSpellcheckerLanguage"
        ></cur-select>
      </template>
    </compound>

    <div v-if="isOsx && spellcheckerEnabled" class="description">
      {{ $t('settings.spelling.autoDetectNote') }}
    </div>

    <div v-if="!isOsx && spellcheckerEnabled">
      <h6 class="title">{{ $t('settings.spelling.customDictionary') }}</h6>
      <div class="description">{{ $t('settings.spelling.editWords') }}</div>
      <table class="pref-table">
        <thead>
          <tr>
            <th>{{ $t('settings.spelling.word') }}</th>
            <th>{{ $t('settings.spelling.options') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in wordsInCustomDictionary" :key="item.word + '-' + index">
            <td>{{ item.word }}</td>
            <td>
              <button
                type="button"
                class="btn-icon"
                @click="handleDeleteClick(item)"
                :title="$t('common.delete')"
              >
                <i class="el-icon-delete"></i>
              </button>
            </td>
          </tr>
          <tr v-if="!wordsInCustomDictionary.length">
            <td colspan="2" class="empty">{{ $t('settings.spelling.noWords') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts">
import { ipcRenderer } from '../../util/tauri'
import log from '../../util/logger'
import { mapState } from 'pinia'
import { usePreferencesStore } from '@/stores/preferences'
import Compound from '../common/compound'
import CurSelect from '../common/select'
import Bool from '../common/bool'
import Separator from '../common/separator'
import { isOsx } from '@/util'
import { SpellChecker } from '@/spellchecker'
import { getLanguageName } from '@/spellchecker/languageMap'
import notice from '@/services/notification'

export default {
  components: {
    Bool,
    Compound,
    CurSelect,
    Separator
  },
  data() {
    this.isOsx = isOsx
    return {
      availableDictionaries: [],
      wordsInCustomDictionary: [],
      errorMessage: ''
    }
  },
  computed: {
    ...mapState(usePreferencesStore, [
      'spellcheckerEnabled',
      'spellcheckerNoUnderline',
      'spellcheckerLanguage'
    ])
  },
  mounted() {
    if (!isOsx) {
      this.getAvailableDictionaries().then(dicts => {
        this.availableDictionaries = dicts
      })

      ipcRenderer.invoke('mt::spellchecker-get-custom-dictionary-words').then(words => {
        this.wordsInCustomDictionary = words.map(word => {
          return { word }
        })
      })
    }
  },
  methods: {
    async getAvailableDictionaries() {
      const dictionaries = await SpellChecker.getAvailableDictionaries()
      return dictionaries.map(selectedItem => {
        return {
          value: selectedItem,
          label: getLanguageName(selectedItem)
        }
      })
    },
    async ensureDictLanguage(lang) {
      if (!this.spellchecker) {
        this.spellchecker = new SpellChecker(true, 'en-US')
      }
      await this.spellchecker.switchLanguage(lang)
    },

    handleSpellcheckerLanguage(languageCode) {
      this.ensureDictLanguage(languageCode)
        .then(() => {
          this.onSelectChange('spellcheckerLanguage', languageCode)
        })
        .catch(error => {
          log.error(error)
          notice.notify({
            title: this.$t('settings.spelling.failedSwitch'),
            type: 'error',
            message: error.message
          })
        })
    },
    handleSpellcheckerEnabled(isEnabled) {
      this.onSelectChange('spellcheckerEnabled', isEnabled)
    },
    onSelectChange(type, value) {
      const preferencesStore = usePreferencesStore()
      preferencesStore.SET_SINGLE_PREFERENCE({ type, value })
    },
    handleDeleteClick(selectedItem) {
      if (selectedItem && typeof selectedItem.word === 'string') {
        ipcRenderer
          .invoke('mt::spellchecker-remove-word', selectedItem.word)
          .then(success => {
            if (success) {
              this.wordsInCustomDictionary = this.wordsInCustomDictionary.filter(
                item => item.word !== selectedItem.word
              )
            } else {
              notice.notify({
                title: this.$t('settings.spelling.failedRemove'),
                type: 'error',
                message: this.$t('settings.spelling.unexpectedError')
              })
            }
          })
          .catch(error => log.error(error))
      }
    }
  }
}
</script>

<style scoped>
.pref-spellchecker {
  & div.description {
    margin-top: 10px;
    margin-bottom: 2px;
    color: var(--iconColor);
    font-size: 14px;
  }
  & h6.title {
    font-weight: 400;
    font-size: 1.1em;
    margin-bottom: 0;
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
.pref-table td.empty {
  text-align: center;
  color: var(--iconColor);
}
.pref-table .btn-icon {
  padding: 1px 2px;
  margin: 5px 10px;
  color: var(--themeColor);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
}
.pref-table .btn-icon:hover,
.pref-table .btn-icon:active {
  opacity: 0.9;
  background: none;
  border: none;
}
</style>
