import {
  THEME_STYLE_ID,
  COMMON_STYLE_ID,
  DEFAULT_CODE_FONT_FAMILY,
  oneDarkThemes,
  railscastsThemes
} from '../config'
import {
  dark,
  everforestDark,
  everforestLight,
  graphite,
  materialDark,
  oneDark,
  ulysses
} from './themeColor'
import { isLinux } from './index'

const patchTheme = (css: string): string => {
  return `@media not print {\n${css}\n}`
}

const getEmojiPickerPatch = (): string => {
  return isLinux
    ? '.ag-emoji-picker section .emoji-wrapper .item span { font-family: sans-serif, "Noto Color Emoji"; }'
    : ''
}

export const addThemeStyle = (theme: string): void => {
  const isCmRailscasts: boolean = railscastsThemes.includes(theme)
  const isCmOneDark: boolean = oneDarkThemes.includes(theme)
  const isDarkTheme: boolean = isCmOneDark || isCmRailscasts
  let themeStyleEle: HTMLStyleElement | null = document.querySelector(`#${THEME_STYLE_ID}`)
  if (!themeStyleEle) {
    themeStyleEle = document.createElement('style')
    themeStyleEle.id = THEME_STYLE_ID
    document.head.appendChild(themeStyleEle)
  }

  switch (theme) {
    case 'light':
      themeStyleEle.innerHTML = ''
      break
    case 'dark':
      themeStyleEle.innerHTML = patchTheme(dark())
      break
    case 'material-dark':
      themeStyleEle.innerHTML = patchTheme(materialDark())
      break
    case 'ulysses':
      themeStyleEle.innerHTML = patchTheme(ulysses())
      break
    case 'graphite':
      themeStyleEle.innerHTML = patchTheme(graphite())
      break
    case 'everforest-light':
      themeStyleEle.innerHTML = patchTheme(everforestLight())
      break
    case 'everforest-dark':
      themeStyleEle.innerHTML = patchTheme(everforestDark())
      break
    case 'one-dark':
      themeStyleEle.innerHTML = patchTheme(oneDark())
      break
    default:
      console.log('unknown theme')
      break
  }

  // workaround: use dark icons
  document.body.classList.remove('dark')
  if (isDarkTheme) {
    document.body.classList.add('dark')
  }

  // CodeMirror 6 theme: applied at creation in sourceCode.vue.
  // Theme switching while in source code view requires tab switch to take effect.
}

export const setEditorWidth = (value: string): void => {
  const EDITOR_WIDTH_STYLE_ID = 'editor-width'
  let result = ''
  if (value && /^[0-9]+(?:ch|px|%)$/.test(value)) {
    const editorAreaWidth = `calc(100px + ${value})`
    // Overwrite the theme value and add 100px for padding.
    // #ag-editor-id: Muya; .editor-component .milkdown: Milkdown; .source-code .cm-editor: Source code view
    result = `
:root { --editorAreaWidth: ${editorAreaWidth}; }
#ag-editor-id,
.editor-component .milkdown,
.source-code .cm-editor {
  width: min(100%, var(--editorAreaWidth));
  margin-left: auto;
  margin-right: auto;
}
`
  }
  let styleEle: HTMLStyleElement | null = document.querySelector(`#${EDITOR_WIDTH_STYLE_ID}`)
  if (!styleEle) {
    styleEle = document.createElement('style')
    styleEle.setAttribute('id', EDITOR_WIDTH_STYLE_ID)
    document.head.appendChild(styleEle)
  }

  styleEle.innerHTML = result
}

interface CommonStyleOptions {
  codeFontFamily: string
  codeFontSize: number
  hideScrollbar: boolean
}

export const addCommonStyle = (options: CommonStyleOptions): void => {
  const { codeFontFamily, codeFontSize, hideScrollbar } = options
  let sheet: HTMLStyleElement | null = document.querySelector(`#${COMMON_STYLE_ID}`)
  if (!sheet) {
    sheet = document.createElement('style')
    sheet.id = COMMON_STYLE_ID
    document.head.appendChild(sheet)
  }

  let scrollbarStyle = ''
  if (hideScrollbar) {
    scrollbarStyle = '::-webkit-scrollbar {display: none;}'
  }

  sheet.innerHTML = `${scrollbarStyle}
span code,
td code,
th code,
code,
code[class*="language-"],
.cm-editor,
pre.ag-paragraph {
font-family: ${codeFontFamily}, ${DEFAULT_CODE_FONT_FAMILY};
font-size: ${codeFontSize}px;
}

${getEmojiPickerPatch()}
`
}

interface AddStylesOptions extends CommonStyleOptions {
  theme: string
}

// Append common sheet and theme at the end of head - order is important.
export const addStyles = (options: AddStylesOptions): void => {
  const { theme } = options
  addThemeStyle(theme)
  addCommonStyle(options)
}
