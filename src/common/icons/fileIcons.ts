/**
 * File icons - shared wrapper for @marktext/file-icons.
 * Used by sidebar and other components, independent of editor engine.
 */

import '@marktext/file-icons/build/index.css'
import fileIcons from '@marktext/file-icons'

const fileIconsWithClass = {
  ...fileIcons,
  getClassByName(name: string): string | null {
    const icon = fileIcons.matchName(name)
    return icon ? icon.getClass(0, false) : null
  },
  getClassByLanguage(lang: string): string | null {
    const icon = fileIcons.matchLanguage(lang)
    return icon ? icon.getClass(0, false) : null
  }
}

export default fileIconsWithClass
