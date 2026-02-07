// Tauri 渲染进程 - 使用 window.electronAPI (由 tauri.js 桥接层设置)
// 或提供安全的 stub 实现

interface LstatResult {
  isDirectory: () => boolean
  isFile: () => boolean
  isSymbolicLink: () => boolean
}

interface FsModule {
  existsSync: (p: string) => boolean
  lstatSync: (p: string) => LstatResult
  readlinkSync: (p: string) => string
  mkdirSync: (p: string, opts?: { recursive?: boolean }) => void
  ensureDirSync: (dirPath: string) => void
}

interface FsPromisesModule {
  access: (p: string) => Promise<void>
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

let fs: FsModule
let fsPromises: FsPromisesModule
let path: PathModule

if (typeof window !== 'undefined' && (window as any).electronAPI) {
  // 使用 electronAPI (由 Tauri 桥接层提供)
  const api = (window as any).electronAPI
  fs = {
    existsSync: api.fs.existsSync || ((): boolean => false),
    lstatSync: api.fs.lstatSync || ((): LstatResult => ({ isDirectory: () => false, isFile: () => false, isSymbolicLink: () => false })),
    readlinkSync: api.fs.readlinkSync || ((): string => ''),
    mkdirSync: (p: string, opts?: { recursive?: boolean }): void => api.fs.mkdirSync ? api.fs.mkdirSync(p, opts) : undefined,
    ensureDirSync: (dirPath: string): void => {
      try {
        if (api.fs.mkdirSync) api.fs.mkdirSync(dirPath, { recursive: true })
      } catch (e: any) {
        if (e.code !== 'EEXIST') throw e
      }
    }
  }
  fsPromises = {
    access: api.fs.access || ((): Promise<void> => Promise.reject(new Error('not available')))
  }
  path = api.path
} else {
  // 降级 stub - API 未初始化时使用
  const sep: string = typeof navigator !== 'undefined' && navigator.platform.startsWith('Win') ? '\\' : '/'
  fs = {
    existsSync: (): boolean => false,
    lstatSync: (): LstatResult => ({ isDirectory: () => false, isFile: () => false, isSymbolicLink: () => false }),
    readlinkSync: (): string => '',
    mkdirSync: (): void => {},
    ensureDirSync: (): void => {}
  }
  fsPromises = {
    access: (): Promise<void> => Promise.reject(new Error('fs.access not available'))
  }
  path = {
    join: (...args: string[]): string => args.filter(Boolean).join(sep).replace(/[/\\]+/g, sep),
    resolve: (...args: string[]): string => args.filter(Boolean).join(sep).replace(/[/\\]+/g, sep),
    dirname: (p: string): string => p ? p.substring(0, Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))) || sep : '.',
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
    normalize: (p: string): string => p ? p.replace(/[/\\]+/g, sep) : '.',
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
}

/**
 * Test whether or not the given path exists.
 *
 * @param p The path to the file or directory.
 */
export const exists = async (p: string): Promise<boolean> => {
  try {
    await fsPromises.access(p)
    return true
  } catch (_) {
    return false
  }
}

/**
 * Ensure that a directory exist.
 *
 * @param dirPath The directory path.
 */
export const ensureDirSync = (dirPath: string): void => {
  try {
    fs.ensureDirSync(dirPath)
  } catch (e: any) {
    if (e.code !== 'EEXIST') {
      throw e
    }
  }
}

/**
 * Returns true if the path is a directory with read access.
 *
 * @param dirPath The directory path.
 */
export const isDirectory = (dirPath: string): boolean => {
  try {
    return fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory()
  } catch (_) {
    return false
  }
}

/**
 * Returns true if the path is a directory or a symbolic link to a directory with read access.
 *
 * @param dirPath The directory path.
 */
export const isDirectory2 = (dirPath: string): boolean => {
  try {
    if (!fs.existsSync(dirPath)) {
      return false
    }

    const fi = fs.lstatSync(dirPath)
    if (fi.isDirectory()) {
      return true
    } else if (fi.isSymbolicLink()) {
      const targetPath = path.resolve(path.dirname(dirPath), fs.readlinkSync(dirPath))
      return isDirectory(targetPath)
    }
    return false
  } catch (_) {
    return false
  }
}

/**
 * Returns true if the path is a file with read access.
 *
 * @param filepath The file path.
 */
export const isFile = (filepath: string): boolean => {
  try {
    return fs.existsSync(filepath) && fs.lstatSync(filepath).isFile()
  } catch (_) {
    return false
  }
}

/**
 * Returns true if the path is a file or a symbolic link to a file with read access.
 *
 * @param filepath The file path.
 */
export const isFile2 = (filepath: string): boolean => {
  try {
    if (!fs.existsSync(filepath)) {
      return false
    }

    const fi = fs.lstatSync(filepath)
    if (fi.isFile()) {
      return true
    } else if (fi.isSymbolicLink()) {
      const targetPath = path.resolve(path.dirname(filepath), fs.readlinkSync(filepath))
      return isFile(targetPath)
    }
    return false
  } catch (_) {
    return false
  }
}

/**
 * Returns true if the path is a symbolic link with read access.
 *
 * @param filepath The link path.
 */
export const isSymbolicLink = (filepath: string): boolean => {
  try {
    return fs.existsSync(filepath) && fs.lstatSync(filepath).isSymbolicLink()
  } catch (_) {
    return false
  }
}
