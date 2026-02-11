<template>
  <AlertDialogRoot :open="open" @update:open="emit('update:open', $event)">
    <AlertDialogPortal>
      <AlertDialogOverlay class="confirm-dialog-overlay" />
      <AlertDialogContent
        class="confirm-dialog-content"
        @interact-outside="e => e.preventDefault()"
      >
        <AlertDialogTitle class="confirm-dialog-title">{{ title }}</AlertDialogTitle>
        <AlertDialogDescription class="confirm-dialog-description">
          {{ message }}
        </AlertDialogDescription>
        <div class="confirm-dialog-actions">
          <AlertDialogCancel
            class="confirm-dialog-btn confirm-dialog-cancel"
            @click="emit('cancel')"
          >
            {{ cancelText }}
          </AlertDialogCancel>
          <AlertDialogAction
            class="confirm-dialog-btn confirm-dialog-confirm"
            @click="emit('confirm')"
          >
            {{ confirmText }}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>

<script setup lang="ts">
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle
} from 'radix-vue'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
  }>(),
  {
    confirmText: 'OK',
    cancelText: 'Cancel'
  }
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()
</script>

<style scoped>
.confirm-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  background: rgba(0, 0, 0, 0.45);
  animation: confirm-dialog-overlay-in 0.2s ease-out;
}

.confirm-dialog-content {
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
  animation: confirm-dialog-content-in 0.2s ease-out;
  min-width: 360px;
  max-width: 90vw;
}

.confirm-dialog-title {
  margin: 0 0 12px;
  font-size: 17px;
  font-weight: 600;
  color: var(--editorColor);
}

.confirm-dialog-description {
  margin: 0 0 20px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--editorColor50);
}

.confirm-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.confirm-dialog-btn {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.confirm-dialog-cancel {
  color: var(--editorColor);
  background: var(--editorColor04);
  border: 1px solid var(--floatBorderColor);
}

.confirm-dialog-cancel:hover {
  background: var(--editorColor10);
}

.confirm-dialog-confirm {
  color: #fff;
  background: var(--editorColor);
  border: none;
}

.confirm-dialog-confirm:hover {
  background: var(--editorColor80);
}

@keyframes confirm-dialog-overlay-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes confirm-dialog-content-in {
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
