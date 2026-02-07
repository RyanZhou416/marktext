/// <reference types="vite/client" />

// Vue single-file component type declaration
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// JSON module declarations
declare module '*.json' {
  const value: any
  export default value
}

// SVG imports (Vite handles these)
declare module '*.svg' {
  const content: string
  export default content
}

// PNG imports
declare module '*.png' {
  const content: string
  export default content
}

// CSS imports
declare module '*.css' {
  const content: Record<string, string>
  export default content
}

// Extend Window interface for MarkText globals
declare interface Window {
  marktext: {
    env: {
      type: string
      windowId: string
      [key: string]: any
    }
    paths: {
      [key: string]: string
    }
    [key: string]: any
  }
  DIRNAME: string
  electronAPI: {
    path: {
      join: (...args: string[]) => string
      resolve: (...args: string[]) => string
      dirname: (p: string) => string
      basename: (p: string, ext?: string) => string
      extname: (p: string) => string
      normalize: (p: string) => string
      relative: (from: string, to: string) => string
      sep: string
    }
    [key: string]: any
  }
}

// Common module declarations for untyped JS modules
declare module 'common/*' {
  const value: any
  export default value
  export const isFile: (filepath: string) => boolean
  export const isDirectory: (filepath: string) => boolean
  export const isSamePathSync: (p1: string, p2: string) => boolean
  export const hasMarkdownExtension: (filepath: string) => boolean
  export const MARKDOWN_INCLUSIONS: string[]
  export const isChildOfDirectory: (dir: string, child: string) => boolean
}

// Event bus type
declare module 'mitt' {
  type Handler<T = any> = (event: T) => void
  type WildcardHandler = (type: string, event: any) => void

  interface Emitter {
    on(type: string, handler: Handler): void
    off(type: string, handler: Handler): void
    emit(type: string, event?: any): void
    all: Map<string, Handler[]>
  }

  export default function mitt(): Emitter
}
