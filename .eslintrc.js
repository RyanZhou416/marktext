module.exports = {
  root: true,
  parserOptions: {
    parser: '@babel/eslint-parser',
    ecmaVersion: 11,
    ecmaFeatures: {
      impliedStrict: true
    },
    sourceType: 'module',
    requireConfigFile: false,
    babelOptions: {
      configFile: false
    }
  },
  env: {
    browser: true,
    es6: true,
    node: true
  },
  extends: [
    'standard',
    'eslint:recommended',
    'plugin:vue/base',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:prettier/recommended'
  ],
  globals: {
    __static: true
  },
  plugins: ['html', 'vue'],
  rules: {
    // Code quality rules (formatting is handled by Prettier)
    'no-return-await': 'error',
    'no-return-assign': 'error',
    'no-new': 'error',
    // allow console
    'no-console': 'off',
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'require-atomic-updates': 'off',
    // TODO: fix these errors someday
    'prefer-const': 'off',
    'no-mixed-operators': 'off',
    'no-prototype-builtins': 'off',
    // Ignore Vite-specific import suffixes and ESM-only packages
    'import/no-unresolved': [
      'error',
      {
        ignore: [
          '\\?raw$',
          '\\?inline$',
          '\\?url$',
          '\\?worker$',
          'vue-sonner',
          'radix-vue',
          '@vueuse',
          '@tanstack'
        ]
      }
    ],
    // Disable import resolution rules - they crash on ESM-only packages
    // (vue-sonner, radix-vue, @vueuse/core, @tanstack/vue-virtual)
    'import/namespace': 'off',
    'import/default': 'off',
    'import/named': 'off',
    'import/no-named-as-default': 'off',
    'import/no-named-as-default-member': 'off',
    'import/no-duplicates': 'off'
  },
  settings: {
    'import/resolver': {
      alias: {
        map: [
          ['common', './src/common'],
          // Normally only valid for renderer/
          ['@', './src/renderer'],
          ['muya', './src/muya']
        ],
        extensions: ['.js', '.ts', '.vue', '.json', '.css', '.node']
      }
    },
    // Ignore Vite-specific import suffixes and ESM-only packages
    'import/ignore': [
      '\\?raw$',
      '\\?inline$',
      '\\?url$',
      '\\?worker$',
      'vue-sonner',
      'radix-vue',
      '@vueuse',
      '@tanstack'
    ]
  },
  overrides: [
    {
      files: ['*.vue'],
      parser: 'vue-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser'
      },
      plugins: ['@typescript-eslint'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-unused-expressions': 'off',
        'no-unused-vars': 'off',
        'no-undef': 'off'
      }
    },
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: ['plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
      rules: {
        // Gradual adoption - relax some strict rules initially
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-unsafe-function-type': 'warn',
        // Disable base rules that conflict with TS versions
        'no-unused-vars': 'off',
        'no-undef': 'off',
        'no-use-before-define': 'off',
        'no-return-await': 'warn',
        'no-useless-catch': 'warn',
        'node/no-callback-literal': 'off'
      }
    }
  ],
  ignorePatterns: ['node_modules', 'src/muya/dist/**/*', 'src/muya/webpack.config.js']
}
