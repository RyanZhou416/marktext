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
import { history, undoCommand, redoCommand } from '@milkdown/plugin-history'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { TextSelection } from '@milkdown/prose/state'

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
  private _eventHandlers: Map<string, Set<(...args: unknown[]) => void>> = new Map()

  get container(): HTMLElement {
    if (!this._container) throw new Error('MilkdownAdapter: not mounted')
    return this._container
  }

  mount(element: HTMLElement, options: EditorOptions): Promise<void> {
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
      })
      .use(commonmark)
      .use(history)
      .use(listener)

    return editor.create().then(() => {
      this.editor = editor
      const view = editor.ctx?.get(editorViewCtx)
      this._container = view?.dom ?? element
    })
  }

  destroy(): void {
    if (this.editor) {
      this.editor.destroy()
      this.editor = null
      this._container = null
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
    if (!newDoc?.content) return
    const tr = state.tr.replaceWith(1, state.doc.nodeSize - 1, newDoc.content)
    view.dispatch(tr)
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
    } else {
      NOT_IMPLEMENTED(`format(${type})`)()
    }
  }

  updateParagraph(_type: ParagraphType): void {
    NOT_IMPLEMENTED('updateParagraph')()
  }

  createTable(_spec: TableSpec): void {
    NOT_IMPLEMENTED('createTable')()
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
    const cursor = this.getCursor()
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

  setFont(_options: { fontSize?: number; lineHeight?: number | string }): void {
    // no-op for MVP
  }

  setTabSize(_tabSize: number): void {
    // no-op for MVP
  }

  setListIndentation(_value: number | string): void {
    // no-op for MVP
  }

  setOptions(_options: Partial<EditorOptions>, _needRender?: boolean): void {
    // no-op for MVP
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
