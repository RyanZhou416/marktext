<template>
  <section class="pref-range-item" :class="{ 'ag-underdevelop': disable }">
    <div class="description">
      <span>{{ description }}:</span>
      <span v-if="selectValue" class="value"
        >{{ selectValue }} <span v-if="unit">{{ unit }}</span></span
      >
      <i v-if="more" class="el-icon-info" @click="handleMoreClick"></i>
    </div>
    <input
      type="range"
      class="pref-range"
      :value="selectValue"
      :min="min"
      :max="max"
      :step="step ?? 1"
      @input="
        e => {
          selectValue = Number(e.target.value)
        }
      "
      @change="e => select(Number(e.target.value))"
    />
  </section>
</template>

<script lang="ts">
import { ref, watch } from 'vue'
import { shell } from '../../../util/tauri'

export default {
  props: {
    description: String,
    value: [String, Number],
    min: Number,
    max: Number,
    onChange: Function,
    unit: String,
    step: Number,
    more: String,
    disable: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    // Reactive state
    const selectValue = ref(props.value)

    // Watch for prop changes
    watch(
      () => props.value,
      (newValue, oldValue) => {
        if (newValue !== oldValue) {
          selectValue.value = newValue
        }
      }
    )

    // Methods
    const handleMoreClick = () => {
      if (typeof props.more === 'string') {
        shell.openExternal(props.more)
      }
    }

    const select = value => {
      props.onChange(value)
    }

    return {
      selectValue,
      handleMoreClick,
      select
    }
  }
}
</script>

<style>
.pref-range-item {
  margin: 20px 0;
  font-size: 14px;
  color: var(--editorColor);
  width: 100%;
  & .value {
    text-align: right;
    font-style: italic;
    float: right;
  }
  & .pref-range {
    width: 100%;
    accent-color: var(--themeColor);
  }
}
.pref-select-item .description {
  margin-bottom: 10px;

  & .value {
    color: var(--editorColor80);
  }
  & i {
    cursor: pointer;
    opacity: 0.7;
    color: var(--iconColor);
  }
  & i:hover {
    color: var(--themeColor);
  }
}
</style>
