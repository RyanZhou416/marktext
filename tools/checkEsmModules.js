"use strict";

/**
 * 检测 dependencies 中哪些包是 ESM-only 的
 * 这些包需要加入 webpack 白名单，否则打包后运行会失败
 *
 * 使用方法: node tools/checkEsmModules.js
 */

const fs = require("fs");
const path = require("path");

const { dependencies } = require("../package.json");

// 从 webpack 配置中读取当前白名单
function getWhiteListFromWebpack() {
  try {
    const webpackConfigPath = path.join(
      __dirname,
      "../.electron-vue/webpack.renderer.config.js"
    );
    const content = fs.readFileSync(webpackConfigPath, "utf-8");

    // 匹配 whiteListedModules = [...] 或 whiteListedModules = [...]
    const match = content.match(/whiteListedModules\s*=\s*\[([^\]]+)\]/);
    if (match) {
      // 解析数组内容
      const arrayContent = match[1];
      const modules = arrayContent
        .split(",")
        .map((s) => s.trim().replace(/['"]/g, ""))
        .filter((s) => s.length > 0);
      return modules;
    }
  } catch (err) {
    console.error("警告: 无法读取 webpack 配置文件:", err.message);
  }
  return ["vue"]; // 默认值
}

const whiteListedModules = getWhiteListFromWebpack();

console.log("检查 ESM 模块兼容性...\n");
console.log(`当前白名单: ${JSON.stringify(whiteListedModules)}\n`);

const esmOnlyPackages = [];
const needsCheck = [];

for (const pkgName of Object.keys(dependencies)) {
  try {
    const pkgJsonPath = require.resolve(`${pkgName}/package.json`, {
      paths: [path.join(__dirname, "../node_modules")],
    });
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));

    // 检测是否是 ESM-only
    const isEsmOnly =
      pkgJson.type === "module" || // package.json 声明为 ESM
      (pkgJson.exports && !pkgJson.main && !pkgJson.exports.require) || // 只有 ESM 导出
      (pkgJson.module && !pkgJson.main); // 只有 module 字段

    // 检测是否有 CommonJS 导出
    const hasRequireExport =
      pkgJson.exports?.require ||
      pkgJson.exports?.["."]?.require ||
      (pkgJson.main && !pkgJson.type);

    if (isEsmOnly && !hasRequireExport) {
      const inWhitelist = whiteListedModules.includes(pkgName);
      esmOnlyPackages.push({
        name: pkgName,
        type: pkgJson.type || "commonjs",
        inWhitelist,
      });
    }
  } catch (err) {
    // 某些包可能没有 package.json 或解析失败
    needsCheck.push(pkgName);
  }
}

// 输出结果
if (esmOnlyPackages.length > 0) {
  console.log("=== ESM-only 包 ===\n");

  const notInWhitelist = esmOnlyPackages.filter((p) => !p.inWhitelist);
  const inWhitelist = esmOnlyPackages.filter((p) => p.inWhitelist);

  if (notInWhitelist.length > 0) {
    console.log("❌ 以下包是 ESM-only，需要加入白名单：");
    notInWhitelist.forEach((p) => {
      console.log(`   - ${p.name}`);
    });
    console.log("");
    console.log(
      "   修复方法: 在 .electron-vue/webpack.renderer.config.js 中添加到 whiteListedModules"
    );
    console.log("");
  }

  if (inWhitelist.length > 0) {
    console.log("✅ 以下 ESM-only 包已在白名单中：");
    inWhitelist.forEach((p) => {
      console.log(`   - ${p.name}`);
    });
    console.log("");
  }
} else {
  console.log("✅ 没有发现 ESM-only 的包\n");
}

if (needsCheck.length > 0) {
  console.log("ℹ️  以下包需要手动检查：");
  needsCheck.forEach((p) => {
    console.log(`   - ${p}`);
  });
  console.log("");
}

// 输出建议的白名单
const allEsmModules = esmOnlyPackages.map((p) => p.name);
const suggestedWhitelist = [
  ...new Set([...whiteListedModules, ...allEsmModules]),
];

if (allEsmModules.some((m) => !whiteListedModules.includes(m))) {
  console.log("=== 建议的白名单配置 ===\n");
  console.log(
    `const whiteListedModules = ${JSON.stringify(suggestedWhitelist)}`
  );
  console.log("");
  process.exitCode = 1; // 有未处理的 ESM 包时返回错误码
} else {
  console.log("=== 检查通过 ===\n");
  console.log("所有 ESM-only 包都已在白名单中。");
}
