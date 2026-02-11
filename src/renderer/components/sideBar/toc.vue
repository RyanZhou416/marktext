<template>
  <div
    class="side-bar-toc"
    :class="[{ 'side-bar-toc-overflow': !wordWrapInToc, 'side-bar-toc-wordwrap': wordWrapInToc }]"
  >
    <div class="title">Table Of Contents</div>
    <div v-if="toc.length" class="toc-tree">
      <TocNode
        v-for="(node, index) in toc"
        :key="index"
        :node="node"
        :depth="0"
        @click="handleClick"
      />
    </div>
    <div class="no-data" v-else>
      <svg aria-hidden="true" :viewBox="EmptyIcon.viewBox">
        <use :xlink:href="EmptyIcon.url"></use>
      </svg>
    </div>
  </div>
</template>

<script lang="ts">
import { mapState } from 'pinia'
import { useEditorStore } from '@/stores/editor'
import { usePreferencesStore } from '@/stores/preferences'
import bus from '../../bus'
import EmptyIcon from '@/assets/icons/undraw_toc_empty.svg'
import TocNode from './TocNode.vue'

export default {
  components: {
    TocNode
  },
  data() {
    this.EmptyIcon = EmptyIcon
    return {}
  },
  computed: {
    ...mapState(useEditorStore, ['toc']),
    ...mapState(usePreferencesStore, ['wordWrapInToc'])
  },
  methods: {
    handleClick(node: { slug?: string | null }) {
      if (node?.slug) {
        bus.$emit('scroll-to-header', node.slug)
      }
    }
  }
}
</script>

<style>
.side-bar-toc {
  height: calc(100% - 35px);
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  & .title {
    color: var(--sideBarTitleColor);
    font-weight: 600;
    font-size: 16px;
    margin: 37px 0 10px 0;
    padding-left: 25px;
  }
  & .toc-tree {
    background: transparent;
    color: var(--sideBarColor);
    font-size: 14px;
  }
  & > li {
    font-size: 14px;
    margin-bottom: 15px;
    cursor: pointer;
  }
  & .no-data {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-around;
    padding-bottom: 50px;
    & svg {
      width: 120px;
      fill: var(--themeColor);
    }
  }
}
.side-bar-toc-overflow {
  overflow: auto;
}
.side-bar-toc-wordwrap {
  overflow-x: hidden;
  overflow-y: auto;
  & .toc-node-content {
    white-space: normal;
    height: auto;
    min-height: 26px;
  }
}
</style>
