<template>
  <section class="pref-range-item" :class="{ 'ag-underdevelop': disable }">
    <div class="description">
      <span>{{ description }}:</span>
      <span class="value" v-if="selectValue"
        >{{ selectValue }} <span v-if="unit">{{ unit }}</span></span
      >
      <i class="el-icon-info" v-if="more" @click="handleMoreClick"></i>
    </div>
    <el-slider
      v-model="selectValue"
      @change="select"
      :min="min"
      :max="max"
      :format-tooltip="(value) => value + (unit ? unit : '')"
      :step="step"
    >
    </el-slider>
  </section>
</template>

<script>
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
  setup (props) {
    // Reactive state
    const selectValue = ref(props.value)

    // Watch for prop changes
    watch(() => props.value, (newValue, oldValue) => {
      if (newValue !== oldValue) {
        selectValue.value = newValue
      }
    })

    // Methods
    const handleMoreClick = () => {
      if (typeof props.more === 'string') {
        shell.openExternal(props.more)
      }
    }

    const select = (value) => {
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
  & .el-slider {
    width: 100%;
  }
  & .el-slider__runway,
  & .el-slider__bar {
    height: 4px;
  }
  & .el-slider__button {
    width: 12px;
    height: 12px;
  }
  & .el-slider__button-wrapper {
    width: 20px;
    height: 20px;
    top: -9px;
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
