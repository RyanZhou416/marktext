import { THEME_STYLE_ID, COMMON_STYLE_ID, DEFAULT_CODE_FONT_FAMILY, oneDarkThemes, railscastsThemes } from '../config'
import { dark, graphite, materialDark, oneDark, ulysses } from './themeColor'
import { isLinux } from './index'
import elementStyle from 'element-plus/dist/index.css?inline'

const ORIGINAL_THEME = '#409EFF'

interface ThemeClusterItem {
  color: string
  variable: string
}

const patchTheme = (css: string): string => {
  return `@media not print {\n${css}\n}`
}

const getEmojiPickerPatch = (): string => {
  return isLinux
    ? '.ag-emoji-picker section .emoji-wrapper .item span { font-family: sans-serif, "Noto Color Emoji"; }'
    : ''
}

const getThemeCluster = (themeColor: string): ThemeClusterItem[] => {
  const tintColor = (color: string, tint: number): string => {
    let red: number = parseInt(color.slice(1, 3), 16)
    let green: number = parseInt(color.slice(3, 5), 16)
    let blue: number = parseInt(color.slice(5, 7), 16)
    if (tint === 0) { // when primary color is in its rgb space
      return [red, green, blue].join(',')
    } else {
      red += Math.round(tint * (255 - red))
      green += Math.round(tint * (255 - green))
      blue += Math.round(tint * (255 - blue))
      const redStr: string = red.toString(16)
      const greenStr: string = green.toString(16)
      const blueStr: string = blue.toString(16)
      return `#${redStr}${greenStr}${blueStr}`
    }
  }

  const clusters: ThemeClusterItem[] = [{
    color: themeColor,
    variable: 'var(--themeColor)'
  }]
  for (let i = 9; i >= 1; i--) {
    clusters.push({
      color: tintColor(themeColor, Number((i / 10).toFixed(2))),
      variable: `var(--themeColor${10 - i}0)`
    })
  }

  return clusters
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

  // change CodeMirror theme
  const cm: Element | null = document.querySelector('.CodeMirror')
  if (cm) {
    cm.classList.remove('cm-s-default')
    cm.classList.remove('cm-s-one-dark')
    cm.classList.remove('cm-s-railscasts')
    if (isCmOneDark) {
      cm.classList.add('cm-s-one-dark')
    } else if (isCmRailscasts) {
      cm.classList.add('cm-s-railscasts')
    } else {
      cm.classList.add('cm-s-default')
    }
  }
}

export const setEditorWidth = (value: string): void => {
  const EDITOR_WIDTH_STYLE_ID = 'editor-width'
  let result = ''
  if (value && /^[0-9]+(?:ch|px|%)$/.test(value)) {
    // Overwrite the theme value and add 100px for padding.
    result = `:root { --editorAreaWidth: calc(100px + ${value}); }`
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
.CodeMirror,
pre.ag-paragraph {
font-family: ${codeFontFamily}, ${DEFAULT_CODE_FONT_FAMILY};
font-size: ${codeFontSize}px;
}

${getEmojiPickerPatch()}
`
}

export const addElementStyle = (): void => {
  const ID = 'mt-el-style'
  let sheet: HTMLStyleElement | null = document.querySelector(`#${ID}`)
  if (sheet) {
    return
  }
  const themeCluster: ThemeClusterItem[] = getThemeCluster(ORIGINAL_THEME)
  let newElementStyle: string = elementStyle
  for (const { color, variable } of themeCluster) {
    newElementStyle = newElementStyle.replace(new RegExp(color, 'ig'), variable)
  }
  sheet = document.createElement('style')
  sheet.id = ID
  // NOTE: Prepend element UI style, otherwise we cannot overwrite the style with the default light theme.
  document.head.insertBefore(sheet, document.head.firstChild)
  sheet.innerHTML = newElementStyle
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
