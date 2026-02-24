'use strict'

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const outputPath = path.resolve(rootDir, 'resources', 'THIRD-PARTY-LICENSES.txt')

try {
  const raw = execSync('npx --yes license-checker --json --production', {
    cwd: rootDir,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  })

  const packages = JSON.parse(raw)
  const addedNames = new Set()
  let summary = ''
  let licenseList = ''
  let index = 1

  for (const [key, info] of Object.entries(packages)) {
    let packageName = key.replace(/@[\d.^~]+$/, '')
    if (packageName.startsWith('marktext')) continue
    if (addedNames.has(packageName)) continue
    addedNames.add(packageName)

    const licenses = info.licenses || 'Unknown'
    summary += `${index++}. ${packageName} (${licenses})\n`

    let licenseText = ''
    if (info.licenseFile) {
      try {
        licenseText = fs.readFileSync(info.licenseFile, 'utf-8')
      } catch {
        licenseText = '(license file not found)'
      }
    }

    licenseList += `# ${packageName} (${licenses})
-------------------------------------------------
${licenseText}

`
  }

  const output = `# Third Party Notices
-------------------------------------------------

This file contains all third-party packages that are bundled and shipped with MarkText.

-------------------------------------------------
# Summary
-------------------------------------------------

${summary}

-------------------------------------------------
# Licenses
-------------------------------------------------

${licenseList}`

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, output)
  console.log(`Generated ${outputPath} with ${addedNames.size} packages.`)
} catch (err) {
  console.error('Failed to generate third-party licenses:', err.message)
  process.exit(1)
}
