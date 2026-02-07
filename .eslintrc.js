module.exports = {
  root: true,
  parserOptions: {
    parser: '@babel/eslint-parser',
    ecmaVersion: 11,
    ecmaFeatures: {
      impliedStrict: true
    },
    sourceType: 'module'
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
    'plugin:import/warnings'
  ],
  globals: {
    __static: true
  },
  plugins: ['html', 'vue'],
  rules: {
    // Two spaces but disallow semicolons
    indent: ['error', 2, { 'SwitchCase': 1, 'ignoreComments': true }],
    semi: [2, 'never'],
    'no-return-await': 'error',
    'no-return-assign': 'error',
    'no-new': 'error',
    // allow paren-less arrow functions
    'arrow-parens': 'off',
    // allow console
    'no-console': 'off',
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'require-atomic-updates': 'off',
    // TODO: fix these errors someday
    'prefer-const': 'off',
    'no-mixed-operators': 'off',
    'no-prototype-builtins': 'off',
    // Ignore Vite-specific import suffixes (?raw, ?inline, ?url, etc.)
    'import/no-unresolved': ['error', {
      ignore: ['\\?raw$', '\\?inline$', '\\?url$', '\\?worker$']
    }]
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
    // Ignore Vite-specific import suffixes (?raw, ?inline, etc.)
    'import/ignore': [
      '\\?raw$',
      '\\?inline$',
      '\\?url$',
      '\\?worker$'
    ]
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: [
        'plugin:@typescript-eslint/recommended'
      ],
      rules: {
        // Gradual adoption - relax some strict rules initially
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/ban-ts-comment': 'off',
        // Disable base rules that conflict with TS versions
        'no-unused-vars': 'off',
        'no-undef': 'off'
      }
    }
  ],
  ignorePatterns: [
    'node_modules',
    'src/muya/dist/**/*',
    'src/muya/webpack.config.js'
  ]
}
