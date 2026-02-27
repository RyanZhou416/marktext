const os = require('os')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

const getTauriExecutablePath = () => {
  const binaryName = process.platform === 'win32' ? 'marktext.exe' : 'marktext'
  return path.resolve(path.join('src-tauri', 'target', 'release', binaryName))
}

const getDateAsSuffix = () => {
  const date = new Date()
  return `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`
}

const getTempPath = () => {
  const name = `marktext-e2etest-${getDateAsSuffix()}`
  return path.join(os.tmpdir(), name)
}

const launchTauriApp = async userArgs => {
  const executablePath = getTauriExecutablePath()
  if (!fs.existsSync(executablePath)) {
    throw new Error(`Tauri executable not found: ${executablePath}`)
  }

  const args = ['--user-data-dir', getTempPath()].concat(userArgs || [])
  const child = spawn(executablePath, args, {
    stdio: 'ignore'
  })
  return child
}

const waitForProcessHealthy = (child, timeoutMs = 8000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup()
      if (child.exitCode === null && !child.killed) {
        resolve(true)
      } else {
        reject(new Error('Process exited unexpectedly during startup window.'))
      }
    }, timeoutMs)

    const onExit = (code, signal) => {
      cleanup()
      reject(new Error(`Process exited early (code=${code}, signal=${signal}).`))
    }

    const cleanup = () => {
      clearTimeout(timer)
      child.removeListener('exit', onExit)
    }

    child.on('exit', onExit)
  })
}

const getMainWindowTitle = child => {
  if (!child || !child.pid || process.platform !== 'win32') {
    return ''
  }

  return new Promise(resolve => {
    let output = ''
    const ps = spawn(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `(Get-Process -Id ${child.pid} -ErrorAction SilentlyContinue).MainWindowTitle`
      ],
      { stdio: ['ignore', 'pipe', 'ignore'] }
    )

    ps.stdout.on('data', chunk => {
      output += chunk.toString()
    })
    ps.on('close', () => {
      resolve(output.trim())
    })
    ps.on('error', () => resolve(''))
  })
}

const waitForWindowTitle = (child, matcher, timeoutMs = 12000, intervalMs = 300) => {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now()

    const run = async () => {
      if (!child || child.exitCode !== null || child.killed) {
        reject(new Error('App exited before window title became ready.'))
        return
      }

      const title = await getMainWindowTitle(child)
      if (typeof matcher === 'function' ? matcher(title) : matcher.test(title)) {
        resolve(title)
        return
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error(`Timed out waiting for window title. Last title: "${title}"`))
        return
      }
      setTimeout(run, intervalMs)
    }

    run()
  })
}

const killProcessTree = async child => {
  if (!child || child.exitCode !== null || child.killed) return
  if (process.platform === 'win32') {
    await new Promise(resolve => {
      const killer = spawn('taskkill', ['/pid', `${child.pid}`, '/t', '/f'], { stdio: 'ignore' })
      killer.on('exit', () => resolve())
      killer.on('error', () => resolve())
    })
    return
  }
  child.kill('SIGTERM')
}

module.exports = {
  getTauriExecutablePath,
  launchTauriApp,
  waitForProcessHealthy,
  waitForWindowTitle,
  killProcessTree
}
