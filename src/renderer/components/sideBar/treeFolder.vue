<template>
  <div class="side-bar-folder">
    <FileContextMenu :has-paste-content="!!clipboard" @action="handleContextAction">
      <div
        class="folder-name"
        @click="folderNameClick"
        :style="{ 'padding-left': `${depth * 20 + 20}px` }"
        :class="[{ active: folder.id === activeItem.id }]"
        :title="folder.pathname"
        ref="folder"
      >
        <svg class="icon" aria-hidden="true">
          <use
            :xlink:href="`#${folder.isCollapsed ? 'icon-folder-close' : 'icon-folder-open'}`"
          ></use>
        </svg>
        <input
          type="text"
          @click.stop="noop"
          class="rename"
          v-if="renameCache === folder.pathname"
          v-model="newName"
          ref="renameInput"
          @keydown.enter="rename"
        />
        <span v-else class="text-overflow">{{ folder.name }}</span>
      </div>
    </FileContextMenu>
    <div class="folder-contents" v-if="!folder.isCollapsed">
      <folder
        v-for="(childFolder, index) of folder.folders"
        :key="index + 'folder'"
        :folder="childFolder"
        :depth="depth + 1"
      ></folder>
      <input
        type="text"
        v-if="createCache.dirname === folder.pathname"
        class="new-input"
        :style="{ 'margin-left': `${depth * 5 + 15}px` }"
        ref="input"
        @keydown.enter="handleInputEnter"
        v-model="createName"
      />
      <file
        v-for="(file, index) of folder.files"
        :key="index + 'file'"
        :file="file"
        :depth="depth + 1"
      ></file>
    </div>
  </div>
</template>

<script lang="ts">
import { mapState } from 'pinia'
import { useProjectStore } from '@/stores/project'
import FileContextMenu from './FileContextMenu.vue'
import bus from '../../bus'
import { ref, toRef } from 'vue'
import { useCreateFileOrDirectory } from '../../composables/useCreateFileOrDirectory'

export default {
  setup(props) {
    const inputRef = ref(null)
    const folderRef = toRef(props, 'folder')
    const { createName, handleInputFocus, handleInputEnter } = useCreateFileOrDirectory(
      inputRef,
      folderRef
    )
    return { createName, handleInputFocus, handleInputEnter, input: inputRef }
  },
  name: 'folder',
  data() {
    return {
      newName: ''
    }
  },
  props: {
    folder: {
      type: Object,
      required: true
    },
    depth: {
      type: Number,
      required: true
    }
  },
  components: {
    File: () => import('./treeFile.vue'),
    FileContextMenu
  },
  computed: {
    ...mapState(useProjectStore, ['renameCache', 'createCache', 'activeItem', 'clipboard'])
  },
  created() {
    this.$nextTick(() => {
      bus.$on('SIDEBAR::show-new-input', this.handleInputFocus)
      bus.$on('SIDEBAR::show-rename-input', this.focusRenameInput)
    })
  },
  methods: {
    handleContextAction(action: string) {
      const projectStore = useProjectStore()
      projectStore.CHANGE_ACTIVE_ITEM(this.folder)
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
    folderNameClick() {
      this.folder.isCollapsed = !this.folder.isCollapsed
    },
    noop() {},
    focusRenameInput() {
      this.$nextTick(() => {
        if (this.$refs.renameInput) {
          this.$refs.renameInput.focus()
          this.newName = this.folder.name
        }
      })
    },
    rename() {
      const { newName } = this
      if (newName) {
        const projectStore = useProjectStore()
        projectStore.RENAME_IN_SIDEBAR(newName)
      }
    }
  }
}
</script>

<style scoped>
.side-bar-folder {
  & > .folder-name {
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
}
.new-input,
input.rename {
  outline: none;
  height: 22px;
  margin: 5px 0;
  padding: 0 6px;
  color: var(--sideBarColor);
  border: 1px solid var(--floatBorderColor);
  background: var(--floatBorderColor);
  width: 70%;
  border-radius: 3px;
}
</style>
