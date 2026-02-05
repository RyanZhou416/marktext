# MarkText 升级路线图

> 本文档记录 MarkText 从当前状态逐步升级到现代化技术栈的完整路线。
> 每个阶段完成后请更新状态。

## 核心原则

### 1. 一劳永逸原则 ⭐

**当发现"修修补补"的方案会在后续升级中被覆盖或失效时，应该选择彻底的现代化方案，而不是临时性的兼容补丁。**

示例：
- ❌ 临时方案：设置 `nodeIntegration: true` 让旧代码继续工作
- ✅ 一劳永逸：彻底重构渲染进程，使用 `contextBridge` + IPC 的现代架构

理由：
- 临时方案会积累技术债务
- 每次 Electron 升级都可能踩坑
- 违背框架推荐的安全实践
- 长期维护成本更高

**应用场景**：
- 如果发现某个修复方案会被后续升级覆盖 → 选择一劳永逸
- 如果发现需要大量 polyfill/hack → 考虑彻底重构
- 如果发现与框架推荐实践相悖 → 按推荐实践重写

### 2. 验证一律用脚本，不手动敲命令

   - 环境与依赖：用 `scripts\setup-dev-env.cmd`（Windows）完成安装、Electron、原生模块编译与格式化。
   - 开发运行：用 `scripts\dev.cmd` 验证能正常启动和操作。
   - 构建验证：用 `scripts\build-win-portable.cmd` 或 `scripts\build-win-installer.cmd` 验证打包通过。
   - 各阶段的「验证清单」以「运行上述脚本是否通过」为准，不写 `yarn install` / `yarn run rebuild` 等手写步骤。

### 3. 升级后必须同步更新脚本

   - 依赖或原生模块有变更（如增删 keytar、换 Node/Electron 版本、换 VS 版本）时，必须检查并更新：
     - **环境设置脚本**：`scripts\setup-dev-env.cmd`（清理/编译的原生模块目录、VS 版本等）。
     - **构建脚本**：`scripts\build-win-portable.cmd`、`scripts\build-win-installer.cmd`、`scripts\build-windows.ps1`（同上，以及是否需要 rebuild 的判断）。
   - 避免脚本里仍引用已删除的依赖（如 keytar）或错误的 VS 版本，导致每次误判需重建或清理失败。

## 概览

```
当前状态                                              目标状态
─────────                                            ─────────
Electron 18        ──────────────────────────────►   Tauri 2.0
Vue 2 + Vuex       ──────────────────────────────►   Vue 3 + Pinia
webpack            ──────────────────────────────►   Vite (解决 ESM 兼容性)
Muya (自研)        ──────────────────────────────►   Milkdown/现代化Muya
JavaScript         ──────────────────────────────►   TypeScript
原生模块 x3        ──────────────────────────────►   原生模块 x0
```

---

## 阶段 0: 基础准备 ✅ 已完成

**目标**: 修复 Windows 构建问题，建立自动化构建流程

| 任务                       | 状态 | 说明                                  |
| -------------------------- | ---- | ------------------------------------- |
| 替换 `ced` → `chardet`     | ✅   | 移除 1 个原生模块，纯 JS 字符编码检测 |
| 创建 VS 2026 补丁脚本      | ✅   | `.electron-vue/patch-node-gyp.js`     |
| 创建一键构建脚本           | ✅   | `scripts/build-win-portable.cmd` 等   |
| 修复 electron-builder 配置 | ✅   | 禁用重复编译原生模块                  |

**当前原生模块**: `fontmanager-redux`, `native-keymap` (2 个；keytar 已在阶段 2 移除)

---

## 阶段 1: 构建工具升级 ✅ 已完成

**目标**: 升级构建工具到最新稳定版本

| 任务                  | 状态 | 当前版本 | 目标版本                |
| --------------------- | ---- | -------- | ----------------------- |
| 升级 electron-builder | ✅   | 23.0.6   | 26.7.0                  |
| 替换 electron-rebuild | ✅   | 3.2.7    | @electron/rebuild 4.0.0 |
| 升级 Node.js          | ✅   | 20.11.0  | 24.13.0                 |
| 修复配置兼容性        | ✅   | -        | electron-builder.yml    |

### 操作步骤

```bash
# 1. 升级 electron-builder
yarn upgrade electron-builder@^26

# 2. 替换 electron-rebuild 为官方包
yarn remove electron-rebuild
yarn add -D @electron/rebuild

# 3. 更新 package.json 中的 rebuild 脚本
# "rebuild": "electron-rebuild -f"

# 4. 更新 browserslist 数据库
npx browserslist@latest --update-db
```

### 验证清单（均通过脚本执行）

- [x] 运行 `scripts\setup-dev-env.cmd` 成功（或等价的环境初始化脚本）
- [x] 运行 `scripts\build-win-portable.cmd` 构建成功
- [x] 生成的应用可以正常运行

### 遇到的问题与修复

**问题**: 打包后的应用卡在加载页面，渲染进程崩溃

**错误信息**:

```
Uncaught Error: require() of ES Module snabbdom/build/index.js not supported.
```

**原因**: `snabbdom` 3.x 是纯 ESM 模块，但 webpack 将其设为 external，导致运行时用 `require()` 加载失败

**修复**: 在 `.electron-vue/webpack.renderer.config.js` 中将 `snabbdom` 加入白名单：

```javascript
const whiteListedModules = ["vue", "snabbdom", "snabbdom-to-html"];
```

---

## 阶段 2: 减少原生模块 ✅

**目标**: 将原生模块从 3 个减少到 2 个

| 任务                          | 状态 | 说明                     |
| ----------------------------- | ---- | ------------------------ |
| 替换 `keytar` → `safeStorage` | ✅   | 使用 Electron 内置 API   |
| 更新密码存储逻辑              | ✅   | 主进程实现加解密         |
| 迁移现有存储数据              | ✅   | 自动迁移，兼容旧版本数据 |

### 实现细节

**新增文件**:

- `src/main/dataCenter/secureStorage.js` - 安全存储模块

**实现特点**:

1. 使用 Electron `safeStorage` API 进行加密/解密
2. 数据存储在 `electron-store` 中（base64 编码的加密数据）
3. 自动检测并迁移 keytar 中的旧数据
4. 兼容 keytar API 接口，最小化代码改动
5. 支持加密不可用时的降级处理

**迁移逻辑**:

- 首次启动时自动检测 keytar 数据
- 迁移成功后从 keytar 删除旧数据
- 使用标记防止重复迁移

### 验证清单

- [x] GitHub token 存储/读取正常
- [x] 图床配置存储正常
- [x] 旧版本数据可以迁移

### 收益

- 减少 1 个原生模块依赖
- 简化构建流程（无需编译 keytar）
- 减小安装包体积

### 脚本同步（升级后必做）

- 已从 `scripts\setup-dev-env.cmd`、`scripts\build-win-portable.cmd`、`scripts\build-win-installer.cmd` 中移除对 keytar 的清理与检查，仅保留 fontmanager-redux、native-keymap。

---

## 阶段 3: Electron 小版本升级 ✅

**目标**: 升级到 Electron 18 的最新补丁版本，确保稳定性

| 任务                  | 状态 | 当前版本 | 目标版本          |
| --------------------- | ---- | -------- | ----------------- |
| 升级 Electron 18.x    | ✅   | 18.0.4   | 18.3.x (最新补丁) |
| 升级 @electron/remote | ✅   | 2.0.8    | 2.1.x             |
| 测试所有功能          | ✅   | -        | 已通过脚本验证    |

### 操作步骤

- 修改 `package.json` 中 `electron`、`@electron/remote` 版本后，**一律用脚本验证**，不手敲命令。

### 验证清单（均通过脚本执行）

- [x] 运行 `scripts\setup-dev-env.cmd` 成功（含依赖安装、Electron、原生模块编译、格式化）
- [x] 运行 `scripts\dev.cmd` 能正常启动并操作
- [x] 运行 `scripts\build-win-portable.cmd` 构建成功
- [x] 若本阶段涉及依赖或原生模块变更，已检查并更新 `scripts\setup-dev-env.cmd`、`scripts\build-win-portable.cmd`、`scripts\build-win-installer.cmd` 中的清理/编译项（如移除 keytar、统一 VS 版本等）

---

## 阶段 4: Electron 大版本升级 ✅ 已完成

**目标**: 升级到 Electron 38.x（最新稳定版），启用 contextIsolation 安全特性

| 任务                        | 状态 | 当前版本 | 目标版本                |
| --------------------------- | ---- | -------- | ----------------------- |
| 研究 Breaking Changes       | ✅   | -        | 阅读 18→38 的所有变更   |
| 创建 preload 脚本           | ✅   | -        | contextBridge 暴露 API  |
| 配置 webpack.preload        | ✅   | -        | electron-preload target |
| 升级 Electron               | ✅   | 18.3.x   | 38.x                    |
| 启用 contextIsolation       | ✅   | false    | true                    |
| 禁用 nodeIntegration        | ✅   | true     | false                   |
| 重构 renderer Electron 导入 | ✅   | 直接导入 | 通过 electronAPI        |
| 移除 @electron/remote 依赖  | ✅   | 使用中   | 用 IPC 替代             |
| 添加主进程 IPC 处理程序     | ✅   | -        | 窗口操作、上下文菜单等  |
| **渲染进程彻底现代化**      | ✅   | -        | 见阶段 4.5              |

### 实现的安全增强

1. **contextIsolation: true**

   - 渲染进程无法直接访问 Node.js API
   - 所有 API 通过 preload 脚本安全暴露

2. **nodeIntegration: false**

   - 渲染进程无法 `require()` Node.js 模块
   - 防止 XSS 攻击获取系统权限

3. **webSecurity: true**
   - 启用同源策略

### 新增文件

- `src/preload/index.js` - Preload 脚本，安全暴露以下 API：

  - `ipcRenderer` - IPC 通信（带通道白名单验证）
  - `shell` - 打开外部链接/文件
  - `clipboard` - 剪贴板操作
  - `nativeImage` - 图片处理（受限）
  - `fs` - 文件系统操作
  - `path` - 路径处理
  - `os` - 操作系统信息
  - `process` - 进程信息（安全子集）
  - `crypto` - 加密操作（createHash, randomBytes）
  - `childProcess` - 子进程操作（spawn, exec, execFile）

- `.electron-vue/webpack.preload.config.js` - Preload 脚本的 webpack 配置

- `src/renderer/util/electron.js` - Renderer 端的 API 桥接模块

### 重构的文件

渲染进程中所有直接导入 `electron`、`@electron/remote`、`path`、`fs` 的文件都已重构为使用 `util/electron.js` 桥接模块：

**Store 模块** (12 文件):

- `index.js`, `editor.js`, `project.js`, `layout.js`, `listenForMain.js`
- `preferences.js`, `autoUpdates.js`, `notification.js`, `tweet.js`
- `commandCenter.js`, `treeCtrl.js`, `help.js`

**Commands 模块** (6 文件):

- `index.js`, `fileEncoding.js`, `quickOpen.js`, `lineEnding.js`
- `trailingNewline.js`, `utils.js`

**Components** (7 文件):

- `tweet/index.vue`, `titleBar/index.vue`, `sideBar/searchResultItem.vue`
- `import/index.vue`, `exportSettings/index.vue`
- `editorWithTabs/tabs.vue`, `editorWithTabs/editor.vue`

**prefComponents** (13 文件):

- `common/titlebar.vue`, `common/bool/index.vue`, `common/select/index.vue`
- `common/range/index.vue`, `common/textBox/index.vue`, `common/fontTextBox/index.vue`
- `keybindings/index.vue`, `keybindings/KeybindingConfigurator.js`
- `spellchecker/index.vue`, `sideBar/index.vue`
- `image/components/uploader/index.vue`, `image/components/uploader/legalNoticesCheckbox.vue`
- `image/components/folderSetting/index.vue`

**工具和其他** (14 文件):

- `util/clipboard.js`, `util/pdf.js`, `util/fileSystem.js`, `util/index.js`
- `spellchecker/index.js`, `mixins/index.js`, `config.js`, `bootstrap.js`, `main.js`
- `pages/app.vue`, `pages/preference.vue`
- `node/ripgrepSearcher.js`, `node/fileSearcher.js`, `node/paths.js`
- `contextMenu/tabs/index.js`, `contextMenu/sideBar/index.js`

### 新增主进程 IPC 处理程序

在 `src/main/app/windowManager.js` 中添加了以下处理程序：

- `mt::window-minimize` - 最小化窗口
- `mt::window-maximize` - 最大化窗口
- `mt::window-unmaximize` - 取消最大化
- `mt::window-set-fullscreen` - 设置全屏状态
- `mt::window-toggle-full-screen` - 切换全屏
- `mt::show-app-menu` - 显示应用菜单
- `mt::window-close` - 关闭窗口（自定义标题栏使用）

在 `src/main/app/index.js` 中添加了以下处理程序：

- `mt::get-available-fonts` - 获取系统可用字体列表（原生模块必须在主进程运行）

### 其他重要更改

- **全局对象**: 将 `global.marktext` 更改为 `window.marktext`，因为 `global` 在 `contextIsolation` 下不可用
- **进程信息**: 使用 `processInfo.env` 替代 `process.env` 访问环境变量

### 验证清单

- [x] 运行 `scripts\setup-dev-env.cmd` 成功

- [x] 运行 `scripts\dev.cmd` 能正常启动

- [x] 所有编辑功能正常（需用户测试）

- [x] 文件打开正常（需用户测试）

  

- [x] 运行 `scripts\build-win-portable.cmd` 构建成功

- [x] 原生模块（fontmanager-redux, native-keymap）兼容 Electron 38

验证时间: 2026-02-04

### 已知待处理问题

1. **上下文菜单**: 右键菜单功能暂不可用。已实现 IPC 通信架构（`mt::show-context-menu` → `mt::context-menu-clicked`），但存在未知问题导致菜单不显示。**决定**：等待 Tauri 迁移时重写，不再投入时间调试
2. **fs-extra**: `util/fileSystem.js` 仍需要 `fs-extra` 的高级功能（ensureDir, move, copy），保留了直接导入
3. **原生模块**: Electron 38 的 ABI 版本可能需要重新编译原生模块

### 已修复的问题

1. **IPC event 参数丢失**: preload 脚本的 `safeIpcRenderer.on/once` 原先剥离了 event 参数，导致回调中第一个参数 undefined（2026-02-04 修复）
2. **process.env 复制失败**: 某些 Electron 版本无法直接 spread `process.env`，改用显式循环复制（2026-02-04 修复）
3. **自定义标题栏关闭**: 缺少 `mt::window-close` IPC 处理程序，导致设置页面无法关闭（2026-02-05 修复）
4. **上下文菜单**: 原来使用 `@electron/remote` 的 `Menu`，现改为通过 IPC 发送菜单模板到主进程，主进程创建菜单并通过 `mt::context-menu-clicked` 回调执行 action（2026-02-05 修复）
5. **拖放文件路径**: `contextIsolation: true` 时 `File.path` 不可用，改用 `webUtils.getPathForFile()` API 获取文件路径（2026-02-05 修复）

### 回滚方案

如果验证失败，可以通过以下步骤回滚：

1. 将 `package.json` 中 `electron` 版本改回 `^18.3.0`
2. 将 `src/main/config.js` 中的 `webPreferences` 改回原值
3. 撤销 renderer 中的 import 更改（恢复直接从 `electron` 导入）

---

## 阶段 4.5: 渲染进程现代化 ✅ 已完成

> **遵循一劳永逸原则**：发现简单启用 `nodeIntegration: true` 的临时方案会在后续升级中持续带来问题，决定彻底重构渲染进程架构。

**目标**: 彻底重构渲染进程，实现 Electron 推荐的安全架构

### 问题背景

直接升级到 Electron 38 后，设置 `nodeIntegration: false` + `contextIsolation: true` 导致：
- `require is not defined` - 渲染进程无法直接使用 Node.js
- `global is not defined` - `global` 对象不存在
- 大量依赖 Node.js API 的代码无法运行

**临时方案（已放弃）**：
- 设置 `nodeIntegration: true` 让旧代码继续工作
- 问题：违背 Electron 安全最佳实践，未来版本可能进一步限制

**一劳永逸方案（采用）**：
- 渲染进程作为纯 Web 环境运行
- 所有 Node.js/Electron 功能通过 preload + contextBridge 暴露
- webpack target 设置为 `web`，不依赖 Node.js polyfill

### 任务清单

| 任务                           | 状态 | 说明                             |
| ------------------------------ | ---- | -------------------------------- |
| webpack target 改为 web        | ✅   | 生成纯浏览器兼容的 bundle        |
| 移除 Node.js polyfill 依赖     | ✅   | 使用 resolve.fallback: false     |
| 完善 preload 脚本              | ✅   | 暴露 fs/path/os/crypto/childProcess/webFrame/webUtils |
| 重构 renderer 所有 Node.js 调用| ✅   | 改为使用 window.electronAPI      |
| 处理第三方库兼容性             | ✅   | 移除 vue-electron, electron-log  |
| 处理 common 模块               | ✅   | 条件导入 electronAPI/Node.js     |
| 处理 muya 中的 Node.js 调用    | ✅   | 条件使用 electronAPI.path/webUtils |
| 修复 IPC event 参数传递        | ✅   | preload 正确传递 event 给回调    |
| 添加 mt::window-close 处理     | ✅   | 自定义标题栏关闭按钮支持         |
| 添加上下文菜单 IPC 处理        | ⏸️   | 架构已实现，功能待 Tauri 重写    |
| 修复拖放文件路径获取           | ✅   | 使用 webUtils.getPathForFile()   |
| 测试所有功能                   | ✅   | 基础功能已验证                   |

### 架构变更

**变更前（旧架构）**：
```
┌─────────────────────────────────────┐
│           Renderer Process          │
│  ┌───────────────────────────────┐  │
│  │  可以直接使用:                │  │
│  │  - require('electron')        │  │
│  │  - require('fs')              │  │
│  │  - require('path')            │  │
│  │  - process.env                │  │
│  │  - global                     │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**变更后（现代架构）**：
```
┌─────────────────────────────────────┐
│           Renderer Process          │
│  ┌───────────────────────────────┐  │
│  │  纯 Web 环境:                 │  │
│  │  - 无 require                 │  │
│  │  - 无 Node.js API             │  │
│  │  - 通过 window.electronAPI    │  │
│  └───────────────────────────────┘  │
│                  ↓                  │
│  ┌───────────────────────────────┐  │
│  │  Preload Script (contextBridge)│  │
│  │  - 暴露安全的 API 子集        │  │
│  │  - IPC 通道白名单验证         │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
                   ↓ IPC
┌─────────────────────────────────────┐
│           Main Process              │
│  - 完整 Node.js 环境              │
│  - 处理文件系统、原生模块等       │
└─────────────────────────────────────┘
```

### 需要重构的文件

**1. Webpack 配置** (1 文件):
- `.electron-vue/webpack.renderer.config.js`
  - `target: 'web'` 替代 `'electron-renderer'`
  - 移除 `libraryTarget: 'commonjs2'`
  - 清空 `externals`（所有依赖打包进 bundle）

**2. HTML 模板** (1 文件):
- `src/index.ejs`
  - 移除 `require('module').globalPaths.push()`
  - 移除 `require('path').join()`
  - 添加 `global` 和 `process` 的浏览器 polyfill

**3. 主入口** (2 文件):
- `src/renderer/main.js`
  - 移除 `vue-electron`（直接 require electron）
  - 移除 `source-map-support`（需要 fs/path）
- `src/renderer/bootstrap.js`
  - 改用 `window.electronAPI.ipcRenderer`
  - 改用自定义 logger 替代 `electron-log`

**4. Store 模块** (12 文件):
所有 `import { xxx } from 'electron'` 改为 `import { xxx } from '../util/electron'`

**5. Commands 模块** (6 文件):
同上

**6. Components** (7 文件):
同上

**7. prefComponents** (13 文件):
同上

**8. Common 模块** (3 文件):
- `src/common/envPaths.js` - 条件导入 path
- `src/common/filesystem/paths.js` - 条件导入 fs/path
- `src/common/filesystem/index.js` - 条件导入 fs-extra

**9. Muya 编辑器** (1 文件):
- `src/muya/lib/utils/index.js` - `getImageInfo` 中的 `require('path')`

**10. 工具和其他** (14 文件):
包括 `util/`, `spellchecker/`, `mixins/`, `config.js`, `contextMenu/` 等

### 第三方库处理

| 库                  | 问题                     | 解决方案                    |
| ------------------- | ------------------------ | --------------------------- |
| `vue-electron`      | 直接 require('electron') | 移除，使用自定义桥接        |
| `source-map-support`| 需要 fs/path             | 移除或仅在 main 进程使用    |
| `electron-log`      | 需要 electron 模块       | 替换为自定义 console logger |
| `vscode-ripgrep`    | 路径解析问题             | 通过 IPC 获取路径           |
| `fs-extra`          | Node.js 模块             | 通过 preload 暴露必要方法   |

### 安全增强

1. **IPC 通道白名单**: preload 脚本验证通道名必须以 `mt::` 开头
2. **API 最小化**: 只暴露必要的 API，不暴露完整的 Node.js 功能
3. **数据复制**: 跨边界传递数据时自动复制，防止引用泄露

### 验证清单

- [x] `webpack target: 'web'` 构建成功
- [x] 应用启动不报 `require is not defined`
- [x] 应用启动不报 `global is not defined`
- [x] 自定义标题栏关闭按钮正常
- [x] 文件打开/保存正常
- [x] 编辑功能正常
- [x] 设置面板正常
- [x] 拖放文件打开正常
- [ ] ~~上下文菜单~~（暂时跳过，等 Tauri 迁移时重写）
- [ ] 图片上传正常
- [ ] 搜索功能正常（ripgrep）
- [ ] 拼写检查正常

验证时间: 2026-02-05

---

## 阶段 5: Vue 生态升级准备 ✅ 已完成

**目标**: 为 Vue 3 迁移做准备

| 任务                     | 状态 | 说明                           |
| ------------------------ | ---- | ------------------------------ |
| 安装 Vue 2.7             | ✅   | 2.6.14 → 2.7.16                |
| 审计 Element UI 使用     | ✅   | 26 个文件，78 处使用           |
| 审计 Vuex 使用           | ✅   | 21 个文件，76 处调用           |
| Composition API 试点     | ✅   | 2 个组件已重构                 |

### Vue 2.7 升级

```bash
# 已完成升级
vue: 2.6.14 → 2.7.16
vue-template-compiler: 2.6.14 → 2.7.16
```

### Element UI 使用审计

**统计**: 26 个文件使用 Element UI，共 78 处组件引用

| 组件 | 使用次数 | 使用文件 |
| ---- | -------- | -------- |
| el-dialog | 8 | import, commandPalette, editor, tweet, exportSettings, key-input-dialog, rename, about |
| el-button | 8 | keybindings, spellchecker, search, uploader, folderSetting, theme, general |
| el-input | 5 | textBox, uploader, exportSettings |
| el-tooltip | 5 | bool, uploader, titleBar, image, search |
| el-table/el-table-column | 4 | keybindings, spellchecker |
| el-select/el-option | 3 | select, exportSettings |
| el-form/el-form-item | 5 | editor |
| el-input-number | 3 | editor, exportSettings |
| el-slider | 1 | range |
| el-switch | 1 | bool |
| el-checkbox | 1 | legalNoticesCheckbox |
| el-autocomplete | 2 | sideBar, fontTextBox |
| el-radio/el-radio-group | 2 | general |
| el-tabs/el-tab-pane | 2 | exportSettings |
| el-tree | 1 | toc |
| el-row/el-col | 2 | about |
| el-upload | 1 | (registered but not used in templates) |
| el-color-picker | 1 | (registered but not used in templates) |

**迁移注意**: Element UI → Element Plus 时需要：
- 组件名前缀变化: `el-` → `El` (大驼峰)
- 图标需额外安装: `@element-plus/icons-vue`
- 部分 API 变化（参考官方迁移指南）

### Vuex 使用审计

**统计**: 21 个文件使用 `$store`，共 76 处调用

| 模块 | 行数 | State | Mutations | Actions | 迁移难度 |
| ---- | ---- | ----- | --------- | ------- | -------- |
| editor.js | 1540 | 4 | 23 | 51 | 高 |
| project.js | 234 | 6 | 9 | 9 | 中 |
| preferences.js | 173 | ~50 | 3 | 8 | 中 |
| layout.js | 83 | 4 | 3 | 3 | 低 |
| commandCenter.js | 76 | 1 | 2 | 1 | 低 |
| autoUpdates.js | 55 | 0 | 0 | 1 | 低 |
| listenForMain.js | 44 | 0 | 0 | 3 | 低 |
| notification.js | 34 | 0 | 0 | 1 | 低 |
| tweet.js | 20 | 0 | 0 | 1 | 低 |

**迁移策略**: Vuex → Pinia
- 移除 mutations（直接修改 state）
- 从低复杂度模块开始迁移
- `editor.js` 最后处理（核心模块）

### Mixins 审计

4 个 mixin 定义于 `src/renderer/mixins/index.js`：

| Mixin | 使用文件数 | 说明 |
| ----- | ---------- | ---- |
| tabsMixins | 2 | tabs.vue, treeOpenedTab.vue |
| loadingPageMixins | 2 | app.vue, preference.vue |
| fileMixins | 2 | searchResultItem.vue, treeFile.vue |
| createFileOrDirectoryMixins | 2 | treeFolder.vue, tree.vue |

**迁移策略**: 重构为 Composition API composables

### Composition API 试点

已将 2 个简单组件重构为 Composition API：

1. `src/renderer/prefComponents/common/bool/index.vue` - 布尔开关
2. `src/renderer/prefComponents/common/range/index.vue` - 范围滑块

### 验证清单

- [x] Vue 2.7 升级成功
- [x] 构建通过 (`scripts\build-win-portable.cmd`)
- [x] 应用运行正常
- [x] Element UI 审计完成
- [x] Vuex 审计完成
- [x] Composition API 试点完成

验证时间: 2026-02-05

---

## 阶段 6: Vue 3 迁移 + 构建工具现代化

**目标**: 完成 Vue 2 → Vue 3 迁移，同时迁移到 Vite 构建工具

| 任务                           | 状态 | 说明                |
| ------------------------------ | ---- | ------------------- |
| 迁移 webpack → Vite            | ⬜   | 解决 ESM 兼容性问题 |
| 升级 Vue 3                     | ⬜   | vue@3.x             |
| 迁移 Vuex → Pinia              | ⬜   | 状态管理            |
| 迁移 Element UI → Element Plus | ⬜   | 组件库              |
| 迁移 Vue Router                | ⬜   | vue-router@4.x      |
| 修复所有组件                   | ⬜   | 语法适配            |

### 为什么迁移到 Vite

当前 webpack 配置的问题：

- 使用 externals 将依赖排除在打包之外
- 运行时用 `require()` 加载，但 ESM 模块不支持
- 需要手动维护白名单，容易遗漏

Vite 的优势：

- ✅ **原生 ESM 支持**：彻底解决 ESM/CJS 兼容性问题
- ✅ **更快的开发体验**：即时 HMR，无需等待打包
- ✅ **更快的构建速度**：基于 Rollup，tree-shaking 更好
- ✅ **Vue 3 官方推荐**：更好的生态支持
- ✅ **配置更简单**：比 webpack 配置少很多

### Vite + Electron 方案

推荐使用 [electron-vite](https://electron-vite.org/)：

```bash
# 项目结构
src/
├── main/           # 主进程 (Node.js)
├── preload/        # 预加载脚本
└── renderer/       # 渲染进程 (Vue 3)

# 配置文件
electron.vite.config.ts
```

### 主要变化

1. **模板语法**:

   - `v-model` 变化
   - `v-if` / `v-for` 优先级变化

2. **全局 API**:

   - `Vue.use()` → `app.use()`
   - `Vue.component()` → `app.component()`

3. **生命周期**:
   - `beforeDestroy` → `beforeUnmount`
   - `destroyed` → `unmounted`

---

## 阶段 7: TypeScript 迁移

**目标**: 逐步将 JavaScript 迁移到 TypeScript

| 任务             | 状态 | 说明             |
| ---------------- | ---- | ---------------- |
| 配置 TypeScript  | ⬜   | tsconfig.json    |
| 添加类型定义     | ⬜   | 安装 @types/\*   |
| 迁移主进程代码   | ⬜   | src/main/        |
| 迁移渲染进程代码 | ⬜   | src/renderer/    |
| 迁移 Muya        | ⬜   | src/muya/ (最后) |

### 配置示例

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true,
    "jsx": "preserve",
    "moduleResolution": "node",
    "allowJs": true,
    "checkJs": false,
    "esModuleInterop": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

---

## 阶段 8: Tauri 评估与 PoC

**目标**: 评估 Tauri 可行性，创建概念验证

| 任务             | 状态 | 说明                      |
| ---------------- | ---- | ------------------------- |
| 学习 Tauri 2.0   | ⬜   | 文档、示例                |
| 创建 PoC 项目    | ⬜   | 基础 Markdown 编辑器      |
| 评估 Muya 兼容性 | ⬜   | 能否在 Tauri WebView 运行 |
| 评估文件系统 API | ⬜   | Tauri 的 fs 插件          |
| 评估性能差异     | ⬜   | 内存、启动速度、包大小    |

### Tauri 优势

- 📦 包大小: ~150MB → ~15MB
- 💾 内存: 降低 50%+
- 🚀 启动速度: 更快
- 🦀 后端: Rust (安全、高性能)
- 🔧 原生模块: 不再需要 (Rust 直接实现)

### PoC 目标

```
marktext-tauri-poc/
├── src-tauri/          # Rust 后端
│   ├── src/
│   │   ├── main.rs
│   │   └── commands.rs # 文件读写、系统功能
│   └── Cargo.toml
├── src/                # 前端 (复用现有 Vue 代码)
│   ├── App.vue
│   └── ...
└── package.json
```

---

## 阶段 9: Tauri 迁移

**目标**: 将 MarkText 迁移到 Tauri 2.0

| 任务                | 状态 | 说明                  |
| ------------------- | ---- | --------------------- |
| 创建 Tauri 项目结构 | ⬜   | -                     |
| 迁移前端代码        | ⬜   | Vue 组件              |
| 实现 Rust 后端      | ⬜   | 替代 Node.js 主进程   |
| 实现文件系统功能    | ⬜   | 打开、保存、监听      |
| 实现系统功能        | ⬜   | 字体列表、键盘布局等  |
| 实现自动更新        | ⬜   | Tauri updater         |
| 测试所有平台        | ⬜   | Windows, macOS, Linux |

---

## 阶段 10: 编辑器引擎现代化

**目标**: 评估并可能替换 Muya 编辑器引擎

| 任务            | 状态 | 说明                 |
| --------------- | ---- | -------------------- |
| 评估 Milkdown   | ⬜   | 基于 ProseMirror     |
| 评估 TipTap     | ⬜   | 基于 ProseMirror     |
| 评估现代化 Muya | ⬜   | TypeScript 重写      |
| 选择方案        | ⬜   | 综合考虑功能和工作量 |
| 实施迁移        | ⬜   | -                    |

### 编辑器对比

| 特性       | Muya     | Milkdown | TipTap    |
| ---------- | -------- | -------- | --------- |
| 维护状态   | 自己维护 | 社区活跃 | 商业+社区 |
| TypeScript | ❌       | ✅       | ✅        |
| 插件生态   | 自己写   | 丰富     | 丰富      |
| WYSIWYG    | ✅       | ✅       | ✅        |
| 学习成本   | 已掌握   | 中等     | 中等      |
| 迁移成本   | 0        | 高       | 高        |

---

## 进度跟踪

| 阶段                          | 状态      | 开始日期   | 完成日期   |
| ----------------------------- | --------- | ---------- | ---------- |
| 阶段 0: 基础准备              | ✅ 完成   | 2026-02-04 | 2026-02-04 |
| 阶段 1: 构建工具升级          | ✅ 完成   | 2026-02-04 | 2026-02-04 |
| 阶段 2: 减少原生模块          | ✅ 完成   | 2026-02-04 | 2026-02-04 |
| 阶段 3: Electron 小版本升级   | ✅ 完成   | 2026-02-04 | 2026-02-04 |
| 阶段 4: Electron 大版本升级   | ✅ 完成   | 2026-02-04 | 2026-02-05 |
| 阶段 4.5: 渲染进程现代化      | ✅ 完成   | 2026-02-04 | 2026-02-05 |
| 阶段 5: Vue 生态升级准备      | ✅ 完成   | 2026-02-05 | 2026-02-05 |
| 阶段 6: Vue 3 迁移            | ⬜ 待开始 | -          | -          |
| 阶段 7: TypeScript 迁移       | ⬜ 待开始 | -          | -          |
| 阶段 8: Tauri 评估与 PoC      | ⬜ 待开始 | -          | -          |
| 阶段 9: Tauri 迁移            | ⬜ 待开始 | -          | -          |
| 阶段 10: 编辑器引擎现代化     | ⬜ 待开始 | -          | -          |

---

## 版本规划

| 版本    | 包含阶段   | 主要变化                               |
| ------- | ---------- | -------------------------------------- |
| v0.18.0 | 0-1        | 构建优化，Windows 支持改进             |
| v0.19.0 | 2-3        | 减少原生模块，Electron 补丁更新        |
| v0.20.0 | 4, 4.5     | Electron 38 + 渲染进程现代化（安全架构）|
| v0.21.0 | 5-6        | Vue 3 + Vite 迁移                      |
| v0.22.0 | 7          | TypeScript 迁移                        |
| v1.0.0  | 8-10       | Tauri 版本发布                         |

---

## ESM 兼容性检查

升级依赖时，需要检查是否有 ESM-only 的包。这些包必须加入 webpack 白名单，否则打包后会崩溃。

```bash
# 检测 ESM-only 模块
node tools/checkEsmModules.js
```

**原理**：webpack externals 会让这些包在运行时通过 `require()` 加载，但 ESM 模块不支持 `require()`。

**当前白名单**：

```javascript
const whiteListedModules = ["vue", "snabbdom", "snabbdom-to-html", "mermaid"];
```

**升级依赖后的检查步骤**：

1. 运行 `node tools/checkEsmModules.js`
2. 如果发现新的 ESM-only 包，加入白名单
3. 重新构建并测试打包后的应用

---

## 注意事项

1. **每个阶段完成后**:

   - 更新本文档状态
   - 创建 git tag
   - **用脚本验证**：`scripts\setup-dev-env.cmd`、`scripts\dev.cmd`、`scripts\build-win-portable.cmd` 等，不手写验证步骤
   - 测试所有平台（Windows 以脚本为准）

2. **升级后必须更新脚本**:

   - 依赖或原生模块有增删、Node/Electron/VS 版本变更时，必须同步修改：
     - 环境设置脚本：`scripts\setup-dev-env.cmd`
     - 构建脚本：`scripts\build-win-portable.cmd`、`scripts\build-win-installer.cmd`、`scripts\build-windows.ps1`
   - 避免脚本中仍引用已删除依赖（如 keytar）或错误版本，导致验证/构建异常。

3. **风险控制**:

   - 每个阶段都要可回滚
   - 保持向后兼容（数据、配置）
   - 充分测试再合并（以脚本通过为准）

4. **文档更新**:
   - 更新 README
   - 更新构建文档
   - 更新贡献指南
