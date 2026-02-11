<template>
  <div class="tree-view">
    <div class="title">
      <!-- Placeholder -->
    </div>

    <!-- Opened tabs -->
    <div class="opened-files">
      <div class="title">
        <svg
          class="icon icon-arrow"
          :class="{ fold: !showOpenedFiles }"
          aria-hidden="true"
          @click.stop="toggleOpenedFiles()"
        >
          <use xlink:href="#icon-arrow"></use>
        </svg>
        <span class="default-cursor text-overflow" @click.stop="toggleOpenedFiles()"
          >Opened files</span
        >
        <a href="javascript:;" @click.stop="saveAll(false)" title="Save All">
          <svg class="icon" aria-hidden="true">
            <use xlink:href="#icon-save-all"></use>
          </svg>
        </a>
        <a href="javascript:;" @click.stop="saveAll(true)" title="Close All">
          <svg class="icon" aria-hidden="true">
            <use xlink:href="#icon-close-all"></use>
          </svg>
        </a>
      </div>
      <div class="opened-files-list" v-show="showOpenedFiles">
        <transition-group name="list">
          <opened-file v-for="tab of tabs" :key="tab.id" :file="tab"></opened-file>
        </transition-group>
      </div>
    </div>

    <!-- Project tree view -->
    <div class="project-tree" v-if="projectTree">
      <div class="title">
        <svg
          class="icon icon-arrow"
          :class="{ fold: !showDirectories }"
          aria-hidden="true"
          @click.stop="toggleDirectories()"
        >
          <use xlink:href="#icon-arrow"></use>
        </svg>
        <span class="default-cursor text-overflow" @click.stop="toggleDirectories()">{{
          projectTree.name
        }}</span>
      </div>
      <div class="tree-wrapper" ref="treeScrollRef" v-show="showDirectories">
        <div v-if="flatTree.length === 0" class="empty-project">
          <span>Empty project</span>
          <a href="javascript:;" @click.stop="createFile">Create File</a>
        </div>
        <div
          v-else
          :style="{
            height: `${treeVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }"
        >
          <div
            v-for="virtualRow in treeVirtualizer.getVirtualItems()"
            :key="flatTree[virtualRow.index].key"
            :ref="el => treeVirtualizer.measureElement(el)"
            :data-index="virtualRow.index"
            :style="{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`
            }"
          >
            <!-- Folder row -->
            <template v-if="flatTree[virtualRow.index].type === 'folder'">
              <FileContextMenu
                :has-paste-content="!!clipboard"
                @action="a => handleFolderContextAction(a, flatTree[virtualRow.index].item)"
              >
                <div
                  class="folder-name"
                  @click="toggleFolder(flatTree[virtualRow.index].item)"
                  :style="{ 'padding-left': `${flatTree[virtualRow.index].depth * 20 + 20}px` }"
                  :class="[{ active: flatTree[virtualRow.index].item.id === activeItem.id }]"
                  :title="flatTree[virtualRow.index].item.pathname"
                >
                  <svg class="icon" aria-hidden="true">
                    <use
                      :xlink:href="`#${flatTree[virtualRow.index].item.isCollapsed ? 'icon-folder-close' : 'icon-folder-open'}`"
                    ></use>
                  </svg>
                  <input
                    type="text"
                    @click.stop
                    class="rename"
                    v-if="renameCache === flatTree[virtualRow.index].item.pathname"
                    :value="flatTree[virtualRow.index].item.name"
                    @keydown.enter="handleRename($event)"
                  />
                  <span v-else class="text-overflow">{{
                    flatTree[virtualRow.index].item.name
                  }}</span>
                </div>
              </FileContextMenu>
            </template>
            <!-- Create input row -->
            <template v-else-if="flatTree[virtualRow.index].type === 'input'">
              <input
                type="text"
                class="new-input"
                :style="{ 'margin-left': `${flatTree[virtualRow.index].depth * 5 + 15}px` }"
                ref="input"
                v-model="createName"
                @keydown.enter="handleInputEnter"
              />
            </template>
            <!-- File row -->
            <template v-else>
              <FileContextMenu
                :has-paste-content="!!clipboard"
                @action="a => handleFileContextAction(a, flatTree[virtualRow.index].item)"
              >
                <div
                  :title="flatTree[virtualRow.index].item.pathname"
                  class="side-bar-file"
                  :style="{
                    'padding-left': `${flatTree[virtualRow.index].depth * 20 + 20}px`,
                    opacity: flatTree[virtualRow.index].item.isMarkdown ? 1 : 0.75
                  }"
                  @click="handleFileClick(flatTree[virtualRow.index].item)"
                  :class="[
                    {
                      current: currentFile.pathname === flatTree[virtualRow.index].item.pathname,
                      active: flatTree[virtualRow.index].item.id === activeItem.id
                    }
                  ]"
                >
                  <file-icon :name="flatTree[virtualRow.index].item.name"></file-icon>
                  <input
                    type="text"
                    @click.stop
                    class="rename"
                    v-if="renameCache === flatTree[virtualRow.index].item.pathname"
                    :value="flatTree[virtualRow.index].item.name"
                    @keydown.enter="handleRename($event)"
                  />
                  <span v-else>{{ flatTree[virtualRow.index].item.name }}</span>
                </div>
              </FileContextMenu>
            </template>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="open-project">
      <div class="centered-group">
        <svg aria-hidden="true" :viewBox="FolderIcon.viewBox">
          <use :xlink:href="FolderIcon.url"></use>
        </svg>
        <button class="button-primary" @click="openFolder">Open Folder</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import OpenedFile from './treeOpenedTab.vue'
import FileIcon from './icon.vue'
import FileContextMenu from './FileContextMenu.vue'
import { mapState } from 'pinia'
import { useProjectStore } from '@/stores/project'
import { useEditorStore } from '@/stores/editor'
import { useFile } from '../../composables/useFile'
import bus from '../../bus'
import { ref, computed } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { useCreateFileOrDirectory } from '../../composables/useCreateFileOrDirectory'
import FolderIcon from '@/assets/icons/undraw_folder.svg'

interface FlatTreeItem {
  type: 'folder' | 'file' | 'input'
  item: any
  depth: number
  key: string
}

function flattenNode(node: any, depth: number, createCacheDirname: string): FlatTreeItem[] {
  const items: FlatTreeItem[] = []
  // Folders first
  for (const folder of node.folders || []) {
    items.push({ type: 'folder', item: folder, depth, key: `f-${folder.pathname}` })
    if (!folder.isCollapsed) {
      items.push(...flattenNode(folder, depth + 1, createCacheDirname))
    }
  }
  // Create input for this folder
  if (createCacheDirname === node.pathname) {
    items.push({ type: 'input', item: node, depth, key: `input-${node.pathname}` })
  }
  // Files
  for (const file of node.files || []) {
    items.push({ type: 'file', item: file, depth, key: `e-${file.pathname}` })
  }
  return items
}

export default {
  setup() {
    const inputRef = ref(null)
    const { createName, handleInputFocus, handleInputEnter } = useCreateFileOrDirectory(
      inputRef,
      ref(null)
    )
    const { handleFileClick } = useFile()

    const treeScrollRef = ref<HTMLElement | null>(null)
    const flatTreeCount = ref(0)

    const treeVirtualizer = useVirtualizer(
      computed(() => ({
        count: flatTreeCount.value,
        getScrollElement: () => treeScrollRef.value,
        estimateSize: () => 30,
        overscan: 10
      }))
    )

    // Document-level listeners for hiding rename/create input (auto-cleanup on unmount)
    useEventListener(document, 'click', (event: Event) => {
      const target = event.target as HTMLElement
      if (target.tagName !== 'INPUT') {
        const projectStore = useProjectStore()
        projectStore.CHANGE_ACTIVE_ITEM({})
        projectStore.CREATE_PATH({})
        projectStore.SET_RENAME_CACHE(null)
      }
    })
    useEventListener(document, 'contextmenu', (event: Event) => {
      const target = event.target as HTMLElement
      if (target.tagName !== 'INPUT') {
        const projectStore = useProjectStore()
        projectStore.CREATE_PATH({})
        projectStore.SET_RENAME_CACHE(null)
      }
    })
    useEventListener(document, 'keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const projectStore = useProjectStore()
        projectStore.CREATE_PATH({})
        projectStore.SET_RENAME_CACHE(null)
      }
    })

    return {
      createName,
      handleInputFocus,
      handleInputEnter,
      input: inputRef,
      handleFileClick,
      treeScrollRef,
      flatTreeCount,
      treeVirtualizer
    }
  },
  data() {
    this.depth = 0
    this.FolderIcon = FolderIcon
    return {
      showDirectories: true,
      showNewInput: false,
      showOpenedFiles: true
    }
  },
  props: {
    projectTree: {
      validator: function (value) {
        return typeof value === 'object'
      },
      required: true
    },
    openedFiles: Array,
    tabs: Array
  },
  components: {
    OpenedFile,
    FileIcon,
    FileContextMenu
  },
  computed: {
    ...mapState(useProjectStore, ['createCache', 'renameCache', 'activeItem', 'clipboard']),
    ...mapState(useEditorStore, ['currentFile']),
    flatTree() {
      if (!this.projectTree) return []
      const createDirname = this.createCache?.dirname || ''
      return flattenNode(this.projectTree, this.depth, createDirname)
    }
  },
  watch: {
    'flatTree.length'(newLen) {
      this.flatTreeCount = newLen
    }
  },
  created() {
    this.$nextTick(() => {
      bus.$on('SIDEBAR::show-new-input', this.handleInputFocus)
    })
  },
  methods: {
    openFolder() {
      const projectStore = useProjectStore()
      projectStore.ASK_FOR_OPEN_PROJECT()
    },
    saveAll(isClose) {
      const editorStore = useEditorStore()
      editorStore.ASK_FOR_SAVE_ALL(isClose)
    },
    createFile() {
      const projectStore = useProjectStore()
      projectStore.CHANGE_ACTIVE_ITEM(this.projectTree)
      bus.$emit('SIDEBAR::new', 'file')
    },
    toggleOpenedFiles() {
      this.showOpenedFiles = !this.showOpenedFiles
    },
    toggleDirectories() {
      this.showDirectories = !this.showDirectories
    },
    toggleFolder(folder: any) {
      folder.isCollapsed = !folder.isCollapsed
    },
    handleRename(event: Event) {
      const newName = (event.target as HTMLInputElement).value
      if (newName) {
        const projectStore = useProjectStore()
        projectStore.RENAME_IN_SIDEBAR(newName)
      }
    },
    handleFileContextAction(action: string, file: any) {
      const projectStore = useProjectStore()
      projectStore.CHANGE_ACTIVE_ITEM(file)
      const actionMap: Record<string, [string, string?]> = {
        newFile: ['SIDEBAR::new', 'file'],
        newDirectory: ['SIDEBAR::new', 'directory'],
        copy: ['SIDEBAR::copy-cut', 'copy'],
        cut: ['SIDEBAR::copy-cut', 'cut'],
        paste: ['SIDEBAR::paste'],
        rename: ['SIDEBAR::rename'],
        delete: ['SIDEBAR::remove'],
        showInFolder: ['SIDEBAR::show-in-folder']
      }
      const [event, arg] = actionMap[action] || []
      if (event) {
        arg ? bus.$emit(event, arg) : bus.$emit(event)
      }
    },
    handleFolderContextAction(action: string, folder: any) {
      this.handleFileContextAction(action, folder)
    }
  }
}
</script>

<style scoped>
.list-item {
  display: inline-block;
  margin-right: 10px;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.2s;
}
.list-enter, .list-leave-to
  /* .list-leave-active for below version 2.1.8 */ {
  opacity: 0;
  transform: translateX(-50px);
}
.tree-view {
  font-size: 14px;
  color: var(--sideBarColor);
  display: flex;
  flex-direction: column;
  height: 100%;
}
.tree-view > .title {
  height: 35px;
  line-height: 35px;
  padding: 0 15px;
  display: flex;
  flex-shrink: 0;
  flex-direction: row-reverse;
}

.icon-arrow {
  margin-right: 5px;
  transition: all 0.25s ease-out;
  transform: rotate(90deg);
  fill: var(--sideBarTextColor);
}

.icon-arrow.fold {
  transform: rotate(0);
}

.opened-files,
.project-tree {
  & > .title {
    height: 30px;
    line-height: 30px;
    font-size: 14px;
  }
}

.opened-files .title {
  padding-right: 15px;
  display: flex;
  align-items: center;
  & > span {
    flex: 1;
  }
  & > a {
    display: none;
    text-decoration: none;
    color: var(--sideBarColor);
    margin-left: 8px;
  }
}
.opened-files div.title:hover > a,
.opened-files div.title > a:hover {
  display: block;
  &:hover {
    color: var(--highlightThemeColor);
  }
}
.opened-files {
  display: flex;
  flex-direction: column;
}
.default-cursor {
  cursor: pointer;
}
.opened-files .opened-files-list {
  max-height: 200px;
  overflow: auto;
  &::-webkit-scrollbar:vertical {
    width: 8px;
  }
  flex: 1;
}

.project-tree {
  display: flex;
  flex-direction: column;
  overflow: auto;
  & > .title {
    padding-right: 15px;
    display: flex;
    align-items: center;
    & > span {
      flex: 1;
      user-select: none;
    }
    & > a {
      pointer-events: auto;
      cursor: pointer;
      margin-left: 8px;
      color: var(--sideBarIconColor);
      opacity: 0;
    }
    & > a:hover {
      color: var(--highlightThemeColor);
    }
    & > a.active {
      color: var(--highlightThemeColor);
    }
  }
  & > .tree-wrapper {
    overflow: auto;
    flex: 1;
    &::-webkit-scrollbar:vertical {
      width: 8px;
    }
  }
  flex: 1;
}
.project-tree div.title:hover > a {
  opacity: 1;
}
.open-project {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  align-items: center;
  padding-bottom: 100px;
  & .centered-group {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  & svg {
    width: 120px;
    fill: var(--themeColor);
  }
  & button.button-primary {
    display: block;
    margin-top: 20px;
  }
}
.new-input {
  outline: none;
  height: 22px;
  margin: 5px 0;
  padding: 0 6px;
  color: var(--sideBarColor);
  border: 1px solid var(--floatBorderColor);
  background: var(--floatBorderColor);
  width: calc(100% - 45px);
  border-radius: 3px;
}
.tree-wrapper {
  position: relative;
}
.empty-project {
  position: absolute;
  top: 0;
  left: 0;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  padding-top: 40px;
  align-items: center;
  & > a {
    color: var(--highlightThemeColor);
    text-align: center;
    margin-top: 15px;
    text-decoration: none;
  }
}
.bold {
  font-weight: 600;
}
/* Folder row styles (previously in treeFolder.vue scoped) */
.folder-name {
  cursor: default;
  user-select: none;
  display: flex;
  align-items: center;
  height: 30px;
  padding-right: 15px;
  & > svg {
    flex-shrink: 0;
    color: var(--sideBarIconColor);
    margin-right: 5px;
  }
  &:hover {
    background: var(--sideBarItemHoverBgColor);
  }
}
/* File row styles (previously in treeFile.vue scoped) */
.side-bar-file {
  display: flex;
  position: relative;
  align-items: center;
  cursor: default;
  user-select: none;
  height: 30px;
  box-sizing: border-box;
  padding-right: 15px;
  &:hover {
    background: var(--sideBarItemHoverBgColor);
  }
  & > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &::before {
    content: '';
    position: absolute;
    display: block;
    left: 0;
    background: var(--themeColor);
    width: 2px;
    height: 0;
    top: 50%;
    transform: translateY(-50%);
    transition: all 0.2s ease;
  }
}
.side-bar-file.current::before {
  height: 100%;
}
.side-bar-file.current > span {
  color: var(--themeColor);
}
.side-bar-file.active > span {
  color: var(--sideBarTitleColor);
}
input.rename {
  height: 22px;
  outline: none;
  margin: 5px 0;
  padding: 0 8px;
  color: var(--sideBarColor);
  border: 1px solid var(--floatBorderColor);
  background: var(--floatBorderColor);
  width: 100%;
  border-radius: 3px;
}
</style>
