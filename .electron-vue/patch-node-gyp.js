/**
 * 自动修补 node-gyp 以支持 Visual Studio 2026 和 Windows 11 SDK
 * 在 postinstall 阶段自动运行
 */

const fs = require("fs");
const path = require("path");

const nodeGypPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "node-gyp",
  "lib",
  "find-visualstudio.js"
);

function patchNodeGyp() {
  console.log("[patch-node-gyp] 检查 VS 2026 和 Win11 SDK 支持...");

  if (!fs.existsSync(nodeGypPath)) {
    console.log("[patch-node-gyp] node-gyp 未找到，跳过");
    return;
  }

  let content = fs.readFileSync(nodeGypPath, "utf8");
  let patched = false;

  // 1. 添加 VS 2026 版本识别 (versionMajor 18 -> 2026)
  if (!content.includes("versionMajor === 18")) {
    console.log("[patch-node-gyp] 正在添加 VS 2026 版本支持...");
    content = content.replace(
      /(if \(ret\.versionMajor === 17\) \{\s*\n\s*ret\.versionYear = 2022\s*\n\s*return ret\s*\n\s*\})/,
      `$1
    if (ret.versionMajor === 18) {
      ret.versionYear = 2026
      return ret
    }`
    );
    patched = true;
  }

  // 2. 添加 VS 2026 工具集支持 (2026 -> v145)
  if (!content.includes("versionYear === 2026")) {
    console.log("[patch-node-gyp] 正在添加 VS 2026 工具集支持...");
    content = content.replace(
      /(} else if \(versionYear === 2022\) \{\s*\n\s*return 'v143'\s*\n\s*\})/,
      `$1 else if (versionYear === 2026) {
      return 'v145'
    }`
    );
    patched = true;
  }

  // 3. 添加 Windows 11 SDK 检测支持
  if (!content.includes("Windows11SDK")) {
    console.log("[patch-node-gyp] 正在添加 Windows 11 SDK 支持...");

    // 在 getSDK 函数中添加 Windows 11 SDK 检测
    // 原始代码只检查 Windows10SDK，我们需要同时检查 Windows11SDK
    content = content.replace(
      /const win10SDKPrefix = 'Microsoft\.VisualStudio\.Component\.Windows10SDK\.'/,
      `const win10SDKPrefix = 'Microsoft.VisualStudio.Component.Windows10SDK.'
    const win11SDKPrefix = 'Microsoft.VisualStudio.Component.Windows11SDK.'`
    );

    // 修改 SDK 检测逻辑，同时检查 Win10 和 Win11 SDK
    content = content.replace(
      /info\.packages\.forEach\(\(pkg\) => \{\s*\n\s*if \(!pkg\.startsWith\(win10SDKPrefix\)\) \{\s*\n\s*return\s*\n\s*\}/,
      `info.packages.forEach((pkg) => {
      // 检查 Windows 10 SDK 或 Windows 11 SDK
      const isWin10SDK = pkg.startsWith(win10SDKPrefix)
      const isWin11SDK = pkg.startsWith(win11SDKPrefix)
      if (!isWin10SDK && !isWin11SDK) {
        return
      }
      const sdkPrefix = isWin10SDK ? win10SDKPrefix : win11SDKPrefix`
    );

    // 修改版本解析，使用动态前缀
    content = content.replace(
      /const parts = pkg\.split\('\.'\)\s*\n\s*if \(parts\.length > 5 && parts\[5\] !== 'Desktop'\)/,
      `const parts = pkg.split('.')
      // Windows 11 SDK 格式: Microsoft.VisualStudio.Component.Windows11SDK.22621
      // Windows 10 SDK 格式: Microsoft.VisualStudio.Component.Windows10SDK.19041
      if (parts.length > 5 && parts[5] !== 'Desktop')`
    );

    // 修改日志输出
    content = content.replace(
      /this\.log\.silly\('- ignoring non-Desktop Win10SDK:', pkg\)/,
      `this.log.silly('- ignoring non-Desktop SDK:', pkg)`
    );

    content = content.replace(
      /this\.log\.silly\('- failed to parse Win10SDK number:', pkg\)/,
      `this.log.silly('- failed to parse SDK number:', pkg)`
    );

    content = content.replace(
      /this\.log\.silly\('- found Win10SDK:', foundSdkVer\)/,
      `this.log.silly('- found Windows SDK:', foundSdkVer)`
    );

    patched = true;
  }

  // 4. 添加 2026 到 supportedYears 数组
  if (!content.includes("[2019, 2022, 2026]")) {
    console.log("[patch-node-gyp] 正在添加 VS 2026 到支持列表...");
    // 替换所有 [2019, 2022] 为 [2019, 2022, 2026]
    content = content.replace(/\[2019, 2022\]/g, "[2019, 2022, 2026]");
    patched = true;
  }

  if (patched) {
    fs.writeFileSync(nodeGypPath, content, "utf8");
    console.log("[patch-node-gyp] 修补完成");
  } else {
    console.log("[patch-node-gyp] 已支持 VS 2026 和 Win11 SDK，跳过");
  }
}

try {
  patchNodeGyp();
} catch (err) {
  console.error("[patch-node-gyp] 修补失败:", err.message);
}
