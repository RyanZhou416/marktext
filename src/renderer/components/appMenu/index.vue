<template>
  <DropdownMenuRoot @update:open="onMenuOpen">
    <DropdownMenuTrigger as-child>
      <slot />
    </DropdownMenuTrigger>

    <DropdownMenuPortal>
      <DropdownMenuContent class="radix-menu-content" :side-offset="4" side="bottom" align="start">
        <!-- Top level: each menu group is a Sub -->
        <template v-for="group in menuConfig" :key="group.id">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger class="radix-menu-item radix-menu-sub-trigger">
              <span class="radix-menu-label">{{ t(group.label) }}</span>
              <span class="radix-menu-arrow">&#9656;</span>
            </DropdownMenuSubTrigger>

            <DropdownMenuPortal>
              <DropdownMenuSubContent
                class="radix-menu-content"
                :side-offset="4"
                :align-offset="-4"
              >
                <!-- If entire submenu is a radio group (e.g. Theme) -->
                <template v-if="isRadioGroup(group.submenu)">
                  <DropdownMenuRadioGroup
                    :model-value="getActiveRadio(group.submenu)"
                    @update:model-value="onAction"
                  >
                    <template v-for="(item, idx) in group.submenu" :key="idx">
                      <DropdownMenuSeparator
                        v-if="item.type === 'separator'"
                        class="radix-menu-separator"
                      />
                      <DropdownMenuRadioItem v-else :value="item.id!" class="radix-menu-item">
                        <DropdownMenuItemIndicator class="radix-menu-indicator">
                          &#9679;
                        </DropdownMenuItemIndicator>
                        <span class="radix-menu-label">{{ t(item.label!) }}</span>
                        <span v-if="item.accelerator" class="radix-menu-accel">{{
                          item.accelerator
                        }}</span>
                      </DropdownMenuRadioItem>
                    </template>
                  </DropdownMenuRadioGroup>
                </template>

                <!-- Normal submenu with mixed item types -->
                <template v-else>
                  <template v-for="(item, idx) in group.submenu" :key="idx">
                    <DropdownMenuSeparator
                      v-if="item.type === 'separator'"
                      class="radix-menu-separator"
                    />

                    <!-- Nested submenu (e.g. Export, Line Ending) -->
                    <DropdownMenuSub v-else-if="item.submenu">
                      <DropdownMenuSubTrigger class="radix-menu-item radix-menu-sub-trigger">
                        <span class="radix-menu-indicator-space"></span>
                        <span class="radix-menu-label">{{ t(item.label!) }}</span>
                        <span class="radix-menu-arrow">&#9656;</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent
                          class="radix-menu-content"
                          :side-offset="4"
                          :align-offset="-4"
                        >
                          <!-- Nested radio group (e.g. Line Ending) -->
                          <template v-if="isRadioGroup(item.submenu)">
                            <DropdownMenuRadioGroup
                              :model-value="getActiveRadio(item.submenu)"
                              @update:model-value="onAction"
                            >
                              <template v-for="(sub, si) in item.submenu" :key="si">
                                <DropdownMenuSeparator
                                  v-if="sub.type === 'separator'"
                                  class="radix-menu-separator"
                                />
                                <DropdownMenuRadioItem
                                  v-else
                                  :value="sub.id!"
                                  class="radix-menu-item"
                                >
                                  <DropdownMenuItemIndicator class="radix-menu-indicator">
                                    &#9679;
                                  </DropdownMenuItemIndicator>
                                  <span class="radix-menu-label">{{ t(sub.label!) }}</span>
                                  <span v-if="sub.accelerator" class="radix-menu-accel">{{
                                    sub.accelerator
                                  }}</span>
                                </DropdownMenuRadioItem>
                              </template>
                            </DropdownMenuRadioGroup>
                          </template>
                          <!-- Nested normal items (e.g. Export > HTML / PDF, Recent files) -->
                          <template v-else>
                            <template v-for="(sub, si) in item.submenu" :key="si">
                              <DropdownMenuSeparator
                                v-if="sub.type === 'separator'"
                                class="radix-menu-separator"
                              />
                              <DropdownMenuItem
                                v-else
                                class="radix-menu-item"
                                :disabled="sub.id === 'file.no-recent'"
                                @select="() => onAction(sub.id!)"
                              >
                                <span class="radix-menu-indicator-space"></span>
                                <span class="radix-menu-label">{{
                                  sub.rawLabel || t(sub.label!)
                                }}</span>
                                <span v-if="sub.accelerator" class="radix-menu-accel">{{
                                  sub.accelerator
                                }}</span>
                              </DropdownMenuItem>
                            </template>
                          </template>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>

                    <!-- Checkbox item -->
                    <DropdownMenuCheckboxItem
                      v-else-if="item.role === 'check'"
                      :checked="checkedIds.has(item.id!)"
                      class="radix-menu-item"
                      @select="() => onAction(item.id!)"
                    >
                      <DropdownMenuItemIndicator class="radix-menu-indicator">
                        &#10003;
                      </DropdownMenuItemIndicator>
                      <span class="radix-menu-label">{{ t(item.label!) }}</span>
                      <span v-if="item.accelerator" class="radix-menu-accel">{{
                        item.accelerator
                      }}</span>
                    </DropdownMenuCheckboxItem>

                    <!-- Regular item -->
                    <DropdownMenuItem
                      v-else
                      class="radix-menu-item"
                      @select="() => onAction(item.id!)"
                    >
                      <span class="radix-menu-indicator-space"></span>
                      <span class="radix-menu-label">{{ t(item.label!) }}</span>
                      <span v-if="item.accelerator" class="radix-menu-accel">{{
                        item.accelerator
                      }}</span>
                    </DropdownMenuItem>
                  </template>
                </template>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </template>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuItemIndicator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from 'radix-vue'
import { appMenuConfig, type MenuItem, type MenuGroup } from '@/config/appMenu'
import { usePreferencesStore } from '@/stores/preferences'
import { computed } from 'vue'

export default defineComponent({
  name: 'AppMenu',
  components: {
    DropdownMenuRoot,
    DropdownMenuTrigger,
    DropdownMenuPortal,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuCheckboxItem,
    DropdownMenuItemIndicator,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent
  },
  props: {
    checkedIds: {
      type: Object as PropType<Set<string>>,
      default: () => new Set()
    }
  },
  emits: ['action'],
  setup(props, { emit }) {
    const { t } = useI18n()
    const preferencesStore = usePreferencesStore()

    const menuConfig = computed<MenuGroup[]>(() => {
      return appMenuConfig.map(group => {
        if (group.id !== 'file') return group
        return {
          ...group,
          submenu: group.submenu.map(item => {
            if (item.id !== 'file.open-recent') return item
            const recentItems: MenuItem[] = preferencesStore.recentFiles.map(
              (filePath: string, idx: number) => ({
                id: `file.recent-${idx}`,
                rawLabel: filePath.replace(/\\/g, '/').split('/').pop() || filePath
              })
            )
            const sep: MenuItem = { type: 'separator' }
            const clearItem: MenuItem = {
              id: 'file.clear-recent',
              label: 'menu.file.clearRecentlyUsed'
            }
            const noRecent: MenuItem = {
              id: 'file.no-recent',
              label: 'settings.general.noRecentFiles'
            }
            return {
              ...item,
              submenu: recentItems.length > 0 ? [...recentItems, sep, clearItem] : [noRecent]
            }
          })
        }
      })
    })

    /** Check if all non-separator items in a list have role:'radio' */
    function isRadioGroup(items: MenuItem[]): boolean {
      const realItems = items.filter(i => i.type !== 'separator')
      return realItems.length > 0 && realItems.every(i => i.role === 'radio')
    }

    /** Find the active radio item ID within a list */
    function getActiveRadio(items: MenuItem[]): string {
      for (const item of items) {
        if (item.id && props.checkedIds.has(item.id)) return item.id
      }
      return ''
    }

    function onAction(id: string) {
      if (id === 'file.no-recent') return
      emit('action', id)
    }

    function onMenuOpen(open: boolean) {
      if (open) {
        preferencesStore.LOAD_RECENT_FILES()
      }
    }

    return {
      t,
      menuConfig,
      isRadioGroup,
      getActiveRadio,
      onAction,
      onMenuOpen
    }
  }
})
</script>

<style>
@import '@/assets/styles/radix-menu.css';
</style>
