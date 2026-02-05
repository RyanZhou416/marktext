import { resolve } from 'path'
import { execSync } from 'child_process'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { createRequire } from 'module'

// Create require for loading JSON
const require = createRequire(import.meta.url)
const pkg = require('./package.json')

// Get git revision info for version string
function getGitInfo() {
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

const isDev = process.env.NODE_ENV === 'development'

// Environment definitions for main process
const mainDefines = {
  'global.MARKTEXT_GIT_SHORT_HASH': JSON.stringify(shortHash),
  'global.MARKTEXT_GIT_HASH': JSON.stringify(fullHash),
  'global.MARKTEXT_VERSION': JSON.stringify(pkg.version),
  'global.MARKTEXT_VERSION_STRING': JSON.stringify(`v${pkg.version}${versionSuffix}`),
  'global.MARKTEXT_IS_STABLE': JSON.stringify(isStableRelease),
  // Define __static for development mode (production is handled by globalSetting.js)
  ...(isDev ? { __static: JSON.stringify(resolve(__dirname, 'static')) } : {})
}

// Environment definitions for renderer process
const rendererDefines = {
  'process.versions.MARKTEXT_VERSION': JSON.stringify(pkg.version),
  'process.versions.MARKTEXT_VERSION_STRING': JSON.stringify(`v${pkg.version}${versionSuffix}`)
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        }
      }
    },
    resolve: {
      alias: {
        common: resolve(__dirname, 'src/common')
      }
    },
    define: mainDefines
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    },
    define: mainDefines
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        }
      },
      assetsDir: 'assets',
      copyPublicDir: true,
      // Ensure CommonJS modules are transformed properly
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true
      }
    },
    publicDir: resolve(__dirname, 'src/renderer/public'),
    plugins: [
      vue(),
      // Provide Node.js polyfills for browser compatibility
      nodePolyfills({
        // Include specific polyfills needed by third-party libraries
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
        main: resolve(__dirname, 'src/main'),
        snapsvg: resolve(__dirname, 'src/muya/lib/assets/libs/snapsvg-shim.js'),
        // Vue 3 ESM bundler build (includes runtime compiler)
        vue: 'vue/dist/vue.esm-bundler.js',
        // Node.js modules without browser polyfills - provide empty stubs
        // Actual functionality is provided via preload script
        fs: resolve(__dirname, 'src/renderer/node/stubs/empty.js'),
        child_process: resolve(__dirname, 'src/renderer/node/stubs/empty.js'),
        net: resolve(__dirname, 'src/renderer/node/stubs/empty.js'),
        tls: resolve(__dirname, 'src/renderer/node/stubs/empty.js'),
        dns: resolve(__dirname, 'src/renderer/node/stubs/empty.js'),
        dgram: resolve(__dirname, 'src/renderer/node/stubs/empty.js'),
        // Stub modules that use require() in browser environment
        encoding: resolve(__dirname, 'src/renderer/node/stubs/empty.js'),
        'electron-log': resolve(__dirname, 'src/renderer/node/stubs/empty.js')
      },
      // Allow importing .vue files without extension
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '.vue']
    },
    define: {
      ...rendererDefines,
      global: 'window',
      // Static path for assets - will be resolved by preload in production
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
      // Force optimization of CommonJS modules
      esbuildOptions: {
        target: 'es2020'
      }
    },
    // Allow importing raw CSS as strings using ?inline suffix
    assetsInclude: ['**/*.md']
  }
})
