/**
 * IEditorEngine - Abstract interface for markdown editor engines.
 * Implemented by MuyaAdapter (and future MilkdownAdapter).
 */

import type {
  CursorState,
  TOCEntry,
  FormatType,
  ParagraphType,
  TableSpec,
  ImageInfo,
  SearchOptions,
  ReplaceOptions,
  SearchMatchesResult,
  SelectionPayload,
  ExportHTMLOptions,
  EditorOptions,
  ChangePayload,
  FormatClickPayload,
  PreviewImagePayload,
  SelectionChangePayload,
  SelectionFormatsPayload
} from './types'

export type EditorEventName =
  | 'change'
  | 'format-click'
  | 'preview-image'
  | 'selectionChange'
  | 'selectionFormats'
  | 'focus'
  | 'blur'
  | 'crashed'

export type EditorEventHandler =
  | ((payload: ChangePayload) => void)
  | ((payload: FormatClickPayload) => void)
  | ((payload: PreviewImagePayload) => void)
  | ((payload: SelectionChangePayload) => void)
  | ((payload: SelectionFormatsPayload) => void)
  | (() => void)

export interface IEditorEngine {
  /** Root container element (for scroll, typewriter mode, etc.) */
  readonly container: HTMLElement

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  mount(element: HTMLElement, options: EditorOptions): void | Promise<void>
  destroy(): void

  // -------------------------------------------------------------------------
  // Content
  // -------------------------------------------------------------------------

  getMarkdown(): string
  setMarkdown(markdown: string, cursor?: CursorState, renderCursor?: boolean): void
  getCursor(): CursorState
  setCursor(cursor: CursorState): void
  getHistory(): unknown
  setHistory(history: unknown): void
  clearHistory(): void
  getWordCount(markdown?: string): number
  getTOC(): TOCEntry[]

  // -------------------------------------------------------------------------
  // Editing
  // -------------------------------------------------------------------------

  format(type: FormatType): void
  updateParagraph(type: ParagraphType): void
  createTable(spec: TableSpec): void
  insertImage(info: ImageInfo): void
  duplicate(): void
  deleteParagraph(blockKey?: string): void
  insertParagraph(location: 'before' | 'after', text?: string, outMost?: boolean): void
  undo(): void
  redo(): void
  selectAll(): void

  // -------------------------------------------------------------------------
  // Search & Replace
  // -------------------------------------------------------------------------

  search(value: string, options: SearchOptions): SearchMatchesResult
  replace(value: string, options: ReplaceOptions): SearchMatchesResult
  find(action: 'pre' | 'next'): SearchMatchesResult
  getSelection(): SelectionPayload

  // -------------------------------------------------------------------------
  // Export
  // -------------------------------------------------------------------------

  exportStyledHTML(options?: ExportHTMLOptions): Promise<string>

  // -------------------------------------------------------------------------
  // State & Config
  // -------------------------------------------------------------------------

  focus(): void
  blur(removeRange?: boolean, unSelect?: boolean): void
  hasFocus(): boolean
  hasSelectionInTable(): boolean
  setFocusMode(enabled: boolean): void
  setFont(options: { fontSize?: number; lineHeight?: number | string }): void
  setTabSize(tabSize: number): void
  setListIndentation(value: number | string): void
  setOptions(options: Partial<EditorOptions>, needRender?: boolean): void
  invalidateImageCache(): void
  hideAllFloatTools(): void

  /** Optional: get 1-based line number from DOM node (e.g. heading). Used for "click heading to show source". */
  getLineFromDOMNode?(node: Node): number | null

  // -------------------------------------------------------------------------
  // Spellcheck (optional, Muya-specific)
  // -------------------------------------------------------------------------

  replaceMisspelling?(word: string, replacement: string): void

  // -------------------------------------------------------------------------
  // Copy/Paste (optional)
  // -------------------------------------------------------------------------

  copyAsMarkdown?(): void
  copyAsHtml?(): void
  pasteAsPlainText?(): void

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------

  on(event: EditorEventName, handler: EditorEventHandler): void
  off(event: EditorEventName, handler: EditorEventHandler): void
  once(event: EditorEventName, handler: EditorEventHandler): void
}
