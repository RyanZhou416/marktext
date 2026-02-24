'use strict'

/**
 * 检测 dependencies 中哪些包是 ESM-only 的
 *
 * 说明：项目已迁移到 Vite，Vite 原生支持 ESM，无需 webpack 白名单。
 * 本工具仅用于信息展示，帮助了解依赖的模块格式。
 *
 * 使用方法: node tools/checkEsmModules.js
 */

const fs = require('fs')
const path = require('path')

const { dependencies } = require('../package.json')

const esmOnlyPackages = []
const needsCheck = []

for (const pkgName of Object.keys(dependencies)) {
  try {
    const pkgJsonPath = require.resolve(`${pkgName}/package.json`, {
      paths: [path.join(__dirname, '../node_modules')]
    })
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'))

    const isEsmOnly =
      pkgJson.type === 'module' ||
      (pkgJson.exports && !pkgJson.main && !pkgJson.exports.require) ||
      (pkgJson.module && !pkgJson.main)

    const hasRequireExport =
      pkgJson.exports?.require || pkgJson.exports?.['.']?.require || (pkgJson.main && !pkgJson.type)

    if (isEsmOnly && !hasRequireExport) {
      esmOnlyPackages.push({
        name: pkgName,
        type: pkgJson.type || 'commonjs'
      })
    }
  } catch (err) {
    needsCheck.push(pkgName)
  }
}

console.log('检查 ESM 模块（Vite 项目，无需白名单）\n')

if (esmOnlyPackages.length > 0) {
  console.log('ESM-only 包：')
  esmOnlyPackages.forEach(p => console.log(`  - ${p.name}`))
  console.log('')
}

if (needsCheck.length > 0) {
  console.log('需手动检查的包：')
  needsCheck.forEach(p => console.log(`  - ${p}`))
  console.log('')
}

console.log('Vite 原生支持 ESM，上述包可直接使用。')
