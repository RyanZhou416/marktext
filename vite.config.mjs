/**
 * Pure Vite configuration for Tauri build.
 * Replaces electron.vite.config.mjs - only handles the renderer (frontend).
 * Main process and preload are no longer needed (Rust backend replaces them).
 */

import { resolve } from 'path'
import { execSync } from 'child_process'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const pkg = require('./package.json')

function getGitInfo () {
  try {
    const shortHash = execSync('git rev-parse --short HEAD').toString().trim()
    const fullHash = execSync('git rev-parse HEAD').toString().trim()
    return { shortHash, fullHash }
  } catch (e) {
    return { shortHash: 'N/A', fullHash: 'N/A' }
  }
}

const { shortHash, fullHash } = getGitInfo()
const isStableRelease = !!process.env.MARKTEXT_IS_STABLE
const versionSuffix = isStableRelease ? '' : ` (${shortHash})`
const __dirname = resolve()

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  build: {
    outDir: resolve(__dirname, 'out/renderer'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'src/renderer/index.html')
      }
    },
    assetsDir: 'assets',
    copyPublicDir: true,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  },
  publicDir: resolve(__dirname, 'src/renderer/public'),
  plugins: [
    vue(),
    VueI18nPlugin({
      include: [resolve(__dirname, 'src/locales/en.json'), resolve(__dirname, 'src/locales/zh-CN.json')]
    }),
    nodePolyfills({
      include: ['buffer', 'process', 'util', 'stream', 'events', 'path', 'os', 'crypto', 'assert', 'url', 'zlib', 'http', 'https', 'string_decoder', 'constants', 'timers', 'querystring', 'vm'],
      globals: {
        Buffer: true,
        global: true,
        process: true
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
      common: resolve(__dirname, 'src/common'),
      muya: resolve(__dirname, 'src/muya'),
      // main: was src/main (Electron), now removed
      snapsvg: resolve(__dirname, 'src/muya/lib/assets/libs/snapsvg-shim.js'),
      vue: 'vue/dist/vue.esm-bundler.js',
      fs: resolve(__dirname, 'src/renderer/node/stubs/empty.js'),
      child_process: resolve(__dirname, 'src/renderer/node/stubs/empty.js'),
      net: resolve(__dirname, 'src/renderer/node/stubs/empty.js'),
      tls: resolve(__dirname, 'src/renderer/node/stubs/empty.js'),
      dns: resolve(__dirname, 'src/renderer/node/stubs/empty.js'),
      dgram: resolve(__dirname, 'src/renderer/node/stubs/empty.js'),
      encoding: resolve(__dirname, 'src/renderer/node/stubs/empty.js'),
      'electron-log': resolve(__dirname, 'src/renderer/node/stubs/empty.js'),
      'command-exists': resolve(__dirname, 'src/renderer/node/stubs/empty.js'),
      '@hfelix/electron-localshortcut': resolve(__dirname, 'src/renderer/node/stubs/empty.js')
    },
    extensions: ['.mts', '.ts', '.tsx', '.mjs', '.js', '.jsx', '.json', '.vue']
  },
  define: {
    'process.versions.MARKTEXT_VERSION': JSON.stringify(pkg.version),
    'process.versions.MARKTEXT_VERSION_STRING': JSON.stringify(`v${pkg.version}${versionSuffix}`),
    global: 'window',
    __static: JSON.stringify('static')
  },
  css: {
    postcss: {
      plugins: []
    }
  },
  optimizeDeps: {
    include: [
      'vue',
      'pinia',
      'vue-router',
      'element-plus',
      'snabbdom',
      'snabbdom-to-html',
      'mermaid',
      'katex',
      'prismjs',
      'mitt'
    ],
    exclude: [
      '@tauri-apps/api',
      '@tauri-apps/plugin-shell',
      '@tauri-apps/plugin-dialog',
      '@tauri-apps/plugin-clipboard-manager',
      '@tauri-apps/plugin-fs',
      '@tauri-apps/plugin-os',
      '@tauri-apps/plugin-process',
      '@tauri-apps/plugin-window-state'
    ],
    esbuildOptions: {
      target: 'es2020',
      define: {
        global: 'globalThis',
        'process.env.NODE_DEBUG': 'false'
      }
    }
  },
  assetsInclude: ['**/*.md'],
  server: {
    port: 5173,
    strictPort: false,
    watch: {
      ignored: ['**/src-tauri/**']
    }
  }
})
