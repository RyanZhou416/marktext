/**
 * Editor abstraction layer - IEditorEngine interface and adapters.
 */

export type { IEditorEngine, EditorEventName, EditorEventHandler } from './interface'
export { MuyaAdapter } from './muya/adapter'
export { createEditorEngine } from './factory'
export type { EditorEngineType } from './factory'
export type * from './types'
