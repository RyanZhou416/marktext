<template>
  <div class="pref-sidebar">
    <h3 class="title">{{ $t('settings.preferences') }}</h3>
    <section class="search-wrapper">
      <ComboboxRoot
        v-model="selectedItem"
        class="pref-combobox"
        :display-value="displaySearchValue"
        :filter-function="filterSearch"
      >
        <ComboboxAnchor class="pref-combobox-anchor">
          <ComboboxInput
            class="pref-combobox-input"
            :placeholder="$t('settings.searchPreferences')"
          />
          <ComboboxTrigger class="pref-combobox-trigger">
            <i class="el-icon-search"></i>
          </ComboboxTrigger>
        </ComboboxAnchor>
        <ComboboxPortal>
          <ComboboxContent class="pref-combobox-content" position="popper" :side-offset="4">
            <ComboboxViewport class="pref-combobox-viewport">
              <ComboboxEmpty class="pref-combobox-empty"> No preferences found </ComboboxEmpty>
              <ComboboxItem
                v-for="(item, index) in restaurants"
                :key="`${item.category}-${item.preference}-${index}`"
                :value="item"
                class="pref-combobox-item"
                @select="handleComboboxSelect"
              >
                <div class="name">{{ item.category }}</div>
                <span class="addr">{{ item.preference }}</span>
              </ComboboxItem>
            </ComboboxViewport>
          </ComboboxContent>
        </ComboboxPortal>
      </ComboboxRoot>
    </section>
    <section class="category">
      <div
        v-for="c of category"
        :key="c.name"
        class="item"
        @click="handleCategoryItemClick(c)"
        :class="{ active: c.label === currentCategory }"
      >
        <svg :viewBox="c.icon.viewBox">
          <use :xlink:href="c.icon.url"></use>
        </svg>
        <span>{{ c.name }}</span>
      </div>
    </section>
  </div>
</template>
<script lang="ts">
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxViewport
} from 'radix-vue'
import { ipcRenderer } from '../../util/tauri'
import { category, searchContent } from './config'

type SearchItem = { category: string; preference: string }

export default {
  components: {
    ComboboxAnchor,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxPortal,
    ComboboxRoot,
    ComboboxTrigger,
    ComboboxViewport
  },
  data() {
    return {
      currentCategory: 'general',
      restaurants: [] as SearchItem[],
      selectedItem: null as SearchItem | null
    }
  },
  computed: {
    category() {
      return category(this.$t)
    }
  },
  watch: {
    $route(to, from) {
      if (to.name !== from.name) {
        this.currentCategory = to.name
      }
    }
  },
  methods: {
    displaySearchValue(item: SearchItem | null) {
      return item ? `${item.category}: ${item.preference}` : ''
    },
    filterSearch(list: SearchItem[], term: string) {
      if (!term) return list
      const lower = term.toLowerCase()
      return list.filter(
        item =>
          item.preference.toLowerCase().indexOf(lower) >= 0 ||
          item.category.toLowerCase().indexOf(lower) >= 0
      )
    },
    handleComboboxSelect(event: { value: SearchItem }) {
      const item = event.value
      this.$router.push({
        path: `/preference/${item.category.toLowerCase()}`
      })
      this.selectedItem = null
    },
    loadAll() {
      return searchContent
    },
    handleCategoryItemClick(item) {
      const { currentCategory } = this
      if (item.name.toLowerCase() !== currentCategory) {
        this.$router.push({
          path: item.path
        })
      }
    },
    onIpcCategoryChange(event, category) {
      const validRoute =
        category &&
        this.$router.getRoutes().findIndex(route => route.path.endsWith(`/${category}`)) !== -1
      if (validRoute) {
        this.$router.push({
          path: `/preference/${category}`
        })
      }
    }
  },

  mounted() {
    this.restaurants = this.loadAll()
    if (this.$route && this.$route.name) {
      this.currentCategory = this.$route.name
    }
    ipcRenderer.on('settings::change-tab', this.onIpcCategoryChange)
  },
  unmounted() {
    ipcRenderer.removeAllListener('settings::change-tab', this.onIpcCategoryChange)
  }
}
</script>

<style>
.pref-sidebar {
  -webkit-app-region: drag;
  display: flex;
  flex-direction: column;
  background: var(--sideBarBgColor);
  width: var(--prefSideBarWidth);
  height: 100vh;
  padding-top: 30px;
  box-sizing: border-box;
  & h3 {
    margin: 0;
    font-weight: normal;
    text-align: center;
    color: var(--sideBarColor);
  }
}
.search-wrapper {
  -webkit-app-region: no-drag;
  padding: 0 20px;
  margin: 30px 0;
}

.pref-combobox {
  width: 100%;
}

.pref-combobox-anchor {
  display: flex;
  align-items: center;
  height: 35px;
  background: var(--inputBgColor);
  border: 1px solid var(--floatBorderColor);
  border-radius: 4px;
  padding: 0 8px;
}

.pref-combobox-anchor:focus-within {
  border-color: var(--themeColor);
}

.pref-combobox-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: var(--editorColor);
  font-size: 14px;
}

.pref-combobox-input::placeholder {
  color: var(--editorColor50);
}

.pref-combobox-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 0 4px;
  cursor: pointer;
  color: var(--iconColor);
}

.pref-combobox-trigger:hover {
  color: var(--themeColor);
}

.pref-combobox-content {
  min-width: var(--radix-combobox-trigger-width);
  max-height: 280px;
  background: var(--floatBgColor);
  border: 1px solid var(--floatBorderColor);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.pref-combobox-viewport {
  padding: 4px 0;
  max-height: 272px;
  overflow-y: auto;
}

.pref-combobox-empty {
  padding: 8px 12px;
  font-size: 13px;
  color: var(--editorColor50);
  text-align: center;
}

.pref-combobox-item {
  display: flex;
  flex-direction: column;
  padding: 7px 12px;
  font-size: 13px;
  color: var(--editorColor);
  cursor: default;
  user-select: none;
  opacity: 0.8;
}

.pref-combobox-item[data-highlighted] {
  background: var(--floatHoverColor);
}

.pref-combobox-item .name {
  text-overflow: ellipsis;
  overflow: hidden;
  color: var(--editorColor80);
}

.pref-combobox-item .addr {
  font-size: 12px;
  color: var(--editorColor);
}
.category {
  -webkit-app-region: no-drag;
  overflow-y: auto;
  & .item {
    width: 100%;
    height: 50px;
    font-size: 18px;
    color: var(--sideBarColor);
    padding-left: 20px;
    box-sizing: border-box;
    display: flex;
    flex-direction: row;
    align-items: center;
    cursor: pointer;
    position: relative;
    user-select: none;
    & > svg {
      width: 28px;
      height: 28px;
      fill: var(--iconColor);
      margin-right: 15px;
    }
    &:hover {
      background: var(--sideBarItemHoverBgColor);
    }
    &::before {
      content: '';
      width: 4px;
      height: 0;
      background: var(--highlightThemeColor);
      position: absolute;
      left: 0;
      border-top-right-radius: 3px;
      border-bottom-right-radius: 3px;
      transition: height 0.25s ease-in-out;
      top: 50%;
      transform: translateY(-50%);
    }
    &.active {
      color: var(--sideBarTitleColor);
    }
    &.active::before {
      height: 100%;
    }
  }
}
</style>
