/**
 * MuyaAdapter - IEditorEngine implementation wrapping the Muya markdown editor.
 */

import Muya from 'muya/lib'
import TablePicker from 'muya/lib/ui/tablePicker'
import QuickInsert from 'muya/lib/ui/quickInsert'
import CodePicker from 'muya/lib/ui/codePicker'
import EmojiPicker from 'muya/lib/ui/emojiPicker'
import ImagePathPicker from 'muya/lib/ui/imagePicker'
import ImageSelector from 'muya/lib/ui/imageSelector'
import ImageToolbar from 'muya/lib/ui/imageToolbar'
import Transformer from 'muya/lib/ui/transformer'
import FormatPicker from 'muya/lib/ui/formatPicker'
import LinkTools from 'muya/lib/ui/linkTools'
import FootnoteTool from 'muya/lib/ui/footnoteTool'
import TableBarTools from 'muya/lib/ui/tableTools'
import FrontMenu from 'muya/lib/ui/frontMenu'

import type { IEditorEngine } from '../interface'
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
  EditorOptions
} from '../types'

/** Muya instance type (untyped) */
type MuyaInstance = InstanceType<typeof Muya>

/** Whether Muya plugins have been registered (static, once per app) */
let pluginsRegistered = false

function ensurePluginsRegistered(pluginOptions?: {
  unsplashAccessKey?: string
  photoCreatorClick?: (url: string) => void
  jumpClick?: (linkInfo: { href: string }) => void
}) {
  if (pluginsRegistered) return
  Muya.use(TablePicker)
  Muya.use(QuickInsert)
  Muya.use(CodePicker)
  Muya.use(EmojiPicker)
  Muya.use(ImagePathPicker)
  Muya.use(
    ImageSelector,
    pluginOptions?.unsplashAccessKey
      ? {
          unsplashAccessKey: pluginOptions.unsplashAccessKey,
          photoCreatorClick: pluginOptions.photoCreatorClick
        }
      : {}
  )
  Muya.use(Transformer)
  Muya.use(ImageToolbar)
  Muya.use(FormatPicker)
  Muya.use(FrontMenu)
  Muya.use(LinkTools, pluginOptions?.jumpClick ? { jumpClick: pluginOptions.jumpClick } : {})
  Muya.use(FootnoteTool)
  Muya.use(TableBarTools)
  pluginsRegistered = true
}

function mapSearchOptions(opt: SearchOptions): Record<string, unknown> {
  return {
    isCaseSensitive: opt.caseSensitive ?? opt.isCaseSensitive ?? false,
    isWholeWord: opt.wholeWord ?? opt.isWholeWord ?? false,
    isRegexp: opt.isRegex ?? opt.isRegexp ?? false,
    selectHighlight: opt.selectHighlight ?? false,
    highlightIndex: opt.highlightIndex ?? -1
  }
}

function mapReplaceOptions(opt: ReplaceOptions): Record<string, unknown> {
  const base = mapSearchOptions(opt)
  return {
    ...base,
    replaceValue: opt.replaceValue,
    isSingle: opt.isSingle ?? true
  }
}

export class MuyaAdapter implements IEditorEngine {
  private muya: MuyaInstance | null = null
  private _container: HTMLElement | null = null

  get container(): HTMLElement {
    if (!this._container) throw new Error('MuyaAdapter: not mounted')
    return this._container
  }

  mount(element: HTMLElement, options: EditorOptions): void {
    ensurePluginsRegistered({
      unsplashAccessKey: (options as Record<string, unknown>).unsplashAccessKey as
        | string
        | undefined,
      photoCreatorClick: options.photoCreatorClick as ((url: string) => void) | undefined,
      jumpClick: options.jumpClick as ((linkInfo: { href: string }) => void) | undefined
    })

    const muyaOptions: Record<string, unknown> = {
      ...options,
      imageAction: options.imageAction,
      imagePathPicker: options.imagePathPicker,
      clipboardFilePath: options.clipboardFilePath ?? (() => null),
      imagePathAutoComplete: options.imagePathAutoComplete
    }

    const instance = new Muya(element, muyaOptions) as MuyaInstance
    this.muya = instance
    this._container = instance.container
  }

  destroy(): void {
    if (this.muya) {
      this.muya.destroy()
      this.muya = null
      this._container = null
    }
  }

  getMarkdown(): string {
    return this.muya!.getMarkdown()
  }

  setMarkdown(markdown: string, cursor?: CursorState, renderCursor = true): void {
    this.muya!.setMarkdown(markdown, cursor, renderCursor)
  }

  getCursor(): CursorState {
    return this.muya!.getCursor() as CursorState
  }

  setCursor(cursor: CursorState): void {
    this.muya!.setCursor(cursor)
  }

  getHistory(): unknown {
    return this.muya!.getHistory()
  }

  setHistory(history: unknown): void {
    this.muya!.setHistory(history)
  }

  clearHistory(): void {
    this.muya!.clearHistory()
  }

  getWordCount(markdown?: string): number {
    return this.muya!.getWordCount(markdown)
  }

  getTOC(): TOCEntry[] {
    return this.muya!.getTOC() as TOCEntry[]
  }

  format(type: FormatType): void {
    this.muya!.format(type)
  }

  updateParagraph(type: ParagraphType): void {
    this.muya!.updateParagraph(type)
  }

  createTable(spec: TableSpec): void {
    this.muya!.createTable(spec)
  }

  insertImage(info: ImageInfo): void {
    this.muya!.insertImage(info)
  }

  duplicate(): void {
    this.muya!.duplicate()
  }

  deleteParagraph(blockKey?: string): void {
    this.muya!.deleteParagraph(blockKey)
  }

  insertParagraph(location: 'before' | 'after', text = '', outMost = false): void {
    this.muya!.insertParagraph(location, text, outMost)
  }

  undo(): void {
    this.muya!.undo()
  }

  redo(): void {
    this.muya!.redo()
  }

  selectAll(): void {
    this.muya!.selectAll()
  }

  search(value: string, options: SearchOptions): SearchMatchesResult {
    const opt = mapSearchOptions(options) as { selectHighlight?: boolean }
    return this.muya!.search(value, opt) as SearchMatchesResult
  }

  replace(value: string, options: ReplaceOptions): SearchMatchesResult {
    const opt = mapReplaceOptions(options)
    return this.muya!.replace(value, opt) as SearchMatchesResult
  }

  find(action: 'pre' | 'next'): SearchMatchesResult {
    return this.muya!.find(action) as SearchMatchesResult
  }

  getSelection(): SelectionPayload {
    return this.muya!.getSelection() as SelectionPayload
  }

  async exportStyledHTML(options?: ExportHTMLOptions): Promise<string> {
    const result = this.muya!.exportStyledHTML(options)
    return Promise.resolve(result)
  }

  focus(): void {
    this.muya!.focus()
  }

  blur(removeRange = false, unSelect = false): void {
    this.muya!.blur(removeRange, unSelect)
  }

  hasFocus(): boolean {
    return this.muya!.hasFocus()
  }

  hasSelectionInTable(): boolean {
    const cs = (this.muya as unknown as { contentState?: { selectedTableCells?: unknown } })
      .contentState
    return !!cs?.selectedTableCells
  }

  setFocusMode(enabled: boolean): void {
    this.muya!.setFocusMode(enabled)
  }

  setFont(options: { fontSize?: number; lineHeight?: number | string }): void {
    this.muya!.setFont(options)
  }

  setTabSize(tabSize: number): void {
    this.muya!.setTabSize(tabSize)
  }

  setListIndentation(value: number | string): void {
    this.muya!.setListIndentation(value)
  }

  setOptions(options: Partial<EditorOptions>, needRender?: boolean): void {
    this.muya!.setOptions(options, needRender)
  }

  invalidateImageCache(): void {
    this.muya!.invalidateImageCache()
  }

  hideAllFloatTools(): void {
    this.muya!.hideAllFloatTools()
  }

  replaceMisspelling(word: string, replacement: string): void {
    ;(
      this.muya as unknown as { _replaceCurrentWordInlineUnsafe: (w: string, r: string) => void }
    )._replaceCurrentWordInlineUnsafe(word, replacement)
  }

  copyAsMarkdown(): void {
    this.muya!.copyAsMarkdown()
  }

  copyAsHtml(): void {
    this.muya!.copyAsHtml()
  }

  pasteAsPlainText(): void {
    this.muya!.pasteAsPlainText()
  }

  on(event: string, handler: (...args: unknown[]) => void): void {
    this.muya!.on(event, handler)
  }

  off(event: string, handler: (...args: unknown[]) => void): void {
    this.muya!.off(event, handler)
  }

  once(event: string, handler: (...args: unknown[]) => void): void {
    this.muya!.once(event, handler)
  }
}
