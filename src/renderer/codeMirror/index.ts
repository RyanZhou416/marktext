/**
 * CodeMirror 6 wrapper for MarkText source code view.
 * Replaces CodeMirror 5 with @codemirror/* packages.
 */

import { EditorState, Compartment, type Extension, type Text } from '@codemirror/state'
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightActiveLine,
  drawSelection,
  type KeyBinding
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, selectAll } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'

import './index.css'

export interface CreateEditorOptions {
  value: string
  theme?: 'default' | 'railscasts' | 'one-dark'
  direction?: 'ltr' | 'rtl'
  lineNumberFormatter?: (line: number) => string
  onUpdate?: () => void
}

/** CM5 {line, ch} (0-based) -> CM6 offset */
export function posToOffset(doc: Text, pos: { line: number; ch: number }): number {
  const lineNum = Math.min(pos.line + 1, doc.lines)
  const line = doc.line(lineNum)
  return line.from + Math.min(pos.ch, line.length)
}

/** CM6 offset -> CM5 {line, ch} (0-based) */
export function offsetToPos(doc: Text, offset: number): { line: number; ch: number } {
  const line = doc.lineAt(Math.min(offset, doc.length))
  return { line: line.number - 1, ch: offset - line.from }
}

/** Set cursor at the end of last line */
export function setCursorAtLastLine(view: EditorView): void {
  const len = view.state.doc.length
  view.dispatch({ selection: { anchor: len, head: len } })
  view.focus()
}

/** Set text direction (LTR/RTL) */
export function setTextDirection(view: EditorView, direction: 'ltr' | 'rtl'): void {
  view.dispatch({
    effects: directionCompartment.reconfigure(EditorView.contentAttributes.of({ dir: direction }))
  })
}

/** Select all content */
export function selectAllContent(view: EditorView): boolean {
  return selectAll(view)
}

/** Scroll to line (1-based) and place cursor at line start */
export function scrollToLine(view: EditorView, line: number): void {
  const doc = view.state.doc
  const lineNum = Math.max(1, Math.min(line, doc.lines))
  const lineObj = doc.line(lineNum)
  view.dispatch({
    selection: { anchor: lineObj.from, head: lineObj.from },
    effects: EditorView.scrollIntoView(lineObj.from)
  })
  view.focus()
}

const directionCompartment = new Compartment()

/** Create CodeMirror 6 editor instance */
export function createEditor(container: HTMLElement, options: CreateEditorOptions): EditorView {
  const { value, theme = 'default', direction = 'ltr', lineNumberFormatter, onUpdate } = options

  const extensions: Extension[] = [
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap] as KeyBinding[]),
    lineNumbers({
      formatNumber: lineNumberFormatter ?? (n => String(n))
    }),
    highlightActiveLineGutter(),
    highlightActiveLine(),
    drawSelection(),
    markdown(),
    EditorState.tabSize.of(4),
    EditorView.lineWrapping,
    directionCompartment.of(EditorView.contentAttributes.of({ dir: direction })),
    ...(onUpdate
      ? [
          EditorView.updateListener.of(update => {
            if (update.docChanged || update.selectionSet) {
              onUpdate()
            }
          })
        ]
      : [])
  ]

  if (theme === 'one-dark' || theme === 'railscasts') {
    extensions.push(oneDark)
  }
  // railscasts: use oneDark as fallback (no official CM6 railscasts theme)

  const state = EditorState.create({
    doc: value,
    extensions
  })

  const view = new EditorView({
    state,
    parent: container
  })

  view.focus()

  return view
}
