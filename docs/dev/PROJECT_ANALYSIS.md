# MarkText 项目结构与技术栈分析

> **注意**: 本文档部分内容（尤其是 Electron 架构、Vuex、Webpack 相关描述）尚未更新至最新状态。项目已迁移到 **Tauri 2.0 + Vue 3 + Vite + Pinia + TypeScript**。最新的架构信息请参考 [UPGRADE_ROADMAP.md](./UPGRADE_ROADMAP.md)。

> 本文档旨在帮助开发者快速了解 MarkText 项目的整体架构、技术栈和代码组织方式，为后续的改进和开发工作提供参考。

## 1. 项目概述

MarkText 是一款开源的 Markdown 编辑器，专注于速度和可用性。它支持实时预览（所见即所得），提供简洁优雅的界面，让用户获得无干扰的写作体验。

- **版本**: 0.17.1
- **许可证**: MIT
- **支持平台**: Windows、macOS、Linux

### 1.1 核心特性

- 实时预览（WYSIWYG）编辑模式
- 支持 CommonMark、GFM、Pandoc Markdown 规范
- 数学公式（KaTeX）、Front Matter、Emoji 支持
- 多主题支持：Cadmium Light、Material Dark、One Dark 等
- 多编辑模式：源代码模式、打字机模式、专注模式
- 导出 HTML/PDF
- 图片直接粘贴
- 拼写检查
- 全文搜索（使用 ripgrep）

## 2. 技术栈

### 2.1 核心框架

| 技术           | 版本   | 用途               |
| -------------- | ------ | ------------------ |
| **Tauri**      | 2.0    | 跨平台桌面应用框架 |
| **Vue.js**     | ^3.4.0 | 前端 UI 框架       |
| **Pinia**      | ^2.1.0 | 状态管理           |
| **Vue Router** | ^4.2.0 | 路由管理           |
| **TypeScript** | ^5.9.3 | 类型系统           |

### 2.2 编辑器引擎

| 技术           | 版本    | 用途                     |
| -------------- | ------- | ------------------------ |
| **Muya**       | 0.1.2   | 自研 Markdown 编辑器引擎 |
| **CodeMirror** | ^5.65.2 | 代码编辑器（源码模式）   |
| **Snabbdom**   | ^3.4.0  | Virtual DOM 实现         |
| **Turndown**   | ^7.1.1  | HTML 转 Markdown         |

### 2.3 Markdown 渲染相关

| 技术               | 版本             | 用途            |
| ------------------ | ---------------- | --------------- |
| **KaTeX**          | ^0.15.3          | 数学公式渲染    |
| **Mermaid**        | ^10.0.0          | 图表/流程图渲染 |
| **Prism.js**       | ^1.27.0          | 代码语法高亮    |
| **flowchart.js**   | ^1.17.1          | 流程图渲染      |
| **Vega/Vega-Lite** | ^5.22.1 / ^5.2.0 | 数据可视化      |

### 2.4 UI 组件库

| 技术                      | 版本   | 用途                                     |
| ------------------------- | ------ | ---------------------------------------- |
| **Radix Vue**             | ^1.9.x | 无头 UI 组件（Dialog、Menu、Tooltip 等） |
| **@vueuse/core**          | ^14.x  | Vue 组合式工具函数                       |
| **vue-sonner**            | ^2.x   | Toast 通知系统                           |
| **@tanstack/vue-virtual** | ^3.x   | 虚拟滚动（文件树、搜索结果）             |
| **github-markdown-css**   | ^3.0.1 | Markdown 样式                            |

### 2.5 构建工具

| 技术            | 版本    | 用途                |
| --------------- | ------- | ------------------- |
| **Vite**        | ^5.4.0  | 前端构建工具        |
| **Tauri CLI**   | ^2.0.0  | 应用打包分发        |
| **Webpack**     | (Muya)  | Muya 编辑器库打包   |
| **Babel**       | ^7.17.9 | JavaScript 编译     |
| **ESLint**      | ^8.13.0 | 代码检查            |
| **Prettier**    | ^3.8.1  | 代码格式化          |
| **Husky**       | ^9.1.7  | Git hooks 管理      |
| **lint-staged** | ^16.2.7 | 暂存文件 lint       |
| **commitlint**  | ^20.4.1 | Commit 信息规范检查 |

### 2.6 测试框架

| 技术           | 版本    | 用途           |
| -------------- | ------- | -------------- |
| **Karma**      | ^6.3.18 | 单元测试运行器 |
| **Mocha**      | ^9.2.2  | 测试框架       |
| **Chai**       | ^4.3.6  | 断言库         |
| **Playwright** | ^1.21.0 | E2E 测试       |

### 2.7 其他重要依赖

| 技术                                | 用途         |
| ----------------------------------- | ------------ |
| **@tauri-apps/plugin-fs**           | 文件系统操作 |
| **@tauri-apps/plugin-dialog**       | 系统对话框   |
| **@tauri-apps/plugin-shell**        | Shell 命令   |
| **@tauri-apps/plugin-clipboard**    | 剪贴板管理   |
| **@tauri-apps/plugin-window-state** | 窗口状态管理 |
| **DOMPurify**                       | XSS 防护     |
| **axios**                           | HTTP 请求    |
| **Unsplash API**                    | 图片搜索     |

## 3. 项目结构

> Electron 时代的项目结构和架构详解已归档至 [archive/PROJECT_STRUCTURE_ELECTRON.md](archive/PROJECT_STRUCTURE_ELECTRON.md)。

```
marktext/
├── src-tauri/              # Tauri 后端 (Rust)
│   ├── src/
│   │   ├── main.rs         # 应用入口
│   │   ├── lib.rs          # Tauri 初始化
│   │   └── commands/       # Tauri 命令处理
│   ├── capabilities/       # 权限配置
│   ├── Cargo.toml          # Rust 依赖
│   └── tauri.conf.json     # Tauri 配置
│
├── src/
│   ├── renderer/           # Vue 3 前端
│   │   ├── main.js         # 前端入口
│   │   ├── components/     # Vue 组件
│   │   ├── pages/          # 页面视图
│   │   ├── stores/         # Pinia 状态管理 (TypeScript)
│   │   ├── router/         # Vue Router 配置
│   │   ├── i18n/           # 国际化
│   │   ├── assets/         # 样式、图标、主题
│   │   └── util/           # 工具函数
│   │
│   ├── muya/               # Muya 编辑器引擎
│   │   ├── lib/            # 核心库
│   │   └── themes/         # 编辑器主题
│   │
│   ├── common/             # 共享代码 (TypeScript)
│   └── locales/            # 翻译文件
│
├── test/                   # 测试
├── resources/              # 应用资源
├── docs/                   # 文档
├── tools/                  # 构建工具脚本
├── scripts/                # 平台环境脚本
└── package.json
```

## 4. 架构简述

详细架构文档请参考 [ARCHITECTURE.md](ARCHITECTURE.md)。

项目采用 Tauri 2.0 架构，由三个核心部分组成：

1. **Tauri 后端** (`src-tauri/`): Rust 进程，负责文件 I/O、系统对话框、窗口管理、OS 集成
2. **Vue 前端** (`src/renderer/`): WebView 中的 Vue 3 应用，使用 Pinia 状态管理
3. **Muya 引擎** (`src/muya/`): 纯 JavaScript 的 Markdown 编辑器引擎

前后端通过 Tauri IPC 通信（`invoke()` 调用和事件系统），详见 [IPC 文档](code/IPC.md)。

## 5. 构建与开发

```bash
# 安装依赖
npm install

# 开发模式（Vite + Tauri）
npm run tauri:dev

# 生产构建
npm run tauri:build

# 代码检查与格式化
npm run lint          # ESLint 检查 (JS, TS, Vue)
npm run lint:fix      # 自动修复
npm run format        # Prettier 格式化
npm run format:check  # 检查格式

## 7. 测试结构

```

test/
├── e2e/ # E2E 测试 (Playwright)
│ ├── playwright.config.js
│ ├── launch.spec.js # 启动测试
│ └── xss.spec.js # XSS 安全测试
│
├── specs/ # 规范符合性测试
│ ├── commonMark/ # CommonMark 0.30 测试
│ └── gfm/ # GFM 0.29 测试
│
└── unit/ # 单元测试 (Karma + Mocha)
├── karma.conf.js
└── specs/
├── markdown-\*.spec.js
└── extract-word.spec.js

````

## 8. 关键技术实现

### 8.1 Virtual DOM 渲染

Muya 使用 Snabbdom 实现虚拟 DOM，提供高效的编辑器渲染：

```javascript
// 使用 Snabbdom 进行差异化更新
import { h, init, classModule, styleModule, propsModule } from "snabbdom";
````

### 8.2 Markdown 解析

项目使用自定义解析器处理多种 Markdown 语法：

- CommonMark 基础语法
- GFM 扩展（表格、任务列表、删除线等）
- 数学公式（KaTeX）
- 图表（Mermaid、flowchart.js、Vega）
- Front Matter（YAML）

### 8.3 主题系统

主题文件位于 `src/renderer/assets/themes/`：

- `dark.theme.css`
- `one-dark.theme.css`
- `material-dark.theme.css`
- `graphite.theme.css`
- `ulysses.theme.css`

## 9. 改进建议

### 9.1 技术栈升级状态

| 升级项           | 状态      | 说明                                       |
| ---------------- | --------- | ------------------------------------------ |
| Electron → Tauri | ✅ 已完成 | 迁移至 Tauri 2.0                           |
| Vue 2 → Vue 3    | ✅ 已完成 | 含 Radix Vue、Pinia、Vue Router 4          |
| Webpack → Vite   | ✅ 已完成 | 前端构建已迁移至 Vite（Muya 仍用 Webpack） |
| TypeScript 迁移  | ✅ 已完成 | 32 个文件已迁移                            |
| i18n 国际化      | ✅ 已完成 | Vue I18n v10                               |
| 代码规范化       | ✅ 已完成 | Prettier + Husky + commitlint              |
| Muya → Milkdown  | 📋 计划中 | 编辑器引擎替换                             |

### 9.2 架构优化方向

1. **TypeScript 迁移**: 提高代码可维护性和类型安全
2. **模块化 Muya**: 将编辑器引擎独立为 npm 包
3. **性能优化**: 大文件编辑（虚拟滚动已通过 @tanstack/vue-virtual 实现：文件树、搜索结果）
4. **插件系统**: 支持用户扩展
5. **协作编辑**: 实时多人协作（CRDT/OT）

### 9.3 功能扩展方向

- 云同步支持
- 更多导出格式（DOCX、LaTeX）
- AI 辅助写作
- 版本历史
- 自定义主题编辑器

## 10. 开发环境要求

- **Node.js**: v18+（推荐使用 nvm 管理版本，项目根目录有 `.nvmrc`）
- **Rust**: stable toolchain（通过 [rustup](https://rustup.rs/) 安装）
- **npm**: v9+（随 Node.js 自带）
- **C++ 编译工具链**:
  - Windows: Visual Studio 2022
  - macOS: Xcode Command Line Tools
  - Linux: build-essential + WebKit2GTK 开发库

## 11. 相关资源

- [GitHub 仓库](https://github.com/marktext/marktext)
- [用户文档](../README.md)
- [构建指南](./BUILD.md)
- [贡献指南](../../CONTRIBUTING.md)
- [更新日志](../../.github/CHANGELOG.md)

---

_文档更新日期: 2026-02-11_
