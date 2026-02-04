# MarkText 升级路线图

> 本文档记录 MarkText 从当前状态逐步升级到现代化技术栈的完整路线。
> 每个阶段完成后请更新状态。

## 概览

```
当前状态                                              目标状态
─────────                                            ─────────
Electron 18        ──────────────────────────────►   Tauri 2.0
Vue 2 + Vuex       ──────────────────────────────►   Vue 3 + Pinia
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
- [ ] 生成的应用可以正常运行（待测试）

---

## 阶段 2: 减少原生模块

**目标**: 将原生模块从 3 个减少到 2 个

| 任务                          | 状态 | 说明                   |
| ----------------------------- | ---- | ---------------------- |
| 替换 `keytar` → `safeStorage` | ⬜   | 使用 Electron 内置 API |
| 更新密码存储逻辑              | ⬜   | 主进程实现加解密       |
| 迁移现有存储数据              | ⬜   | 兼容旧版本数据         |

### 技术方案

**keytar 当前用法**:

```javascript
// 旧代码
const keytar = require("keytar");
await keytar.setPassword("marktext", "github-token", token);
const token = await keytar.getPassword("marktext", "github-token");
```

**safeStorage 替代方案**:

```javascript
// 新代码 (主进程)
const { safeStorage } = require("electron");
const Store = require("electron-store");

const store = new Store();

function setSecureValue(key, value) {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(value);
    store.set(key, encrypted.toString("base64"));
  }
}

function getSecureValue(key) {
  const encrypted = store.get(key);
  if (encrypted && safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(Buffer.from(encrypted, "base64"));
  }
  return null;
}
```

### 验证清单

- [ ] GitHub token 存储/读取正常
- [ ] 图床配置存储正常
- [ ] 旧版本数据可以迁移

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

## 阶段 6: Vue 3 迁移

**目标**: 完成 Vue 2 → Vue 3 迁移

| 任务                           | 状态 | 说明           |
| ------------------------------ | ---- | -------------- |
| 升级 Vue 3                     | ⬜   | vue@3.x        |
| 迁移 Vuex → Pinia              | ⬜   | 状态管理       |
| 迁移 Element UI → Element Plus | ⬜   | 组件库         |
| 迁移 Vue Router                | ⬜   | vue-router@4.x |
| 修复所有组件                   | ⬜   | 语法适配       |

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
| v0.21.0 | 5-6      | Vue 3 迁移                      |
| v0.22.0 | 7        | TypeScript 迁移                 |
| v1.0.0  | 8-10     | Tauri 版本发布                  |

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
