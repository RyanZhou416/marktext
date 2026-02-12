<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="overlayRef"
      class="image-viewer-overlay"
      tabindex="-1"
      @click.self="handleClose"
      @keydown.esc="handleClose"
    >
      <button class="image-viewer-close" aria-label="Close" @click="handleClose">×</button>
      <img v-if="currentUrl" :src="currentUrl" class="image-viewer-img" alt="" @click.stop />
    </div>
  </Teleport>
</template>

<script lang="ts">
import { computed, watch, ref, nextTick } from 'vue'

export default {
  name: 'ImageViewer',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    urls: {
      type: Array as () => string[],
      default: () => []
    },
    initialIndex: {
      type: Number,
      default: 0
    }
  },
  emits: ['close'],
  setup(props, { emit }) {
    const overlayRef = ref<HTMLElement | null>(null)
    const currentIndex = computed(() => {
      const len = props.urls?.length || 0
      if (len === 0) return 0
      const idx = Math.max(0, Math.min(props.initialIndex, len - 1))
      return idx
    })
    const currentUrl = computed(() => {
      const arr = props.urls || []
      return arr[currentIndex.value] || ''
    })
    const handleClose = () => emit('close')
    watch(
      () => props.visible,
      val => {
        if (val) {
          nextTick(() => {
            overlayRef.value?.focus()
          })
        }
      }
    )
    return {
      overlayRef,
      currentUrl,
      handleClose
    }
  }
}
</script>

<style scoped>
.image-viewer-overlay {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.85);
  cursor: zoom-out;
  outline: none;
}

.image-viewer-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  line-height: 1;
  color: #fff;
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.image-viewer-close:hover {
  opacity: 1;
}

.image-viewer-img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  pointer-events: none;
}
</style>
