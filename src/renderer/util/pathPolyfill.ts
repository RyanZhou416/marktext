/**
 * Pure JavaScript path utilities polyfill
 *
 * This module provides path operations that work in browser/Tauri environments
 * without requiring Node.js or async Rust calls. It's designed to be compatible
 * with Node.js path module for basic operations used by Muya.
 */

interface ParsedPath {
  root: string
  dir: string
  base: string
  ext: string
  name: string
}

interface PathObject {
  root?: string
  dir?: string
  base?: string
  name?: string
  ext?: string
}

interface PathModule {
  sep: string
  delimiter: string
  normalize: (path: string) => string
  join: (...paths: string[]) => string
  resolve: (...paths: string[]) => string
  dirname: (path: string) => string
  basename: (path: string, ext?: string) => string
  extname: (path: string) => string
  isAbsolute: (path: string) => boolean
  relative: (from: string, to: string) => string
  parse: (path: string) => ParsedPath
  format: (pathObject: PathObject) => string
  posix: null
  win32: null
}

// Detect platform from userAgent
const isWindows: boolean =
  typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('win')

const sep: string = isWindows ? '\\' : '/'
const delimiter: string = isWindows ? ';' : ':'

/**
 * Normalize a path, resolving '..' and '.' segments
 */
function normalize(path: string): string {
  if (!path || path.length === 0) return '.'

  const isAbsolutePath: boolean = isAbsolute(path)
  const trailingSep: boolean =
    path.charCodeAt(path.length - 1) === 47 || // /
    path.charCodeAt(path.length - 1) === 92 // \

  // Normalize separators
  path = path.replace(/[/\\]+/g, sep)

  // Split and process segments
  const segments: string[] = path.split(sep)
  const result: string[] = []

  for (const segment of segments) {
    if (segment === '..') {
      if (result.length > 0 && result[result.length - 1] !== '..') {
        result.pop()
      } else if (!isAbsolutePath) {
        result.push('..')
      }
    } else if (segment !== '.' && segment !== '') {
      result.push(segment)
    }
  }

  let normalized: string = result.join(sep)

  // Handle Windows drive letter
  if (isWindows && isAbsolutePath && normalized.length >= 2) {
    if (normalized.charAt(1) !== ':' && path.charAt(1) === ':') {
      normalized = path.charAt(0) + ':' + (normalized.startsWith(sep) ? '' : sep) + normalized
    }
  }

  if (
    isAbsolutePath &&
    !normalized.startsWith(sep) &&
    !(isWindows && normalized.charAt(1) === ':')
  ) {
    normalized = sep + normalized
  }

  if (trailingSep && !normalized.endsWith(sep)) {
    normalized += sep
  }

  return normalized || '.'
}

/**
 * Join path segments
 */
function join(...paths: string[]): string {
  if (paths.length === 0) return '.'

  let joined: string = ''
  for (const path of paths) {
    if (path && path.length > 0) {
      if (joined.length > 0) {
        joined += sep + path
      } else {
        joined = path
      }
    }
  }

  return normalize(joined)
}

/**
 * Resolve paths to an absolute path
 */
function resolve(...paths: string[]): string {
  let resolved: string = ''

  for (let i: number = paths.length - 1; i >= 0 && !isAbsolute(resolved); i--) {
    const path: string = paths[i]
    if (path && path.length > 0) {
      resolved = path + (resolved ? sep + resolved : '')
    }
  }

  // If still not absolute, prepend current working directory placeholder
  // In browser, we can't get real cwd, so just normalize
  resolved = normalize(resolved)

  return resolved
}

/**
 * Get the directory name of a path
 */
function dirname(path: string): string {
  if (!path || path.length === 0) return '.'

  path = normalize(path)

  // Remove trailing separator
  if (path.length > 1 && path.endsWith(sep)) {
    path = path.slice(0, -1)
  }

  const lastSepIndex: number = path.lastIndexOf(sep)

  if (lastSepIndex === -1) return '.'
  if (lastSepIndex === 0) return sep

  // Handle Windows drive root
  if (isWindows && lastSepIndex === 2 && path.charAt(1) === ':') {
    return path.slice(0, 3)
  }

  return path.slice(0, lastSepIndex)
}

/**
 * Get the base name of a path
 */
function basename(path: string, ext?: string): string {
  if (!path || path.length === 0) return ''

  path = normalize(path)

  // Remove trailing separator
  if (path.length > 1 && path.endsWith(sep)) {
    path = path.slice(0, -1)
  }

  const lastSepIndex: number = path.lastIndexOf(sep)
  let base: string = lastSepIndex === -1 ? path : path.slice(lastSepIndex + 1)

  // Remove extension if provided
  if (ext && base.endsWith(ext)) {
    base = base.slice(0, base.length - ext.length)
  }

  return base
}

/**
 * Get the extension of a path
 */
function extname(path: string): string {
  if (!path || path.length === 0) return ''

  const base: string = basename(path)
  const dotIndex: number = base.lastIndexOf('.')

  if (dotIndex === -1 || dotIndex === 0) return ''

  return base.slice(dotIndex)
}

/**
 * Check if a path is absolute
 */
function isAbsolute(path: string): boolean {
  if (!path || path.length === 0) return false

  // Unix absolute path
  if (path.charCodeAt(0) === 47) return true // /

  // Windows absolute path (C:\ or C:/)
  if (isWindows && path.length >= 3) {
    const code0: number = path.charCodeAt(0)
    const code1: number = path.charCodeAt(1)
    const code2: number = path.charCodeAt(2)

    // Drive letter (A-Z or a-z)
    if ((code0 >= 65 && code0 <= 90) || (code0 >= 97 && code0 <= 122)) {
      if (code1 === 58 && (code2 === 47 || code2 === 92)) {
        // : and / or \
        return true
      }
    }
  }

  // UNC path
  if (isWindows && path.length >= 2) {
    const code0: number = path.charCodeAt(0)
    const code1: number = path.charCodeAt(1)
    if ((code0 === 47 || code0 === 92) && (code1 === 47 || code1 === 92)) {
      return true
    }
  }

  return false
}

/**
 * Get relative path from 'from' to 'to'
 */
function relative(from: string, to: string): string {
  if (from === to) return ''

  from = resolve(from)
  to = resolve(to)

  if (from === to) return ''

  // Find common prefix
  const fromParts: string[] = from.split(sep).filter((p: string) => p.length > 0)
  const toParts: string[] = to.split(sep).filter((p: string) => p.length > 0)

  let commonLength: number = 0
  const minLength: number = Math.min(fromParts.length, toParts.length)

  for (let i: number = 0; i < minLength; i++) {
    if (fromParts[i] === toParts[i]) {
      commonLength++
    } else {
      break
    }
  }

  // Build relative path
  const upCount: number = fromParts.length - commonLength
  const result: string[] = []

  for (let i: number = 0; i < upCount; i++) {
    result.push('..')
  }

  for (let i: number = commonLength; i < toParts.length; i++) {
    result.push(toParts[i])
  }

  return result.join(sep)
}

/**
 * Parse a path into components
 */
function parse(path: string): ParsedPath {
  const result: ParsedPath = {
    root: '',
    dir: '',
    base: '',
    ext: '',
    name: ''
  }

  if (!path || path.length === 0) return result

  path = normalize(path)

  // Get root
  if (isAbsolute(path)) {
    if (isWindows && path.length >= 3 && path.charAt(1) === ':') {
      result.root = path.slice(0, 3)
    } else if (path.startsWith(sep)) {
      result.root = sep
    }
  }

  result.dir = dirname(path)
  result.base = basename(path)
  result.ext = extname(path)
  result.name = basename(path, result.ext)

  return result
}

/**
 * Format a path from components
 */
function format(pathObject: PathObject): string {
  if (!pathObject) return ''

  const { root = '', dir, base, name, ext } = pathObject

  let result: string = ''

  if (dir) {
    result = dir
    if (base) {
      result += (result.endsWith(sep) ? '' : sep) + base
    } else if (name) {
      result += (result.endsWith(sep) ? '' : sep) + name + (ext || '')
    }
  } else if (base) {
    result = (root || '') + base
  } else if (name) {
    result = (root || '') + name + (ext || '')
  } else {
    result = root || ''
  }

  return result
}

// Export path module compatible interface
export const path: PathModule = {
  sep,
  delimiter,
  normalize,
  join,
  resolve,
  dirname,
  basename,
  extname,
  isAbsolute,
  relative,
  parse,
  format,
  // Provide posix/win32 stubs for compatibility
  posix: null,
  win32: null
}

export default path
