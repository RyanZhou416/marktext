<template>
  <section class="pref-switch-item" :class="{ 'ag-underdevelop': disable }">
    <div class="description">
      <span>{{ description }}:</span>
      <i class="el-icon-info" v-if="more" @click="handleMoreClick"></i>
      <AppTooltip
        v-else-if="detailedDescription"
        :content="detailedDescription"
        class="item"
        side="top"
      >
        <i class="el-icon-info"></i>
      </AppTooltip>
      <span v-if="notes" class="notes">
        {{ notes }}
      </span>
    </div>
    <SwitchRoot
      v-model:checked="status"
      class="pref-switch-root"
      :disabled="disable"
      @update:checked="handleSwitchChange"
    >
      <SwitchThumb class="pref-switch-thumb" />
    </SwitchRoot>
  </section>
</template>

<script lang="ts">
import { ref, watch } from 'vue'
import { SwitchRoot, SwitchThumb } from 'radix-vue'
import { shell } from '../../../util/tauri'
import AppTooltip from '@/components/common/AppTooltip.vue'

export default {
  components: {
    AppTooltip,
    SwitchRoot,
    SwitchThumb
  },
  props: {
    description: String,
    notes: String,
    bool: Boolean,
    onChange: Function,
    more: String,
    detailedDescription: String,
    disable: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    // Reactive state
    const status = ref(props.bool)

    // Watch for prop changes
    watch(
      () => props.bool,
      (newValue, oldValue) => {
        if (newValue !== oldValue) {
          status.value = newValue
        }
      }
    )

    // Methods
    const handleMoreClick = () => {
      if (typeof props.more === 'string') {
        shell.openExternal(props.more)
      }
    }

    const handleSwitchChange = (value: boolean) => {
      props.onChange(value)
    }

    return {
      status,
      handleMoreClick,
      handleSwitchChange
    }
  }
}
</script>

<style>
.pref-switch-item {
  font-size: 14px;
  user-select: none;
  margin: 20px 0;
  color: var(--editorColor);
  display: flex;
  align-items: center;
  justify-content: space-between;

  & .description {
    & i {
      cursor: pointer;
      opacity: 0.7;
      color: var(--iconColor);
    }
    & i:hover {
      color: var(--themeColor);
    }
  }

  & .notes {
    font-style: italic;
    font-size: 12px;
  }
}

.pref-switch-root {
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: var(--floatBorderColor);
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s ease;
}

.pref-switch-root[data-state='checked'] {
  background: var(--themeColor);
}

.pref-switch-root[data-disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}

.pref-switch-thumb {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  transition: transform 0.2s ease;
  transform: translateX(2px);
  position: absolute;
  top: 2px;
  left: 0;
}

.pref-switch-root[data-state='checked'] .pref-switch-thumb {
  transform: translateX(18px);
}
</style>
