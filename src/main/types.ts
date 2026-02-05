/**
 * Type definitions for MarkText main process
 */

import { BrowserWindow, MenuItem, Menu, App } from 'electron'

// Global declarations
declare global {
  var __static: string
  var MARKTEXT_GIT_SHORT_HASH: string
  var MARKTEXT_GIT_HASH: string
  var MARKTEXT_VERSION: string
  var MARKTEXT_VERSION_STRING: string
  var MARKTEXT_IS_STABLE: boolean
}

// Application environment paths
export interface AppPaths {
  userDataPath: string
  logPath: string
  configPath: string
  prefPath: string
  themePath: string
}

// Application environment
export interface AppEnvironment {
  paths: AppPaths
  isFirstStartup: boolean
  args: CliArgs
}

// CLI arguments
export interface CliArgs {
  _: string[]
  '--disable-gpu'?: boolean
  '--new-window'?: boolean
  '--safe-mode'?: boolean
  '--verbose'?: boolean
  '--help'?: boolean
  '--version'?: boolean
  '-n'?: boolean
  '-s'?: boolean
  '-v'?: boolean
  '-h'?: boolean
  [key: string]: unknown
}

// Window type enum
export type WindowType = 'editor' | 'settings'

// Accessor preferences
export interface Preferences {
  autoSave: boolean
  autoSaveDelay: number
  titleBarStyle: string
  hideScrollbar: boolean
  aidou: boolean
  fileSortBy: string
  startUpAction: string
  defaultDirectoryToOpen: string
  language: string
  editorFontFamily: string
  fontSize: number
  lineHeight: number
  codeFontSize: number
  codeFontFamily: string
  codeBlockLineNumbers: boolean
  trimUnnecessaryCodeBlockEmptyLines: boolean
  autoPairBracket: boolean
  autoPairMarkdownSyntax: boolean
  autoPairQuote: boolean
  endOfLine: string
  defaultEncoding: string
  autoGuessEncoding: boolean
  textDirection: string
  openFilesInNewWindow: boolean
  openFolderInNewWindow: boolean
  zoom: number
  hideQuickInsertHint: boolean
  hideLinkPopup: boolean
  autoCheck: boolean
  preferLooseListItem: boolean
  bulletListMarker: string
  orderListDelimiter: string
  preferHeadingStyle: string
  tabSize: number
  listIndentation: string
  frontmatterType: string
  superSubScript: boolean
  footnote: boolean
  isHtmlEnabled: boolean
  isGitlabCompatibilityEnabled: boolean
  sequenceTheme: string
  theme: string
  autoSwitchTheme: number
  spellcheckerEnabled: boolean
  spellcheckerNoUnderline: boolean
  spellcheckerAutoDetectLanguage: boolean
  spellcheckerLanguage: string
  sideBarVisibility: boolean
  tabBarVisibility: boolean
  sourceCodeModeEnabled: boolean
  searchExclusions: string[]
  searchMaxFileSize: string
  searchIncludeHidden: boolean
  searchNoIgnore: boolean
  searchFollowSymlinks: boolean
  watcherUsePolling: boolean
  imageInsertAction: string
  imagePreferRelativeDirectory: boolean
  imageRelativeDirectoryName: string
  [key: string]: unknown
}

// Editor tab
export interface EditorTab {
  id: string
  pathname: string
  filename: string
  markdown: string
  encoding: string
  lineEnding: string
  isSaved: boolean
  wordCount: WordCount
  cursor?: CursorState
  history?: HistoryState
}

// Word count
export interface WordCount {
  word: number
  character: number
  paragraph: number
  all: number
}

// Cursor state
export interface CursorState {
  start: { line: number; ch: number }
  end: { line: number; ch: number }
}

// History state
export interface HistoryState {
  stack: unknown[]
  index: number
}

// Menu action
export interface MenuAction {
  id: string
  label: string
  accelerator?: string
  click?: (menuItem: MenuItem, browserWindow: BrowserWindow, event: KeyboardEvent) => void
  enabled?: boolean
  visible?: boolean
  submenu?: MenuAction[]
}

// File information
export interface FileInfo {
  pathname: string
  filename: string
  extension: string
  size: number
  birthTime: Date
  modifyTime: Date
  isDirectory: boolean
  isFile: boolean
  isSymlink: boolean
}

// Tree item (for sidebar)
export interface TreeItem {
  pathname: string
  name: string
  isDirectory: boolean
  isFile: boolean
  isMarkdown: boolean
  children?: TreeItem[]
}

// IPC channel types
export type IpcChannel = `mt::${string}`

// Window info
export interface WindowInfo {
  id: number
  type: WindowType
  pathname?: string
}

// Theme
export interface Theme {
  name: string
  css: string
}

// Keybinding
export interface Keybinding {
  id: string
  description: string
  accelerator: string
}

export {}
