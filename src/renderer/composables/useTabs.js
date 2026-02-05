import { useEditorStore } from '../stores/editor'

/**
 * Composable for tab operations
 * Replaces tabsMixins
 */
export function useTabs () {
  const editorStore = useEditorStore()

  function selectFile (file) {
    if (file.id !== editorStore.currentFile.id) {
      editorStore.updateCurrentFile(file)
    }
  }

  function removeFileInTab (file) {
    const { isSaved } = file
    if (isSaved) {
      editorStore.forceCloseTab(file)
    } else {
      editorStore.closeUnsavedTab(file)
    }
  }

  return {
    selectFile,
    removeFileInTab
  }
}
