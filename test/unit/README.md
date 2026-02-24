# Unit Tests (Deprecated)

The Karma + webpack unit tests in this directory are **deprecated** and no longer work after the migration to Tauri + Vite.

- `karma.conf.js` depends on `.electron-vue/webpack.renderer.config.js` which has been removed
- Tests were designed for Electron; the project now uses Tauri

**Current testing**: Use `npm run e2e` (Playwright) for end-to-end tests.

**Future**: Consider migrating to [Vitest](https://vitest.dev/) for unit tests compatible with Vite.
