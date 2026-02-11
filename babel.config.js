const presetsHash = {
  test: [
    [
      '@babel/preset-env',
      {
        targets: { node: 18 }
      }
    ]
  ],
  main: [
    [
      '@babel/preset-env',
      {
        targets: { node: 18 }
      }
    ]
  ],
  // Tauri uses the system WebView (WebView2 on Windows, WebKit on macOS/Linux)
  renderer: [
    [
      '@babel/preset-env',
      {
        useBuiltIns: false,
        targets: {
          chrome: '108',
          safari: '16',
          firefox: '108'
        }
      }
    ]
  ]
}

module.exports = function (api) {
  const plugins = [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-syntax-class-properties',
    '@babel/plugin-transform-runtime',
    '@babel/plugin-syntax-dynamic-import',
    '@babel/plugin-proposal-function-bind',
    '@babel/plugin-proposal-export-default-from'
  ]
  const env = api.env()
  const presets = presetsHash[env]

  if (env === 'test') {
    plugins.push('babel-plugin-istanbul')
  }

  return {
    presets,
    plugins
  }
}
