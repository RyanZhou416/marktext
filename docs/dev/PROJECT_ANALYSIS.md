# MarkText 项目结构与技术栈分析

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

| 技术           | 版本    | 用途               |
| -------------- | ------- | ------------------ |
| **Electron**   | ^18.0.4 | 跨平台桌面应用框架 |
| **Vue.js**     | ^2.6.14 | 前端 UI 框架       |
| **Vuex**       | ^3.6.2  | 状态管理           |
| **Vue Router** | ^3.5.3  | 路由管理           |

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

| 技术                    | 版本    | 用途          |
| ----------------------- | ------- | ------------- |
| **Element UI**          | ^2.15.8 | Vue UI 组件库 |
| **github-markdown-css** | ^3.0.1  | Markdown 样式 |

### 2.5 构建工具

| 技术                 | 版本    | 用途            |
| -------------------- | ------- | --------------- |
| **Webpack**          | ^5.72.0 | 模块打包        |
| **Babel**            | ^7.17.9 | JavaScript 编译 |
| **electron-builder** | ^23.0.6 | 应用打包分发    |
| **ESLint**           | ^8.13.0 | 代码检查        |

### 2.6 测试框架

| 技术           | 版本    | 用途           |
| -------------- | ------- | -------------- |
| **Karma**      | ^6.3.18 | 单元测试运行器 |
| **Mocha**      | ^9.2.2  | 测试框架       |
| **Chai**       | ^4.3.6  | 断言库         |
| **Playwright** | ^1.21.0 | E2E 测试       |

### 2.7 其他重要依赖

| 技术                      | 用途           |
| ------------------------- | -------------- |
| **chokidar**              | 文件监听       |
| **electron-store**        | 持久化存储     |
| **electron-window-state** | 窗口状态管理   |
| **keytar**                | 系统密钥链访问 |
| **vscode-ripgrep**        | 全文搜索       |
| **DOMPurify**             | XSS 防护       |
| **axios**                 | HTTP 请求      |
| **Unsplash API**          | 图片搜索       |

## 3. 项目结构

```
marktext/
├── .electron-vue/          # Webpack 构建配置
│   ├── build.js            # 生产构建脚本
│   ├── dev-runner.js       # 开发服务器
│   ├── webpack.main.config.js      # 主进程 Webpack 配置
│   └── webpack.renderer.config.js  # 渲染进程 Webpack 配置
│
├── docs/                   # 文档目录
│   ├── dev/               # 开发文档
│   └── i18n/              # 多语言文档
│
├── resources/              # 应用资源（图标等）
│
├── src/                    # 源代码
│   ├── common/            # 主进程/渲染进程共享代码
│   ├── main/              # Electron 主进程
│   ├── muya/              # Muya 编辑器引擎
│   └── renderer/          # Electron 渲染进程 (Vue 应用)
│
├── static/                 # 静态资源
│
├── test/                   # 测试文件
│   ├── e2e/               # E2E 测试
│   ├── specs/             # CommonMark/GFM 规范测试
│   └── unit/              # 单元测试
│
├── tools/                  # 工具脚本
│
├── electron-builder.yml    # 打包配置
└── package.json
```

## 4. 架构详解

### 4.1 Electron 架构

MarkText 采用标准的 Electron 双进程架构：

```
┌─────────────────────────────────────────────────────────────┐
│                      Main Process                            │
│  ┌─────────┐  ┌──────────┐  ┌────────────┐  ┌────────────┐ │
│  │   App   │  │  Window  │  │    Menu    │  │  Keyboard  │ │
│  │ Manager │  │ Manager  │  │   System   │  │  Shortcuts │ │
│  └─────────┘  └──────────┘  └────────────┘  └────────────┘ │
│  ┌──────────┐  ┌───────────┐  ┌────────────┐               │
│  │ FileSystem│  │Preferences│  │Spellchecker│               │
│  │  Watcher │  │   Store   │  │   System   │               │
│  └──────────┘  └───────────┘  └────────────┘               │
└─────────────────────────┬───────────────────────────────────┘
                          │ IPC
┌─────────────────────────┴───────────────────────────────────┐
│                    Renderer Process                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    Vue.js Application                   ││
│  │  ┌─────────┐  ┌────────┐  ┌──────────┐  ┌───────────┐ ││
│  │  │ Vuex    │  │ Router │  │Components│  │  Services │ ││
│  │  │ Store   │  │        │  │          │  │           │ ││
│  │  └─────────┘  └────────┘  └──────────┘  └───────────┘ ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │                   Muya Editor Engine                    ││
│  │  ┌──────────┐  ┌────────┐  ┌────────┐  ┌───────────┐  ││
│  │  │ Content  │  │ Parser │  │  UI    │  │ Selection │  ││
│  │  │  State   │  │        │  │Floats  │  │  System   │  ││
│  │  └──────────┘  └────────┘  └────────┘  └───────────┘  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 4.2 主进程 (src/main/)

主进程负责系统级交互和窗口管理：

```
src/main/
├── app/                    # 应用核心
│   ├── index.js           # 应用入口
│   ├── windowManager.js   # 窗口管理器
│   └── accessor.js        # 全局服务访问器
│
├── cli/                    # 命令行接口
│   ├── index.js
│   └── parser.js
│
├── commands/               # IPC 命令处理
│   ├── file.js            # 文件操作命令
│   └── tab.js             # 标签页命令
│
├── contextMenu/            # 右键菜单
│   └── editor/            # 编辑器右键菜单
│
├── dataCenter/             # 数据中心（状态持久化）
│
├── filesystem/             # 文件系统操作
│   ├── encoding.js        # 编码检测
│   ├── markdown.js        # Markdown 文件处理
│   └── watcher.js         # 文件监听
│
├── keyboard/               # 快捷键系统
│   ├── keybindingsDarwin.js
│   ├── keybindingsLinux.js
│   └── keybindingsWindows.js
│
├── menu/                   # 应用菜单
│   ├── actions/           # 菜单动作处理
│   └── templates/         # 菜单模板
│
├── preferences/            # 偏好设置
│
├── spellchecker/           # 拼写检查
│
├── utils/                  # 工具函数
│
└── windows/                # 窗口类
    ├── base.js            # 基础窗口类
    ├── editor.js          # 编辑器窗口
    └── setting.js         # 设置窗口
```

### 4.3 渲染进程 (src/renderer/)

渲染进程是基于 Vue.js 的前端应用：

```
src/renderer/
├── assets/                 # 静态资源
│   ├── icons/             # SVG 图标
│   ├── themes/            # 主题样式文件
│   └── styles/            # 全局样式
│
├── components/             # Vue 组件
│   ├── editorWithTabs/    # 编辑器+标签页组件
│   │   ├── editor.vue     # 主编辑器
│   │   ├── tabs.vue       # 标签页
│   │   └── sourceCode.vue # 源码模式
│   ├── sideBar/           # 侧边栏
│   ├── titleBar/          # 标题栏
│   ├── search/            # 搜索组件
│   └── commandPalette/    # 命令面板
│
├── prefComponents/         # 偏好设置组件
│   ├── general/           # 通用设置
│   ├── editor/            # 编辑器设置
│   ├── markdown/          # Markdown 设置
│   ├── theme/             # 主题设置
│   ├── image/             # 图片设置
│   ├── keybindings/       # 快捷键设置
│   └── spellchecker/      # 拼写检查设置
│
├── store/                  # Vuex 状态管理
│   ├── index.js           # Store 入口
│   ├── editor.js          # 编辑器状态
│   ├── project.js         # 项目状态
│   ├── layout.js          # 布局状态
│   ├── preferences.js     # 偏好设置状态
│   └── listenForMain.js   # 监听主进程事件
│
├── services/               # 服务
│   ├── printService.js    # 打印/导出服务
│   └── notification/      # 通知服务
│
├── util/                   # 工具函数
│   ├── clipboard.js       # 剪贴板操作
│   ├── pdf.js             # PDF 生成
│   └── markdownToHtml.js  # Markdown 转 HTML
│
├── contextMenu/            # 右键菜单
│
├── router/                 # Vue Router 配置
│
└── pages/                  # 页面
    ├── app.vue            # 主应用页面
    └── preference.vue     # 设置页面
```

### 4.4 Muya 编辑器引擎 (src/muya/)

Muya 是 MarkText 自研的核心 Markdown 编辑器引擎：

```
src/muya/
├── lib/
│   ├── index.js            # 编辑器入口
│   │
│   ├── contentState/       # 内容状态管理（核心）
│   │   ├── index.js        # ContentState 类
│   │   ├── core.js         # 核心状态操作
│   │   ├── history.js      # 撤销/重做
│   │   ├── inputCtrl.js    # 输入控制
│   │   ├── formatCtrl.js   # 格式化控制
│   │   ├── pasteCtrl.js    # 粘贴处理
│   │   ├── copyCutCtrl.js  # 复制/剪切处理
│   │   ├── enterCtrl.js    # 回车处理
│   │   ├── backspaceCtrl.js# 退格处理
│   │   ├── deleteCtrl.js   # 删除处理
│   │   ├── arrowCtrl.js    # 方向键处理
│   │   ├── tabCtrl.js      # Tab 键处理
│   │   ├── paragraphCtrl.js# 段落控制
│   │   ├── codeBlockCtrl.js# 代码块控制
│   │   ├── tableBlockCtrl.js# 表格控制
│   │   ├── imageCtrl.js    # 图片控制
│   │   ├── linkCtrl.js     # 链接控制
│   │   └── searchCtrl.js   # 搜索控制
│   │
│   ├── parser/             # Markdown 解析器
│   │   └── [22 个解析模块]
│   │
│   ├── selection/          # 选区管理
│   │   ├── index.js        # Selection 类
│   │   ├── cursor.js       # 光标操作
│   │   └── dom.js          # DOM 选区操作
│   │
│   ├── eventHandler/       # 事件处理
│   │   ├── keyboard.js     # 键盘事件
│   │   ├── clickEvent.js   # 点击事件
│   │   ├── clipboard.js    # 剪贴板事件
│   │   ├── dragDrop.js     # 拖放事件
│   │   └── mouseEvent.js   # 鼠标事件
│   │
│   ├── ui/                 # UI 浮层组件
│   │   ├── formatPicker/   # 格式选择器
│   │   ├── quickInsert/    # 快速插入菜单
│   │   ├── tablePicker/    # 表格选择器
│   │   ├── imageSelector/  # 图片选择器
│   │   ├── codePicker/     # 代码语言选择
│   │   ├── emojiPicker/    # Emoji 选择器
│   │   ├── linkTools/      # 链接工具
│   │   └── tooltip/        # 工具提示
│   │
│   ├── renderers/          # 渲染器
│   │   └── index.js        # Snabbdom 渲染
│   │
│   ├── utils/              # 工具函数
│   │   ├── exportHtml.js   # 导出 HTML
│   │   ├── exportMarkdown.js# 导出 Markdown
│   │   └── importMarkdown.js# 导入 Markdown
│   │
│   └── assets/             # 资源文件
│       ├── icons/          # SVG 图标
│       ├── pngicon/        # PNG 图标
│       └── styles/         # 样式
│
├── themes/                 # Muya 主题
│   └── default.css
│
└── package.json            # 独立包配置
```

## 5. 数据流架构

### 5.1 Vuex Store 模块

```javascript
// src/renderer/store/index.js
const store = new Vuex.Store({
  modules: {
    listenForMain, // 监听主进程事件
    autoUpdates, // 自动更新
    notification, // 通知
    tweet, // 分享功能
    project, // 项目管理
    preferences, // 用户偏好
    editor, // 编辑器状态
    layout, // 布局状态
    commandCenter, // 命令中心
  },
});
```

### 5.2 IPC 通信模式

```
Main Process                    Renderer Process
┌──────────────┐               ┌──────────────────┐
│              │  ipcMain.on   │                  │
│   Handlers   │◄──────────────│  ipcRenderer.send│
│              │               │                  │
│              │  webContents  │                  │
│              │  .send()      │                  │
│              │──────────────►│  ipcRenderer.on  │
│              │               │                  │
└──────────────┘               └──────────────────┘
```

常用 IPC 通道前缀：

- `mt::` - MarkText 主进程发送到渲染进程
- `ficus::` - 偏好设置相关
- `AGANI::` - 编辑器/Muya 相关

## 6. 构建与打包

### 6.1 开发环境

```bash
# 安装依赖
yarn install

# 启动开发服务器
yarn dev
```

### 6.2 生产构建

```bash
# 构建当前平台
yarn build

# 仅构建二进制（不打包）
yarn build:bin

# 平台特定构建
yarn release:win    # Windows
yarn release:mac    # macOS
yarn release:linux  # Linux
```

### 6.3 Webpack 配置

- **主进程配置**: `.electron-vue/webpack.main.config.js`
  - 入口: `src/main/index.js`
  - 目标: `electron-main`

- **渲染进程配置**: `.electron-vue/webpack.renderer.config.js`
  - 入口: `src/renderer/main.js`
  - 目标: `electron-renderer`
  - Vue Loader、CSS 处理、SVG Sprite 等

### 6.4 打包配置 (electron-builder.yml)

支持的输出格式：

- **Windows**: NSIS 安装程序、ZIP
- **macOS**: DMG、ZIP (x64 + arm64)
- **Linux**: AppImage、DEB、RPM、tar.gz

## 7. 测试结构

```
test/
├── e2e/                    # E2E 测试 (Playwright)
│   ├── playwright.config.js
│   ├── launch.spec.js      # 启动测试
│   └── xss.spec.js         # XSS 安全测试
│
├── specs/                  # 规范符合性测试
│   ├── commonMark/         # CommonMark 0.30 测试
│   └── gfm/                # GFM 0.29 测试
│
└── unit/                   # 单元测试 (Karma + Mocha)
    ├── karma.conf.js
    └── specs/
        ├── markdown-*.spec.js
        └── extract-word.spec.js
```

## 8. 关键技术实现

### 8.1 Virtual DOM 渲染

Muya 使用 Snabbdom 实现虚拟 DOM，提供高效的编辑器渲染：

```javascript
// 使用 Snabbdom 进行差异化更新
import { h, init, classModule, styleModule, propsModule } from "snabbdom";
```

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

### 9.1 技术栈升级考虑

| 当前版本    | 建议升级          | 原因                   |
| ----------- | ----------------- | ---------------------- |
| Vue 2.6     | Vue 3.x           | Vue 2 已 EOL，性能提升 |
| Electron 18 | Electron 最新 LTS | 安全更新、性能改进     |
| Webpack 5   | Vite              | 更快的开发构建体验     |
| Element UI  | Element Plus      | 适配 Vue 3             |

### 9.2 架构优化方向

1. **TypeScript 迁移**: 提高代码可维护性和类型安全
2. **模块化 Muya**: 将编辑器引擎独立为 npm 包
3. **性能优化**: 大文件编辑、虚拟滚动
4. **插件系统**: 支持用户扩展
5. **协作编辑**: 实时多人协作（CRDT/OT）

### 9.3 功能扩展方向

- 云同步支持
- 更多导出格式（DOCX、LaTeX）
- AI 辅助写作
- 版本历史
- 自定义主题编辑器

## 10. 开发环境要求

- **Node.js**: >=16 且 <17
- **Python**: >=3.6（用于 node-gyp 编译原生模块）
- **C++ 编译工具链**:
  - Windows: Visual Studio 2019
  - macOS: Xcode Command Line Tools
  - Linux: build-essential

## 11. 相关资源

- [GitHub 仓库](https://github.com/marktext/marktext)
- [用户文档](../README.md)
- [构建指南](./BUILD.md)
- [贡献指南](../../CONTRIBUTING.md)
- [更新日志](../../.github/CHANGELOG.md)

---

_文档更新日期: 2026-01-29_
