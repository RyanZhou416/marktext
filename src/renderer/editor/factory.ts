/**
 * Editor engine factory - creates IEditorEngine instances by type.
 * Supports 'muya' (default) and 'milkdown'.
 */

import type { IEditorEngine } from './interface'
import { MuyaAdapter } from './muya/adapter'
import { MilkdownAdapter } from './milkdown/adapter'

export type EditorEngineType = 'muya' | 'milkdown'

export function createEditorEngine(type: EditorEngineType = 'muya'): IEditorEngine {
  switch (type) {
    case 'muya':
      return new MuyaAdapter()
    case 'milkdown':
      return new MilkdownAdapter()
    default:
      console.warn(`[Editor] Unknown engine "${type}", using Muya.`)
      return new MuyaAdapter()
  }
}
