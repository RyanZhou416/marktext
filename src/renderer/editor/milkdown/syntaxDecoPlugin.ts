/**
 * Typora-style syntax decoration plugin for Milkdown.
 *
 * Shows markdown syntax markers as non-editable widget decorations
 * for any block/inline element the cursor or selection touches.
 *
 * Supported:
 *   Block:  heading, blockquote, code_block, hr, table, image, html
 *   Inline: strong, emphasis, strike_through, inlineCode, link
 */

import { $prose } from '@milkdown/utils'
import { Plugin, PluginKey } from '@milkdown/prose/state'
import { Decoration, DecorationSet } from '@milkdown/prose/view'
import type { EditorState as PMEditorState } from '@milkdown/prose/state'
import type { Mark, Node as PMNode } from '@milkdown/prose/model'

const PLUGIN_KEY = new PluginKey('MT_SYNTAX_DECORATION')

function widget(
  pos: number,
  text: string,
  className: string,
  key: string,
  side: number = -1
): Decoration {
  return Decoration.widget(
    pos,
    () => {
      const span = document.createElement('span')
      span.className = className
      span.textContent = text
      span.contentEditable = 'false'
      return span
    },
    { side, key }
  )
}

const CLS = 'mt-syntax-marker'

function getMarkSyntax(mark: Mark): [string, string] | null {
  switch (mark.type.name) {
    case 'strong':
      return ['**', '**']
    case 'emphasis':
      return [mark.attrs.marker || '*', mark.attrs.marker || '*']
    case 'strike_through':
      return ['~~', '~~']
    case 'inlineCode':
      return ['`', '`']
    case 'link': {
      const href = mark.attrs.href || ''
      const title = mark.attrs.title ? ` "${mark.attrs.title}"` : ''
      return ['[', `](${href}${title})`]
    }
    default:
      return null
  }
}

function findMarkRange(
  parent: PMNode,
  mark: Mark,
  childOffset: number
): { from: number; to: number } | null {
  let rangeFrom = -1
  let rangeTo = -1
  let found = false

  parent.forEach((child, offset) => {
    if (mark.isInSet(child.marks)) {
      if (rangeFrom === -1 || offset > rangeTo) {
        if (found) return
        rangeFrom = offset
      }
      rangeTo = offset + child.nodeSize
      if (childOffset >= offset && childOffset < offset + child.nodeSize) {
        found = true
      }
    } else {
      if (found) return
      if (rangeFrom !== -1) {
        rangeFrom = -1
        rangeTo = -1
      }
    }
  })

  return found ? { from: rangeFrom, to: rangeTo } : null
}

function buildDecorations(state: PMEditorState): DecorationSet {
  const { selection } = state
  const { from, to } = selection
  const decorations: Decoration[] = []
  const seen = new Set<string>()

  state.doc.nodesBetween(from, to, (node, pos, parent) => {
    const contentStart = pos + 1

    switch (node.type.name) {
      // ── Heading: # ~ ###### ──
      case 'heading': {
        const key = `heading-${pos}`
        if (seen.has(key)) break
        seen.add(key)
        const level = node.attrs.level as number
        decorations.push(
          widget(contentStart, '#'.repeat(level) + ' ', `${CLS} mt-syntax-heading`, key)
        )
        break
      }

      // ── Blockquote: > ──
      case 'blockquote': {
        const key = `bq-${pos}`
        if (seen.has(key)) break
        seen.add(key)
        decorations.push(widget(contentStart, '> ', `${CLS} mt-syntax-blockquote`, key))
        break
      }

      // ── Code block: ``` ──
      case 'code_block': {
        const key = `cb-${pos}`
        if (seen.has(key)) break
        seen.add(key)
        const lang = (node.attrs.language as string) || ''
        decorations.push(
          widget(contentStart, '```' + lang, `${CLS} mt-syntax-codeblock-open`, key + '-o')
        )
        decorations.push(
          widget(pos + node.nodeSize - 1, '```', `${CLS} mt-syntax-codeblock-close`, key + '-c', 1)
        )
        break
      }

      // ── Horizontal rule: --- (hide rendered <hr>, show source only) ──
      case 'hr': {
        const key = `hr-${pos}`
        if (seen.has(key)) break
        seen.add(key)
        decorations.push(
          Decoration.node(
            pos,
            pos + node.nodeSize,
            { class: 'mt-hr-source-mode' },
            { key: key + '-hide' }
          )
        )
        decorations.push(widget(pos, '---', `${CLS} mt-syntax-hr`, key))
        break
      }

      // ── Table: | ... | ──
      case 'table': {
        const key = `table-${pos}`
        if (seen.has(key)) break
        seen.add(key)
        decorations.push(widget(contentStart, '| table |', `${CLS} mt-syntax-table`, key))
        break
      }

      // ── Image: ![alt](src) ──
      case 'image': {
        const key = `img-${pos}`
        if (seen.has(key)) break
        seen.add(key)
        const alt = (node.attrs.alt as string) || ''
        const src = (node.attrs.src as string) || ''
        const title = node.attrs.title ? ` "${node.attrs.title}"` : ''
        decorations.push(widget(pos, `![${alt}](${src}${title})`, `${CLS} mt-syntax-image`, key))
        break
      }

      // ── Raw HTML ──
      case 'html': {
        const key = `html-${pos}`
        if (seen.has(key)) break
        seen.add(key)
        decorations.push(widget(contentStart, '<html>', `${CLS} mt-syntax-html`, key))
        break
      }
    }

    // ── Inline marks (text nodes only) ──
    if (!node.isText || !parent) return

    for (const mark of node.marks) {
      const syntax = getMarkSyntax(mark)
      if (!syntax) continue

      const parentStart = state.doc.resolve(pos).start()
      const childOffset = pos - parentStart
      const range = findMarkRange(parent, mark, childOffset)
      if (!range) continue

      const absFrom = parentStart + range.from
      const absTo = parentStart + range.to
      const decoKey = `${mark.type.name}-${absFrom}-${absTo}`
      if (seen.has(decoKey)) continue
      seen.add(decoKey)

      const [openSyntax, closeSyntax] = syntax
      const markName = mark.type.name

      decorations.push(
        widget(
          absFrom,
          openSyntax,
          `${CLS} mt-syntax-inline mt-syntax-${markName}`,
          `${markName}-o-${absFrom}`,
          -1
        )
      )
      decorations.push(
        widget(
          absTo,
          closeSyntax,
          `${CLS} mt-syntax-inline mt-syntax-${markName}`,
          `${markName}-c-${absTo}`,
          1
        )
      )
    }
  })

  return decorations.length > 0 ? DecorationSet.create(state.doc, decorations) : DecorationSet.empty
}

export const syntaxDecoration = $prose(() => {
  return new Plugin({
    key: PLUGIN_KEY,
    props: {
      decorations: buildDecorations
    }
  })
})
