// Tauri 渲染进程 - 使用 window.electronAPI (由 tauri.js 桥接层设置)
// 或提供安全的 stub 实现
let fs, fsPromises, path

if (typeof window !== 'undefined' && window.electronAPI) {
  // 使用 electronAPI (由 Tauri 桥接层提供)
  const api = window.electronAPI
  fs = {
    existsSync: api.fs.existsSync || (() => false),
    lstatSync: api.fs.lstatSync || (() => ({ isDirectory: () => false, isFile: () => false, isSymbolicLink: () => false })),
    readlinkSync: api.fs.readlinkSync || (() => ''),
    mkdirSync: (p, opts) => api.fs.mkdirSync ? api.fs.mkdirSync(p, opts) : undefined,
    ensureDirSync: (dirPath) => {
      try {
        if (api.fs.mkdirSync) api.fs.mkdirSync(dirPath, { recursive: true })
      } catch (e) {
        if (e.code !== 'EEXIST') throw e
      }
    }
  }
  fsPromises = {
    access: api.fs.access || (() => Promise.reject(new Error('not available')))
  }
  path = api.path
} else {
  // 降级 stub - API 未初始化时使用
  const sep = typeof navigator !== 'undefined' && navigator.platform.startsWith('Win') ? '\\' : '/'
  fs = {
    existsSync: () => false,
    lstatSync: () => ({ isDirectory: () => false, isFile: () => false, isSymbolicLink: () => false }),
    readlinkSync: () => '',
    mkdirSync: () => {},
    ensureDirSync: () => {}
  }
  fsPromises = {
    access: () => Promise.reject(new Error('fs.access not available'))
  }
  path = {
    join: (...args) => args.filter(Boolean).join(sep).replace(/[/\\]+/g, sep),
    resolve: (...args) => args.filter(Boolean).join(sep).replace(/[/\\]+/g, sep),
    dirname: (p) => p ? p.substring(0, Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))) || sep : '.',
    basename: (p, ext) => {
      if (!p) return ''
      let base = p.substring(Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\')) + 1)
      if (ext && base.endsWith(ext)) base = base.slice(0, -ext.length)
      return base
    },
    extname: (p) => {
      if (!p) return ''
      const base = p.substring(Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\')) + 1)
      const dotIdx = base.lastIndexOf('.')
      return dotIdx > 0 ? base.slice(dotIdx) : ''
    },
    normalize: (p) => p ? p.replace(/[/\\]+/g, sep) : '.',
    isAbsolute: (p) => {
      if (!p) return false
      if (sep === '\\') return /^[A-Za-z]:[/\\]/.test(p)
      return p.startsWith('/')
    },
    relative: (from, to) => {
      if (!from || !to) return ''
      return to
    },
    sep
  }
}

/**
 * Test whether or not the given path exists.
 *
 * @param {string} p The path to the file or directory.
 * @returns {boolean}
 */
export const exists = async p => {
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
 * @param {string} dirPath The directory path.
 */
export const ensureDirSync = dirPath => {
  try {
    fs.ensureDirSync(dirPath)
  } catch (e) {
    if (e.code !== 'EEXIST') {
      throw e
    }
  }
}

/**
 * Returns true if the path is a directory with read access.
 *
 * @param {string} dirPath The directory path.
 */
export const isDirectory = dirPath => {
  try {
    return fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory()
  } catch (_) {
    return false
  }
}

/**
 * Returns true if the path is a directory or a symbolic link to a directory with read access.
 *
 * @param {string} dirPath The directory path.
 */
export const isDirectory2 = dirPath => {
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
 * @param {string} filepath The file path.
 */
export const isFile = filepath => {
  try {
    return fs.existsSync(filepath) && fs.lstatSync(filepath).isFile()
  } catch (_) {
    return false
  }
}

/**
 * Returns true if the path is a file or a symbolic link to a file with read access.
 *
 * @param {string} filepath The file path.
 */
export const isFile2 = filepath => {
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
 * @param {string} filepath The link path.
 */
export const isSymbolicLink = filepath => {
  try {
    return fs.existsSync(filepath) && fs.lstatSync(filepath).isSymbolicLink()
  } catch (_) {
    return false
  }
}
