import { ref, nextTick, type Ref } from 'vue'
import { useProjectStore } from '../stores/project'

interface FolderNode {
  isCollapsed?: boolean
  [key: string]: any
}

/**
 * Composable for creating files and directories
 * Replaces createFileOrDirectoryMixins
 */
export function useCreateFileOrDirectory(
  inputRef: Ref<HTMLInputElement | null>,
  folder?: Ref<FolderNode | null>
) {
  const projectStore = useProjectStore()
  const createName = ref('')

  function handleInputFocus(): void {
    nextTick(() => {
      if (inputRef.value) {
        inputRef.value.focus()
        createName.value = ''
        if (folder?.value) {
          folder.value.isCollapsed = false
        }
      }
    })
  }

  function handleInputEnter(): void {
    projectStore.CREATE_FILE_DIRECTORY(createName.value)
  }

  return {
    createName,
    handleInputFocus,
    handleInputEnter
  }
}
