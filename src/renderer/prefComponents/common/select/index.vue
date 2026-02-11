<template>
  <section class="pref-select-item" :class="{ 'ag-underdevelop': disable }">
    <div class="description" v-if="description">
      <span>{{ description }}:</span>
      <i v-if="more" class="info-icon" @click="handleMoreClick">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      </i>
    </div>
    <SelectRoot v-model="selectValue" :disabled="disable">
      <SelectTrigger class="cur-select-trigger" aria-label="Select option">
        <SelectValue :placeholder="placeholder" />
        <SelectIcon class="cur-select-icon" />
      </SelectTrigger>
      <SelectPortal>
        <SelectContent class="cur-select-content" position="popper" :side-offset="4" align="start">
          <SelectViewport class="cur-select-viewport">
            <SelectItem
              v-for="item in options"
              :key="String(item.value)"
              class="cur-select-item"
              :value="String(item.value)"
              :text-value="item.label"
            >
              <SelectItemText>{{ item.label }}</SelectItemText>
            </SelectItem>
          </SelectViewport>
        </SelectContent>
      </SelectPortal>
    </SelectRoot>
    <div v-if="notes" class="notes">
      {{ notes }}
    </div>
  </section>
</template>

<script lang="ts">
import {
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport
} from 'radix-vue'
import { shell } from '../../../util/tauri'

export default {
  components: {
    SelectContent,
    SelectIcon,
    SelectItem,
    SelectItemText,
    SelectPortal,
    SelectRoot,
    SelectTrigger,
    SelectValue,
    SelectViewport
  },
  props: {
    description: String,
    notes: String,
    value: [String, Number],
    modelValue: [String, Number],
    options: {
      type: Array,
      default: () => []
    },
    onChange: Function,
    more: String,
    placeholder: {
      type: String,
      default: ''
    },
    disable: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue'],
  computed: {
    selectValue: {
      get() {
        const val = this.modelValue != null ? this.modelValue : this.value
        return val != null ? String(val) : ''
      },
      set(v: string) {
        this.select(v)
      }
    }
  },
  methods: {
    handleMoreClick() {
      if (typeof this.more === 'string') {
        shell.openExternal(this.more)
      }
    },
    select(value: string) {
      const opt = this.options.find(o => String(o.value) === value)
      const rawValue = opt ? opt.value : value
      this.$emit('update:modelValue', rawValue)
      if (typeof this.onChange === 'function') {
        this.onChange(rawValue)
      }
    }
  }
}
</script>

<style scoped>
.pref-select-item {
  margin: 20px 0;
  font-size: 14px;
  color: var(--editorColor);
}

.pref-select-item .notes {
  margin-top: 10px;
  font-style: italic;
  font-size: 12px;
}

.pref-select-item .description {
  margin-bottom: 10px;
}

.pref-select-item .description i.info-icon {
  display: inline-flex;
  cursor: pointer;
  opacity: 0.7;
  color: var(--iconColor);
  margin-left: 4px;
  vertical-align: middle;
}

.pref-select-item .description i.info-icon:hover {
  color: var(--themeColor);
}

/* Trigger */
.cur-select-trigger {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  height: 30px;
  padding: 0 8px 0 12px;
  font-size: 13px;
  color: var(--editorColor);
  background: var(--inputBgColor);
  border: 1px solid var(--floatBorderColor);
  border-radius: 4px;
  outline: none;
  cursor: pointer;
  user-select: none;
}

.cur-select-trigger:hover:not([data-disabled]) {
  border-color: var(--editorColor30);
}

.cur-select-trigger[data-disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}

.cur-select-trigger[data-placeholder] {
  color: var(--editorColor50);
}

.cur-select-icon {
  flex-shrink: 0;
  font-size: 10px;
  color: var(--editorColor50);
}

/* Dropdown content - match radix-menu styling */
.cur-select-content {
  min-width: var(--radix-select-trigger-width);
  max-height: min(280px, var(--radix-select-content-available-height, 280px));
  background: var(--floatBgColor);
  border: 1px solid var(--floatBorderColor);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  z-index: 10001;
  animation-duration: 120ms;
  animation-timing-function: ease-out;
}

.cur-select-content[data-side='bottom'] {
  animation-name: cur-select-slide-down;
}

@keyframes cur-select-slide-down {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.cur-select-viewport {
  padding: 4px 0;
  overflow-y: auto;
}

/* Dropdown items - match radix-menu-item */
.cur-select-item {
  display: flex;
  align-items: center;
  height: 28px;
  padding: 0 12px 0 24px;
  font-size: 13px;
  color: var(--editorColor);
  cursor: default;
  user-select: none;
  outline: none;
  border-radius: 2px;
  margin: 0 4px;
}

.cur-select-item[data-highlighted] {
  background: var(--floatHoverColor);
}

.cur-select-item[data-disabled] {
  color: var(--editorColor30);
  pointer-events: none;
}
</style>
