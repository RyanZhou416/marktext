// 根据运行环境选择 path 模块
// 渲染进程使用 electronAPI 或 Tauri path polyfill，主进程直接使用 Node.js
let path
if (typeof window !== 'undefined' && window.electronAPI) {
  path = window.electronAPI.path
} else if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
  // Tauri environment: use a simple path polyfill
  const sep = navigator.platform.startsWith('Win') ? '\\' : '/'
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
    sep
  }
} else {
  // Fallback: inline path polyfill (no Node.js require)
  const sep = typeof navigator !== 'undefined' && navigator.platform.startsWith('Win') ? '\\' : '/'
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
    sep
  }
}

class EnvPaths {
  /**
   * @param {string} userDataPath The user data path.
   * @returns
   */
  constructor (userDataPath) {
    const currentDate = new Date()
    if (!userDataPath) {
      throw new Error('"userDataPath" is not set.')
    }

    this._electronUserDataPath = userDataPath // path.join(userDataPath, 'electronUserData')
    this._userDataPath = userDataPath
    this._logPath = path.join(
      this._userDataPath,
      'logs',
      `${currentDate.getFullYear()}${currentDate.getMonth() + 1}`
    )
    this._preferencesPath = userDataPath // path.join(this._userDataPath, 'preferences')

    this._dataCenterPath = userDataPath

    this._preferencesFilePath = path.join(
      this._preferencesPath,
      'preference.json'
    )

    // TODO(sessions): enable this...
    // this._globalStorage = path.join(this._userDataPath, 'globalStorage')
    // this._preferencesPath = path.join(this._userDataPath, 'preferences')
    // this._sessionsPath = path.join(this._userDataPath, 'sessions')
  }

  get electronUserDataPath () {
    // This path is identical to app.getPath('userData') but userDataPath must not necessarily be the same path.
    return this._electronUserDataPath
  }

  get userDataPath () {
    return this._userDataPath
  }

  get logPath () {
    return this._logPath
  }

  get preferencesPath () {
    return this._preferencesPath
  }

  get dataCenterPath () {
    return this._dataCenterPath
  }

  get preferencesFilePath () {
    return this._preferencesFilePath
  }
}

export default EnvPaths
