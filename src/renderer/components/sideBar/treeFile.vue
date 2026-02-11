<template>
  <FileContextMenu :has-paste-content="!!clipboard" @action="handleContextAction">
    <div
      :title="file.pathname"
      class="side-bar-file"
      :style="{ 'padding-left': `${depth * 20 + 20}px`, opacity: file.isMarkdown ? 1 : 0.75 }"
      @click="handleFileClick(file)"
      :class="[
        { current: currentFile.pathname === file.pathname, active: file.id === activeItem.id }
      ]"
      ref="file"
    >
      <file-icon :name="file.name"></file-icon>
      <input
        type="text"
        @click.stop="noop"
        class="rename"
        v-if="renameCache === file.pathname"
        v-model="newName"
        ref="renameInput"
        @keydown.enter="rename"
      />
      <span v-else>{{ file.name }}</span>
    </div>
  </FileContextMenu>
</template>

<script lang="ts">
import FileIcon from './icon.vue'
import FileContextMenu from './FileContextMenu.vue'
import { mapState } from 'pinia'
import { useProjectStore } from '@/stores/project'
import { useEditorStore } from '@/stores/editor'
import { useFile } from '../../composables/useFile'
import bus from '../../bus'

export default {
  setup() {
    const { handleSearchResultClick, handleFileClick } = useFile()
    return { handleSearchResultClick, handleFileClick }
  },
  name: 'file',
  data() {
    return {
      newName: ''
    }
  },
  props: {
    file: {
      type: Object,
      required: true
    },
    depth: {
      type: Number,
      required: true
    }
  },
  components: {
    FileIcon,
    FileContextMenu
  },
  computed: {
    ...mapState(useProjectStore, ['renameCache', 'activeItem', 'clipboard']),
    ...mapState(useEditorStore, ['currentFile', 'tabs'])
  },
  created() {
    this.$nextTick(() => {
      bus.$on('SIDEBAR::show-rename-input', this.focusRenameInput)
    })
  },
  methods: {
    handleContextAction(action: string) {
      const projectStore = useProjectStore()
      projectStore.CHANGE_ACTIVE_ITEM(this.file)
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
    noop() {},
    focusRenameInput() {
      this.$nextTick(() => {
        if (this.$refs.renameInput) {
          this.$refs.renameInput.focus()
          this.newName = this.file.name
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
