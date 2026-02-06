import { isLinux, isOsx, isWindows } from './index'
import { clipboard } from './tauri'

// plist was used for macOS NSFilenamesPboardType clipboard parsing
// In Tauri, clipboard.has() always returns false, so plist is not needed
const plist = { parse: (data) => [] }

const hasClipboardFiles = () => {
  return clipboard.has('NSFilenamesPboardType')
}

const getClipboardFiles = () => {
  if (!hasClipboardFiles()) {
    return []
  }
  return plist.parse(clipboard.read('NSFilenamesPboardType'))
}

export const guessClipboardFilePath = () => {
  if (isLinux) return ''
  if (isOsx) {
    const result = getClipboardFiles()
    return Array.isArray(result) && result.length ? result[0] : ''
  } else if (isWindows) {
    const rawFilePath = clipboard.read('FileNameW')
    const filePath = rawFilePath.replace(
      new RegExp(String.fromCharCode(0), 'g'),
      ''
    )
    return filePath && typeof filePath === 'string' ? filePath : ''
  } else {
    return ''
  }
}
