import { ref, nextTick } from 'vue'
import { useProjectStore } from '../stores/project'

/**
 * Composable for creating files and directories
 * Replaces createFileOrDirectoryMixins
 */
export function useCreateFileOrDirectory (inputRef, folder) {
  const projectStore = useProjectStore()
  const createName = ref('')

  function handleInputFocus () {
    nextTick(() => {
      if (inputRef.value) {
        inputRef.value.focus()
        createName.value = ''
        if (folder && folder.value) {
          folder.value.isCollapsed = false
        }
      }
    })
  }

  function handleInputEnter () {
    projectStore.createFileDirectory(createName.value)
  }

  return {
    createName,
    handleInputFocus,
    handleInputEnter
  }
}
