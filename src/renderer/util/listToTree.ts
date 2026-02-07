interface TocItem {
  parent?: Node | null
  lvl: number | null
  content: string | null
  slug: string | null
}

class Node {
  parent: Node | null
  lvl: number | null
  label: string | null
  slug: string | null
  children: Node[]

  constructor (item: TocItem) {
    const { parent, lvl, content, slug } = item
    this.parent = parent ?? null
    this.lvl = lvl
    this.label = content
    this.slug = slug
    this.children = []
  }

  // Add child node.
  addChild (node: Node): void {
    this.children.push(node)
  }
}

const findParent = (item: TocItem, lastNode: Node | null, rootNode: Node): Node => {
  if (!lastNode) {
    return rootNode
  }
  const { lvl: lastLvl } = lastNode
  const { lvl } = item

  if (lvl! < lastLvl!) {
    return findParent(item, lastNode.parent, rootNode)
  } else if (lvl === lastLvl) {
    return lastNode.parent!
  } else {
    return lastNode
  }
}

const listToTree = (list: TocItem[]): Node[] => {
  const rootNode: Node = new Node({ parent: null, lvl: null, content: null, slug: null })
  let lastNode: Node | null = null

  for (const item of list) {
    const parent: Node = findParent(item, lastNode, rootNode)

    const node: Node = new Node({ parent, ...item })
    parent.addChild(node)
    lastNode = node
  }

  return rootNode.children
}

export default listToTree
