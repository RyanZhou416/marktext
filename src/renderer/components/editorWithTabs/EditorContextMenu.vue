<template>
  <ContextMenuRoot>
    <ContextMenuTrigger as-child>
      <slot />
    </ContextMenuTrigger>

    <ContextMenuPortal>
      <ContextMenuContent class="radix-menu-content" :side-offset="4">
        <ContextMenuItem
          class="radix-menu-item"
          :disabled="!hasSelection"
          @select="onAction('cut')"
        >
          <span class="radix-menu-label">{{ $t('contextMenu.editor.cut') }}</span>
        </ContextMenuItem>
        <ContextMenuItem
          class="radix-menu-item"
          :disabled="!hasSelection"
          @select="onAction('copy')"
        >
          <span class="radix-menu-label">{{ $t('contextMenu.editor.copy') }}</span>
        </ContextMenuItem>
        <ContextMenuItem class="radix-menu-item" @select="onAction('paste')">
          <span class="radix-menu-label">{{ $t('contextMenu.editor.paste') }}</span>
        </ContextMenuItem>
        <ContextMenuSeparator v-if="hasSelection" class="radix-menu-separator" />
        <ContextMenuItem
          v-if="hasSelection"
          class="radix-menu-item"
          @select="onAction('copyAsMarkdown')"
        >
          <span class="radix-menu-label">{{ $t('contextMenu.editor.copyAsMarkdown') }}</span>
        </ContextMenuItem>
        <ContextMenuItem
          v-if="hasSelection"
          class="radix-menu-item"
          @select="onAction('copyAsHtml')"
        >
          <span class="radix-menu-label">{{ $t('contextMenu.editor.copyAsHtml') }}</span>
        </ContextMenuItem>
        <ContextMenuSeparator class="radix-menu-separator" />
        <ContextMenuItem v-if="isLink" class="radix-menu-item" @select="onAction('openLink')">
          <span class="radix-menu-label">{{ $t('contextMenu.editor.openLink') }}</span>
        </ContextMenuItem>
        <ContextMenuItem v-if="isLink" class="radix-menu-item" @select="onAction('copyLink')">
          <span class="radix-menu-label">{{ $t('contextMenu.editor.copyLink') }}</span>
        </ContextMenuItem>
        <ContextMenuSeparator v-if="isLink" class="radix-menu-separator" />
        <ContextMenuItem v-if="isImage" class="radix-menu-item" @select="onAction('copyImage')">
          <span class="radix-menu-label">{{ $t('contextMenu.editor.copyImage') }}</span>
        </ContextMenuItem>
        <ContextMenuItem v-if="isImage" class="radix-menu-item" @select="onAction('saveImageAs')">
          <span class="radix-menu-label">{{ $t('contextMenu.editor.saveImageAs') }}</span>
        </ContextMenuItem>
        <ContextMenuSeparator v-if="isImage" class="radix-menu-separator" />
        <ContextMenuItem class="radix-menu-item" @select="onAction('selectAll')">
          <span class="radix-menu-label">{{ $t('contextMenu.editor.selectAll') }}</span>
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
  name: 'EditorContextMenu',
  components: {
    ContextMenuRoot,
    ContextMenuTrigger,
    ContextMenuPortal,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator
  },
  props: {
    hasSelection: {
      type: Boolean,
      default: false
    },
    isLink: {
      type: Boolean,
      default: false
    },
    isImage: {
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
