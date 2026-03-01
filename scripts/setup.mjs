#!/usr/bin/env node
/**
 * MarkText Development Environment Setup
 *
 * Cross-platform Node.js script that:
 *   1. Checks system tools (Rust, Node, npm, WebView2) in parallel
 *   2. Installs JS dependencies
 *   3. Checks project tools (Tauri CLI) and fetches Rust deps
 *   4. Detects & configures compile accelerators (sccache, lld)
 *
 * Usage: node scripts/setup.mjs
 * Safe to re-run — skips steps already done.
 */

import { execSync, execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { platform } from 'node:os'

// ─── Helpers ─────────────────────────────────────────────────

const isWin = platform() === 'win32'
const root = join(import.meta.dirname, '..')
const tauriDir = join(root, 'src-tauri')

const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const CYAN = '\x1b[36m'
const DIM = '\x1b[2m'
const RESET = '\x1b[0m'

const ok = (msg) => console.log(`  ${GREEN}[OK]${RESET} ${msg}`)
const warn = (msg) => console.log(`  ${YELLOW}[!]${RESET}  ${msg}`)
const fail = (msg) => console.log(`  ${RED}[MISSING]${RESET} ${msg}`)
const info = (msg) => console.log(`  ${DIM}${msg}${RESET}`)
const heading = (step, total, msg) =>
  console.log(`\n${CYAN}[Step ${step}/${total}]${RESET} ${msg}\n`)

function which(cmd) {
  try {
    const out = execSync(`${isWin ? 'where' : 'which'} ${cmd}`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8',
    }).trim()
    return out.split(/\r?\n/)[0]
  } catch {
    return null
  }
}

function getVersion(cmd, args = ['--version']) {
  try {
    const fullCmd = [cmd, ...args].join(' ')
    return execSync(fullCmd, {
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8',
    }).trim()
  } catch {
    return null
  }
}

function run(cmd, opts = {}) {
  return execSync(cmd, {
    cwd: root,
    stdio: 'inherit',
    encoding: 'utf-8',
    ...opts,
  })
}

// ─── Step 1: Check system tools (parallel) ───────────────────

async function checkSystemTools() {
  heading(1, 4, 'Checking system tools...')

  const checks = await Promise.all([
    // Rust
    Promise.resolve().then(() => {
      const path = which('rustc')
      if (!path) return { name: 'Rust', ok: false, critical: true }
      return { name: 'Rust', ok: true, version: getVersion('rustc') }
    }),
    // Cargo
    Promise.resolve().then(() => {
      const path = which('cargo')
      if (!path) return { name: 'Cargo', ok: false, critical: true }
      return { name: 'Cargo', ok: true, version: getVersion('cargo') }
    }),
    // Node.js (Vite 7 requires Node 20+)
    Promise.resolve().then(() => {
      const major = parseInt(process.version.slice(1).split('.')[0], 10)
      if (major < 20) {
        return {
          name: 'Node.js',
          ok: false,
          critical: true,
          version: `Node.js ${process.version} (20+ required for Vite 7)`,
        }
      }
      return { name: 'Node.js', ok: true, version: `Node.js ${process.version}` }
    }),
    // npm
    Promise.resolve().then(() => {
      const path = which('npm')
      if (!path) return { name: 'npm', ok: false, critical: true }
      return { name: 'npm', ok: true, version: `npm ${getVersion('npm')}` }
    }),
    // WebView2 (Windows only)
    Promise.resolve().then(() => {
      if (!isWin) return { name: 'WebView2', ok: true, version: 'N/A (not Windows)' }
      try {
        execSync(
          'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" /v pv',
          { stdio: 'pipe' }
        )
        return { name: 'WebView2', ok: true, version: 'installed' }
      } catch {
        // Check for Edge as fallback
        const edgePaths = [
          process.env['ProgramFiles(x86)'] + '\\Microsoft\\Edge\\Application\\msedge.exe',
          process.env['ProgramFiles'] + '\\Microsoft\\Edge\\Application\\msedge.exe',
        ]
        if (edgePaths.some(existsSync)) {
          return { name: 'WebView2', ok: true, version: 'via Microsoft Edge' }
        }
        return { name: 'WebView2', ok: false, critical: true }
      }
    }),
  ])

  const results = {}
  let hasMissing = false

  for (const c of checks) {
    if (c.ok) {
      ok(c.version || c.name)
      results[c.name] = c.version
    } else {
      fail(c.version || c.name)
      if (c.critical) hasMissing = true
    }
  }

  if (hasMissing) {
    console.log(`\n${RED}Missing system dependencies:${RESET}`)
    if (!checks.find((c) => c.name === 'Rust')?.ok) {
      console.log('\n  [Rust] https://rustup.rs/')
      console.log('         Or: winget install Rustlang.Rustup')
    }
    if (!checks.find((c) => c.name === 'Node.js')?.ok) {
      console.log('\n  [Node.js] https://nodejs.org/ (v20+ required)')
      console.log('           Or: winget install OpenJS.NodeJS.LTS')
    }
    if (!checks.find((c) => c.name === 'WebView2')?.ok) {
      console.log(
        '\n  [WebView2] Install Edge or download from:'
      )
      console.log(
        '             https://developer.microsoft.com/en-us/microsoft-edge/webview2/'
      )
    }
    process.exit(1)
  }

  return results
}

// ─── Step 2: Install JS dependencies ─────────────────────────

function installJsDeps() {
  heading(2, 4, 'Installing JS dependencies...')

  if (existsSync(join(root, 'node_modules', '.package-lock.json'))) {
    ok('node_modules already exists')
    return
  }

  console.log('  Running npm install...')
  run('npm install --legacy-peer-deps')
  ok('Dependencies installed')
}

// ─── Step 3: Check project tools + fetch Rust deps ───────────

function checkProjectTools() {
  heading(3, 4, 'Checking project tools & fetching Rust dependencies...')

  // Tauri CLI
  let tauriVer = null
  if (which('cargo-tauri')) {
    tauriVer = getVersion('cargo-tauri')
  }
  if (!tauriVer) {
    tauriVer = getVersion('npx', ['tauri', '--version'])
  }

  if (tauriVer) {
    ok(`Tauri CLI ${tauriVer}`)
  } else {
    fail('Tauri CLI not found. Try: cargo install tauri-cli')
    process.exit(1)
  }

  // Fetch Rust dependencies
  if (existsSync(join(tauriDir, 'target', '.cargo-lock'))) {
    ok('Rust dependencies already fetched')
  } else {
    console.log('  Fetching Rust dependencies...')
    run('cargo fetch', { cwd: tauriDir })
    ok('Rust dependencies fetched')
  }

  return tauriVer
}

// ─── Step 4: Compile accelerators ────────────────────────────

function configureAccelerators() {
  heading(4, 4, 'Checking compile accelerators...')

  const hasSccache = !!which('sccache')
  const hasLld = !!which('lld-link') || !!which('rust-lld')

  if (hasSccache) {
    ok(`sccache ${getVersion('sccache') || ''}`)
  } else {
    warn('sccache not installed')
    info('  Caches compiled crates across builds.')
    info('  Install: cargo install sccache --locked')
    info('  Or:      winget install Mozilla.sccache')
    console.log()
  }

  if (hasLld) {
    ok('lld linker found')
  } else {
    warn('lld linker not installed')
    info('  2-5x faster linking than default MSVC linker.')
    info('  Install: rustup component add llvm-tools')
    console.log()
  }

  // Write .cargo/config.toml
  const cargoConfigDir = join(tauriDir, '.cargo')
  if (!existsSync(cargoConfigDir)) mkdirSync(cargoConfigDir, { recursive: true })

  const lines = ['# Auto-generated by scripts/setup.mjs', '']
  if (hasSccache) {
    lines.push('[build]', 'rustc-wrapper = "sccache"', '')
  }
  if (hasLld && isWin) {
    lines.push(
      '[target.x86_64-pc-windows-msvc]',
      'linker = "lld-link"',
      'rustflags = ["-C", "link-arg=-fuse-ld=lld"]',
      ''
    )
  }
  if (!hasSccache && !hasLld) {
    lines.push(
      '# No accelerators found. Consider installing:',
      '# - sccache: cargo install sccache --locked',
      '# - lld: rustup component add llvm-tools'
    )
  }

  writeFileSync(join(cargoConfigDir, 'config.toml'), lines.join('\n') + '\n')
  ok('Cargo config written')

  return { hasSccache, hasLld }
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  console.log()
  console.log('==============================================================')
  console.log('       MarkText Development Environment Setup')
  console.log('==============================================================')

  const versions = await checkSystemTools()
  installJsDeps()
  const tauriVer = checkProjectTools()
  const accel = configureAccelerators()

  // Write marker
  writeFileSync(join(root, '.tauri-env-ready'), new Date().toISOString() + '\n')

  // Summary
  console.log()
  console.log('==============================================================')
  console.log('       Environment Ready!')
  console.log('==============================================================')
  console.log()
  console.log(`  ${versions['Rust'] || '?'}`)
  console.log(`  Tauri CLI ${tauriVer}`)
  console.log(`  ${versions['Node.js']}`)
  console.log(`  ${versions['npm']}`)
  console.log(
    `  sccache:  ${accel.hasSccache ? GREEN + 'enabled' + RESET : YELLOW + 'not installed' + RESET}`
  )
  console.log(
    `  lld:      ${accel.hasLld ? GREEN + 'enabled' + RESET : YELLOW + 'not installed' + RESET}`
  )
  console.log()
  console.log('  Build scripts:')
  console.log('    npm run dev                    Dev run (hot reload + devtools)')
  console.log('    npm run build:portable-debug   Portable debug (with devtools)')
  console.log('    npm run build:portable-release Portable release')
  console.log('    npm run build:installer-debug  Installer debug (with devtools)')
  console.log('    npm run build:installer-release Installer release')
  console.log('    npm run e2e                    Tauri smoke e2e (build + run)')
  console.log('    npm run test:specs             CommonMark/GFM spec tests')
  console.log()

  if (!accel.hasSccache || !accel.hasLld) {
    console.log(`  ${CYAN}Performance tips:${RESET}`)
    if (!accel.hasSccache) console.log('    Install sccache:  cargo install sccache --locked')
    if (!accel.hasLld) console.log('    Install lld:      rustup component add llvm-tools')
    console.log()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
