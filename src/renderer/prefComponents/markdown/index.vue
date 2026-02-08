<template>
  <div class="pref-markdown">
    <h4>{{ $t('settings.markdown.title') }}</h4>
    <compound>
      <template #head>
        <h6 class="title">{{ $t('settings.markdown.lists') }}</h6>
      </template>
      <template #children>
        <bool
          :description="$t('settings.markdown.preferLooseList')"
          :bool="preferLooseListItem"
          :onChange="value => onSelectChange('preferLooseListItem', value)"
          more="https://spec.commonmark.org/0.29/#loose"
        ></bool>
        <cur-select
          :description="$t('settings.markdown.bulletListMarker')"
          :value="bulletListMarker"
          :options="bulletListMarkerOptions"
          :onChange="value => onSelectChange('bulletListMarker', value)"
          more="https://spec.commonmark.org/0.29/#bullet-list-marker"
        ></cur-select>
        <cur-select
          :description="$t('settings.markdown.orderedListMarker')"
          :value="orderListDelimiter"
          :options="orderListDelimiterOptions"
          :onChange="value => onSelectChange('orderListDelimiter', value)"
          more="https://spec.commonmark.org/0.29/#ordered-list"
        ></cur-select>
        <cur-select
          :description="$t('settings.markdown.listIndentation')"
          :value="listIndentation"
          :options="listIndentationOpts"
          :onChange="value => onSelectChange('listIndentation', value)"
        ></cur-select>
      </template>
    </compound>

    <compound>
      <template #head>
        <h6 class="title">{{ $t('settings.markdown.extensions') }}</h6>
      </template>
      <template #children>
        <cur-select
          :description="$t('settings.markdown.frontMatterFormat')"
          :value="frontmatterType"
          :options="frontmatterTypeOptions"
          :onChange="value => onSelectChange('frontmatterType', value)"
        ></cur-select>
        <bool
          :description="$t('settings.markdown.superSubScript')"
          :bool="superSubScript"
          :onChange="value => onSelectChange('superSubScript', value)"
          more="https://pandoc.org/MANUAL.html#superscripts-and-subscripts"
        ></bool>
        <bool
          :description="$t('settings.markdown.footnote')"
          :notes="$t('common.requiresRestart')"
          :bool="footnote"
          :onChange="value => onSelectChange('footnote', value)"
          more="https://pandoc.org/MANUAL.html#footnotes"
        ></bool>
      </template>
    </compound>

    <compound>
      <template #head>
        <h6 class="title">{{ $t('settings.markdown.compatibility') }}</h6>
      </template>
      <template #children>
        <bool
          :description="$t('settings.markdown.htmlRendering')"
          :bool="isHtmlEnabled"
          :onChange="value => onSelectChange('isHtmlEnabled', value)"
        ></bool>
        <bool
          :description="$t('settings.markdown.gitlabMode')"
          :bool="isGitlabCompatibilityEnabled"
          :onChange="value => onSelectChange('isGitlabCompatibilityEnabled', value)"
        ></bool>
      </template>
    </compound>

    <compound>
      <template #head>
        <h6 class="title">{{ $t('settings.markdown.diagrams') }}</h6>
      </template>
      <template #children>
        <cur-select
          :description="$t('settings.markdown.sequenceTheme')"
          :value="sequenceTheme"
          :options="sequenceThemeOpts"
          :onChange="value => onSelectChange('sequenceTheme', value)"
          more="https://bramp.github.io/js-sequence-diagrams/"
        ></cur-select>
      </template>
    </compound>

    <compound>
      <template #head>
        <h6 class="title">{{ $t('settings.general.misc') }}</h6>
      </template>
      <template #children>
        <cur-select
          :description="$t('settings.markdown.headingStyle')"
          :value="preferHeadingStyle"
          :options="preferHeadingStyleOpts"
          :onChange="value => onSelectChange('preferHeadingStyle', value)"
          :disable="true"
        ></cur-select>
      </template>
    </compound>
  </div>
</template>

<script lang="ts">
import Compound from '../common/compound'
import Separator from '../common/separator'
import { mapState } from 'pinia'
import { usePreferencesStore } from '@/stores/preferences'
import Bool from '../common/bool'
import CurSelect from '../common/select'
import {
  bulletListMarkerOptions,
  orderListDelimiterOptions,
  preferHeadingStyleOptions,
  listIndentationOptions,
  frontmatterTypeOptions,
  sequenceThemeOptions
} from './config'

export default {
  components: {
    Compound,
    Separator,
    Bool,
    CurSelect
  },
  data () {
    this.bulletListMarkerOptions = bulletListMarkerOptions
    this.orderListDelimiterOptions = orderListDelimiterOptions
    this.frontmatterTypeOptions = frontmatterTypeOptions
    return {}
  },
  computed: {
    listIndentationOpts () {
      return listIndentationOptions(this.$t)
    },
    preferHeadingStyleOpts () {
      return preferHeadingStyleOptions(this.$t)
    },
    sequenceThemeOpts () {
      return sequenceThemeOptions(this.$t)
    },
    ...mapState(usePreferencesStore, [
      'preferLooseListItem',
      'bulletListMarker',
      'orderListDelimiter',
      'preferHeadingStyle',
      'listIndentation',
      'frontmatterType',
      'superSubScript',
      'footnote',
      'isHtmlEnabled',
      'isGitlabCompatibilityEnabled',
      'sequenceTheme'
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
  .pref-markdown {
  }
</style>
