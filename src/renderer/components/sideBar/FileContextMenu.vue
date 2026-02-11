<template>
  <ContextMenuRoot>
    <ContextMenuTrigger as-child>
      <slot />
    </ContextMenuTrigger>

    <ContextMenuPortal>
      <ContextMenuContent class="radix-menu-content" :side-offset="4">
        <ContextMenuItem class="radix-menu-item" @select="onAction('newFile')">
          <span class="radix-menu-label">{{ $t('contextMenu.sidebar.newFile') }}</span>
        </ContextMenuItem>
        <ContextMenuItem class="radix-menu-item" @select="onAction('newDirectory')">
          <span class="radix-menu-label">{{ $t('contextMenu.sidebar.newDirectory') }}</span>
        </ContextMenuItem>
        <ContextMenuSeparator class="radix-menu-separator" />
        <ContextMenuItem class="radix-menu-item" @select="onAction('copy')">
          <span class="radix-menu-label">{{ $t('contextMenu.sidebar.copy') }}</span>
        </ContextMenuItem>
        <ContextMenuItem class="radix-menu-item" @select="onAction('cut')">
          <span class="radix-menu-label">{{ $t('contextMenu.sidebar.cut') }}</span>
        </ContextMenuItem>
        <ContextMenuItem
          class="radix-menu-item"
          :disabled="!hasPasteContent"
          @select="onAction('paste')"
        >
          <span class="radix-menu-label">{{ $t('contextMenu.sidebar.paste') }}</span>
        </ContextMenuItem>
        <ContextMenuSeparator class="radix-menu-separator" />
        <ContextMenuItem class="radix-menu-item" @select="onAction('rename')">
          <span class="radix-menu-label">{{ $t('contextMenu.sidebar.rename') }}</span>
        </ContextMenuItem>
        <ContextMenuItem class="radix-menu-item" @select="onAction('delete')">
          <span class="radix-menu-label">{{ $t('contextMenu.sidebar.moveToTrash') }}</span>
        </ContextMenuItem>
        <ContextMenuSeparator class="radix-menu-separator" />
        <ContextMenuItem class="radix-menu-item" @select="onAction('showInFolder')">
          <span class="radix-menu-label">{{ $t('contextMenu.sidebar.showInFolder') }}</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenuPortal>
  </ContextMenuRoot>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import {
  ContextMenuRoot,
  ContextMenuTrigger,
  ContextMenuPortal,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator
} from 'radix-vue'

export default defineComponent({
  name: 'FileContextMenu',
  components: {
    ContextMenuRoot,
    ContextMenuTrigger,
    ContextMenuPortal,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator
  },
  props: {
    hasPasteContent: {
      type: Boolean,
      default: false
    }
  },
  emits: ['action'],
  setup(_, { emit }) {
    function onAction(action: string) {
      emit('action', action)
    }
    return { onAction }
  }
})
</script>

<style>
@import '@/assets/styles/radix-menu.css';
</style>
