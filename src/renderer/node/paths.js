import EnvPaths from 'common/envPaths'
import { processInfo, path } from '../util/electron'

// 获取 ripgrep 路径
// 在 contextIsolation 模式下，我们需要手动构建路径
const getRgPath = () => {
  const resourcesPath = processInfo.resourcesPath
  if (resourcesPath) {
    // 打包后的应用
    const rgName = processInfo.platform === 'win32' ? 'rg.exe' : 'rg'
    return path.join(
      resourcesPath,
      'app.asar.unpacked',
      'node_modules',
      'vscode-ripgrep',
      'bin',
      rgName
    )
  }
  // 开发环境 - 返回空字符串，后面会尝试其他方式
  return ''
}

class RendererPaths extends EnvPaths {
  /**
   * Configure and sets all application paths.
   *
   * @param {string} userDataPath The user data path.
   */
  constructor (userDataPath) {
    if (!userDataPath) {
      throw new Error('No user data path is given.')
    }

    // Initialize environment paths
    super(userDataPath)

    // Allow to use a local ripgrep binary (e.g. an optimized version).
    const env = processInfo.env || {}
    if (env.MARKTEXT_RIPGREP_PATH) {
      // NOTE: Binary must be a compatible version, otherwise the searcher may fail.
      this._ripgrepBinaryPath = env.MARKTEXT_RIPGREP_PATH
    } else {
      this._ripgrepBinaryPath = getRgPath()
    }
  }

  // Returns the path to ripgrep on disk.
  get ripgrepBinaryPath () {
    return this._ripgrepBinaryPath
  }
}

export default RendererPaths
