/**
 * Shared types for the editor abstraction layer (IEditorEngine).
 * Used by both MuyaAdapter and future MilkdownAdapter.
 */

// ---------------------------------------------------------------------------
// Cursor & Selection
// ---------------------------------------------------------------------------

export interface CursorPosition {
  line: number
  ch: number
}

export interface CursorState {
  anchor: CursorPosition
  focus: CursorPosition
}

export interface CursorCoords {
  y: number
}

export interface SelectionPayload {
  cursorCoords: CursorCoords
  start?: { key: string; offset: number }
  end?: { key: string; offset: number }
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// TOC
// ---------------------------------------------------------------------------

export interface TOCEntry {
  slug: string
  content: string
  lvl: number
}

// ---------------------------------------------------------------------------
// Format & Paragraph
// ---------------------------------------------------------------------------

export type FormatType =
  | 'strong'
  | 'em'
  | 'del'
  | 'u'
  | 'mark'
  | 'inline_code'
  | 'inline_math'
  | 'link'
  | 'image'
  | 'clear'

export type ParagraphType =
  | 'p'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'blockquote'
  | 'ul'
  | 'ol'
  | 'li'
  | 'pre'
  | 'figure'
  | 'loose-list-item'
  | 'task-list-item'
  | 'multiplemath'
  | 'thematicBreakLine'
  | string

// ---------------------------------------------------------------------------
// Table & Image
// ---------------------------------------------------------------------------

export interface TableSpec {
  rows: number
  columns: number
}

export interface ImageInfo {
  src: string
  alt?: string
  title?: string
}

// ---------------------------------------------------------------------------
// Search & Replace
// ---------------------------------------------------------------------------

export interface SearchOptions {
  caseSensitive?: boolean
  wholeWord?: boolean
  isRegex?: boolean
  selectHighlight?: boolean
  highlightIndex?: number
  isCaseSensitive?: boolean
  isWholeWord?: boolean
  isRegexp?: boolean
}

export interface ReplaceOptions extends SearchOptions {
  replaceValue?: string
  isSingle?: boolean
}

export interface SearchMatch {
  range?: [[number, number], [number, number]]
  match?: string
  subMatches?: string[]
  key?: string
  start?: number
  end?: number
  [key: string]: unknown
}

export interface SearchMatchesResult {
  value: string
  matches: SearchMatch[]
  index: number
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface ChangePayload {
  markdown: string
  wordCount: number
  cursor: CursorState
  history: unknown
  toc: TOCEntry[]
}

export interface FormatClickPayload {
  event: MouseEvent
  formatType: FormatType
  data: { href?: string; alt?: string; src?: string; [key: string]: unknown }
}

export interface PreviewImagePayload {
  data: { src?: string; alt?: string; [key: string]: unknown }
}

export interface SelectionChangePayload {
  cursorCoords: CursorCoords
  start?: unknown
  end?: unknown
  affiliation?: unknown[]
  [key: string]: unknown
}

export type SelectionFormatsPayload = Record<string, unknown>

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export interface ExportHTMLOptions {
  title?: string
  extraCss?: string
  toc?: string
  printOptimization?: boolean
  header?: string
  footer?: string
  headerFooterStyled?: boolean
}

// ---------------------------------------------------------------------------
// Editor Options (Muya-compatible subset)
// ---------------------------------------------------------------------------

export interface EditorOptions {
  markdown?: string
  focusMode?: boolean
  fontSize?: number
  lineHeight?: number | string
  tabSize?: number
  codeBlockLineNumbers?: boolean
  preferLooseListItem?: boolean
  autoPairBracket?: boolean
  autoPairMarkdownSyntax?: boolean
  autoPairQuote?: boolean
  bulletListMarker?: string
  orderListDelimiter?: string
  listIndentation?: number | string
  frontmatterType?: string
  superSubScript?: boolean
  footnote?: boolean
  disableHtml?: boolean
  isGitlabCompatibilityEnabled?: boolean
  sequenceTheme?: string
  mermaidTheme?: string
  vegaTheme?: string
  hideQuickInsertHint?: boolean
  autoCheck?: boolean
  spellcheckEnabled?: boolean
  trimUnnecessaryCodeBlockEmptyLines?: boolean
  imageAction?: (image: unknown, id: string, alt?: string) => Promise<string>
  imagePathPicker?: () => void
  imagePathAutoComplete?: (
    src: string
  ) => Promise<Array<{ text: string; iconClass: string; type: string }>>
  clipboardFilePath?: () => string | null
  photoCreatorClick?: (url: string) => void
  jumpClick?: (linkInfo: { href: string }) => void
  [key: string]: unknown
}
