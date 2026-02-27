import { useEditorStore } from '../stores/editor'

interface TabFile {
  id?: string
  isSaved?: boolean
  [key: string]: any
}

/**
 * Composable for tab operations
 * Replaces tabsMixins
 */
export function useTabs() {
  const editorStore = useEditorStore()

  function selectFile(file: TabFile): void {
    if (file.id !== editorStore.currentFile.id) {
      editorStore.UPDATE_CURRENT_FILE(file)
    }
  }

  function removeFileInTab(file: TabFile): void {
    const { isSaved } = file
    if (isSaved) {
      editorStore.FORCE_CLOSE_TAB(file)
    } else {
      editorStore.CLOSE_UNSAVED_TAB(file)
    }
  }

  return {
    selectFile,
    removeFileInTab
  }
}
