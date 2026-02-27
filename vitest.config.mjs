import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { mergeConfig } from 'vite'
import { defineConfig } from 'vitest/config'
import viteConfig from './vite.config.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)))

export default mergeConfig(
  viteConfig,
  defineConfig({
    root: projectRoot,
    test: {
      globals: true,
      environment: 'jsdom',
      include: ['test/unit/specs/**/*.spec.js'],
      setupFiles: ['test/unit/index.js']
    }
  })
)
