# MarkText 升级路线图

> 本文档记录 MarkText 从当前状态逐步升级到现代化技术栈的完整路线。
> 每个阶段完成后请更新状态。

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

**当前原生模块**: `keytar`, `fontmanager-redux`, `native-keymap` (3 个)

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

### 验证清单

- [x] `yarn install` 成功
- [x] `scripts/build-win-portable.cmd` 构建成功
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

---

## 阶段 3: Electron 小版本升级

**目标**: 升级到 Electron 18 的最新补丁版本，确保稳定性

| 任务                  | 状态 | 当前版本 | 目标版本          |
| --------------------- | ---- | -------- | ----------------- |
| 升级 Electron 18.x    | ⬜   | 18.0.4   | 18.3.x (最新补丁) |
| 升级 @electron/remote | ⬜   | 2.0.8    | 2.1.x             |
| 测试所有功能          | ⬜   | -        | -                 |

---

## 阶段 4: Electron 大版本升级

**目标**: 升级到 Electron LTS 版本

| 任务                  | 状态 | 当前版本 | 目标版本              |
| --------------------- | ---- | -------- | --------------------- |
| 研究 Breaking Changes | ⬜   | -        | 阅读 18→28 的所有变更 |
| 升级 Electron         | ⬜   | 18.x     | 28.x 或 30.x          |
| 修复 API 兼容性       | ⬜   | -        | 根据警告修复          |
| 升级 @electron/remote | ⬜   | 2.x      | 匹配版本              |

### 主要 Breaking Changes (18 → 28)

1. **废弃的 API**:

   - `remote` 模块需要显式启用
   - `BrowserWindow` 选项变化

2. **安全性变化**:

   - `contextIsolation` 默认为 `true`
   - `nodeIntegration` 默认为 `false`

3. **其他**:
   - 需要检查原生模块 ABI 兼容性

---

## 阶段 5: Vue 生态升级准备

**目标**: 为 Vue 3 迁移做准备

| 任务                     | 状态 | 说明                           |
| ------------------------ | ---- | ------------------------------ |
| 安装 Vue 2.7             | ⬜   | 桥接版本，支持 Composition API |
| 逐步使用 Composition API | ⬜   | 新代码使用新语法               |
| 审计 Element UI 使用     | ⬜   | 准备迁移到 Element Plus        |
| 审计 Vuex 使用           | ⬜   | 准备迁移到 Pinia               |

### Vue 2.7 迁移 (桥接阶段)

```bash
# 升级到 Vue 2.7
yarn upgrade vue@^2.7 vue-template-compiler@^2.7
```

```javascript
// 新组件可以使用 Composition API
<script>
import { ref, computed, onMounted } from 'vue'

export default {
  setup() {
    const count = ref(0)
    const doubled = computed(() => count.value * 2)

    onMounted(() => {
      console.log('mounted')
    })

    return { count, doubled }
  }
}
</script>
```

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

| 阶段                        | 状态      | 开始日期   | 完成日期   |
| --------------------------- | --------- | ---------- | ---------- |
| 阶段 0: 基础准备            | ✅ 完成   | 2026-02-04 | 2026-02-04 |
| 阶段 1: 构建工具升级        | ✅ 完成   | 2026-02-04 | 2026-02-04 |
| 阶段 2: 减少原生模块        | ⬜ 待开始 | -          | -          |
| 阶段 3: Electron 小版本升级 | ⬜ 待开始 | -          | -          |
| 阶段 4: Electron 大版本升级 | ⬜ 待开始 | -          | -          |
| 阶段 5: Vue 生态升级准备    | ⬜ 待开始 | -          | -          |
| 阶段 6: Vue 3 迁移          | ⬜ 待开始 | -          | -          |
| 阶段 7: TypeScript 迁移     | ⬜ 待开始 | -          | -          |
| 阶段 8: Tauri 评估与 PoC    | ⬜ 待开始 | -          | -          |
| 阶段 9: Tauri 迁移          | ⬜ 待开始 | -          | -          |
| 阶段 10: 编辑器引擎现代化   | ⬜ 待开始 | -          | -          |

---

## 版本规划

| 版本    | 包含阶段 | 主要变化                        |
| ------- | -------- | ------------------------------- |
| v0.18.0 | 0-1      | 构建优化，Windows 支持改进      |
| v0.19.0 | 2-3      | 减少原生模块，Electron 补丁更新 |
| v0.20.0 | 4        | Electron 大版本升级             |
| v0.21.0 | 5-6      | Vue 3 + Vite 迁移               |
| v0.22.0 | 7        | TypeScript 迁移                 |
| v1.0.0  | 8-10     | Tauri 版本发布                  |

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
   - 测试所有平台

2. **风险控制**:

   - 每个阶段都要可回滚
   - 保持向后兼容（数据、配置）
   - 充分测试再合并

3. **文档更新**:
   - 更新 README
   - 更新构建文档
   - 更新贡献指南
