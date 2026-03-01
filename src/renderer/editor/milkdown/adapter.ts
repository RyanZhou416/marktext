/**
 * MilkdownAdapter - IEditorEngine implementation wrapping Milkdown.
 * Minimal MVP: mount, getMarkdown, setMarkdown, change event, focus, destroy.
 */

import {
  Editor,
  rootCtx,
  defaultValueCtx,
  editorViewCtx,
  editorStateCtx,
  serializerCtx,
  parserCtx,
  commandsCtx
} from '@milkdown/core'
import { commonmark, toggleStrongCommand, toggleEmphasisCommand } from '@milkdown/preset-commonmark'
import { gfm, toggleStrikethroughCommand, insertTableCommand } from '@milkdown/preset-gfm'
import { history, undoCommand, redoCommand } from '@milkdown/plugin-history'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { clipboard } from '@milkdown/plugin-clipboard'
import { upload } from '@milkdown/plugin-upload'
import { emoji } from '@milkdown/plugin-emoji'
import { TextSelection, EditorState } from '@milkdown/prose/state'
import type { MarkType } from '@milkdown/prose/model'
import { syntaxDecoration } from './syntaxDecoPlugin'

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
  EditorOptions,
  ChangePayload
} from '../types'

type MilkdownEditor = InstanceType<typeof Editor>

const NOT_IMPLEMENTED = (method: string) => () => {
  console.warn(`[MilkdownAdapter] ${method} not yet implemented`)
}

export class MilkdownAdapter implements IEditorEngine {
  private editor: MilkdownEditor | null = null
  private _container: HTMLElement | null = null
  private _rootElement: HTMLElement | null = null
  private _eventHandlers: Map<string, Set<(...args: unknown[]) => void>> = new Map()
  private _options: EditorOptions = {}

  get container(): HTMLElement {
    if (!this._container) throw new Error('MilkdownAdapter: not mounted')
    return this._container
  }

  mount(element: HTMLElement, options: EditorOptions): Promise<void> {
    this._options = { ...options }
    const markdown = (options.markdown as string) ?? ''
    const editor = Editor.make()
      .config(ctx => {
        ctx.set(rootCtx, element)
        ctx.set(defaultValueCtx, markdown)
        ctx.get(listenerCtx).markdownUpdated((_ctx, md) => {
          this._emit('change', {
            markdown: md,
            wordCount: this._wordCount(md),
            cursor: this.getCursor(),
            history: null,
            toc: []
          } as ChangePayload)
        })
        ctx.get(listenerCtx).focus(() => this._emit('focus'))
        ctx.get(listenerCtx).blur(() => this._emit('blur'))
        ctx.get(listenerCtx).selectionUpdated((ctx, selection) => {
          this._emitSelectionChange(ctx, selection)
          this._emitSelectionFormats(ctx, selection)
        })
      })
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(listener)
      .use(clipboard)
      .use(upload)
      .use(emoji)
      .use(syntaxDecoration)

    return editor.create().then(() => {
      this.editor = editor
      const view = editor.ctx?.get(editorViewCtx)
      this._rootElement = element
      this._container = view?.dom ?? element
      this._applyOptions()
    })
  }

  destroy(): void {
    if (this.editor) {
      this.editor.destroy()
      this.editor = null
      this._container = null
      this._rootElement = null
    }
    this._eventHandlers.clear()
  }

  private _emit(event: string, payload?: unknown): void {
    const handlers = this._eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(fn => fn(payload))
    }
  }

  private _wordCount(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 0).length
  }

  private _emitSelectionChange(
    ctx: import('@milkdown/ctx').Ctx,
    selection: import('@milkdown/prose/state').Selection
  ): void {
    const view = ctx.get(editorViewCtx)
    const state = ctx.get(editorStateCtx)
    const { from, to } = selection
    const coords = view.coordsAtPos(from)
    const container = this._container ?? this._rootElement
    const y = container
      ? coords.top - (container as HTMLElement).getBoundingClientRect().top
      : coords.top
    const selectedText = state.doc.textBetween(from, to, '\n')
    const block = { text: selectedText }
    this._emit('selectionChange', {
      cursorCoords: { y },
      start: { key: 'milkdown', offset: 0, block, type: 'p' },
      end: { key: 'milkdown', offset: selectedText.length, block, type: 'p' },
      affiliation: []
    })
  }

  private _emitSelectionFormats(
    ctx: import('@milkdown/ctx').Ctx,
    selection: import('@milkdown/prose/state').Selection
  ): void {
    const state = ctx.get(editorStateCtx)
    const { from, to } = selection
    const schema = state.schema
    const formats: { type: string }[] = []
    const markMap: Record<string, string> = {
      strong: 'strong',
      emphasis: 'em',
      strike_through: 'del'
    }
    for (const [name, formatType] of Object.entries(markMap)) {
      const markType = schema.marks[name] as MarkType | undefined
      if (markType && state.doc.rangeHasMark(from, to, markType)) {
        formats.push({ type: formatType })
      }
    }
    this._emit('selectionFormats', formats)
  }

  private _ensureMounted(): void {
    if (!this.editor?.ctx) throw new Error('MilkdownAdapter: not mounted')
  }

  getMarkdown(): string {
    this._ensureMounted()
    const ctx = this.editor!.ctx!
    const serializer = ctx.get(serializerCtx)
    const state = ctx.get(editorStateCtx)
    return serializer(state.doc)
  }

  setMarkdown(markdown: string, _cursor?: CursorState, _renderCursor = true): void {
    this._ensureMounted()
    const content = markdown ?? ''
    const ctx = this.editor!.ctx!
    const parser = ctx.get(parserCtx)
    const view = ctx.get(editorViewCtx)
    const state = view.state
    let newDoc
    try {
      newDoc = parser(content)
    } catch (e) {
      console.error('[MilkdownAdapter] setMarkdown parse error:', e)
      return
    }
    if (!newDoc) return
    try {
      // Use updateState instead of replaceWith to avoid "position X out of range"
      const newState = EditorState.create({
        doc: newDoc,
        schema: state.schema,
        plugins: state.plugins
      })
      view.updateState(newState)
    } catch (e) {
      console.error('[MilkdownAdapter] setMarkdown updateState error:', e)
    }
  }

  getCursor(): CursorState {
    this._ensureMounted()
    const ctx = this.editor!.ctx!
    const state = ctx.get(editorStateCtx)
    const { from, to } = state.selection
    return {
      anchor: { line: 0, ch: from },
      focus: { line: 0, ch: to }
    }
  }

  setCursor(_cursor: CursorState): void {
    NOT_IMPLEMENTED('setCursor')()
  }

  getHistory(): unknown {
    return null
  }

  setHistory(_history: unknown): void {
    // no-op
  }

  clearHistory(): void {
    // no-op
  }

  getWordCount(markdown?: string): number {
    return this._wordCount(markdown ?? this.getMarkdown())
  }

  getLineFromDOMNode(node: Node): number | null {
    this._ensureMounted()
    const el = node instanceof Element ? node : (node as ChildNode).parentElement
    if (!el) return null
    const ctx = this.editor!.ctx!
    const view = ctx.get(editorViewCtx)
    const state = ctx.get(editorStateCtx)
    const rect = el.getBoundingClientRect()
    const result = view.posAtCoords({
      left: rect.left + rect.width / 2,
      top: rect.top + rect.height / 2
    })
    if (!result) return null
    const textBefore = state.doc.textBetween(0, result.pos, '\n')
    const line = textBefore.split('\n').length
    return line >= 1 ? line : null
  }

  getTOC(): TOCEntry[] {
    return []
  }

  format(type: FormatType): void {
    this._ensureMounted()
    const ctx = this.editor!.ctx!
    const commands = ctx.get(commandsCtx)
    if (type === 'strong') {
      commands.call(toggleStrongCommand.key)
    } else if (type === 'em') {
      commands.call(toggleEmphasisCommand.key)
    } else if (type === 'del') {
      commands.call(toggleStrikethroughCommand.key)
    } else {
      NOT_IMPLEMENTED(`format(${type})`)()
    }
  }

  updateParagraph(_type: ParagraphType): void {
    NOT_IMPLEMENTED('updateParagraph')()
  }

  createTable(spec: TableSpec): void {
    this._ensureMounted()
    const ctx = this.editor!.ctx!
    const commands = ctx.get(commandsCtx)
    const rows = spec.rows ?? 3
    const columns = spec.columns ?? 3
    commands.call(insertTableCommand.key, { row: rows, col: columns })
  }

  insertImage(_info: ImageInfo): void {
    NOT_IMPLEMENTED('insertImage')()
  }

  duplicate(): void {
    NOT_IMPLEMENTED('duplicate')()
  }

  deleteParagraph(_blockKey?: string): void {
    NOT_IMPLEMENTED('deleteParagraph')()
  }

  insertParagraph(_location: 'before' | 'after', _text?: string, _outMost?: boolean): void {
    NOT_IMPLEMENTED('insertParagraph')()
  }

  undo(): void {
    this._ensureMounted()
    const ctx = this.editor!.ctx!
    const commands = ctx.get(commandsCtx)
    commands.call(undoCommand.key)
  }

  redo(): void {
    this._ensureMounted()
    const ctx = this.editor!.ctx!
    const commands = ctx.get(commandsCtx)
    commands.call(redoCommand.key)
  }

  selectAll(): void {
    this._ensureMounted()
    const ctx = this.editor!.ctx!
    const view = ctx.get(editorViewCtx)
    const { state } = view
    const tr = state.tr.setSelection(TextSelection.create(state.doc, 0, state.doc.content.size))
    view.dispatch(tr)
  }

  search(_value: string, _options: SearchOptions): SearchMatchesResult {
    return { value: '', matches: [], index: -1 }
  }

  replace(_value: string, _options: ReplaceOptions): SearchMatchesResult {
    return { value: '', matches: [], index: -1 }
  }

  find(_action: 'pre' | 'next'): SearchMatchesResult {
    return { value: '', matches: [], index: -1 }
  }

  getSelection(): SelectionPayload {
    return {
      cursorCoords: { y: 0 },
      start: { key: '', offset: 0 },
      end: { key: '', offset: 0 }
    }
  }

  async exportStyledHTML(_options?: ExportHTMLOptions): Promise<string> {
    return this.getMarkdown()
  }

  focus(): void {
    this._ensureMounted()
    const ctx = this.editor!.ctx!
    const view = ctx.get(editorViewCtx)
    view.focus()
  }

  blur(_removeRange = false, _unSelect = false): void {
    this._ensureMounted()
    const ctx = this.editor!.ctx!
    const view = ctx.get(editorViewCtx)
    ;(view.dom as HTMLElement).blur()
  }

  hasFocus(): boolean {
    this._ensureMounted()
    const ctx = this.editor!.ctx!
    const view = ctx.get(editorViewCtx)
    return document.activeElement === view.dom
  }

  hasSelectionInTable(): boolean {
    return false
  }

  setFocusMode(_enabled: boolean): void {
    // no-op for MVP
  }

  setFont(options: { fontSize?: number; lineHeight?: number | string }): void {
    if (options.fontSize != null) this._options.fontSize = options.fontSize
    if (options.lineHeight != null) this._options.lineHeight = options.lineHeight
    this._applyOptions()
  }

  setTabSize(tabSize: number): void {
    this._options.tabSize = tabSize
    this._applyOptions()
  }

  setListIndentation(_value: number | string): void {
    // no-op for Milkdown (list indentation handled by preset)
  }

  setOptions(options: Partial<EditorOptions>, _needRender?: boolean): void {
    Object.assign(this._options, options)
    this._applyOptions()
  }

  private _applyOptions(): void {
    const root = this._rootElement ?? this._container
    if (!root) return
    const el = root as HTMLElement
    if (this._options.fontSize != null) {
      el.style.setProperty('--mk-font-size', `${this._options.fontSize}px`)
    }
    if (this._options.lineHeight != null) {
      el.style.setProperty('--mk-line-height', String(this._options.lineHeight))
    }
    if (this._container && this._options.spellcheckEnabled != null) {
      ;(this._container as HTMLElement).setAttribute(
        'spellcheck',
        this._options.spellcheckEnabled ? 'true' : 'false'
      )
    }
    const theme = this._options.theme as string | undefined
    if (theme) {
      el.classList.toggle(
        'milkdown-dark',
        /dark|one-dark|railscasts|material-dark|everforest-dark/i.test(theme)
      )
    }
  }

  invalidateImageCache(): void {
    // no-op
  }

  hideAllFloatTools(): void {
    // no-op
  }

  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, new Set())
    }
    this._eventHandlers.get(event)!.add(handler as (...args: unknown[]) => void)
  }

  off(event: string, handler: (...args: unknown[]) => void): void {
    this._eventHandlers.get(event)?.delete(handler as (...args: unknown[]) => void)
  }

  once(event: string, handler: (...args: unknown[]) => void): void {
    const wrapped = (...args: unknown[]) => {
      this.off(event, wrapped)
      ;(handler as (...a: unknown[]) => void)(...args)
    }
    this.on(event, wrapped)
  }
}
