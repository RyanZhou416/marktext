import path from 'path'
import AppPaths, { ensureAppDirectoriesSync } from './paths'
import type { CliArgs } from '../types'

declare global {
  var MARKTEXT_DEBUG: boolean
  var MARKTEXT_DEBUG_VERBOSE: number
  var MARKTEXT_SAFE_MODE: boolean
}

interface AppEnvironmentOptions {
  debug: boolean
  isDevMode: boolean
  verbose: number
  safeMode: boolean
  userDataPath?: string
  disableSpellcheck: boolean
}

let envId = 0

const patchEnvPath = (): void => {
  if (process.platform === 'darwin') {
    process.env.PATH += (process.env.PATH!.endsWith(path.delimiter) ? '' : path.delimiter) + '/Library/TeX/texbin'
  }
}

export class AppEnvironment {
  private _id: number
  private _appPaths: AppPaths
  private _debug: boolean
  private _isDevMode: boolean
  private _verbose: number
  private _safeMode: boolean
  private _disableSpellcheck: boolean

  constructor(options: AppEnvironmentOptions) {
    this._id = envId++
    this._appPaths = new AppPaths(options.userDataPath)
    this._debug = !!options.debug
    this._isDevMode = !!options.isDevMode
    this._verbose = options.verbose || 0
    this._safeMode = !!options.safeMode
    this._disableSpellcheck = !!options.disableSpellcheck
  }

  /**
   * Returns an unique identifier that can be used with IPC to identify messages from this environment.
   */
  get id(): number {
    return this._id
  }

  get paths(): AppPaths {
    return this._appPaths
  }

  get debug(): boolean {
    return this._debug
  }

  get isDevMode(): boolean {
    return this._isDevMode
  }

  get verbose(): number {
    return this._verbose
  }

  get safeMode(): boolean {
    return this._safeMode
  }

  get disableSpellcheck(): boolean {
    return this._disableSpellcheck
  }
}

/**
 * Create a (global) application environment instance and bootstraps the application.
 *
 * @param args The parsed application arguments.
 * @returns The current (global) environment.
 */
const setupEnvironment = (args: CliArgs): AppEnvironment => {
  patchEnvPath()

  const isDevMode = process.env.NODE_ENV !== 'production'
  const debug = (args as any)['--debug'] || !!process.env.MARKTEXT_DEBUG || process.env.NODE_ENV !== 'production'
  const verbose = (args as any)['--verbose'] || 0
  const safeMode = (args as any)['--safe']
  const userDataPath = (args as any)['--user-data-dir'] // or null (= default user data path)
  const disableSpellcheck = (args as any)['--disable-spellcheck']

  const appEnvironment = new AppEnvironment({
    debug,
    isDevMode,
    verbose,
    safeMode,
    userDataPath,
    disableSpellcheck
  })

  ensureAppDirectoriesSync(appEnvironment.paths)

  // Keep this for easier access.
  global.MARKTEXT_DEBUG = debug
  global.MARKTEXT_DEBUG_VERBOSE = verbose
  global.MARKTEXT_SAFE_MODE = safeMode

  return appEnvironment
}

export default setupEnvironment
