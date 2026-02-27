import { CLASS_OR_ID } from '../../../config'

export default function header(h, cursor, block, token, outerClass) {
  const { content } = token
  const { start, end } = token.range
  // Show heading markers when cursor is inside the whole heading token,
  // not only when it lands on the hidden `#` marker itself.
  const className = this.getClassName(
    outerClass,
    block,
    {
      range: {
        start: 0,
        end: block.text.length
      }
    },
    cursor
  )
  const markerVnode = this.highlight(h, block, start, end - content.length, token)
  const contentVnode = this.highlight(h, block, end - content.length, end, token)
  const spaceSelector =
    className === CLASS_OR_ID.AG_HIDE
      ? `span.${CLASS_OR_ID.AG_HEADER_TIGHT_SPACE}.${CLASS_OR_ID.AG_REMOVE}`
      : `span.${CLASS_OR_ID.AG_GRAY}.${CLASS_OR_ID.AG_REMOVE}`

  return [
    h(`span.${className}.${CLASS_OR_ID.AG_REMOVE}`, markerVnode),
    h(spaceSelector, contentVnode)
  ]
}
