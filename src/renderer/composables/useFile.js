import { ipcRenderer } from '../util/tauri'
import { isSamePathSync } from 'common/filesystem/paths'
import bus from '../bus'
import { useEditorStore } from '../stores/editor'

/**
 * Composable for file operations
 * Replaces fileMixins
 */
export function useFile () {
  const editorStore = useEditorStore()

  function handleSearchResultClick (searchMatch, searchResult) {
    const { range } = searchMatch
    const { filePath } = searchResult

    const openedTab = editorStore.tabs.find((file) =>
      isSamePathSync(file.pathname, filePath)
    )
    const cursor = {
      isCollapsed: range[0][0] !== range[1][0],
      anchor: {
        line: range[0][0],
        ch: range[0][1]
      },
      focus: {
        line: range[1][0],
        ch: range[1][1]
      }
    }

    if (openedTab) {
      openedTab.cursor = cursor
      if (editorStore.currentFile !== openedTab) {
        editorStore.updateCurrentFile(openedTab)
      } else {
        const { id, markdown, cursor, history } = editorStore.currentFile
        bus.$emit('file-changed', {
          id,
          markdown,
          cursor,
          renderCursor: true,
          history
        })
      }
    } else {
      ipcRenderer.send('mt::open-file', filePath, {
        cursor
      })
    }
  }

  function handleFileClick (file) {
    const { isMarkdown, pathname } = file
    if (!isMarkdown) return
    const openedTab = editorStore.tabs.find((f) =>
      isSamePathSync(f.pathname, pathname)
    )
    if (openedTab) {
      if (editorStore.currentFile === openedTab) {
        return
      }
      editorStore.updateCurrentFile(openedTab)
    } else {
      ipcRenderer.send('mt::open-file', pathname, {})
    }
  }

  return {
    handleSearchResultClick,
    handleFileClick
  }
}
