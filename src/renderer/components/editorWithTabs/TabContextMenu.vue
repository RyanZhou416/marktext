<template>
  <ContextMenuRoot @update:open="onOpenChange">
    <ContextMenuTrigger as-child>
      <slot />
    </ContextMenuTrigger>

    <ContextMenuPortal>
      <ContextMenuContent class="radix-menu-content" :side-offset="4">
        <ContextMenuItem class="radix-menu-item" @select="onAction('close')">
          <span class="radix-menu-label">{{ $t('contextMenu.tabs.close') }}</span>
        </ContextMenuItem>
        <ContextMenuItem class="radix-menu-item" @select="onAction('closeOthers')">
          <span class="radix-menu-label">{{ $t('contextMenu.tabs.closeOthers') }}</span>
        </ContextMenuItem>
        <ContextMenuItem class="radix-menu-item" @select="onAction('closeSaved')">
          <span class="radix-menu-label">{{ $t('contextMenu.tabs.closeSaved') }}</span>
        </ContextMenuItem>
        <ContextMenuItem class="radix-menu-item" @select="onAction('closeAll')">
          <span class="radix-menu-label">{{ $t('contextMenu.tabs.closeAll') }}</span>
        </ContextMenuItem>
        <ContextMenuSeparator class="radix-menu-separator" />
        <ContextMenuItem
          class="radix-menu-item"
          :disabled="!hasPathname"
          @select="onAction('rename')"
        >
          <span class="radix-menu-label">{{ $t('contextMenu.tabs.rename') }}</span>
        </ContextMenuItem>
        <ContextMenuItem
          class="radix-menu-item"
          :disabled="!hasPathname"
          @select="onAction('copyPath')"
        >
          <span class="radix-menu-label">{{ $t('contextMenu.tabs.copyPath') }}</span>
        </ContextMenuItem>
        <ContextMenuItem
          class="radix-menu-item"
          :disabled="!hasPathname"
          @select="onAction('showInFolder')"
        >
          <span class="radix-menu-label">{{ $t('contextMenu.tabs.showInFolder') }}</span>
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
  name: 'TabContextMenu',
  components: {
    ContextMenuRoot,
    ContextMenuTrigger,
    ContextMenuPortal,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator
  },
  props: {
    hasPathname: {
      type: Boolean,
      default: false
    }
  },
  emits: ['action', 'open'],
  setup(_, { emit }) {
    function onAction(action: string) {
      emit('action', action)
    }
    function onOpenChange(open: boolean) {
      if (open) {
        emit('open')
      }
    }
    return { onAction, onOpenChange }
  }
})
</script>

<style>
@import '@/assets/styles/radix-menu.css';
</style>
