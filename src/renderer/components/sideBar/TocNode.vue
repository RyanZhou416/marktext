<template>
  <div class="toc-node">
    <div
      class="toc-node-content"
      :style="{ paddingLeft: `${25 + depth * 10}px` }"
      @click="$emit('click', node)"
    >
      {{ node.label }}
    </div>
    <template v-if="node.children && node.children.length">
      <TocNode
        v-for="(child, index) in node.children"
        :key="index"
        :node="child"
        :depth="depth + 1"
        @click="$emit('click', $event)"
      />
    </template>
  </div>
</template>

<script lang="ts">
export default {
  name: 'TocNode',
  props: {
    node: {
      type: Object,
      required: true
    },
    depth: {
      type: Number,
      default: 0
    }
  },
  emits: ['click']
}
</script>

<style scoped>
.toc-node-content {
  height: 28px;
  display: flex;
  align-items: center;
  cursor: pointer;
  color: var(--sideBarColor);
  transition: background-color 0.15s ease;
}

.toc-node-content:hover {
  background: var(--sideBarItemHoverBgColor);
}

.toc-node-content:focus-visible {
  outline: none;
  background-color: var(--sideBarItemHoverBgColor);
}

.toc-node + .toc-node {
  margin-top: 4px;
}
</style>
