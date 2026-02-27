<template>
  <TooltipProvider :delay-duration="delay">
    <TooltipRoot>
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent class="app-tooltip-content" :side="side" :side-offset="5">
          <slot name="content">
            <span>{{ content }}</span>
          </slot>
          <TooltipArrow class="app-tooltip-arrow" />
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>

<script setup lang="ts">
import {
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
  TooltipArrow
} from 'radix-vue'

withDefaults(
  defineProps<{
    content?: string
    side?: 'top' | 'right' | 'bottom' | 'left'
    delay?: number
  }>(),
  {
    content: '',
    side: 'top',
    delay: 300
  }
)
</script>

<style>
.app-tooltip-content {
  background: var(--floatBgColor);
  border: 1px solid var(--floatBorderColor);
  color: var(--editorColor);
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.4;
  max-width: 300px;
  z-index: 10002;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  animation: app-tooltip-in 0.15s ease-out;
}

.app-tooltip-arrow {
  fill: var(--floatBgColor);
}

@keyframes app-tooltip-in {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
