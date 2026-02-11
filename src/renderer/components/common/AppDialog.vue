<template>
  <DialogRoot :open="open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay class="app-dialog-overlay" />
      <DialogContent
        class="app-dialog-content"
        :style="{ width }"
        @interact-outside="e => e.preventDefault()"
      >
        <DialogTitle v-if="title" class="app-dialog-title">{{ title }}</DialogTitle>
        <div class="app-dialog-body">
          <slot />
        </div>
        <DialogClose class="app-dialog-close" aria-label="Close">
          <span aria-hidden>×</span>
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle
} from 'radix-vue'

withDefaults(
  defineProps<{
    open: boolean
    title?: string
    width?: string
  }>(),
  {
    width: '480px'
  }
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()
</script>

<style scoped>
.app-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  background: rgba(0, 0, 0, 0.45);
  animation: app-dialog-overlay-in 0.2s ease-out;
}

.app-dialog-content {
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 9999;
  transform: translate(-50%, -50%);
  padding: 24px;
  border-radius: 8px;
  background: var(--floatBgColor);
  border: 1px solid var(--floatBorderColor);
  color: var(--editorColor);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  animation: app-dialog-content-in 0.2s ease-out;
}

.app-dialog-title {
  margin: 0 0 16px;
  font-size: 17px;
  font-weight: 600;
  color: var(--editorColor);
}

.app-dialog-body {
  color: var(--editorColor);
  font-size: 14px;
  line-height: 1.5;
}

.app-dialog-close {
  position: absolute;
  top: 12px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  font-size: 20px;
  line-height: 1;
  color: var(--editorColor50);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s;
}

.app-dialog-close:hover {
  color: var(--editorColor);
  background: var(--editorColor04);
}

@keyframes app-dialog-overlay-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes app-dialog-content-in {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
</style>
