const { expect, test } = require('@playwright/test')
const path = require('path')
const {
  launchTauriApp,
  waitForProcessHealthy,
  waitForWindowTitle,
  killProcessTree
} = require('./helpers')

test.describe('Test XSS Vulnerabilities', async () => {
  let app = null
  let title = ''

  test.beforeAll(async () => {
    const xssPath = path.resolve('test/e2e/data/xss.md')
    app = await launchTauriApp([xssPath])
    await waitForProcessHealthy(app, 10000)
    title = await waitForWindowTitle(app, /marktext/i)

    // Wait to parse and render the document.
    await new Promise(resolve => setTimeout(resolve, 3000))
  })

  test.afterAll(async () => {
    await killProcessTree(app)
  })

  test('Load malicious document', async () => {
    expect(app.exitCode).toBeNull()
    expect(title).toMatch(/marktext/i)
  })
})
