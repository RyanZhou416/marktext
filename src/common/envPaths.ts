// 根据运行环境选择 path 模块
// 渲染进程使用 electronAPI 或 Tauri path polyfill，主进程直接使用 Node.js

interface PathModule {
  join: (...args: string[]) => string
  resolve: (...args: string[]) => string
  dirname: (p: string) => string
  basename: (p: string, ext?: string) => string
  extname: (p: string) => string
  sep: string
}

let path: PathModule
if (typeof window !== 'undefined' && (window as any).electronAPI) {
  path = (window as any).electronAPI.path
} else if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
  // Tauri environment: use a simple path polyfill
  const sep: string = navigator.platform.startsWith('Win') ? '\\' : '/'
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
    sep
  }
} else {
  // Fallback: inline path polyfill (no Node.js require)
  const sep: string = typeof navigator !== 'undefined' && navigator.platform.startsWith('Win') ? '\\' : '/'
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
    sep
  }
}

class EnvPaths {
  private _electronUserDataPath: string
  private _userDataPath: string
  private _logPath: string
  private _preferencesPath: string
  private _dataCenterPath: string
  private _preferencesFilePath: string

  /**
   * @param userDataPath The user data path.
   */
  constructor (userDataPath: string) {
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

  get electronUserDataPath (): string {
    // This path is identical to app.getPath('userData') but userDataPath must not necessarily be the same path.
    return this._electronUserDataPath
  }

  get userDataPath (): string {
    return this._userDataPath
  }

  get logPath (): string {
    return this._logPath
  }

  get preferencesPath (): string {
    return this._preferencesPath
  }

  get dataCenterPath (): string {
    return this._dataCenterPath
  }

  get preferencesFilePath (): string {
    return this._preferencesFilePath
  }
}

export default EnvPaths
