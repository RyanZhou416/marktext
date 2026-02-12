import { isFile, isFile2, isSymbolicLink } from './index'

// Tauri 渲染进程 - 使用 window.electronAPI (由 tauri.js 桥接层设置)

interface StatResult {
  ino: number
  isFile: () => boolean
  isDirectory: () => boolean
  isSymbolicLink: () => boolean
}

interface FsModule {
  readlinkSync: (p: string) => string
  statSync: (p: string) => StatResult
}

interface PathModule {
  join: (...args: string[]) => string
  resolve: (...args: string[]) => string
  dirname: (p: string) => string
  basename: (p: string, ext?: string) => string
  extname: (p: string) => string
  normalize: (p: string) => string
  isAbsolute: (p: string) => boolean
  relative: (from: string, to: string) => string
  sep: string
}

interface ProcessInfo {
  platform: string
  resourcesPath: string
  env: Record<string, string | undefined>
}

let fs: FsModule
let path: PathModule
let isOsx: boolean
let processInfo: ProcessInfo

if (typeof window !== 'undefined' && (window as any).electronAPI) {
  const api = (window as any).electronAPI
  fs = {
    readlinkSync: api.fs.readlinkSync || ((): string => ''),
    statSync:
      api.fs.statSync ||
      ((): StatResult => ({
        ino: 0,
        isFile: () => false,
        isDirectory: () => false,
        isSymbolicLink: () => false
      }))
  }
  path = api.path
  isOsx = api.isOsx || false
  processInfo = api.process || { platform: 'unknown', resourcesPath: '', env: {} }
} else {
  // 降级 stub
  const sep: string =
    typeof navigator !== 'undefined' && navigator.platform.startsWith('Win') ? '\\' : '/'
  fs = {
    readlinkSync: (): string => '',
    statSync: (): StatResult => ({
      ino: 0,
      isFile: () => false,
      isDirectory: () => false,
      isSymbolicLink: () => false
    })
  }
  path = {
    join: (...args: string[]): string =>
      args
        .filter(Boolean)
        .join(sep)
        .replace(/[/\\]+/g, sep),
    resolve: (...args: string[]): string =>
      args
        .filter(Boolean)
        .join(sep)
        .replace(/[/\\]+/g, sep),
    dirname: (p: string): string =>
      p ? p.substring(0, Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))) || sep : '.',
    basename: (p: string, ext?: string): string => {
      if (!p) return ''
      let base = p.substring(Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\')) + 1)
      if (ext && base.endsWith(ext)) base = base.slice(0, -ext.length)
      return base
    },
    extname: (p: string): string => {
      if (!p) return ''
      const base = p.substring(Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\')) + 1)
      const dotIdx = base.lastIndexOf('.')
      return dotIdx > 0 ? base.slice(dotIdx) : ''
    },
    normalize: (p: string): string => (p ? p.replace(/[/\\]+/g, sep) : '.'),
    isAbsolute: (p: string): boolean => {
      if (!p) return false
      if (sep === '\\') return /^[A-Za-z]:[/\\]/.test(p)
      return p.startsWith('/')
    },
    relative: (from: string, to: string): string => {
      if (!from || !to) return ''
      return to
    },
    sep
  }
  isOsx = typeof navigator !== 'undefined' && navigator.platform.startsWith('Mac')
  processInfo = {
    platform:
      typeof navigator !== 'undefined'
        ? navigator.platform.startsWith('Win')
          ? 'win32'
          : navigator.platform.startsWith('Mac')
            ? 'darwin'
            : 'linux'
        : 'linux',
    resourcesPath: '',
    env: {}
  }
}

export const MARKDOWN_EXTENSIONS: readonly string[] = Object.freeze([
  'markdown',
  'mdown',
  'mkdn',
  'md',
  'mkd',
  'mdwn',
  'mdtxt',
  'mdtext',
  'mdx',
  'text',
  'txt'
])

export const MARKDOWN_INCLUSIONS: readonly string[] = Object.freeze(
  MARKDOWN_EXTENSIONS.map(x => '*.' + x)
)

export const IMAGE_EXTENSIONS: readonly string[] = Object.freeze([
  'jpeg',
  'jpg',
  'png',
  'gif',
  'svg',
  'webp'
])

/**
 * Returns true if the filename matches one of the markdown extensions.
 *
 * @param filename Path or filename
 */
export const hasMarkdownExtension = (filename: string): boolean => {
  if (!filename || typeof filename !== 'string') return false
  return MARKDOWN_EXTENSIONS.some(ext => filename.toLowerCase().endsWith(`.${ext}`))
}

/**
 * Returns true if the path is an image file.
 *
 * @param filepath The path
 */
export const isImageFile = (filepath: string): boolean => {
  const extname = path.extname(filepath)
  return (
    isFile(filepath) &&
    IMAGE_EXTENSIONS.some(ext => {
      const EXT_REG = new RegExp(ext, 'i')
      return EXT_REG.test(extname)
    })
  )
}

/**
 * Returns true if the path is a markdown file or symbolic link to a markdown file.
 *
 * @param filepath The path or link path.
 */
export const isMarkdownFile = (filepath: string): boolean => {
  if (!isFile2(filepath)) return false

  // Check symbolic link.
  if (isSymbolicLink(filepath)) {
    const targetPath = path.resolve(path.dirname(filepath), fs.readlinkSync(filepath))
    return isFile(targetPath) && hasMarkdownExtension(targetPath)
  }
  return hasMarkdownExtension(filepath)
}

/**
 * Check if the both paths point to the same file.
 *
 * @param pathA The first path.
 * @param pathB The second path.
 * @param isNormalized Are both paths already normalized.
 */
export const isSamePathSync = (
  pathA: string,
  pathB: string,
  isNormalized: boolean = false
): boolean => {
  if (!pathA || !pathB) return false
  const a = isNormalized ? pathA : path.normalize(pathA)
  const b = isNormalized ? pathB : path.normalize(pathB)
  if (a.length !== b.length) {
    return false
  } else if (a === b) {
    return true
  } else if (a.toLowerCase() === b.toLowerCase()) {
    try {
      const fiA = fs.statSync(a)
      const fiB = fs.statSync(b)
      return fiA.ino === fiB.ino
    } catch (_) {
      // Ignore error
    }
  }
  return false
}

/**
 * Check whether a file or directory is a child of the given directory.
 *
 * @param dir The parent directory.
 * @param child The file or directory path to check.
 */
export const isChildOfDirectory = (dir: string, child: string): boolean => {
  if (!dir || !child) return false
  const relative = path.relative(dir, child)
  return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative)
}

export const getResourcesPath = (): string => {
  let resPath: string = processInfo.resourcesPath
  const nodeEnv: string = processInfo.env ? processInfo.env.NODE_ENV || 'production' : 'production'
  if (nodeEnv === 'development') {
    // Default locations:
    //   Linux/Windows: node_modules/electron/dist/resources/
    //   macOS: node_modules/electron/dist/Electron.app/Contents/Resources
    if (isOsx) {
      resPath = path.join(resPath, '../..')
    }
    resPath = path.join(resPath, '../../../../resources')
  }
  return resPath
}
