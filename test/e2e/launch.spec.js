const { expect, test } = require('@playwright/test')
const {
  launchTauriApp,
  waitForProcessHealthy,
  waitForWindowTitle,
  killProcessTree
} = require('./helpers')

test.describe('Check Launch MarkText', async () => {
  let app = null
  let title = ''

  test.beforeAll(async () => {
    app = await launchTauriApp()
    await waitForProcessHealthy(app, 10000)
    title = await waitForWindowTitle(app, /marktext/i)
  })

  test.afterAll(async () => {
    await killProcessTree(app)
  })

  test('Empty MarkText', async () => {
    expect(app.exitCode).toBeNull()
    expect(title).toMatch(/marktext/i)
  })
})
