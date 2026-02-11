<template>
  <section class="pref-font-input-item" :class="{ 'ag-underdevelop': disable }">
    <div class="description">
      <span>{{ description }}:</span>
      <i class="el-icon-info" v-if="more" @click="handleMoreClick"></i>
    </div>
    <ComboboxRoot
      v-model="selectValue"
      class="font-combobox"
      :filter-function="filterFonts"
      :disabled="disable"
    >
      <ComboboxAnchor class="font-combobox-anchor">
        <ComboboxInput class="font-combobox-input" placeholder="Select font..." />
        <ComboboxTrigger class="font-combobox-trigger">
          <i class="el-icon-arrow-down"></i>
        </ComboboxTrigger>
      </ComboboxAnchor>
      <ComboboxPortal>
        <ComboboxContent class="font-combobox-content" position="popper" :side-offset="4">
          <ComboboxViewport class="font-combobox-viewport">
            <ComboboxEmpty class="font-combobox-empty"> No fonts found </ComboboxEmpty>
            <ComboboxItem
              v-for="font in fontFamilies"
              :key="font"
              :value="font"
              class="font-combobox-item"
              @select="handleComboboxSelect"
            >
              <ComboboxItemIndicator class="font-combobox-indicator" />
              <span class="family">{{ font }}</span>
            </ComboboxItem>
          </ComboboxViewport>
        </ComboboxContent>
      </ComboboxPortal>
    </ComboboxRoot>
  </section>
</template>

<script lang="ts">
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxViewport
} from 'radix-vue'
import { shell, ipcRenderer } from '../../../util/tauri'

const FONT_NAME_REGEX = /^[^\s]+((-|\s)*[^\s])*$/

// Example of fontmanager-redux objects:
// {
//     path: '/Library/Fonts/Arial.ttf',
//     postscriptName: 'ArialMT',
//     family: 'Arial',
//     style: 'Regular',
//     weight: 400,
//     width: 5,
//     italic: false,
//     monospace: false
// }
// {
//     path: '/Library/Fonts/Arial Bold.ttf',
//     postscriptName: 'Arial-BoldMT',
//     family: 'Arial',
//     style: 'Bold',
//     weight: 700,
//     width: 5,
//     italic: false,
//     monospace: false
// }

export default {
  components: {
    ComboboxAnchor,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxItemIndicator,
    ComboboxPortal,
    ComboboxRoot,
    ComboboxTrigger,
    ComboboxViewport
  },
  data() {
    this.defaultValue = this.value
    return {
      fontFamilies: [],
      selectValue: this.value
    }
  },
  props: {
    description: String,
    value: String,
    onChange: Function,
    more: String,
    disable: {
      type: Boolean,
      default: false
    },
    onlyMonospace: {
      type: Boolean,
      default: false
    }
  },

  watch: {
    value: function (value, oldValue) {
      if (value !== oldValue) {
        this.defaultValue = value
        this.selectValue = value
      }
    }
  },

  methods: {
    filterFonts(list: string[], term: string) {
      if (!term || this.defaultValue === term) {
        return list
      }
      const lower = term.toLowerCase()
      return list.filter(f => f.toLowerCase().indexOf(lower) === 0)
    },

    handleComboboxSelect(event: { value: string; preventDefault: () => void }) {
      const value = event.value
      if (!FONT_NAME_REGEX.test(value)) {
        event.preventDefault()
        return
      }
      this.onChange(value)
    },

    handleMoreClick() {
      if (typeof this.more === 'string') {
        shell.openExternal(this.more)
      }
    }
  },
  async mounted() {
    // Get fonts from main process via IPC (native module must run in main process with contextIsolation)
    const { onlyMonospace } = this
    try {
      this.fontFamilies = await ipcRenderer.invoke('mt::get-available-fonts', onlyMonospace)
    } catch (err) {
      console.error('Failed to get available fonts:', err)
      this.fontFamilies = []
    }
  }
}
</script>

<style scoped>
.pref-font-input-item {
  margin: 20px 0;
  font-size: 14px;
  color: var(--editorColor);
}

.font-combobox {
  width: 100%;
}

.font-combobox-anchor {
  display: flex;
  align-items: center;
  height: 30px;
  background: var(--inputBgColor);
  border: 1px solid var(--editorColor10);
  border-radius: 4px;
  padding: 0 8px;
}

.font-combobox-anchor:focus-within {
  border-color: var(--themeColor);
}

.font-combobox-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: var(--editorColor);
  font-size: 14px;
}

.font-combobox-input::placeholder {
  color: var(--editorColor50);
}

.font-combobox-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 0 4px;
  cursor: pointer;
  color: var(--iconColor);
}

.font-combobox-trigger:hover {
  color: var(--themeColor);
}

.font-combobox-content {
  min-width: var(--radix-combobox-trigger-width);
  max-height: 280px;
  background: var(--floatBgColor);
  border: 1px solid var(--floatBorderColor);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.font-combobox-viewport {
  padding: 4px 0;
  max-height: 272px;
  overflow-y: auto;
}

.font-combobox-empty {
  padding: 8px 12px;
  font-size: 13px;
  color: var(--editorColor50);
  text-align: center;
}

.font-combobox-item {
  display: flex;
  align-items: center;
  padding: 7px 12px 7px 28px;
  font-size: 13px;
  color: var(--editorColor);
  cursor: default;
  user-select: none;
  position: relative;
}

.font-combobox-item[data-highlighted] {
  background: var(--floatHoverColor);
}

.font-combobox-indicator {
  position: absolute;
  left: 8px;
  width: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}

.family {
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.pref-font-input-item .description {
  margin-bottom: 10px;
}

.pref-font-input-item .description i {
  cursor: pointer;
  opacity: 0.7;
  color: var(--iconColor);
}

.pref-font-input-item .description i:hover {
  color: var(--themeColor);
}
</style>
