<template>
  <div class="pref-editor">
    <h4>{{ $t('settings.editor.title') }}</h4>
    <compound>
      <template #head>
        <h6 class="title">{{ $t('settings.editor.textEditor') }}</h6>
      </template>
      <template #children>
        <range
          :description="$t('settings.editor.fontSize')"
          :value="fontSize"
          :min="12"
          :max="32"
          unit="px"
          :step="1"
          :onChange="value => onSelectChange('fontSize', value)"
        ></range>
        <range
          :description="$t('settings.editor.lineHeight')"
          :value="lineHeight"
          :min="1.2"
          :max="2.0"
          :step="0.1"
          :onChange="value => onSelectChange('lineHeight', value)"
        ></range>
        <font-text-box
          :description="$t('settings.editor.fontFamily')"
          :value="editorFontFamily"
          :onChange="value => onSelectChange('editorFontFamily', value)"
        ></font-text-box>
        <text-box
          :description="$t('settings.editor.maxWidth')"
          :notes="$t('settings.editor.maxWidthNotes')"
          :input="editorLineWidth"
          :regexValidator="/^(?:$|[0-9]+(?:ch|px|%)$)/"
          :onChange="value => onSelectChange('editorLineWidth', value)"
        ></text-box>
      </template>
    </compound>

    <compound>
      <template #head>
        <h6 class="title">{{ $t('settings.editor.codeBlock') }}</h6>
      </template>
      <template #children>
        <range
          :description="$t('settings.editor.fontSize')"
          :value="codeFontSize"
          :min="12"
          :max="28"
          unit="px"
          :step="1"
          :onChange="value => onSelectChange('codeFontSize', value)"
        ></range>
        <font-text-box
          :description="$t('settings.editor.fontFamily')"
          :onlyMonospace="true"
          :value="codeFontFamily"
          :onChange="value => onSelectChange('codeFontFamily', value)"
        ></font-text-box>
        <!-- FIXME: Disabled due to #1648. -->
        <bool
          v-show="false"
          :description="$t('settings.editor.showLineNumbers')"
          :bool="codeBlockLineNumbers"
          :onChange="value => onSelectChange('codeBlockLineNumbers', value)"
        ></bool>
        <bool
          :description="$t('settings.editor.removeEmptyLines')"
          :bool="trimUnnecessaryCodeBlockEmptyLines"
          :onChange="value => onSelectChange('trimUnnecessaryCodeBlockEmptyLines', value)"
        ></bool>
      </template>
    </compound>

    <compound>
      <template #head>
        <h6 class="title">{{ $t('settings.editor.writingBehavior') }}</h6>
      </template>
      <template #children>
        <bool
          :description="$t('settings.editor.autoCloseBrackets')"
          :bool="autoPairBracket"
          :onChange="value => onSelectChange('autoPairBracket', value)"
        ></bool>
        <bool
          :description="$t('settings.editor.autoCompleteMarkdown')"
          :bool="autoPairMarkdownSyntax"
          :onChange="value => onSelectChange('autoPairMarkdownSyntax', value)"
        ></bool>
        <bool
          :description="$t('settings.editor.autoCloseQuotes')"
          :bool="autoPairQuote"
          :onChange="value => onSelectChange('autoPairQuote', value)"
        ></bool>
      </template>
    </compound>

    <compound>
      <template #head>
        <h6 class="title">{{ $t('settings.editor.fileRepresentation') }}</h6>
      </template>
      <template #children>
        <cur-select
          :description="$t('settings.editor.tabWidth')"
          :value="tabSize"
          :options="tabSizeOptions"
          :onChange="value => onSelectChange('tabSize', value)"
        ></cur-select>
        <cur-select
          :description="$t('settings.editor.lineSeparator')"
          :value="endOfLine"
          :options="endOfLineOpts"
          :onChange="value => onSelectChange('endOfLine', value)"
        ></cur-select>
        <cur-select
          :description="$t('settings.editor.defaultEncoding')"
          :value="defaultEncoding"
          :options="defaultEncodingOptions"
          :onChange="value => onSelectChange('defaultEncoding', value)"
        ></cur-select>
        <bool
          :description="$t('settings.editor.autoDetectEncoding')"
          :bool="autoGuessEncoding"
          :onChange="value => onSelectChange('autoGuessEncoding', value)"
        ></bool>
        <cur-select
          :description="$t('settings.editor.trailingNewline')"
          :value="trimTrailingNewline"
          :options="trimTrailingNewlineOpts"
          :onChange="value => onSelectChange('trimTrailingNewline', value)"
        ></cur-select>
      </template>
    </compound>

    <compound>
      <template #head>
        <h6 class="title">{{ $t('settings.general.misc') }}</h6>
      </template>
      <template #children>
        <cur-select
          :description="$t('settings.editor.textDirection')"
          :value="textDirection"
          :options="textDirectionOpts"
          :onChange="value => onSelectChange('textDirection', value)"
        ></cur-select>
        <bool
          :description="$t('settings.editor.hideQuickInsert')"
          :bool="hideQuickInsertHint"
          :onChange="value => onSelectChange('hideQuickInsertHint', value)"
        ></bool>
        <bool
          :description="$t('settings.editor.hideLinkPopup')"
          :bool="hideLinkPopup"
          :onChange="value => onSelectChange('hideLinkPopup', value)"
        ></bool>
        <bool
          :description="$t('settings.editor.autoCheck')"
          :bool="autoCheck"
          :onChange="value => onSelectChange('autoCheck', value)"
        ></bool>
      </template>
    </compound>
  </div>
</template>

<script lang="ts">
import { mapState } from 'pinia'
import { usePreferencesStore } from '@/stores/preferences'
import Compound from '../common/compound'
import FontTextBox from '../common/fontTextBox'
import Range from '../common/range'
import CurSelect from '../common/select'
import Bool from '../common/bool'
import Separator from '../common/separator'
import TextBox from '../common/textBox'
import {
  tabSizeOptions,
  endOfLineOptions,
  textDirectionOptions,
  trimTrailingNewlineOptions,
  getDefaultEncodingOptions
} from './config'

export default {
  components: {
    Compound,
    FontTextBox,
    Range,
    CurSelect,
    Bool,
    Separator,
    TextBox
  },
  data () {
    this.tabSizeOptions = tabSizeOptions
    this.defaultEncodingOptions = getDefaultEncodingOptions()
    return {}
  },
  computed: {
    endOfLineOpts () {
      return endOfLineOptions(this.$t)
    },
    textDirectionOpts () {
      return textDirectionOptions(this.$t)
    },
    trimTrailingNewlineOpts () {
      return trimTrailingNewlineOptions(this.$t)
    },
    ...mapState(usePreferencesStore, [
      'fontSize',
      'editorFontFamily',
      'lineHeight',
      'autoPairBracket',
      'autoPairMarkdownSyntax',
      'autoPairQuote',
      'tabSize',
      'endOfLine',
      'textDirection',
      'codeFontSize',
      'codeFontFamily',
      'codeBlockLineNumbers',
      'trimUnnecessaryCodeBlockEmptyLines',
      'hideQuickInsertHint',
      'hideLinkPopup',
      'autoCheck',
      'editorLineWidth',
      'defaultEncoding',
      'autoGuessEncoding',
      'trimTrailingNewline'
    ])
  },
  methods: {
    onSelectChange (type, value) {
      const preferencesStore = usePreferencesStore()
      preferencesStore.SET_SINGLE_PREFERENCE({ type, value })
    }
  }
}
</script>

<style scoped>
  .pref-editor {
    & .image-ctrl {
      font-size: 14px;
      user-select: none;
      margin: 20px 0;
      color: var(--editorColor);
      & label {
        display: block;
        margin: 20px 0;
      }
    }
  }
</style>
