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
Electron 18        ──────────────────────────────►   Tauri 2.0               ✅ 已完成
Vue 2 + Vuex       ──────────────────────────────►   Vue 3 + Pinia           ✅ 已完成
webpack            ──────────────────────────────►   Vite                    ✅ 已完成
JavaScript         ──────────────────────────────►   TypeScript              ✅ 已完成
原生模块 x3        ──────────────────────────────►   原生模块 x0             ✅ 已完成
单语言             ──────────────────────────────►   i18n 多语言             ✅ 已完成
Muya (自研)        ──────────────────────────────►   Milkdown (ProseMirror)  ⬜ 阶段 11-16
仅 WYSIWYG         ──────────────────────────────►   Split View 对照编辑     ⬜ 阶段 14
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

## 阶段 6: Vue 3 迁移 + 构建工具现代化 ✅ 已完成

**目标**: 完成 Vue 2 → Vue 3 迁移，同时迁移到 Vite 构建工具

| 任务                           | 状态 | 说明                                   |
| ------------------------------ | ---- | -------------------------------------- |
| 迁移 webpack → Vite            | ✅   | 纯 Vite 构建 (vite.config.mjs)        |
| 升级 Vue 3                     | ✅   | vue@3.4.x + createApp                 |
| 迁移 Vuex → Pinia              | ✅   | 9 个模块 → 10 个 Pinia stores (.ts)   |
| 迁移 Element UI → Element Plus | ✅   | element-plus                           |
| 迁移 Vue Router                | ✅   | vue-router@4.x + createWebHashHistory |
| 修复所有组件                   | ✅   | 27+ 组件 store 引用更新               |
| Mixins → Composables           | ✅   | 4 个 mixin → 4 个 composable          |
| 移除 Vuex 依赖                 | ✅   | package.json 中已移除                  |
| 清理 babel Element UI 插件     | ✅   | babel-plugin-component 已移除          |

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

## 阶段 7: TypeScript 迁移 ✅ 已完成

**目标**: 逐步将 JavaScript 迁移到 TypeScript

| 任务                           | 状态 | 说明                                          |
| ------------------------------ | ---- | --------------------------------------------- |
| 配置 TypeScript                | ✅   | tsconfig.json strict:true, jsx:preserve       |
| ESLint TypeScript 支持         | ✅   | @typescript-eslint/parser + eslint-plugin      |
| Vue 组件类型 shim              | ✅   | src/renderer/env.d.ts                         |
| 迁移 util/ 目录               | ✅   | 13 个 .js → .ts (tauri, index, fileSystem...) |
| 迁移 Pinia stores             | ✅   | 10 个 store 直接用 .ts 创建                   |
| 迁移 src/common/              | ✅   | 6 个 .js → .ts (envPaths, filesystem, ...)    |
| Vue 组件 lang=ts              | ✅   | 45 个 .vue 文件添加 lang="ts"                 |
| 入口文件迁移                   | ✅   | main.ts + router/index.ts                     |
| 迁移 Muya                     | ⬜   | src/muya/ (Phase 10 编辑器现代化时处理)       |

---

## 阶段 8: Tauri 评估与 PoC

**目标**: 评估 Tauri 可行性，创建概念验证

| 任务                        | 状态 | 说明                                              |
| --------------------------- | ---- | ------------------------------------------------- |
| 环境准备与 Tauri 初始化     | ✅   | Rust/Cargo/Tauri CLI，src-tauri 目录结构          |
| 创建 Tauri API 桥接层       | ✅   | tauri.js + backend.js 与 electron.js 同构接口     |
| 实现 Rust 后端核心命令      | ✅   | fs/path/system/fonts/app commands                 |
| Muya 兼容性 (path polyfill) | ✅   | 纯 JS pathPolyfill.js 支持同步 path 操作          |
| 构建脚本                    | ✅   | build-tauri-portable.cmd                          |
| 共享模块 Tauri 兼容         | ✅   | common/filesystem Tauri stub + require shim       |
| 前端自动初始化              | ✅   | app.vue Tauri 环境自动 bootstrap                  |
| 性能评估                    | ✅   | 见下方评估结果                                    |

### Tauri 优势

- 📦 包大小: ~150MB → ~15MB
- 💾 内存: 降低 50%+
- 🚀 启动速度: 更快
- 🦀 后端: Rust (安全、高性能)
- 🔧 原生模块: 不再需要 (Rust 直接实现)

### PoC 实际结构

```
marktext/
├── src-tauri/                    # Tauri Rust 后端
│   ├── src/
│   │   ├── main.rs               # 入口点
│   │   ├── lib.rs                # Tauri 应用配置和插件注册
│   │   └── commands/             # Tauri 命令模块
│   │       ├── mod.rs
│   │       ├── fs.rs             # 文件系统操作
│   │       ├── path.rs           # 路径工具
│   │       ├── system.rs         # 系统信息 (homedir, platform, arch)
│   │       ├── fonts.rs          # 字体枚举 (替代 fontmanager-redux)
│   │       └── app.rs            # 应用信息
│   ├── Cargo.toml                # Rust 依赖 (tauri, font-kit, notify 等)
│   └── tauri.conf.json           # Tauri 配置
├── src/renderer/util/
│   ├── electron.js               # 原有 Electron API 桥接
│   ├── tauri.js                  # 新增 Tauri API 桥接 (同构接口)
│   ├── backend.js                # 统一后端抽象层 (自动检测环境)
│   └── pathPolyfill.js           # 纯 JS path 操作 (Muya 兼容)
└── scripts/
    ├── setup-tauri-env.cmd       # Tauri 开发环境设置
    └── build-tauri-portable.cmd  # Tauri 构建脚本
```

### Tauri 插件映射

| Electron 模块        | Tauri 替代方案                     |
| -------------------- | ---------------------------------- |
| electron-store       | tauri-plugin-store / serde_json    |
| electron-updater     | tauri-plugin-updater               |
| electron-window-state| tauri-plugin-window-state          |
| electron-log         | Rust log + env_logger              |
| @electron/remote     | 不需要 (直接 Tauri commands)       |
| fontmanager-redux    | font-kit Rust crate                |
| native-keymap        | winapi (Windows) / 平台特定实现    |
| chokidar             | notify Rust crate                  |

### 评估结果 (待填写)

| 指标           | Electron 版本 | Tauri 版本 | 差异         |
| -------------- | ------------- | ---------- | ------------ |
| 主程序大小     | ~150MB        | ~11MB      | **-93%**     |
| MSI 安装包     | -             | ~4MB       | 极小         |
| NSIS 安装包    | -             | ~4MB       | 极小         |
| 编辑器兼容性   | 100%          | PoC 可编辑 | 基本功能可用 |

> 注: Tauri PoC 已验证编辑器核心功能可用。文件对话框、偏好持久化、菜单快捷键等
> 高级功能需在阶段 9 完整迁移中实现。

**构建命令**:
```bash
# Tauri 开发
yarn tauri:dev

# Tauri 构建
yarn tauri:build
# 或
scripts\build-tauri-portable.cmd
```

---

## 阶段 9: Tauri 完整迁移

**目标**: 完全从 Electron 迁移到 Tauri 2.0，删除所有 Electron 代码

| 任务                       | 状态    | 说明                                              |
| -------------------------- | ------- | ------------------------------------------------- |
| 9.1 核心文件操作           | ✅ 完成 | 打开/保存/另存为对话框、拖放、重命名/移动/回收站   |
| 9.2 偏好设置与数据中心     | ✅ 完成 | preference.json 读写、user-data、安全凭据存储      |
| 9.3 窗口管理               | ✅ 完成 | 多窗口创建/切换、关闭确认、单实例                  |
| 9.4 菜单系统               | ✅ 完成 | 7 大类原生菜单 + 最近文件列表 + 前端事件联动       |
| 9.5 文件监视器             | ✅ 完成 | notify crate 实现，防抖、fs-change 事件推送前端    |
| 9.6 快捷键系统             | ✅ 完成 | 平台默认 + 用户自定义 keybindings.json             |
| 9.7 上下文菜单             | ✅ 完成 | 编辑器/侧边栏/Tab 右键菜单 Rust 命令              |
| 9.8 导出/打印/导入         | ✅ 完成 | HTML 导出、Pandoc 集成、markdown_to_html           |
| 9.9 图片管理               | ✅ 完成 | 图片选择对话框、路径自动补全、复制到文件夹         |
| 9.10 拼写检查              | ✅ 完成 | WebView 内置 + 自定义词典管理                      |
| 9.11 自动更新              | ✅ 完成 | tauri-plugin-updater + GitHub Releases             |
| 9.12 CLI 与启动环境        | ✅ 完成 | 命令行参数、便携模式、文件关联 .md/.markdown       |
| 9.13 构建系统迁移          | ✅ 完成 | electron-vite → 纯 Vite + Tauri bundler            |
| 9.14 清理 Electron 代码    | ✅ 完成 | 删除 src/main/、.electron-vue/、迁移所有 import    |
| 9.15 测试与文档            | ✅ 完成 | 文档更新、README 更新                              |

### Rust 后端模块

```
src-tauri/src/
├── lib.rs                  # 主入口：CLI解析、便携模式、插件/状态注册
├── menu.rs                 # 原生菜单系统（7类：File/Edit/Paragraph/Format/View/Window/Help）
├── watcher.rs              # 文件监视器（notify crate + 防抖）
└── commands/
    ├── mod.rs              # 模块注册
    ├── app.rs              # 应用信息
    ├── context_menu.rs     # 上下文菜单
    ├── export.rs           # 导出/Pandoc
    ├── file_ops.rs         # 高级文件操作（对话框、保存、回收站）
    ├── fonts.rs            # 字体枚举
    ├── fs.rs               # 基础文件系统
    ├── image.rs            # 图片管理
    ├── keybindings.rs      # 快捷键配置
    ├── path.rs             # 路径操作
    ├── preferences.rs      # 偏好设置 + 数据中心 + 最近文档
    ├── spellcheck.rs       # 自定义词典
    ├── system.rs           # 系统信息
    └── window.rs           # 窗口管理
```

### 已删除的 Electron 代码

- `src/main/` — Electron 主进程（~5000+ 行 TypeScript/JavaScript）
- `src/preload/` — Electron preload 脚本
- `.electron-vue/` — 旧 Webpack 配置（12 个文件）
- `electron.vite.config.mjs` — electron-vite 配置
- `electron-builder.yml` — Electron 打包配置
- `src/renderer/util/electron.js` — Electron API 桥接
- `src/renderer/util/backend.js` — 双后端切换层
- Electron 构建脚本：build-win-portable.cmd、build-win-installer.cmd 等

### 已移除的依赖

运行时：`@electron/remote`、`electron-log`、`electron-store`、`electron-window-state`、`fontmanager-redux`、`native-keymap`、`chokidar`、`fs-extra`、`source-map-support`、`command-exists`、`arg`、`chardet`、`plist`、`minizlib`、`vscode-ripgrep`

开发时：`electron`、`electron-builder`、`electron-vite`、`@electron/rebuild`、`electron-updater`、`electron-devtools-installer`、`node-gyp`、所有 Webpack 相关、所有 Babel 插件（仅保留 eslint parser）、所有 Karma 测试框架

---

## 阶段 10: 国际化（i18n）✅ 已完成

> **优先级：高** — 在编辑器迁移之前完成，避免后续新代码产生新的硬编码字符串。
> 详细方案见 [`MILKDOWN_MIGRATION_REPORT.md` 第 9 章](./MILKDOWN_MIGRATION_REPORT.md#9-国际化方案i18n)。

**目标**: 实现中英双语支持，建立可扩展的多语言框架

| 任务 | 状态 | 说明 |
| ---- | ---- | ---- |
| 10.1 安装 vue-i18n v10 + Vite 插件 | ✅ | `vue-i18n@^10` + `@intlify/unplugin-vue-i18n` |
| 10.2 创建 `src/locales/en.json` | ✅ | 英文翻译文件，~400 个 flat key |
| 10.3 创建 `src/locales/zh-CN.json` | ✅ | 简体中文翻译文件 |
| 10.4 创建 `src/locales/_meta.json` | ✅ | 语言元数据（名称、方向、进度） |
| 10.5 创建 `src/renderer/i18n/index.ts` | ✅ | createI18n 配置 (`legacy: true`，从 `__TAURI_ENV__` 读初始 locale) |
| 10.6 创建 `src/renderer/i18n/loader.ts` | ✅ | 运行时语言切换，使用 `.value` 兼容 vue-i18n v10 Ref API |
| 10.7 `main.ts` 中注册 i18n 插件 | ✅ | `app.use(i18n)` + watcher 同步 store→locale |
| 10.8 提取 Vue 组件字符串 | ✅ | titleBar, about, import, app.vue 等 → `$t('key')` |
| 10.9 提取偏好设置组件字符串 | ✅ | general, editor, markdown, theme, image, sideBar, keybindings, spellchecker + 8 个 config.js |
| 10.10 提取 Muya UI 配置字符串 | ✅ | formatPicker, quickInsert, imageToolbar, frontMenu, tableTools, codePicker, imageSelector (i18nBridge.js) |
| 10.11 提取上下文菜单字符串 | ✅ | tabs/menuItems.js, sideBar/menuItems.js |
| 10.12 提取 Store 通知/错误字符串 | ✅ | editor.ts, notification.ts, preferences.ts |
| 10.13 Rust 侧 i18n 实现 | ✅ | `src-tauri/src/i18n.rs`，`include_str!` 读取共享 JSON |
| 10.14 Rust 菜单本地化 | ✅ | `menu.rs` 所有菜单标签使用 `i18n.t()` |
| 10.15 Rust 对话框本地化 | ✅ | `window.rs`, `file_ops.rs`, `context_menu.rs` 中的对话框文本 |
| 10.16 启用语言选择器 | ✅ | 从 `_meta.json` 动态生成选项，即时生效 |
| 10.17 添加重启提示 | ✅ | 切换语言后原生菜单需重启更新（与 VS Code 一致） |
| 10.18 配置 i18n-ally | ✅ | vite.config.mjs 中配置 `@intlify/unplugin-vue-i18n` |

### 技术决策

| 决策项 | 选择 | 理由 |
| ------ | ---- | ---- |
| 前端库 | vue-i18n v10 (`legacy: true`) | 兼容 Options API，`$t()` 全组件可用 |
| Key 格式 | 扁平 dot notation | grep 友好，i18n-ally 兼容，rust-i18n 兼容 |
| 文件结构 | 单文件/语言（初期） | <600 key 不需要拆分 |
| Rust 侧 | `include_str!` + `serde_json` | 轻量，无需额外 crate |
| Vue 切换 | 即时生效 | `i18n.global.locale` 是响应式的 |
| 菜单切换 | 需重启 | 与 VS Code / Zettlr 一致 |

### 翻译文件格式示例

```json
{
  "_locale": "zh-CN",
  "_name": "简体中文",
  "common.ok": "确定",
  "common.cancel": "取消",
  "menu.file": "文件",
  "menu.file.newTab": "新建标签页",
  "settings.general": "通用",
  "editor.formatBold": "加粗"
}
```

### 添加新语言流程（社区贡献者）

```
1. 复制 src/locales/en.json → src/locales/{locale}.json
2. 翻译所有值（保持 key 不变）
3. 更新 src/locales/_meta.json 添加新语言条目
4. 提交 PR — 无需修改任何代码文件
```

### 实现细节

**关键技术点**:

1. **vue-i18n v10 Ref API**: `i18n.global.locale` 在 v10 中是 `WritableComputedRef`，必须用 `.value` 设置，直接赋值会替换 ref 导致 `$i18n.locale` 变为 `undefined`
2. **initialization_script 注入**: 使用 Tauri 的 `initialization_script`（而非 `eval`）注入 `window.__TAURI_ENV__`，保证在任何页面 JS 执行之前就设置好语言环境，消除竞态条件
3. **主窗口手动创建**: 将主窗口从 `tauri.conf.json` 自动创建改为 `setup()` 中手动创建（`WebviewWindowBuilder`），以支持 `initialization_script`
4. **ipcRenderer 本地事件发射器**: 实现了完整的本地事件系统（`emit`/`on`/`once`/`removeAllListeners`），弥补 Tauri 环境下前端内部事件通信的缺失
5. **Muya i18nBridge**: 为非 Vue 的 Muya 编辑器组件创建了 `i18nBridge.js`，通过 `window.__marktext_i18n` 桥接 vue-i18n 实例

**新增文件**:
- `src/locales/en.json` — 英文翻译 (~400 key)
- `src/locales/zh-CN.json` — 简体中文翻译 (~400 key)
- `src/locales/_meta.json` — 语言元数据
- `src/renderer/i18n/index.ts` — vue-i18n 配置
- `src/renderer/i18n/loader.ts` — 运行时语言切换
- `src/muya/lib/ui/i18nBridge.js` — Muya ↔ vue-i18n 桥接
- `src-tauri/src/i18n.rs` — Rust 侧 i18n（菜单、对话框）

### 验证清单

- [x] `yarn dev` 启动后界面显示英文（默认）
- [x] 设置中切换语言为简体中文，UI 立即更新
- [x] 重启后原生菜单显示中文
- [x] 所有偏好设置面板文本已翻译
- [x] 编辑器工具栏/斜杠命令文本已翻译
- [x] 上下文菜单文本已翻译
- [x] 对话框文本已翻译
- [ ] `scripts\build-tauri-portable.cmd` 构建成功（待验证）
- [ ] 构建后的应用双语正常（待验证）

### 已修复的问题

1. **CMD 脚本语法错误**: `echo` 中未转义的括号导致 `dev-tauri.cmd`/`build-tauri-portable.cmd`/`clean.cmd` 闪退
2. **`timeout` 命令不兼容**: 在非交互式 shell 中 `timeout` 报错，替换为 `ping -n 2 127.0.0.1 >nul`
3. **`ipcRenderer.emit` 缺失**: 自定义 `ipcRenderer` 实现缺少本地事件发射功能，导致前端内部事件通信全部静默失败
4. **Pinia store 单项更新不同步**: `SET_SINGLE_PREFERENCE` 只发送到后端而未更新本地 state
5. **vue-i18n v10 locale 设置方式变更**: 直接赋值 `i18n.global.locale = 'zh-CN'` 在 v10 中会替换 Ref 对象，导致 `$i18n.locale` 变为 `undefined`
6. **`__TAURI_ENV__` 注入竞态条件**: `window.eval()` 在窗口创建后执行，可能晚于页面 JS，改用 `initialization_script` 保证时序
7. **缺失 IPC 处理器**: `keybinding-get-keyboard-info`、`keybinding-get-pref-keybindings`、`renderer-log` 未注册

验证时间: 2026-02-08

---

## 阶段 11: 编辑器抽象层 + 引擎切换

> 与阶段 10 可并行开发。
> 详细方案见 [`MILKDOWN_MIGRATION_REPORT.md` 第 6-8 章](./MILKDOWN_MIGRATION_REPORT.md#6-api-迁移映射)。

**目标**: 建立 IEditorEngine 抽象接口，实现 Muya 适配器，搭建引擎切换基础设施

| 任务 | 状态 | 说明 |
| ---- | ---- | ---- |
| 11.1 定义 `IEditorEngine` 接口 | ⬜ | `src/renderer/editor/interface.ts` |
| 11.2 定义共享类型 | ⬜ | `src/renderer/editor/types.ts` (FormatType, SearchOptions 等) |
| 11.3 实现 MuyaAdapter | ⬜ | `src/renderer/editor/muya/adapter.ts`，包装现有 Muya API |
| 11.4 重构 `editor.vue` | ⬜ | 面向 IEditorEngine 编程，不再直接调用 Muya |
| 11.5 实现编辑器工厂 | ⬜ | `src/renderer/editor/factory.ts`，动态 import 适配器 |
| 11.6 启动参数解析 | ⬜ | `--editor-engine=milkdown` 命令行参数 |
| 11.7 设置项 | ⬜ | `Preferences > General > Editor Engine` 下拉选择 |
| 11.8 Pinia store 集成 | ⬜ | `appStore.editorEngine` 存储当前引擎类型 |
| 11.9 Milkdown 基础集成 | ⬜ | 安装依赖，创建最小可用的 MilkdownAdapter |
| 11.10 Vue 3 集成 | ⬜ | `@milkdown/vue` + `useEditor` composable |
| 11.11 双引擎启动验证 | ⬜ | Muya 和 Milkdown 都能启动，冷切换工作 |

### IEditorEngine 接口（核心）

```typescript
interface IEditorEngine {
  // 生命周期
  mount(element: HTMLElement, options: EditorOptions): void
  destroy(): void

  // 内容
  getMarkdown(): string
  setMarkdown(markdown: string, cursor?: CursorState): void
  getWordCount(): number
  getTOC(): TOCEntry[]

  // 编辑
  format(type: FormatType): void
  updateParagraph(type: ParagraphType): void
  createTable(spec: TableSpec): void
  insertImage(info: ImageInfo): void
  undo(): void
  redo(): void
  selectAll(): void

  // 搜索
  search(value: string, options: SearchOptions): SearchMatch[]
  replace(value: string, options: ReplaceOptions): SearchMatch[]
  findNext(): void
  findPrevious(): void

  // 状态
  focus(): void
  blur(): void
  hasFocus(): boolean

  // 导出
  exportHTML(options?: ExportHTMLOptions): Promise<string>
  exportStyledHTML(options?: ExportStyledHTMLOptions): Promise<string>

  // 配置
  setOptions(options: Partial<EditorOptions>): void

  // 事件
  on(event: 'change', handler: ChangeHandler): void
  on(event: 'selectionChange', handler: SelectionChangeHandler): void
  on(event: 'selectionFormats', handler: SelectionFormatsHandler): void
  on(event: 'focus' | 'blur', handler: () => void): void
  off(event: string, handler: Function): void
}
```

### 引擎切换方式

```bash
# 方式 1：启动参数（优先级最高）
marktext --editor-engine=milkdown

# 方式 2：设置界面（需重启）
Preferences > General > Editor Engine > [Muya (Legacy)] / [Milkdown (Experimental)]
```

### 验证清单

- [ ] `IEditorEngine` 接口定义完整，类型通过编译
- [ ] MuyaAdapter 包装所有现有 Muya 方法
- [ ] `editor.vue` 不再直接 import Muya，使用 IEditorEngine
- [ ] `--editor-engine=muya` 启动正常（默认）
- [ ] `--editor-engine=milkdown` 启动，显示基础编辑器
- [ ] 设置中可选择引擎，提示需重启
- [ ] 冷切换（重启后）引擎正确加载
- [ ] 现有功能无回归（MuyaAdapter 透传正确）

预估工期: **3 周**

---

## 阶段 12: Milkdown 核心功能

> 依赖阶段 11 完成。
> 详细方案见 [`MILKDOWN_MIGRATION_REPORT.md` 第 4 章功能对照矩阵](./MILKDOWN_MIGRATION_REPORT.md#4-功能对照矩阵)。

**目标**: 在 MilkdownAdapter 中实现所有有官方插件支持的核心功能

| 任务 | 状态 | 说明 |
| ---- | ---- | ---- |
| 12.1 CommonMark + GFM 语法 | ⬜ | `@milkdown/preset-commonmark` + `@milkdown/preset-gfm` |
| 12.2 表格交互编辑 | ⬜ | `@milkdown/components` table-block |
| 12.3 数学公式 (KaTeX) | ⬜ | `@milkdown/crepe` latex 功能 或自定义 remark-math |
| 12.4 代码块 (CodeMirror 6) | ⬜ | `@milkdown/crepe` code-mirror 或自定义 CM6 nodeView |
| 12.5 格式工具栏 | ⬜ | `@milkdown/plugin-tooltip` 或 Crepe toolbar |
| 12.6 链接编辑 | ⬜ | Crepe link-tooltip |
| 12.7 撤销/重做 | ⬜ | `@milkdown/plugin-history` |
| 12.8 剪贴板 | ⬜ | `@milkdown/plugin-clipboard` |
| 12.9 图片上传/粘贴/拖拽 | ⬜ | `@milkdown/plugin-upload` + imageAction 回调适配 |
| 12.10 Emoji | ⬜ | `@milkdown/plugin-emoji` |
| 12.11 斜杠命令 | ⬜ | `@milkdown/plugin-slash` + 自定义 UI |
| 12.12 脚注 | ⬜ | `preset-gfm` 内含 |
| 12.13 事件映射 | ⬜ | change, selectionChange, selectionFormats 事件 |
| 12.14 配置项映射 | ⬜ | fontSize, lineHeight, tabSize, bulletListMarker 等 |
| 12.15 主题适配 | ⬜ | CSS 变量映射 MarkText 现有主题 |

### 新增依赖

```json
{
  "@milkdown/kit": "^7.18.0",
  "@milkdown/vue": "^7.18.0",
  "@milkdown/preset-commonmark": "^7.18.0",
  "@milkdown/preset-gfm": "^7.18.0",
  "@milkdown/plugin-history": "^7.18.0",
  "@milkdown/plugin-clipboard": "^7.18.0",
  "@milkdown/plugin-listener": "^7.18.0",
  "@milkdown/plugin-upload": "^7.18.0",
  "@milkdown/plugin-emoji": "^7.18.0",
  "@milkdown/plugin-slash": "^7.18.0",
  "@milkdown/plugin-tooltip": "^7.18.0",
  "@milkdown/plugin-indent": "^7.18.0",
  "@milkdown/plugin-cursor": "^7.18.0"
}
```

### 验证清单

- [ ] Milkdown 引擎可打开 .md 文件并正确渲染
- [ ] GFM 表格、任务列表、删除线正常
- [ ] 数学公式 ($$...$$ 和 $...$) 渲染正常
- [ ] 代码块语法高亮正常
- [ ] 格式工具栏可用（bold, italic, strikethrough 等）
- [ ] 撤销/重做正常
- [ ] 图片粘贴/拖拽/上传正常
- [ ] `getMarkdown()` 输出与输入 Markdown 保真
- [ ] 中文输入法 (IME) 正常工作
- [ ] 大文档 (5000+ 行) 性能可接受 (<500ms 输入延迟)

预估工期: **3-4 周**

---

## 阶段 13: 自定义插件（复用 Muya）

> 依赖阶段 12 完成。
> 详细方案见 [`MILKDOWN_MIGRATION_REPORT.md` 第 5 章 Muya 代码复用分析](./MILKDOWN_MIGRATION_REPORT.md#5-muya-代码复用分析)。

**目标**: 提取 Muya 可复用逻辑，构建 Milkdown 缺失的自定义插件

| 任务 | 状态 | 说明 |
| ---- | ---- | ---- |
| **13.1 提取共享模块** | | |
| 提取图表渲染器 | ⬜ | `shared/renderers/` — Mermaid, Flowchart, Vega, PlantUML, Sequence |
| 提取搜索匹配算法 | ⬜ | `shared/search/matchEngine.ts` — 从 `searchCtrl.js` 提取 |
| 提取 HTML 导出模板 | ⬜ | `shared/export/htmlTemplate.ts` — 从 `exportHtml.js` 提取 (~80% 复用) |
| 提取图片工具 | ⬜ | `shared/images/` — pathResolver, Unsplash API |
| 提取 Focus 模式 CSS | ⬜ | `shared/styles/focusMode.css` — 从 Muya CSS 提取 (~90% 复用) |
| **13.2 构建 Milkdown 插件** | | |
| 搜索替换插件 | ⬜ | 基于 `prosemirror-search` + 复用 matchEngine |
| Mermaid 图表 NodeView | ⬜ | 自定义 ProseMirror nodeView + 复用 Muya 渲染器 |
| Flowchart.js 图表 NodeView | ⬜ | 同上 |
| Vega-Lite 图表 NodeView | ⬜ | 同上 |
| Sequence/PlantUML NodeView | ⬜ | 同上（Sequence 可合并到 Mermaid） |
| Front Matter 插件 | ⬜ | `remark-frontmatter` + 复用 Muya 正则 + 自定义 nodeView |
| TOC 生成插件 | ⬜ | 遍历 ProseMirror doc 收集 heading 节点 |
| Focus 模式插件 | ⬜ | ProseMirror Decoration + 复用 Muya CSS |
| Typewriter 模式插件 | ⬜ | ProseMirror plugin 保持光标垂直居中 |
| HTML 导出插件 | ⬜ | `remark-rehype` + `rehype-stringify` + 复用导出模板 |
| 图片调整大小 NodeView | ⬜ | 自定义 ProseMirror nodeView + 拖拽 resize |
| 上标/下标 | ⬜ | `remark-supersub` |

### 共享模块架构

```
src/renderer/editor/shared/              ← 引擎无关，Muya 和 Milkdown 都可用
├── renderers/
│   ├── types.ts                         # DiagramRenderer 接口
│   ├── mermaid.ts                       # 从 Muya 提取
│   ├── flowchart.ts                     # 从 Muya 提取
│   ├── vega.ts                          # 从 Muya 提取
│   ├── plantuml.ts                      # 从 Muya 提取
│   └── sequence.ts                      # 从 Muya 提取
├── search/
│   └── matchEngine.ts                   # 正则/全词/大小写匹配
├── export/
│   ├── htmlTemplate.ts                  # HTML 结构 + CSS 内联
│   └── styles.ts                        # 导出样式
├── images/
│   ├── pathResolver.ts                  # 图片路径解析
│   └── unsplash.ts                      # Unsplash API
└── styles/
    └── focusMode.css                    # Focus 模式 CSS
```

### 复用节省

| 模块 | 从零开发 | 复用 Muya 后 | 节省 |
|------|---------|-------------|------|
| 图表渲染器 ×5 | 5 周 | 2.5 周 | 2.5 周 |
| 搜索替换 | 1.5 周 | 1 周 | 0.5 周 |
| HTML 导出 | 1 周 | 2 天 | 3 天 |
| Focus 模式 | 3 天 | 1 天 | 2 天 |
| 其他 | 2 周 | 1 周 | 1 周 |
| **合计** | **~10-12 周** | **~6-7 周** | **~4-5 周** |

### 验证清单

- [ ] Mermaid/Flowchart/Vega/Sequence/PlantUML 代码块正确渲染图表
- [ ] 搜索高亮、替换（含正则捕获组）正常
- [ ] Front Matter (YAML/TOML/JSON) 解析和编辑正常
- [ ] TOC 生成返回正确的标题列表
- [ ] Focus 模式正确淡化非活动段落
- [ ] HTML 导出包含样式和图表
- [ ] 图片可拖拽调整大小
- [ ] 与 Muya 引擎对比测试：同一文档两个引擎渲染结果一致

预估工期: **4-5 周**（复用 Muya 后）

---

## 阶段 14: Split View 对照编辑模式

> 依赖阶段 12 完成（核心 Milkdown 功能就绪）。
> 详细方案见 [`MILKDOWN_MIGRATION_REPORT.md` 第 7 章](./MILKDOWN_MIGRATION_REPORT.md#7-对照编辑模式设计split-view)。

**目标**: 实现类似 JetBrains IDE 的左侧源码 + 右侧可编辑预览对照模式

| 任务 | 状态 | 说明 |
| ---- | ---- | ---- |
| **14.1 基础框架** | | |
| `SplitEditor.vue` 组件 | ⬜ | 三模式切换 + 可拖拽分隔栏 |
| 三种编辑模式 UI | ⬜ | 预览(Ctrl+1) / 对照(Ctrl+2) / 源码(Ctrl+3) |
| **14.2 Source Pane** | | |
| CodeMirror 6 集成 | ⬜ | `@codemirror/lang-markdown` + 行号 + 语法高亮 |
| CM6 主题适配 | ⬜ | 匹配 MarkText 主题 (light/dark) |
| **14.3 双向同步** | | |
| SyncEngine 核心 | ⬜ | debounce 150ms + isSyncing 防回声 |
| Source → Preview | ⬜ | markdown → `parserCtx` → ProseMirror doc |
| Preview → Source | ⬜ | serialize → diff patch → CodeMirror 最小更新 |
| IME 兼容 | ⬜ | compositionstart/end 守卫，组合期间暂停同步 |
| **14.4 滚动同步** | | |
| remarkSourceLines 插件 | ⬜ | Remark 插件，注入 `data-source-line` 属性 |
| lineMap 构建 | ⬜ | DOM 扫描构建 sourceLine ↔ offsetTop 映射 |
| 双向滚动同步 | ⬜ | 线性插值 + 二分查找 |
| **14.5 集成** | | |
| IEditorEngine 扩展 | ⬜ | `setSplitMode()`, `getSplitMode()` 方法 |
| 状态栏模式指示 | ⬜ | 显示当前编辑模式 |
| 快捷键注册 | ⬜ | Ctrl+1/2/3 切换模式 |

### 三种编辑模式

| 模式 | 快捷键 | 左面板 | 右面板 |
| ---- | ------ | ------ | ------ |
| 预览模式 | Ctrl+1 | 隐藏 | 全宽 WYSIWYG（当前默认） |
| 对照模式 | Ctrl+2 | CodeMirror 6 源码 | WYSIWYG 预览（可编辑） |
| 源码模式 | Ctrl+3 | 全宽 CodeMirror 6 | 隐藏 |

### 新增依赖

```json
{
  "@codemirror/state": "^6.x",
  "@codemirror/view": "^6.x",
  "@codemirror/lang-markdown": "^6.x",
  "@codemirror/language": "^6.x",
  "@codemirror/language-data": "^6.x",
  "diff": "^5.x"
}
```

### 性能目标

| 指标 | 目标 | 可接受 |
| ---- | ---- | ------ |
| 按键到预览延迟 | <200ms | <500ms |
| 滚动同步延迟 | <16ms (60fps) | <33ms (30fps) |
| 额外内存开销 | <50MB | <100MB |
| 万行文档初始渲染 | <1s | <2s |

### 验证清单

- [ ] Ctrl+1/2/3 切换三种模式，动画流畅
- [ ] 对照模式下，左侧编辑源码 → 右侧预览实时更新
- [ ] 对照模式下，右侧编辑预览 → 左侧源码实时更新
- [ ] 同步更新不丢失光标位置
- [ ] 中文输入法在两个面板中都正常
- [ ] 滚动联动：滚动一侧，另一侧跟随
- [ ] 分隔栏可拖拽调整比例
- [ ] 5000+ 行文档对照模式不卡顿
- [ ] 源码模式下 CodeMirror 6 语法高亮正常

预估工期: **4 周**

---

## 阶段 15: 集成完善 + 测试

> 依赖阶段 13、14 完成。

**目标**: 完善所有集成细节，确保 Milkdown 引擎功能完整

| 任务 | 状态 | 说明 |
| ---- | ---- | ---- |
| 15.1 PDF 导出适配 | ⬜ | Milkdown HTML → PDF 流水线 |
| 15.2 主题系统完整迁移 | ⬜ | 6 个主题 (light/dark 各 3) |
| 15.3 Unsplash 集成 | ⬜ | 图片选择器复用 Muya Unsplash API |
| 15.4 拼写检查适配 | ⬜ | WebView spellcheck + 自定义词典 |
| 15.5 Milkdown UI 本地化 | ⬜ | 工具栏/斜杠命令/placeholder 使用 `$t()` |
| 15.6 发起社区翻译 | ⬜ | 配置 Crowdin/Weblate，邀请社区贡献者 |
| 15.7 单元测试 | ⬜ | 共享模块 + 自定义插件 |
| 15.8 集成测试 | ⬜ | 双引擎对比：同一文档渲染一致性 |
| 15.9 E2E 测试 | ⬜ | Playwright: 三种编辑模式基本流程 |
| 15.10 性能基准测试 | ⬜ | Muya vs Milkdown: 大文档、输入延迟、内存 |
| 15.11 回归测试 + Bug 修复 | ⬜ | 修复所有已知问题 |
| 15.12 文档更新 | ⬜ | README、CONTRIBUTING、用户指南 |

### 验证清单

- [ ] PDF 导出正常（含图表、数学公式）
- [ ] 所有 6 个主题在 Milkdown 引擎下正常
- [ ] Unsplash 图片搜索和插入正常
- [ ] 拼写检查正常
- [ ] Milkdown UI 文本已本地化
- [ ] 至少 3 种语言翻译完成（en, zh-CN, +1）
- [ ] 单元测试覆盖率 >60%（新代码）
- [ ] E2E 测试通过
- [ ] Milkdown 引擎无已知 blocker
- [ ] `scripts\build-tauri-portable.cmd` 构建成功

预估工期: **2-3 周**

---

## 阶段 16: 发布 + 清理（可选）

**目标**: 将 Milkdown 设为默认引擎，收集反馈，最终移除 Muya

| 任务 | 状态 | 说明 |
| ---- | ---- | ---- |
| 16.1 Beta 发布 | ⬜ | Milkdown 引擎为实验性选项 |
| 16.2 收集用户反馈 | ⬜ | GitHub Issues + 社区渠道 |
| 16.3 修复反馈问题 | ⬜ | 根据反馈迭代 |
| 16.4 Milkdown 设为默认 | ⬜ | 切换默认引擎 |
| 16.5 移除 Muya 代码 | ⬜ | 删除 src/muya/ + MuyaAdapter（视反馈决定） |

> **注意**: 移除 Muya 不是必须的。如果社区反馈 Milkdown 有功能缺失，可以长期保留双引擎。

---

## 进度跟踪

| 阶段 | 状态 | 开始日期 | 完成日期 | 预估工期 |
| ---- | ---- | -------- | -------- | -------- |
| 阶段 0: 基础准备 | ✅ 完成 | 2026-02-04 | 2026-02-04 | - |
| 阶段 1: 构建工具升级 | ✅ 完成 | 2026-02-04 | 2026-02-04 | - |
| 阶段 2: 减少原生模块 | ✅ 完成 | 2026-02-04 | 2026-02-04 | - |
| 阶段 3: Electron 小版本升级 | ✅ 完成 | 2026-02-04 | 2026-02-04 | - |
| 阶段 4: Electron 大版本升级 | ✅ 完成 | 2026-02-04 | 2026-02-05 | - |
| 阶段 4.5: 渲染进程现代化 | ✅ 完成 | 2026-02-04 | 2026-02-05 | - |
| 阶段 5: Vue 生态升级准备 | ✅ 完成 | 2026-02-05 | 2026-02-05 | - |
| 阶段 6: Vue 3 迁移 | ✅ 完成 | 2026-02-06 | 2026-02-06 | - |
| 阶段 7: TypeScript 迁移 | ✅ 完成 | 2026-02-06 | 2026-02-06 | - |
| 阶段 8: Tauri 评估与 PoC | ✅ 完成 | 2026-02-05 | 2026-02-05 | - |
| 阶段 9: Tauri 完整迁移 | ✅ 完成 | 2026-02-05 | 2026-02-05 | - |
| **阶段 10: 国际化 (i18n)** | ✅ 完成 | 2026-02-07 | 2026-02-08 | - |
| **阶段 11: 编辑器抽象层 + 引擎切换** | ⬜ 待开始 | - | - | 3 周 |
| **阶段 12: Milkdown 核心功能** | ⬜ 待开始 | - | - | 3-4 周 |
| **阶段 13: 自定义插件 (复用 Muya)** | ⬜ 待开始 | - | - | 4-5 周 |
| **阶段 14: Split View 对照模式** | ⬜ 待开始 | - | - | 4 周 |
| **阶段 15: 集成完善 + 测试** | ⬜ 待开始 | - | - | 2-3 周 |
| **阶段 16: 发布 + 清理** | ⬜ 待开始 | - | - | 视反馈 |

### 并行关系

```
阶段 10 (i18n)  ──────────┐
                           ├──► 阶段 12 (核心功能) ──► 阶段 13 (自定义插件) ──┐
阶段 11 (抽象层) ─────────┘                                                   │
                                                  阶段 14 (Split View) ───────┼──► 阶段 15 (测试) ──► 阶段 16 (发布)
                                                       ↑                      │
                                                  依赖阶段 12 ────────────────┘
```

### 总工期预估

| 场景 | 工期 | 说明 |
| ---- | ---- | ---- |
| 最乐观 | 18 周（~4.5 个月） | 阶段 10+11 并行，一切顺利 |
| 正常预期 | 24-28 周（~6-7 个月） | 含调试、返工、边缘情况 |
| 最悲观 | 36 周（~9 个月） | 架构级问题 + Split View 性能 |

---

## 版本规划

| 版本 | 包含阶段 | 主要变化 |
| ---- | -------- | -------- |
| v0.18.0 | 0-1 | 构建优化，Windows 支持改进 |
| v0.19.0 | 2-3 | 减少原生模块，Electron 补丁更新 |
| v0.20.0 | 4, 4.5 | Electron 38 + 渲染进程现代化 |
| v0.21.0 | 5-6 | Vue 3 + Vite 迁移 |
| v0.22.0 | 7 | TypeScript 迁移 |
| v1.0.0 | 8-9 | Tauri 版本发布 |
| **v1.1.0** | **10** | **中英双语国际化** |
| **v1.2.0** | **11-12** | **Milkdown 引擎（实验性）+ 引擎切换** |
| **v1.3.0** | **13** | **图表/搜索/导出等自定义插件** |
| **v1.4.0** | **14** | **Split View 对照编辑模式** |
| **v2.0.0** | **15-16** | **Milkdown 设为默认 + 完整多语言** |

---

## ESM 兼容性说明

> 已迁移到 Vite + Tauri，ESM 兼容性问题已基本解决。Vite 原生支持 ESM，无需 webpack 白名单。
>
> 以下工具保留用于调试：

```bash
# 如需检测 ESM-only 模块
node tools/checkEsmModules.js
```

---

## 注意事项

1. **每个阶段完成后**:

   - 更新本文档状态（标记 ✅ + 填写日期）
   - 创建 git tag
   - **用脚本验证**：`yarn dev`、`scripts\build-tauri-portable.cmd` 等，不手写验证步骤
   - 测试所有平台（Windows 以脚本为准）

2. **升级后必须更新脚本**:

   - 依赖或原生模块有增删时，必须同步修改：
     - 构建脚本：`scripts\build-tauri-portable.cmd`、`scripts\build-windows.ps1`
   - 避免脚本中仍引用已删除依赖或错误版本，导致验证/构建异常。

3. **风险控制**:

   - 每个阶段都要可回滚
   - 保持向后兼容（数据、配置）
   - 充分测试再合并（以脚本通过为准）
   - **编辑器迁移的安全网**：阶段 11 建立引擎抽象层后，Muya 永远可用，任何阶段验证失败都可回退到 Muya

4. **i18n 纪律**:

   - 阶段 10 以后，**所有新增用户可见字符串必须使用 `$t()` / `i18n.t()`**
   - PR Review 检查清单中加入"无硬编码字符串"
   - 新增字符串必须同时写入 `en.json`，`zh-CN.json` 可后续补充

5. **文档更新**:
   - 更新 README
   - 更新构建文档
   - 更新贡献指南
   - 阶段 16 前准备国际化贡献指南6. **关键参考文档**:
   - 编辑器迁移详细设计：[`docs/dev/MILKDOWN_MIGRATION_REPORT.md`](./MILKDOWN_MIGRATION_REPORT.md)
   - 本路线图中每个编辑器相关阶段都引用了对应报告章节