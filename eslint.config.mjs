import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import prettier from 'eslint-plugin-prettier/recommended'
import pluginN from 'eslint-plugin-n'

export default [
  // ───────────────── Global ignores ─────────────────
  {
    ignores: [
      'node_modules/',
      'dist/',
      'src/muya/dist/**',
      'tools/',
      'test/unit/coverage/**',
      'test/unit/*.js',
      'test/e2e/*.js',
      'src/renderer/assets/symbolIcon/index.js',
      'src/muya/lib/assets/libs/*.js',
      // Root config files that shouldn't be linted
      'babel.config.js',
      'commitlint.config.js',
    ],
  },

  // ───────────────── Base JS recommended ─────────────────
  js.configs.recommended,

  // ───────────────── Node.js best practices ─────────────────
  pluginN.configs['flat/recommended-script'],

  // ───────────────── Vue (flat/recommended) ─────────────────
  ...pluginVue.configs['flat/recommended'],

  // ───────────────── TypeScript (scoped to .ts/.tsx only) ─────────────────
  // Do NOT include .vue here — vue-eslint-parser handles Vue files.
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.ts', '**/*.tsx'],
  })),

  // ───────────────── Prettier (must be last preset) ─────────────────
  prettier,

  // ───────────────── Shared settings for all files ─────────────────
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node,
        __static: 'readonly',
      },
    },
    rules: {
      // ── Code quality (formatting is handled by Prettier) ──
      'no-return-await': 'error',
      'no-return-assign': 'error',
      'no-new': 'error',
      'no-console': 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      'require-atomic-updates': 'off',

      // TODO: fix these errors someday
      'prefer-const': 'off',
      'no-mixed-operators': 'off',
      'no-prototype-builtins': 'off',

      // ESLint 10 new rules — disable for now, fix gradually
      'no-useless-assignment': 'off',
      'preserve-caught-error': 'off',
      'no-unassigned-vars': 'off',

      // Node plugin — relax for frontend/hybrid code
      'n/no-missing-import': 'off',
      'n/no-missing-require': 'off',
      'n/no-unpublished-import': 'off',
      'n/no-unpublished-require': 'off',
      'n/no-unsupported-features/es-syntax': 'off',
      'n/no-unsupported-features/node-builtins': 'off',
      'n/no-process-exit': 'off',
      'n/no-extraneous-import': 'off',
      'n/no-extraneous-require': 'off',
    },
  },

  // ───────────────── Vue files ─────────────────
  {
    files: ['**/*.vue'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-unused-vars': 'off',
      'no-undef': 'off',

      // Vue-specific relaxations
      'vue/multi-word-component-names': 'off',
      'vue/no-reserved-component-names': 'off',
      'vue/no-v-html': 'off',
      'vue/require-default-prop': 'off',
      'vue/no-mutating-props': 'warn',
      'vue/no-unused-components': 'warn',
      'vue/require-toggle-inside-transition': 'warn',
      'vue/no-deprecated-v-on-number-modifiers': 'warn',
    },
  },

  // ───────────────── TypeScript files ─────────────────
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Gradual adoption — relax some strict rules initially
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',

      // Disable base rules that conflict with TS versions
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-use-before-define': 'off',
      'no-return-await': 'warn',
      'no-useless-catch': 'warn',
      'n/no-callback-literal': 'off',
    },
  },

  // ───────────────── Test files ─────────────────
  {
    files: ['test/**/*.js', 'test/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.mocha,
        assert: 'readonly',
        expect: 'readonly',
        should: 'readonly',
        __static: 'readonly',
      },
    },
  },

  // ───────────────── Plain JS files (no TS parser) ─────────────────
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    rules: {
      // TS rules don't apply to plain JS
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      // Muya has many unused params in callbacks — relax to warning
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
]
