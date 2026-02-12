import { useEditorStore } from '../stores/editor'

/**
 * Composable for tab operations
 * Replaces tabsMixins
 */
export function useTabs() {
  const editorStore = useEditorStore()

  function selectFile(file) {
    if (file.id !== editorStore.currentFile.id) {
      editorStore.UPDATE_CURRENT_FILE(file)
    }
  }

  function removeFileInTab(file) {
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
