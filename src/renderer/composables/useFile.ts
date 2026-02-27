import { ipcRenderer } from '../util/tauri'
import { isSamePathSync } from 'common/filesystem/paths'
import bus from '../bus'
import { useEditorStore } from '../stores/editor'

type Position = [number, number]
type SearchRange = [Position, Position]

interface SearchMatch {
  range: SearchRange
}

interface SearchResult {
  filePath: string
}

interface FileCursor {
  isCollapsed: boolean
  anchor: { line: number; ch: number }
  focus: { line: number; ch: number }
}

interface FileState {
  id?: string
  pathname: string
  isMarkdown?: boolean
  markdown?: string
  cursor?: FileCursor
  history?: any
  [key: string]: any
}

/**
 * Composable for file operations
 * Replaces fileMixins
 */
export function useFile() {
  const editorStore = useEditorStore()

  function handleSearchResultClick(searchMatch: SearchMatch, searchResult: SearchResult): void {
    const { range } = searchMatch
    const { filePath } = searchResult

    const openedTab = editorStore.tabs.find((file: FileState) =>
      isSamePathSync(file.pathname, filePath)
    )
    const cursor: FileCursor = {
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
        editorStore.UPDATE_CURRENT_FILE(openedTab)
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

  function handleFileClick(file: FileState): void {
    const { isMarkdown, pathname } = file
    if (!isMarkdown) return
    const openedTab = editorStore.tabs.find((f: FileState) => isSamePathSync(f.pathname, pathname))
    if (openedTab) {
      if (editorStore.currentFile === openedTab) {
        return
      }
      editorStore.UPDATE_CURRENT_FILE(openedTab)
    } else {
      ipcRenderer.send('mt::open-file', pathname, {})
    }
  }

  return {
    handleSearchResultClick,
    handleFileClick
  }
}
