# 项目结构与架构 (Electron 时代 - 已归档)

> **本文档已归档。** 以下内容描述的是迁移到 Tauri 2.0 之前的 Electron 时代项目结构、架构、数据流和构建配置。当前架构请参考 [ARCHITECTURE.md](../ARCHITECTURE.md) 和 [PROJECT_ANALYSIS.md](../PROJECT_ANALYSIS.md)。

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
    commandCenter // 命令中心
  }
})
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
