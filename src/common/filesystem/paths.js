import { isFile, isFile2, isSymbolicLink } from './index'

// 根据运行环境选择模块
let fs, path, isOsx, processInfo

if (typeof window !== 'undefined' && window.electronAPI) {
  // Electron 渲染进程 - 使用 electronAPI
  const api = window.electronAPI
  fs = {
    readlinkSync: api.fs.readlinkSync,
    statSync: api.fs.statSync
  }
  path = api.path
  isOsx = api.isOsx
  processInfo = api.process
} else if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
  // Tauri 渲染进程 - 提供 stub 实现
  const sep = typeof navigator !== 'undefined' && navigator.platform.startsWith('Win') ? '\\' : '/'
  fs = {
    readlinkSync: () => '',
    statSync: () => ({ ino: 0, isFile: () => false, isDirectory: () => false, isSymbolicLink: () => false })
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
  isOsx = typeof navigator !== 'undefined' && navigator.platform.startsWith('Mac')
  processInfo = {
    platform: typeof navigator !== 'undefined'
      ? (navigator.platform.startsWith('Win') ? 'win32' : navigator.platform.startsWith('Mac') ? 'darwin' : 'linux')
      : 'linux',
    resourcesPath: '',
    env: {}
  }
} else {
  // 主进程 - 直接使用 Node.js 模块
  fs = require('fs')
  path = require('path')
  isOsx = process.platform === 'darwin'
  processInfo = process
}

export const MARKDOWN_EXTENSIONS = Object.freeze([
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

export const MARKDOWN_INCLUSIONS = Object.freeze(MARKDOWN_EXTENSIONS.map(x => '*.' + x))

export const IMAGE_EXTENSIONS = Object.freeze([
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
 * @param {string} filename Path or filename
 */
export const hasMarkdownExtension = filename => {
  if (!filename || typeof filename !== 'string') return false
  return MARKDOWN_EXTENSIONS.some(ext => filename.toLowerCase().endsWith(`.${ext}`))
}

/**
 * Returns true if the path is an image file.
 *
 * @param {string} filepath The path
 */
export const isImageFile = filepath => {
  const extname = path.extname(filepath)
  return isFile(filepath) && IMAGE_EXTENSIONS.some(ext => {
    const EXT_REG = new RegExp(ext, 'i')
    return EXT_REG.test(extname)
  })
}

/**
 * Returns true if the path is a markdown file or symbolic link to a markdown file.
 *
 * @param {string} filepath The path or link path.
 */
export const isMarkdownFile = filepath => {
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
 * @param {string} pathA The first path.
 * @param {string} pathB The second path.
 * @param {boolean} [isNormalized] Are both paths already normalized.
 */
export const isSamePathSync = (pathA, pathB, isNormalized = false) => {
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
 * @param {string} dir The parent directory.
 * @param {string} child The file or directory path to check.
 */
export const isChildOfDirectory = (dir, child) => {
  if (!dir || !child) return false
  const relative = path.relative(dir, child)
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
}

export const getResourcesPath = () => {
  let resPath = processInfo.resourcesPath
  const nodeEnv = processInfo.env ? processInfo.env.NODE_ENV : 'production'
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
