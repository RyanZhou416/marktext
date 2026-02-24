'use strict'

const { execSync } = require('child_process')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')

const FORBIDDEN_LICENSES = ['GPL-2.0', 'GPL-3.0', 'AGPL-1.0', 'AGPL-3.0']

const ALLOWED_OVERRIDES = ['marktext']

try {
  const raw = execSync('npx --yes license-checker --json --production', {
    cwd: rootDir,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  })

  const packages = JSON.parse(raw)
  let hasError = false

  for (const [name, info] of Object.entries(packages)) {
    const pkgName = name.replace(/@[\d.]+$/, '')
    if (ALLOWED_OVERRIDES.some(o => pkgName.startsWith(o))) continue

    const licenses = (info.licenses || '').toString()
    if (FORBIDDEN_LICENSES.some(f => licenses.includes(f))) {
      console.error(`[FAIL] ${name}: ${licenses}`)
      hasError = true
    }
  }

  if (hasError) {
    console.error('\nSome packages have incompatible licenses.')
    process.exit(1)
  } else {
    console.log(`All ${Object.keys(packages).length} production packages have compatible licenses.`)
  }
} catch (err) {
  console.error('Failed to run license-checker:', err.message)
  process.exit(1)
}
