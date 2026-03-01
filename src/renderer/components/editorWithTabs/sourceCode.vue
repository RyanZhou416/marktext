<template>
  <div ref="sourceCode" class="source-code"></div>
</template>

<script lang="ts">
import {
  createEditor,
  setCursorAtLastLine,
  setTextDirection,
  posToOffset,
  offsetToPos,
  selectAllContent,
  scrollToLine
} from '../../codeMirror'
import type { EditorView } from '@codemirror/view'
import { wordCount as getWordCount } from 'common/markdown/utils'
import { mapState } from 'pinia'
import { usePreferencesStore } from '@/stores/preferences'
import { useEditorStore } from '@/stores/editor'
import { adjustCursor } from '../../util'
import bus from '../../bus'
import { oneDarkThemes, railscastsThemes } from '@/config'

interface CursorPos {
  line: number
  ch: number
}

interface CursorShape {
  anchor: CursorPos
  focus: CursorPos
}

export default {
  props: {
    markdown: String,
    cursor: Object,
    textDirection: {
      type: String,
      required: true
    }
  },

  computed: {
    ...mapState(usePreferencesStore, ['theme', 'sourceCode']),
    ...mapState(useEditorStore, {
      currentTab: store => store.currentFile
    })
  },

  data() {
    return {
      contentState: null,
      editor: null as EditorView | null,
      commitTimer: null as ReturnType<typeof setTimeout> | null,
      viewDestroyed: false,
      tabId: null as string | null
    }
  },

  watch: {
    textDirection(value: string, oldValue: string) {
      const { editor } = this
      if (value !== oldValue && editor) {
        setTextDirection(editor, value as 'ltr' | 'rtl')
      }
    }
  },

  created() {
    this.$nextTick(() => {
      const { id } = this.currentTab
      const { markdown = '', theme, cursor, textDirection } = this
      const container = this.$refs.sourceCode as HTMLElement

      const themeName = railscastsThemes.includes(theme)
        ? 'railscasts'
        : oneDarkThemes.includes(theme)
          ? 'one-dark'
          : 'default'

      const checkUpdate = () => {
        const ed = this.editor
        if (!ed) return
        const { cursor, markdown } = this.getMarkdownAndCursor(ed)
        const wordCount = getWordCount(markdown)
        if (this.commitTimer) clearTimeout(this.commitTimer)
        this.commitTimer = setTimeout(() => {
          if (!this.viewDestroyed && this.tabId) {
            useEditorStore().LISTEN_FOR_CONTENT_CHANGE({
              id: this.tabId,
              markdown,
              wordCount,
              cursor
            })
          } else if (!this.viewDestroyed && !this.tabId) {
            console.warn(
              'LISTEN_FOR_CONTENT_CHANGE: Cannot commit changes because no tab id was set!'
            )
          }
        }, 1000)
      }

      const editor = (this.editor = createEditor(container, {
        value: markdown,
        theme: themeName,
        direction: (textDirection || 'ltr') as 'ltr' | 'rtl',
        lineNumberFormatter(line) {
          if (line % 10 === 0 || line === 1) {
            return String(line)
          }
          return ''
        },
        onUpdate: checkUpdate
      }))

      bus.$on('file-loaded', this.handleFileChange)
      bus.$on('invalidate-image-cache', this.handleInvalidateImageCache)
      bus.$on('file-changed', this.handleFileChange)
      bus.$on('selectAll', this.handleSelectAll)
      bus.$on('image-action', this.handleImageAction)

      editor.dom.addEventListener('contextmenu', event => {
        event.preventDefault()
        event.stopPropagation()
      })

      if (cursor && cursor.anchor && cursor.focus) {
        const { anchor, focus } = cursor
        this.setSelection(editor, anchor, focus)
      } else {
        setCursorAtLastLine(editor)
      }
      this.tabId = id

      const scrollToLineNum = usePreferencesStore().scrollToLineOnSourceShow
      if (scrollToLineNum != null) {
        scrollToLine(editor, scrollToLineNum)
        usePreferencesStore().SET_SCROLL_TO_LINE_ON_SOURCE(null)
      }
    })
  },

  beforeUnmount() {
    this.viewDestroyed = true
    if (this.commitTimer) clearTimeout(this.commitTimer)

    bus.$off('file-loaded', this.handleFileChange)
    bus.$off('invalidate-image-cache', this.handleInvalidateImageCache)
    bus.$off('file-changed', this.handleFileChange)
    bus.$off('selectAll', this.handleSelectAll)
    bus.$off('image-action', this.handleImageAction)

    const { editor } = this
    if (editor) {
      const { cursor, markdown } = this.getMarkdownAndCursor(editor)
      bus.$emit('file-changed', { id: this.tabId, markdown, cursor, renderCursor: true })
    }
  },

  methods: {
    setSelection(view: EditorView, anchor: CursorPos, focus: CursorPos) {
      const doc = view.state.doc
      const anchorOffset = posToOffset(doc, anchor)
      const headOffset = posToOffset(doc, focus)
      view.dispatch({
        selection: { anchor: anchorOffset, head: headOffset }
      })
    },

    handleImageAction({ id, result, alt }: { id: string; result: string; alt: string }) {
      const { editor } = this
      if (!editor) return

      const value = editor.state.doc.toString()
      const focus = offsetToPos(editor.state.doc, editor.state.selection.main.head)
      const anchor = offsetToPos(editor.state.doc, editor.state.selection.main.anchor)
      const lines = value.split('\n')
      const index = lines.findIndex(line => line.indexOf(id) > 0)

      if (index > -1) {
        const oldLine = lines[index]
        lines[index] = oldLine.replace(new RegExp(`!\\[${id}\\]\\(.*\\)`), `![${alt}](${result})`)
        const newValue = lines.join('\n')
        editor.dispatch({
          changes: { from: 0, to: value.length, insert: newValue }
        })
        const match = /(!\[.*\]\(.*\))/.exec(oldLine)
        if (!match) return

        const range = { start: match.index, end: match.index + match[1].length }
        const delta = alt.length + result.length + 5 - match[1].length

        const adjust = (pointer: CursorPos) => {
          if (pointer.line !== index) return
          if (pointer.ch <= range.start) return
          if (pointer.ch > range.start && pointer.ch < range.end) {
            pointer.ch = range.start + alt.length + result.length + 5
          } else {
            pointer.ch += delta
          }
        }

        adjust(focus)
        adjust(anchor)
        this.setSelection(editor, anchor, focus)
      } else {
        setCursorAtLastLine(editor)
      }
    },

    handleFileChange({
      id,
      markdown,
      cursor
    }: {
      id: string
      markdown?: string
      cursor?: CursorShape
    }) {
      this.prepareTabSwitch()

      const { editor } = this
      if (!editor) return

      if (typeof markdown === 'string') {
        const current = editor.state.doc.toString()
        editor.dispatch({
          changes: { from: 0, to: current.length, insert: markdown }
        })
      }
      if (cursor) {
        const { anchor, focus } = cursor
        this.setSelection(editor, anchor, focus)
      } else {
        setCursorAtLastLine(editor)
      }
      this.tabId = id
    },

    getMarkdownAndCursor(editor: EditorView): { cursor: CursorShape; markdown: string } {
      const doc = editor.state.doc
      const markdown = doc.toString()
      const main = editor.state.selection.main
      let focus = offsetToPos(doc, main.head)
      let anchor = offsetToPos(doc, main.anchor)

      const convertToMuyaCursor = (cursor: CursorPos): CursorPos => {
        const lineNum = cursor.line + 1
        const line = lineNum <= doc.lines ? doc.line(lineNum).text : ''
        const preLine = cursor.line >= 1 ? doc.line(cursor.line).text : undefined
        const nextLine = cursor.line + 2 <= doc.lines ? doc.line(cursor.line + 2).text : undefined
        const adjusted = adjustCursor(cursor, preLine, line, nextLine)
        return adjusted ?? cursor
      }

      anchor = convertToMuyaCursor(anchor)
      focus = convertToMuyaCursor(focus)

      if (anchor && focus && anchor.line > focus.line) {
        const tmp = focus
        focus = anchor
        anchor = tmp
      }
      return { cursor: { focus, anchor }, markdown }
    },

    prepareTabSwitch() {
      if (this.commitTimer) clearTimeout(this.commitTimer)
      if (this.tabId && this.editor) {
        const { cursor, markdown } = this.getMarkdownAndCursor(this.editor)
        useEditorStore().LISTEN_FOR_CONTENT_CHANGE({ id: this.tabId, markdown, cursor })
        this.tabId = null
      }
    },

    handleSelectAll() {
      if (!this.sourceCode) return

      const { editor } = this
      const hasFocus =
        editor && document.activeElement && editor.dom.contains(document.activeElement)
      if (hasFocus) {
        selectAllContent(editor)
      } else {
        const activeElement = document.activeElement as HTMLElement
        if (activeElement?.nodeName === 'INPUT' || activeElement?.nodeName === 'TEXTAREA') {
          activeElement.select()
        }
      }
    },

    handleInvalidateImageCache() {
      // Source code view has no image cache - no-op
    }
  }
}
</script>

<style>
.source-code {
  height: calc(100vh - var(--titleBarHeight));
  box-sizing: border-box;
  overflow: auto;
}
.source-code .cm-editor {
  height: auto;
  margin: 50px auto;
  max-width: var(--editorAreaWidth);
  background: transparent;
}
.source-code .cm-gutters {
  border-right: none;
  background-color: transparent;
}
.source-code .cm-activeLineGutter,
.source-code .cm-activeLine {
  background: var(--floatHoverColor);
}
</style>
