# MarkText 编辑器引擎替换报告：Muya → Milkdown

> 生成日期：2026-02-05
> 版本：v3.0（增补本地化方案）
> 状态：评估阶段

---

## 目录

1. [执行摘要](#1-执行摘要)
2. [现状分析：Muya 引擎](#2-现状分析muya-引擎)
3. [目标方案：Milkdown](#3-目标方案milkdown)
4. [功能对照矩阵](#4-功能对照矩阵)
5. [Muya 代码复用分析](#5-muya-代码复用分析)
6. [API 迁移映射](#6-api-迁移映射)
7. [对照编辑模式设计（Split View）](#7-对照编辑模式设计split-view)
8. [引擎冷切换机制](#8-引擎冷切换机制)
9. [国际化方案（i18n）](#9-国际化方案i18n)
10. [风险评估](#10-风险评估)
11. [工程量估算](#11-工程量估算)
12. [迁移策略](#12-迁移策略)
13. [结论与建议](#13-结论与建议)

---

## 1. 执行摘要

### 评估结论

| 维度         | 评估                                                                           |
| ------------ | ------------------------------------------------------------------------------ |
| **可行性**   | 可行，但工程量大                                                               |
| **功能覆盖** | 25 项核心功能中，16 项有官方支持，7 项需自定义开发，1 项需架构变通，1 项不可能 |
| **预估工期** | 4-8 个月（单人全职）                                                           |
| **建议**     | ⚠️ 谨慎推进 — 收益明确但成本高，建议采用并行替换策略                           |

### 核心矛盾

- Milkdown 在**基础架构**上远优于 Muya（TypeScript、ProseMirror、Remark、插件系统）
- 但 MarkText 的**差异化功能**（多种图表、Source Code 模式、Focus/Typewriter 模式）在 Milkdown 生态中**没有现成方案**
- Milkdown 的图表插件（`@milkdown/plugin-diagram`）已被**弃用**，这是最大的风险信号

---

## 2. 现状分析：Muya 引擎

### 2.1 技术规格

| 指标       | 数值                                               |
| ---------- | -------------------------------------------------- |
| 代码量     | ~150+ JS 文件，约 30,000-40,000 行                 |
| 语言       | 纯 JavaScript（ES6+ classes）                      |
| 测试覆盖率 | **0%**                                             |
| 版本       | 0.1.2                                              |
| 渲染引擎   | Snabbdom v3.4.0（虚拟 DOM）                        |
| 解析器     | 自定义 marked.js fork（基于 v0.8.2 + v1.2.5 补丁） |
| 编辑模型   | ContentEditable + 自定义 Block 树                  |
| 技术债标记 | 30+ TODO/FIXME，功能因 bug 被禁用                  |

### 2.2 架构图

```
┌─────────────────────────────────────────────────────────┐
│                      Muya 编辑器                         │
├─────────┬──────────────┬─────────────┬──────────────────┤
│ 解析层  │   文档模型层   │   编辑行为层  │     渲染层       │
│         │              │             │                  │
│ marked  │  Block Tree  │ 28 个控制器  │ Snabbdom VDOM    │
│ fork    │  (无 Schema) │ (prototype  │ + ContentEditable│
│         │              │   混入)     │                  │
├─────────┴──────────────┴─────────────┴──────────────────┤
│                    事件系统 (EventCenter)                 │
├──────────────────────────────────────────────────────────┤
│           UI 插件：13 个浮动工具 (Popper.js)              │
└──────────────────────────────────────────────────────────┘
```

### 2.3 关键问题

1. **无类型安全**：3-4 万行 JS 无 TypeScript
2. **无测试**：0% 覆盖率，重构风险极高
3. **废弃 API**：使用 `document.execCommand`（浏览器已废弃）
4. **维护重 fork**：marked.js 自定义 fork 需持续维护
5. **功能禁用**：代码块行号等功能因性能 bug (#1648) 被禁用
6. **崩溃无恢复**：有崩溃检测但无恢复机制
7. **架构耦合**：28 个控制器通过 prototype 混入共享 `this`，无法单独测试

### 2.4 公开 API 清单

**内容管理（8 个方法）：**

- `getMarkdown()` / `setMarkdown(markdown, cursor, isRenderCursor)`
- `getCursor()` / `setCursor(cursor)`
- `getHistory()` / `setHistory(history)` / `clearHistory()`
- `getWordCount(markdown)`

**编辑操作（10 个方法）：**

- `format(type)` — 内联格式（bold, italic, strikethrough 等）
- `updateParagraph(type)` — 段落类型切换
- `createTable({ rows, columns })` — 创建表格
- `editTable(data)` — 编辑表格
- `insertImage({ src, alt })` — 插入图片
- `insertParagraph(location, text, outMost)` — 插入段落
- `duplicate()` — 复制段落
- `deleteParagraph()` — 删除段落
- `selectAll()` — 全选
- `copyAsMarkdown()` / `copyAsHtml()` / `pasteAsPlainText()`

**搜索替换（3 个方法）：**

- `search(value, opt)` — 搜索，返回匹配数组
- `replace(value, opt)` — 替换
- `find(action)` — 查找上/下一个

**导出（2 个方法）：**

- `exportStyledHTML(options)` — 带样式 HTML（用于 PDF）
- `exportHtml()` — 纯 HTML

**编辑器状态（4 个方法）：**

- `focus()` / `blur()` / `hasFocus()`
- `setFocusMode(bool)`

**样式设置（4 个方法）：**

- `setFont({ fontSize, lineHeight })`
- `setTabSize(tabSize)`
- `setListIndentation(listIndentation)`
- `setOptions(options, needRender)`

**历史（2 个方法）：**

- `undo()` / `redo()`

**工具（5 个方法）：**

- `getTOC()` — 获取目录
- `invalidateImageCache()`
- `hideAllFloatTools()`
- `extractImages(markdown)`
- `_replaceCurrentWordInlineUnsafe(word, replacement)` — 拼写检查用

**生命周期（4 个方法）：**

- `on(event, listener)` / `off(event, listener)` / `once(event, listener)`
- `destroy()`

**事件（7 个）：**

- `change` — 内容变更，payload: `{ markdown, wordCount, cursor, history, toc }`
- `format-click` — 格式元素点击（链接/图片）
- `selectionChange` — 选区变化
- `selectionFormats` — 选区格式状态
- `focus` / `blur` / `crashed`

**配置选项（27 个）：**

- 基础：`fontSize`, `lineHeight`, `focusMode`, `markdown`, `tabSize`
- 列表：`preferLooseListItem`, `bulletListMarker`, `orderListDelimiter`, `listIndentation`
- 自动补全：`autoPairBracket`, `autoPairMarkdownSyntax`, `autoPairQuote`
- 代码块：`codeBlockLineNumbers`, `trimUnnecessaryCodeBlockEmptyLines`
- 主题：`sequenceTheme`, `mermaidTheme`, `vegaTheme`
- 特殊语法：`frontmatterType`, `superSubScript`, `footnote`, `disableHtml`, `isGitlabCompatibilityEnabled`
- UI：`hideQuickInsertHint`, `autoCheck`, `spellcheckEnabled`
- 图片回调：`imageAction`, `imagePathPicker`, `clipboardFilePath`, `imagePathAutoComplete`

**UI 插件（12 个）：**

1. TablePicker — 表格插入选择器
2. QuickInsert — 快速插入菜单
3. CodePicker — 代码块语言选择
4. EmojiPicker — 表情选择
5. ImagePathPicker — 图片路径输入
6. ImageSelector — 图片选择器（含 Unsplash 集成）
7. Transformer — Block 转换工具
8. ImageToolbar — 图片编辑工具栏
9. FormatPicker — 文本格式选择
10. FrontMenu — Front Matter 菜单
11. FootnoteTool — 脚注编辑工具
12. TableBarTools — 表格编辑工具栏

---

## 3. 目标方案：Milkdown

### 3.1 技术规格

| 指标         | 数值                                  |
| ------------ | ------------------------------------- |
| 当前版本     | 7.18.0（2026-01-19）                  |
| 语言         | TypeScript 原生                       |
| 许可证       | MIT                                   |
| 核心依赖     | ProseMirror + Remark (unified) + Y.js |
| 架构         | 插件驱动，依赖注入（Ctx）             |
| GitHub Stars | ~11,000                               |
| npm 周下载量 | ~62,000（preset-commonmark）          |
| 高级包       | `@milkdown/crepe`（电池内置版）       |

### 3.2 架构图

```
┌──────────────────────────────────────────────────────────┐
│                    Milkdown 编辑器                        │
├──────────┬───────────────┬──────────────┬────────────────┤
│  解析层   │   文档模型层    │   编辑行为层  │     渲染层      │
│          │               │             │                │
│ Remark   │ ProseMirror   │ Commands +  │ ProseMirror    │
│ (unified │ Schema        │ InputRules +│ EditorView +   │
│  生态)   │ (强类型约束)   │ Plugins     │ NodeView       │
├──────────┴───────────────┴──────────────┴────────────────┤
│              Ctx 依赖注入 + Timer 异步编排                  │
├──────────────────────────────────────────────────────────┤
│        插件系统：三阶段生命周期 (setup → run → cleanup)      │
└──────────────────────────────────────────────────────────┘
```

### 3.3 Milkdown vs Muya 架构对比

| 维度         | Muya                            | Milkdown                              |
| ------------ | ------------------------------- | ------------------------------------- |
| **文档模型** | 自由 Block 树，无 Schema        | ProseMirror Schema，强类型验证        |
| **解析器**   | marked.js 自定义 fork           | Remark（unified 生态，数百个插件）    |
| **渲染**     | Snabbdom VDOM + ContentEditable | ProseMirror View 直接 DOM 操作        |
| **编辑行为** | 28 个 prototype 混入控制器      | Commands + InputRules + Plugins       |
| **插件系统** | 简单 `use()` 注册，仅 UI 插件   | Ctx 依赖注入 + Timer 编排，全功能插件 |
| **类型安全** | 无                              | TypeScript 原生                       |
| **测试**     | 0%                              | 完整测试套件                          |
| **协作编辑** | 不支持                          | Y.js 集成                             |
| **可扩展性** | 修改 5-8 个文件添加语法         | 单一自包含插件定义                    |

### 3.4 已验证的使用案例

| 项目                         | 类型              | 规模   |
| ---------------------------- | ----------------- | ------ |
| Standard Notes               | 笔记应用（商业）  | 大型   |
| Microsoft Semantic Workbench | AI 原型工具       | 企业级 |
| Oracle LiveSQL               | 在线 SQL 平台     | 企业级 |
| MarginNote                   | 阅读/笔记（商业） | 大型   |
| TagSpaces                    | 文件管理工具      | 中型   |
| Milkdown VSCode              | VSCode 扩展       | 中型   |

> **注意**：目前**没有**与 MarkText 同级别的桌面 WYSIWYG Markdown 编辑器使用 Milkdown。这是一个未经验证的使用场景。

---

## 4. 功能对照矩阵

### 4.1 完整功能映射

| #      | MarkText 功能         | Muya 实现             | Milkdown 方案                           | 状态          | 风险                 |
| ------ | --------------------- | --------------------- | --------------------------------------- | ------------- | -------------------- |
| 1      | CommonMark 语法       | marked.js fork        | `@milkdown/preset-commonmark`           | ✅ 官方       | 无                   |
| 2      | GFM 语法              | marked.js fork        | `@milkdown/preset-gfm`                  | ✅ 官方       | 无                   |
| 3      | GFM 表格              | 自定义实现            | `preset-gfm` + `components/table-block` | ✅ 官方       | 低（无列宽调整）     |
| 4      | 任务列表              | marked.js fork        | `preset-gfm`                            | ✅ 官方       | 无                   |
| 5      | 删除线                | 内联渲染器            | `preset-gfm`                            | ✅ 官方       | 无                   |
| 6      | 脚注                  | 自定义 + FootnoteTool | `preset-gfm` (remark-gfm)               | ✅ 官方       | 低（交互 UI 需自建） |
| 7      | 数学公式 (KaTeX)      | KaTeX 手动集成        | `@milkdown/crepe` latex 功能            | ✅ 官方       | 低                   |
| 8      | 代码语法高亮          | Prism.js              | `@milkdown/crepe` CodeMirror 功能       | ✅ 官方       | 无（升级为 CM6）     |
| 9      | 撤销/重做             | 自定义 History        | `@milkdown/plugin-history`              | ✅ 官方       | 无                   |
| 10     | 剪贴板                | pasteCtrl             | `@milkdown/plugin-clipboard`            | ✅ 官方       | 无                   |
| 11     | 表情符号              | EmojiPicker           | `@milkdown/plugin-emoji`                | ✅ 官方       | 无                   |
| 12     | 斜杠命令              | QuickInsert           | `@milkdown/plugin-slash`                | ✅ 官方       | 低（UI 需自建）      |
| 13     | 格式工具栏            | FormatPicker          | `@milkdown/crepe` toolbar 功能          | ✅ 官方       | 无                   |
| 14     | 链接编辑              | LinkTools             | `@milkdown/crepe` link-tooltip          | ✅ 官方       | 无                   |
| 15     | 图片上传/粘贴         | imageAction 回调      | `@milkdown/plugin-upload`               | ✅ 官方       | 低                   |
| 16     | Vue 3 集成            | 无官方支持            | `@milkdown/vue`                         | ✅ 官方       | 无                   |
| **17** | **Mermaid 图表**      | mermaid.js 集成       | ~~`plugin-diagram`~~ **已弃用**         | ⚠️ 需自建     | **高**               |
| **18** | **搜索替换**          | search/replace/find   | 无官方插件                              | ⚠️ 需自建     | **高**               |
| **19** | **Front Matter**      | frontmatterType 配置  | 无官方插件                              | ⚠️ 需自建     | **中**               |
| **20** | **目录生成 (TOC)**    | getTOC()              | 无官方插件                              | ⚠️ 需自建     | **中**               |
| **21** | **Focus 模式**        | setFocusMode()        | 无官方插件                              | ⚠️ 需自建     | **中**               |
| **22** | **Typewriter 模式**   | selectionChange 事件  | 无官方插件                              | ⚠️ 需自建     | **中**               |
| **23** | **Source Code 模式**  | 源码/所见即所得切换   | 无支持（WYSIWYG only）                  | ⚠️ 需架构变通 | **高**               |
| **24** | **Flowchart.js 图表** | flowchart.js 集成     | 无插件                                  | ⚠️ 需自建     | **高**               |
| **25** | **Vega-Lite 图表**    | vega-embed 集成       | 无插件                                  | ⚠️ 需自建     | **高**               |
| **26** | **Sequence 图表**     | snap.svg 自定义渲染   | 无插件                                  | ⚠️ 需自建     | **高**               |
| **27** | **PlantUML 图表**     | 代码块特殊处理        | 无插件                                  | ⚠️ 需自建     | **高**               |
| **28** | **HTML 导出**         | exportStyledHTML()    | transformer + remark-rehype 流水线      | ⚠️ 需组装     | **中**               |
| **29** | **上标/下标**         | superSubScript 选项   | 无官方插件                              | ⚠️ 需自建     | **低**               |
| **30** | **拼写检查**          | spellcheckEnabled     | 浏览器原生 / 需自定义                   | ⚠️ 需适配     | **低**               |
| 31     | 图片大小调整          | ImageToolbar          | 无官方支持                              | ⚠️ 需自建     | **中**               |
| 32     | Unsplash 集成         | ImageSelector         | 完全自定义                              | ⚠️ 需自建     | **低**               |
| 33     | 协作编辑（新功能）    | 不支持                | `@milkdown/plugin-collab`               | ✅ 官方       | 无                   |

### 4.2 统计汇总

| 类别                    | 数量   | 功能                                                                                                                                     |
| ----------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ 官方支持，可直接使用 | **16** | CommonMark, GFM, 表格, 任务列表, 删除线, 脚注, 数学, 代码高亮, 撤销重做, 剪贴板, 表情, 斜杠命令, 工具栏, 链接, 图片上传, Vue 3           |
| ⚠️ 需自定义插件开发     | **14** | Mermaid, 搜索替换, Front Matter, TOC, Focus 模式, Typewriter, Flowchart, Vega, Sequence, PlantUML, HTML 导出, 上下标, 图片调整, Unsplash |
| ❌ 需架构级变通         | **1**  | Source Code 模式                                                                                                                         |
| ❌ 不可能实现           | **0**  | （多光标编辑 Muya 也不支持，不计入）                                                                                                     |

---

## 5. Muya 代码复用分析

Muya 中需要自定义开发的功能，很多核心逻辑可以提取复用，不必从零编写。以下是逐项分析。

### 5.1 复用总览

| 组件             | 文件数 | 代码行数 | 与 Muya 耦合度 | 可复用比例 | 提取难度 |
| ---------------- | ------ | -------- | -------------- | ---------- | -------- |
| **图表渲染器**   | 7      | ~800     | 高             | ~40%       | 中       |
| **搜索替换**     | 1      | ~158     | 高             | ~70%       | 中       |
| **HTML 导出**    | 1      | ~401     | 中             | ~80%       | 低       |
| **图片处理**     | 7      | ~1,300   | 高             | ~50%       | 中       |
| **Front Matter** | 5      | ~200     | 高             | ~60%       | 中       |
| **Focus 模式**   | 2      | ~30      | **低**         | ~90%       | **低**   |

### 5.2 图表渲染器（可复用 ~40%）

**涉及文件：**

- `src/muya/lib/contentState/codeBlockCtrl.js` (~174 行)
- `src/muya/lib/parser/render/index.js` (~262 行) — `renderMermaid()`, `renderDiagram()`
- `src/muya/lib/parser/render/plantuml.js` (~59 行)
- `src/muya/lib/parser/render/sequence.js` (~6 行)
- `src/muya/lib/renderers/index.js` (~39 行)
- `src/muya/lib/utils/exportHtml.js` (第 36-116 行)

**可直接复用的部分：**

- 渲染器动态加载机制（`renderers/index.js`）— 按需加载 Mermaid/Flowchart/Vega
- PlantUML 编码算法（`plantuml.js`）— 将代码编码为 PlantUML URL
- 图表类型检测逻辑 — 代码块语言 → 图表类型映射
- 缓存策略 — `mermaidCache`, `diagramCache` 模式
- 导出时的图表渲染 — HTML 导出中的异步图表渲染

**需要重写的部分：**

- Block 树遍历 → 替换为 ProseMirror NodeView
- Snabbdom DOM 更新 → 替换为 ProseMirror nodeView `update()`
- ContentState 方法调用 → 替换为 Milkdown 事务

**迁移策略：** 提取渲染器为独立模块 `shared/renderers/`，接受 `{ code: string, language: string, container: HTMLElement, theme: string }` 参数，与编辑器引擎解耦。

```typescript
// shared/renderers/diagram.ts — 引擎无关的图表渲染
export interface DiagramRenderer {
  render(code: string, container: HTMLElement, options?: DiagramOptions): Promise<void>
  clearCache(): void
}

export const mermaidRenderer: DiagramRenderer = {
  /* 从 Muya 提取 */
}
export const flowchartRenderer: DiagramRenderer = {
  /* 从 Muya 提取 */
}
export const vegaRenderer: DiagramRenderer = {
  /* 从 Muya 提取 */
}
export const plantumlRenderer: DiagramRenderer = {
  /* 从 Muya 提取 */
}
```

### 5.3 搜索替换（可复用 ~70%）

**涉及文件：**

- `src/muya/lib/contentState/searchCtrl.js` (~158 行)

**可直接复用的部分：**

- `matchString()` — 正则/大小写敏感/全词匹配逻辑
- `buildRegexValue()` — 替换时支持捕获组（`$1`, `$2`）
- 搜索选项结构 — `{ isCaseSensitive, isWholeWord, isRegexp }`

**需要重写的部分：**

- Block 树遍历 → 替换为 ProseMirror 文档遍历
- 高亮存储 → 替换为 ProseMirror Decoration
- 文本更新 → 替换为 ProseMirror Transaction

**迁移策略：** 提取匹配算法为 `shared/search/matchEngine.ts`，搜索遍历和高亮由各引擎各自实现。

### 5.4 HTML 导出（可复用 ~80%）

**涉及文件：**

- `src/muya/lib/utils/exportHtml.js` (~401 行)

**可直接复用的部分：**

- HTML 结构生成 — 完整的 HTML 模板
- CSS 内联 — GitHub markdown CSS、Prism、KaTeX 样式
- 页眉/页脚 — Table 布局，左/中/右配置
- DOMPurify 净化 — 安全过滤
- TOC HTML 生成 — `tocRenderer()` 回调

**需要重写的部分：**

- `marked` 解析调用 → 替换为 `remark-rehype` + `rehype-stringify`
- Muya options 读取 → 替换为独立配置对象

**迁移策略：** 这是最适合直接迁移的模块。提取为 `shared/export/htmlExporter.ts`，仅替换 Markdown→HTML 转换管道。

### 5.5 图片处理（可复用 ~50%）

**涉及文件：**

- `src/muya/lib/ui/imageSelector/index.js` (~509 行) — Unsplash 集成
- `src/muya/lib/ui/imageToolbar/index.js` (~143 行)
- `src/muya/lib/ui/transformer/index.js` (~177 行) — 调整大小
- `src/muya/lib/utils/getImageInfo.js` (~36 行)

**可直接复用的部分：**

- Unsplash API 调用逻辑 — 搜索、浏览、下载追踪
- 图片路径解析 — 相对/绝对路径、`file://` 协议
- 调整大小计算逻辑 — 拖拽角点 → 新宽度计算

**需要重写的部分：**

- 整个 UI 层（Snabbdom → Vue 3 组件或 ProseMirror NodeView）
- 事件处理（`eventCenter` → ProseMirror 插件事件）

### 5.6 Focus 模式（可复用 ~90%）

**涉及文件：**

- `src/muya/lib/index.js` (第 199-208 行)
- `src/muya/lib/assets/styles/index.css` (第 1104-1130 行)

**几乎完全可复用：** Focus 模式本质是 CSS 效果：

```css
/* 非活动段落变暗 */
.ag-focus-mode .ag-paragraph:not(.ag-active) {
  opacity: 0.25;
}
.ag-focus-mode .ag-active {
  opacity: 1;
}
```

对 Milkdown 只需：

1. 用 ProseMirror Decoration 给活动段落加 class
2. 复用相同的 CSS 规则（调整选择器前缀）

---

## 6. API 迁移映射

### 6.1 编辑器初始化

**Muya（当前）：**

```javascript
import Muya from '../../../muya/lib'
Muya.use(TablePicker)
// ... 13 个插件
const editor = new Muya(element, { fontSize: 16, markdown: '' /* 28 个选项 */ })
```

**Milkdown（目标）：**

```typescript
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { history } from '@milkdown/plugin-history'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { useEditor } from '@milkdown/vue'

const { get } = useEditor(root =>
  Editor.make()
    .config(ctx => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, markdown)
      ctx.get(listenerCtx).markdownUpdated((ctx, md) => {
        /* change */
      })
    })
    .use(commonmark)
    .use(gfm)
    .use(history)
    .use(listener)
)
```

### 6.2 核心方法映射

| Muya 方法            | Milkdown 等价方式                             | 说明                 |
| -------------------- | --------------------------------------------- | -------------------- |
| `getMarkdown()`      | `editor.action(getMarkdown())`                | `@milkdown/utils`    |
| `setMarkdown(md)`    | `editor.action(replaceAll(md))`               | 替换全部内容         |
| `undo()` / `redo()`  | `editor.action(callCommand(undoCommand.key))` | 命令系统             |
| `focus()`            | `ctx.get(editorViewCtx).focus()`              | ProseMirror view     |
| `format('strong')`   | `callCommand(toggleStrongCommand.key)`        | 每种格式一个命令     |
| `createTable(spec)`  | `callCommand(insertTableCommand.key, spec)`   | GFM 命令             |
| `insertImage(info)`  | `callCommand(insertImageCommand.key, info)`   | CommonMark 命令      |
| `search(value, opt)` | **自定义插件**                                | 复用 Muya 匹配算法   |
| `exportStyledHTML()` | **自定义流水线**                              | 复用 Muya 导出模板   |
| `getTOC()`           | **自定义插件**                                | 遍历 ProseMirror doc |
| `setFocusMode(bool)` | **自定义插件**                                | 复用 Muya CSS        |
| `on('change', cb)`   | `listenerCtx.markdownUpdated(cb)`             | 监听器插件           |
| `destroy()`          | `editor.destroy()`                            | 原生支持             |

### 6.3 配置项映射

| Muya 配置                 | Milkdown 映射方式                                   |
| ------------------------- | --------------------------------------------------- |
| `fontSize` / `lineHeight` | CSS 变量 `--mk-font-size`, `--mk-line-height`       |
| `focusMode`               | 自定义 ProseMirror Decoration 插件（复用 Muya CSS） |
| `tabSize`                 | CodeMirror 6 `EditorState.tabSize`                  |
| `bulletListMarker`        | `remarkStringifyOptions.bullet`                     |
| `orderListDelimiter`      | `remarkStringifyOptions.bulletOrdered`              |
| `autoPairBracket`         | ProseMirror InputRule                               |
| `frontmatterType`         | 自定义 frontmatter 插件配置                         |
| `mermaidTheme`            | 图表渲染器配置（复用 Muya 渲染器）                  |
| `spellcheckEnabled`       | DOM `spellcheck` 属性                               |
| `imageAction`             | `@milkdown/plugin-upload` uploader                  |
| `codeBlockLineNumbers`    | CodeMirror 6 `lineNumbers()` 扩展                   |

---

## 7. 对照编辑模式设计（Split View）

类似 JetBrains IDE 的 Markdown 编辑器，支持左侧源码 + 右侧可编辑预览。

### 7.1 三种编辑模式

| 模式         | 左面板（源码）     | 右面板（预览）       | 行为               | 快捷键   |
| ------------ | ------------------ | -------------------- | ------------------ | -------- |
| **预览模式** | 隐藏               | 全宽，WYSIWYG 可编辑 | 当前 MarkText 默认 | `Ctrl+1` |
| **对照模式** | 可见，CodeMirror 6 | 可见，WYSIWYG 可编辑 | 双向同步           | `Ctrl+2` |
| **源码模式** | 全宽，CodeMirror 6 | 隐藏                 | 纯 Markdown 编辑   | `Ctrl+3` |

### 7.2 架构设计

```
┌──────────────────────────────────────────────────────────────┐
│                     SplitEditor.vue                          │
├─────────────────────┬──┬─────────────────────────────────────┤
│   Source Pane       │分│   Preview Pane                      │
│   (CodeMirror 6)    │隔│   (Milkdown / ProseMirror)          │
│                     │栏│                                     │
│  ┌───────────────┐  │可│  ┌──────────────────────────────┐   │
│  │ EditorView    │  │拖│  │ Milkdown Editor               │   │
│  │ - markdown    │  │拽│  │ - WYSIWYG                    │   │
│  │ - lang-markdown│ │  │  │ - 图表/数学/表格渲染          │   │
│  │ - line numbers│  │  │  │ - 格式工具栏                  │   │
│  └───────┬───────┘  │  │  └──────────┬───────────────────┘   │
│          │          │  │             │                        │
├──────────┴──────────┴──┴─────────────┴────────────────────────┤
│                    SyncEngine                                 │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────────┐     │
│  │ 内容同步    │  │ 滚动同步      │  │ 光标位置映射       │     │
│  │ (debounce  │  │ (line map +  │  │ (source line →    │     │
│  │  + diff)   │  │  interpolate)│  │  DOM element)     │     │
│  └────────────┘  └──────────────┘  └───────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

### 7.3 双向内容同步

**核心原则：** 同一时刻只有一个面板是"活动的"（有焦点），同步方向始终是 活动面板 → 非活动面板。

```typescript
class SplitSyncEngine {
  private activePane: 'source' | 'preview' | null = null
  private syncTimer: number | null = null
  private isSyncing = false
  private lastMarkdown = ''

  // CodeMirror 内容变化时触发
  onSourceChange(newContent: string) {
    if (this.isSyncing) return // 防止回声循环
    this.activePane = 'source'
    this.debouncedSync(newContent, 'source')
  }

  // ProseMirror 内容变化时触发
  onPreviewChange(ctx: Ctx) {
    if (this.isSyncing) return
    this.activePane = 'preview'
    const md = ctx.get(serializerCtx)(ctx.get(editorViewCtx).state.doc)
    this.debouncedSync(md, 'preview')
  }

  private debouncedSync(markdown: string, source: 'source' | 'preview') {
    if (this.syncTimer) clearTimeout(this.syncTimer)
    this.syncTimer = setTimeout(() => this.performSync(markdown, source), 150)
  }

  private performSync(markdown: string, source: 'source' | 'preview') {
    if (markdown === this.lastMarkdown) return
    this.isSyncing = true
    this.lastMarkdown = markdown
    try {
      if (source === 'source') {
        // Markdown → ProseMirror：解析并替换预览内容
        const doc = ctx.get(parserCtx)(markdown)
        const view = ctx.get(editorViewCtx)
        const tr = view.state.tr.replace(
          0,
          view.state.doc.content.size,
          new Slice(doc.content, 0, 0)
        )
        tr.setMeta('addToHistory', false)
        tr.setMeta('splitSync', true) // 标记防止回声
        view.dispatch(tr)
      } else {
        // ProseMirror → CodeMirror：diff 差异更新，保持光标
        const oldContent = this.cmView.state.doc.toString()
        const changes = computeMinimalChanges(oldContent, markdown)
        this.cmView.dispatch({
          changes,
          annotations: [splitSyncAnnotation.of(true)]
        })
      }
    } finally {
      this.isSyncing = false
    }
  }
}
```

**防回声循环三重保护：**

1. `isSyncing` 标志 — 同步过程中忽略变更事件
2. 事务元数据 — `tr.setMeta('splitSync', true)` / `splitSyncAnnotation`
3. 内容比较 — `markdown === lastMarkdown` 跳过无变化同步

**Diff 更新保护光标：** 更新 CodeMirror 时不替换整个文档，而是计算最小差异：

```typescript
import { diffChars } from 'diff'

function computeMinimalChanges(oldText: string, newText: string): ChangeSpec[] {
  const changes: ChangeSpec[] = []
  const diffs = diffChars(oldText, newText)
  let pos = 0
  for (const part of diffs) {
    if (part.removed) {
      changes.push({ from: pos, to: pos + part.value.length })
      pos += part.value.length
    } else if (part.added) {
      changes.push({ from: pos, to: pos, insert: part.value })
    } else {
      pos += part.value.length
    }
  }
  return changes
}
```

### 7.4 滚动同步

使用 **source line 映射** 实现双面板滚动联动：

**Step 1：给预览 DOM 注入 source line 信息**

自定义 Remark 插件在解析时给 AST 节点附加源码行号：

```typescript
// remarkSourceLines.ts
import { visit } from 'unist-util-visit'

export function remarkSourceLines() {
  return (tree: Root) => {
    visit(tree, node => {
      if (node.position) {
        if (!node.data) node.data = {}
        node.data.hProperties = {
          'data-source-line': node.position.start.line,
          'data-source-end-line': node.position.end.line
        }
      }
    })
  }
}
```

**Step 2：构建行号映射表**

```typescript
interface LineMapping {
  sourceLine: number
  domElement: HTMLElement
  domOffsetTop: number
}

function buildScrollMap(previewContainer: HTMLElement): LineMapping[] {
  return Array.from(previewContainer.querySelectorAll('[data-source-line]'))
    .map(el => ({
      sourceLine: parseInt(el.getAttribute('data-source-line')!),
      domElement: el as HTMLElement,
      domOffsetTop: (el as HTMLElement).offsetTop
    }))
    .sort((a, b) => a.sourceLine - b.sourceLine)
}
```

**Step 3：线性插值滚动同步**

```typescript
// 源码面板滚动 → 同步预览面板
onEditorScroll(cmView) {
  const topLine = cmView.state.doc.lineAt(
    cmView.lineBlockAtHeight(cmView.scrollDOM.scrollTop).from
  ).number
  const previewOffset = interpolateOffset(this.scrollMap, topLine)
  this.previewContainer.scrollTo({ top: previewOffset, behavior: 'smooth' })
}
```

### 7.5 中文输入法 (IME) 兼容

**关键：** 在 IME 组合输入期间暂停同步：

```typescript
let isComposing = false
cmView.dom.addEventListener('compositionstart', () => {
  isComposing = true
})
cmView.dom.addEventListener('compositionend', () => {
  isComposing = false
  // 组合结束后触发一次同步
  syncEngine.onSourceChange(cmView.state.doc.toString())
})
```

### 7.6 性能目标

| 指标             | 目标           | 可接受         |
| ---------------- | -------------- | -------------- |
| 按键到预览延迟   | < 200ms        | < 500ms        |
| 滚动同步延迟     | < 16ms (60fps) | < 33ms (30fps) |
| 额外内存开销     | < 50MB         | < 100MB        |
| 万行文档初始渲染 | < 1s           | < 2s           |

### 7.7 参考实现

- `@milkdown-lab/plugin-split-editing`（已归档，~280 行源码，作为参考而非直接使用）
- Joplin 的滚动同步算法（行号百分比中间表示）
- JetBrains Markdown 插件的 Split View 交互设计

---

## 8. 引擎冷切换机制

### 8.1 切换方式

支持两种方式，均为**冷切换**（需重启应用生效）：

**方式一：启动参数**

```bash
# 使用 Milkdown 引擎启动
marktext --editor-engine=milkdown

# 使用 Muya 引擎启动（默认）
marktext --editor-engine=muya
```

**方式二：设置界面**

在 `Preferences > General > Editor Engine` 中添加下拉选择：

```
Editor Engine: [Muya (Legacy)] / [Milkdown (Experimental)]
⚠️ Changing editor engine requires restart.
```

### 8.2 实现架构

```
启动流程:
┌──────────┐    ┌──────────────┐    ┌─────────────────┐
│ 读取配置  │───►│ 解析启动参数  │───►│ 确定引擎类型     │
│ preference│    │ --editor-    │    │ 'muya'|'milkdown'│
│ .json     │    │ engine=xxx   │    │ (参数优先于设置)  │
└──────────┘    └──────────────┘    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │ 注入 engineType  │
                                    │ 到 Pinia store   │
                                    └────────┬────────┘
                                             │
                              ┌──────────────┴──────────────┐
                              │                              │
                     ┌────────▼────────┐          ┌─────────▼─────────┐
                     │  MuyaAdapter    │          │ MilkdownAdapter   │
                     │  implements     │          │ implements        │
                     │  IEditorEngine  │          │ IEditorEngine     │
                     └─────────────────┘          └───────────────────┘
```

### 8.3 配置存储

在 `static/preference.json` 中新增：

```json
{
  "editorEngine": {
    "description": "Editor engine to use. Requires restart.",
    "type": "string",
    "enum": ["muya", "milkdown"],
    "default": "muya"
  }
}
```

### 8.4 启动参数解析

```typescript
// src/main/cli.ts（Tauri 主进程）
import { getMatches } from '@tauri-apps/plugin-cli'

export async function parseEditorEngine(): Promise<'muya' | 'milkdown'> {
  try {
    const matches = await getMatches()
    const engine = matches.args['editor-engine']?.value as string
    if (engine === 'milkdown') return 'milkdown'
  } catch {}

  // 回退到用户设置
  const prefs = loadPreferences()
  return prefs.editorEngine || 'muya'
}
```

### 8.5 编辑器工厂

```typescript
// src/renderer/editor/factory.ts
import type { IEditorEngine } from './interface'

export function createEditorEngine(type: 'muya' | 'milkdown'): IEditorEngine {
  if (type === 'milkdown') {
    const { MilkdownAdapter } = await import('./milkdown/adapter')
    return new MilkdownAdapter()
  } else {
    const { MuyaAdapter } = await import('./muya/adapter')
    return new MuyaAdapter()
  }
}
```

### 8.6 editor.vue 改造

```vue
<template>
  <div ref="editorContainer" class="editor-container">
    <!-- 引擎由工厂动态创建，挂载到此容器 -->
  </div>
</template>

<script>
import { createEditorEngine } from '@/editor/factory'
import { useAppStore } from '@/stores/app'

export default {
  setup() {
    const appStore = useAppStore()
    return { engineType: appStore.editorEngine }
  },
  mounted() {
    // 根据配置创建对应引擎
    this.engine = createEditorEngine(this.engineType)
    this.engine.mount(this.$refs.editorContainer, this.editorOptions)

    // 统一事件绑定 — 无论哪个引擎，接口一致
    this.engine.on('change', this.handleChange)
    this.engine.on('selectionChange', this.handleSelectionChange)
    this.engine.on('selectionFormats', this.handleSelectionFormats)
  },
  beforeUnmount() {
    this.engine.destroy()
  }
}
</script>
```

---

## 9. 国际化方案（i18n）

> **优先级：高** — i18n 应在编辑器迁移**之前或同步**进行，因为提取硬编码字符串是一次性工程，越早做越能避免后续重复工作。

### 9.1 现状评估

**当前状态：零 i18n 支持**

| 维度         | 现状                                                         |
| ------------ | ------------------------------------------------------------ |
| i18n 库      | 无（package.json 无 vue-i18n 等依赖）                        |
| 翻译文件     | 无（无 locale/\*.json）                                      |
| 语言设置     | 存在但**被禁用**（`general/index.vue` 中 `:disable="true"`） |
| 硬编码字符串 | ~60+ 个文件，~325+ 个用户可见字符串                          |

**硬编码字符串分布：**

| 区域                  | 文件数   | 字符串数  | 语言层 |
| --------------------- | -------- | --------- | ------ |
| 原生菜单（`menu.rs`） | 1        | ~50       | Rust   |
| 偏好设置组件          | ~15      | ~100+     | Vue    |
| Muya UI 配置          | ~8       | ~50+      | JS     |
| Vue 组件              | ~20      | ~30+      | Vue    |
| 上下文菜单            | ~2       | ~15       | JS     |
| Store 通知/错误       | ~5       | ~20+      | TS     |
| Tauri 对话框          | ~3       | ~10+      | Rust   |
| 配置定义文件          | ~10      | ~50+      | JS     |
| **合计**              | **~60+** | **~325+** |        |

### 9.2 技术方案

#### 前端：vue-i18n v10

```typescript
// src/renderer/i18n/index.ts
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'

type MessageSchema = typeof en

const i18n = createI18n<[MessageSchema], 'en' | 'zh-CN'>({
  legacy: true, // 兼容 Options API（当前全部组件）
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en },
  missingWarn: import.meta.env.DEV,
  fallbackWarn: import.meta.env.DEV
})

export default i18n
```

**为什么选择 `legacy: true`：** 当前组件全部是 Options API，`legacy: true` 让每个组件自动获得 `this.$t('key')`。未来迁移到 Composition API 后改为 `false` + `useI18n()`。

**懒加载非默认语言：**

```typescript
// src/renderer/i18n/loader.ts
const loaded: string[] = ['en']

export async function loadLocale(i18n: I18n, locale: string) {
  if (loaded.includes(locale)) {
    i18n.global.locale = locale
    return
  }
  const messages = await import(`@/locales/${locale}.json`)
  i18n.global.setLocaleMessage(locale, messages.default)
  loaded.push(locale)
  i18n.global.locale = locale
}
```

#### 后端（Tauri Rust 侧）：共享 JSON + include_str!

前后端共享同一套 locale JSON 文件，Rust 通过 `include_str!` 编译时嵌入：

```rust
// src-tauri/src/i18n.rs
use serde_json::Value;
use std::collections::HashMap;

const EN: &str = include_str!("../../src/locales/en.json");
const ZH_CN: &str = include_str!("../../src/locales/zh-CN.json");

pub struct I18n {
    messages: HashMap<String, Value>,
}

impl I18n {
    pub fn new(locale: &str) -> Self {
        let json = match locale {
            "zh-CN" | "zh-Hans" | "zh" => ZH_CN,
            _ => EN,
        };
        let messages: HashMap<String, Value> =
            serde_json::from_str(json).expect("Failed to parse locale");
        Self { messages }
    }

    pub fn t(&self, key: &str) -> String {
        self.messages.get(key)
            .and_then(|v| v.as_str())
            .unwrap_or(key)
            .to_string()
    }
}
```

菜单使用方式：

```rust
// src-tauri/src/menu.rs
let file_menu = SubmenuBuilder::new(handle, &i18n.t("menu.file"))
    .items(&[
        &MenuItemBuilder::with_id("file.new-tab", &i18n.t("menu.file.newTab"))
            .accelerator("CmdOrCtrl+N")
            .build(handle)?,
    ])
    .build()?;
```

#### 系统语言检测

```rust
// 启动时自动检测
let system_locale = tauri_plugin_os::locale()
    .unwrap_or_else(|| "en".to_string());
let user_pref = load_user_preference("language");
let locale = user_pref.unwrap_or(normalize_locale(&system_locale));
let i18n = I18n::new(&locale);
```

### 9.3 翻译文件结构

**使用扁平 key 格式**（dot notation），不使用嵌套对象：

```
src/
├── locales/
│   ├── en.json              ← 主语言 / 源文件（~400-600 个 key）
│   ├── zh-CN.json           ← 简体中文
│   └── _meta.json           ← 语言元数据
```

**理由：**

- Grep 友好 — 可以全局搜索 `"menu.file.save"`
- `rust-i18n` 兼容 — Rust 侧可直接读取
- `i18n-ally` 兼容 — IDE 扩展完美支持
- 翻译者友好 — 无嵌套混淆

**示例 `en.json`（节选）：**

```json
{
  "_locale": "en",
  "_name": "English",
  "_direction": "ltr",

  "common.ok": "OK",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.close": "Close",
  "common.delete": "Delete",
  "common.rename": "Rename",
  "common.copy": "Copy",
  "common.cut": "Cut",
  "common.paste": "Paste",

  "menu.file": "File",
  "menu.file.newTab": "New Tab",
  "menu.file.newWindow": "New Window",
  "menu.file.openFile": "Open File",
  "menu.file.openFolder": "Open Folder",
  "menu.file.save": "Save",
  "menu.file.saveAs": "Save As...",
  "menu.file.preferences": "Preferences...",

  "menu.edit": "Edit",
  "menu.edit.undo": "Undo",
  "menu.edit.redo": "Redo",
  "menu.edit.find": "Find",
  "menu.edit.replace": "Replace",

  "menu.paragraph": "Paragraph",
  "menu.paragraph.heading1": "Heading 1",

  "menu.format": "Format",
  "menu.format.bold": "Bold",
  "menu.format.italic": "Italic",

  "menu.view": "View",
  "menu.view.sourceCode": "Source Code Mode",
  "menu.view.splitView": "Split View",
  "menu.view.toggleSidebar": "Toggle Sidebar",

  "menu.help": "Help",
  "menu.help.about": "About MarkText",

  "titleBar.words": "Words",
  "titleBar.characters": "Characters",

  "sidebar.newFile": "New File",
  "sidebar.openFolder": "Open Folder",
  "sidebar.emptyProject": "Empty project",

  "settings.general": "General",
  "settings.general.language": "User interface language",
  "settings.general.autoSave": "Auto Save",
  "settings.general.restartRequired": "Requires restart to take effect.",
  "settings.editor": "Editor",
  "settings.editor.fontSize": "Font size",
  "settings.markdown": "Markdown",
  "settings.theme": "Theme",
  "settings.keybindings": "Key Bindings",

  "editor.formatBold": "Bold",
  "editor.formatItalic": "Italic",
  "editor.quickInsert.paragraph": "Paragraph",
  "editor.quickInsert.table": "Table Block",
  "editor.quickInsert.codeBlock": "Code Block",
  "editor.quickInsert.mathBlock": "Display Math",

  "editor.search.placeholder": "Search",
  "editor.search.replacePlaceholder": "Replace",
  "editor.search.matchCase": "Match Case",
  "editor.search.wholeWord": "Whole Word",
  "editor.search.regex": "Regular Expression",

  "dialog.unsavedChanges": "Do you want to save the changes you made?",
  "dialog.unsavedMultiple": "You have {count} unsaved files.",

  "notification.updateAvailable": "Update Available",
  "notification.updateDownloaded": "Update Downloaded",
  "notification.saveFailure": "Save failure"
}
```

**示例 `zh-CN.json`（节选）：**

```json
{
  "_locale": "zh-CN",
  "_name": "简体中文",
  "_direction": "ltr",

  "common.ok": "确定",
  "common.cancel": "取消",
  "common.save": "保存",
  "common.close": "关闭",
  "common.delete": "删除",
  "common.rename": "重命名",
  "common.copy": "复制",
  "common.cut": "剪切",
  "common.paste": "粘贴",

  "menu.file": "文件",
  "menu.file.newTab": "新建标签页",
  "menu.file.newWindow": "新建窗口",
  "menu.file.openFile": "打开文件",
  "menu.file.openFolder": "打开文件夹",
  "menu.file.save": "保存",
  "menu.file.saveAs": "另存为...",
  "menu.file.preferences": "偏好设置...",

  "menu.edit": "编辑",
  "menu.edit.undo": "撤销",
  "menu.edit.redo": "重做",
  "menu.edit.find": "查找",
  "menu.edit.replace": "替换",

  "menu.paragraph": "段落",
  "menu.paragraph.heading1": "一级标题",

  "menu.format": "格式",
  "menu.format.bold": "加粗",
  "menu.format.italic": "斜体",

  "menu.view": "视图",
  "menu.view.sourceCode": "源代码模式",
  "menu.view.splitView": "对照视图",
  "menu.view.toggleSidebar": "切换侧边栏",

  "menu.help": "帮助",
  "menu.help.about": "关于 MarkText",

  "titleBar.words": "字数",
  "titleBar.characters": "字符",

  "sidebar.newFile": "新建文件",
  "sidebar.openFolder": "打开文件夹",
  "sidebar.emptyProject": "空项目",

  "settings.general": "通用",
  "settings.general.language": "界面语言",
  "settings.general.autoSave": "自动保存",
  "settings.general.restartRequired": "需要重启生效。",
  "settings.editor": "编辑器",
  "settings.editor.fontSize": "字体大小",
  "settings.markdown": "Markdown",
  "settings.theme": "主题",
  "settings.keybindings": "快捷键",

  "editor.formatBold": "加粗",
  "editor.formatItalic": "斜体",
  "editor.quickInsert.paragraph": "段落",
  "editor.quickInsert.table": "表格",
  "editor.quickInsert.codeBlock": "代码块",
  "editor.quickInsert.mathBlock": "数学公式",

  "editor.search.placeholder": "搜索",
  "editor.search.replacePlaceholder": "替换",
  "editor.search.matchCase": "区分大小写",
  "editor.search.wholeWord": "全字匹配",
  "editor.search.regex": "正则表达式",

  "dialog.unsavedChanges": "是否保存所做的更改？",
  "dialog.unsavedMultiple": "有 {count} 个未保存的文件。",

  "notification.updateAvailable": "有可用更新",
  "notification.updateDownloaded": "更新已下载",
  "notification.saveFailure": "保存失败"
}
```

**语言元数据 `_meta.json`：**

```json
{
  "languages": [
    {
      "code": "en",
      "name": "English",
      "nativeName": "English",
      "direction": "ltr",
      "progress": 100
    },
    {
      "code": "zh-CN",
      "name": "Chinese Simplified",
      "nativeName": "简体中文",
      "direction": "ltr",
      "progress": 100
    }
  ]
}
```

### 9.4 语言切换策略

| 层                 | 切换方式     | 说明                                                  |
| ------------------ | ------------ | ----------------------------------------------------- |
| Vue 组件           | **即时生效** | `i18n.global.locale` 是响应式的，所有 `$t()` 自动更新 |
| 原生菜单           | **需重启**   | Tauri 菜单不可响应式更新，需重建                      |
| 上下文菜单         | **即时生效** | JS 动态创建，下次打开时读取新 locale                  |
| Milkdown 编辑器 UI | **即时生效** | 通过 Crepe/plugin 配置注入翻译字符串                  |
| Muya 编辑器 UI     | **需重启**   | 配置在初始化时固定                                    |

**用户体验流程：**

```
用户在设置中切换语言
  → Vue 界面立即更新（设置面板、侧边栏、工具栏等）
  → 显示提示："原生菜单将在重启后更新"
  → 下次启动时，Rust 侧读取新 locale，重建菜单
```

### 9.5 Milkdown 编辑器 i18n

Milkdown 本身**没有内置 i18n 支持**，但可以通过配置注入翻译字符串：

```typescript
// 工具栏标签
crepe.setFeature('toolbar', {
  items: [
    { label: t('editor.formatBold'), icon: 'bold', command: toggleBold },
    { label: t('editor.formatItalic'), icon: 'italic', command: toggleItalic },
  ]
})

// 斜杠命令菜单
crepe.setFeature('slash', {
  items: [
    { label: t('editor.quickInsert.paragraph'), ... },
    { label: t('editor.quickInsert.table'), ... },
  ]
})

// placeholder 文本
crepe.setFeature('placeholder', {
  text: t('editor.placeholder')
})
```

### 9.6 添加新语言的流程

为社区贡献者设计的简单流程：

```
1. 复制 src/locales/en.json → src/locales/{locale}.json
2. 翻译所有值（保持 key 不变）
3. 更新 src/locales/_meta.json 添加新语言
4. 提交 PR

无需修改任何代码文件 — 懒加载自动发现新 locale 文件。
```

**未来可接入社区翻译平台：**

- Crowdin（开源项目免费）
- Weblate（自托管，开源）
- Transifex（VS Code 使用）

### 9.7 开发工具

**i18n-ally（Cursor / VS Code 扩展）：**

`.cursor/settings.json` 中添加：

```json
{
  "i18n-ally.localesPaths": ["src/locales"],
  "i18n-ally.keystyle": "flat",
  "i18n-ally.sourceLanguage": "en",
  "i18n-ally.enabledFrameworks": ["vue"],
  "i18n-ally.sortKeys": true,
  "i18n-ally.extract.autoDetect": true
}
```

功能：

- 内联翻译预览（.vue 文件中直接看到翻译结果）
- 缺失翻译检测（高亮未翻译的 key）
- 自动提取（选中硬编码字符串 → 右键 → Extract to i18n）
- 翻译进度追踪

**Vite 插件（可选但推荐）：**

```typescript
// vite.config.mjs
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'

plugins: [
  VueI18nPlugin({
    include: resolve(__dirname, 'src/locales/**')
  })
]
```

- locale 文件预编译（更好的运行时性能）
- 开发时 HMR（热更新翻译文件）

### 9.8 i18n 工程量估算

| 任务                      | 工期                      | 说明                                         |
| ------------------------- | ------------------------- | -------------------------------------------- |
| 基础设施搭建              | 1 天                      | 安装 vue-i18n, 创建 i18n/index.ts, Vite 插件 |
| 创建 en.json + zh-CN.json | 1 天                      | 初始 ~400 个 key 的提取和翻译                |
| Vue 组件字符串提取        | 3-5 天                    | ~35 个文件，使用 i18n-ally 辅助              |
| 偏好设置组件提取          | 2 天                      | ~15 个文件，字符串最密集                     |
| Muya UI 配置提取          | 1 天                      | ~8 个 config.js 文件                         |
| 上下文菜单提取            | 0.5 天                    | ~2 个文件                                    |
| Store 通知/错误提取       | 0.5 天                    | ~5 个文件                                    |
| Rust 侧 i18n 实现         | 1-2 天                    | i18n.rs + menu.rs 改造                       |
| Tauri 对话框本地化        | 0.5 天                    | ~3 个文件                                    |
| 启用语言选择器 + 重启提示 | 0.5 天                    | 偏好设置 UI                                  |
| **合计**                  | **~10-12 天（2-2.5 周）** |                                              |

### 9.9 为什么 i18n 应该尽早做

1. **避免重复工作** — 编辑器迁移（Milkdown）会创建大量新组件和 UI，如果 i18n 框架已就绪，新代码直接用 `$t()` 写，不产生新的硬编码字符串
2. **Muya UI 也受益** — Muya 的 Quick Insert、Format Picker 等配置文件也需要本地化，无论是否替换引擎
3. **解锁语言设置** — 当前被禁用的语言选择器可以立即启用
4. **社区贡献** — i18n 完成后可以发起社区翻译，吸引更多国际贡献者
5. **与引擎无关** — i18n 基础设施不依赖 Muya 或 Milkdown，可以独立进行

---

## 10. 风险评估

### 10.1 高风险项

| 风险                       | 影响                                                                               | 缓解策略                                                          |
| -------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **图表生态缺失**           | Mermaid/Flowchart/Vega/Sequence/PlantUML 全部需要自建插件，`plugin-diagram` 已弃用 | 提取 Muya 图表渲染器为共享模块，包装为 Milkdown NodeView          |
| **搜索替换无现成方案**     | MarkText 的搜索替换是核心功能                                                      | 复用 Muya 的 `matchString()` 算法，基于 `prosemirror-search` 封装 |
| **Source Code 模式不兼容** | Milkdown 仅 WYSIWYG                                                                | Split View 架构解决：左 CodeMirror 6 + 右 Milkdown                |
| **无桌面编辑器先例**       | 没有成功的桌面 Markdown 编辑器用 Milkdown                                          | 原型验证（P0 阶段），保留 Muya 冷切换回退                         |
| **Milkdown 单人维护**      | 长期持续性风险                                                                     | Milkdown 基于 ProseMirror/Remark，底层稳定；最坏情况可 fork       |

### 10.2 中风险项

| 风险                        | 影响                                     | 缓解策略                                               |
| --------------------------- | ---------------------------------------- | ------------------------------------------------------ |
| **Front Matter**            | 需自建插件                               | 复用 Muya 的解析正则，结合 `remark-frontmatter`        |
| **Focus/Typewriter 模式**   | 需自建                                   | 复用 Muya 的 CSS（90% 可复用），ProseMirror Decoration |
| **HTML 导出**               | 需组装流水线                             | 复用 Muya 的导出模板（80% 可复用），替换解析器         |
| **Split View 滚动同步精度** | 复杂内容（图片、数学、表格）位置可能偏移 | 线性插值 + nearest-element 回退                        |
| **IME 输入兼容**            | Split View 同步可能干扰中文输入          | composition 事件守卫，组合期间暂停同步                 |
| 🌐 **i18n 字符串遗漏**      | 硬编码字符串分散在 60+ 文件中            | i18n-ally 自动检测 + CI 检查缺失翻译                   |

### 10.3 低风险项

| 风险                | 影响                      | 缓解策略                         |
| ------------------- | ------------------------- | -------------------------------- |
| 引擎切换            | 冷切换不影响运行时        | 设置界面明确提示需重启           |
| 性能差异            | ProseMirror 通常优于 VDOM | 基准测试验证                     |
| Markdown 往返保真度 | Remark 比 marked.js 更好  | 测试覆盖边缘情况                 |
| 🌐 语言切换不完整   | 原生菜单需重启            | 提示用户，与 VS Code/Zettlr 一致 |

---

## 11. 工程量估算

### 11.1 工作分解（含 i18n）

| 阶段                                 | 任务                                      | 预估工期     | 依赖   |
| ------------------------------------ | ----------------------------------------- | ------------ | ------ |
| **Pi: 国际化基础设施（与 P0 并行）** |                                           | **2-2.5 周** |        |
|                                      | vue-i18n 安装 + i18n/index.ts + Vite 插件 | 1 天         | 无     |
|                                      | 创建 en.json + zh-CN.json（~400 key）     | 1 天         | Pi.1   |
|                                      | Vue 组件字符串提取（~35 文件）            | 3-5 天       | Pi.2   |
|                                      | 偏好设置组件字符串提取（~15 文件）        | 2 天         | Pi.2   |
|                                      | Muya UI 配置 + 上下文菜单提取             | 1.5 天       | Pi.2   |
|                                      | Rust 侧 i18n.rs + menu.rs 本地化          | 1.5 天       | Pi.2   |
|                                      | 启用语言选择器 + 重启提示                 | 0.5 天       | Pi.6   |
| **P0: 基础设施 + 引擎切换**          |                                           | **3 周**     |        |
|                                      | 定义 `IEditorEngine` 接口 + 类型          | 3 天         | 无     |
|                                      | MuyaAdapter 实现（包装现有 API）          | 3 天         | P0.1   |
|                                      | 重构 `editor.vue` 面向接口编程            | 3 天         | P0.2   |
|                                      | 启动参数解析 + 设置项 + 工厂函数          | 2 天         | P0.3   |
|                                      | Milkdown 基础集成（Vue 3 + 核心插件）     | 4 天         | P0.1   |
| **P1: 核心功能**                     |                                           | **3-4 周**   | P0     |
|                                      | CommonMark + GFM + 表格 + 脚注            | 3 天         | P0     |
|                                      | 数学公式 (KaTeX)                          | 2 天         | P0     |
|                                      | 代码块（CodeMirror 6）                    | 3 天         | P0     |
|                                      | 格式工具栏 + 链接编辑                     | 3 天         | P0     |
|                                      | 撤销重做 + 剪贴板                         | 1 天         | P0     |
|                                      | 图片上传/粘贴/拖拽                        | 3 天         | P0     |
|                                      | Emoji + 斜杠命令                          | 2 天         | P0     |
|                                      | 表格编辑工具栏                            | 3 天         | P1.1   |
| **P2: 复用 Muya 构建自定义插件**     |                                           | **4-5 周**   | P1     |
|                                      | 提取共享渲染器模块 (`shared/renderers/`)  | 3 天         | P1     |
|                                      | 搜索替换插件（复用 Muya 匹配算法）        | 1 周         | P1     |
|                                      | Mermaid 图表 NodeView（复用 Muya 渲染器） | 3 天         | P2.1   |
|                                      | Flowchart/Vega/Sequence/PlantUML NodeView | 1.5 周       | P2.3   |
|                                      | Front Matter 插件（复用 Muya 正则）       | 3 天         | P1     |
|                                      | HTML 导出（复用 Muya 模板 80%）           | 2 天         | P1     |
|                                      | TOC 生成                                  | 2 天         | P1     |
|                                      | Focus 模式（复用 Muya CSS 90%）           | 1 天         | P1     |
|                                      | Typewriter 模式                           | 1 天         | P2.8   |
| **P3: Split View 对照模式**          |                                           | **4 周**     | P1     |
|                                      | `SplitEditor.vue` 基础框架 + 三模式切换   | 3 天         | P1     |
|                                      | CodeMirror 6 Source Pane 集成             | 3 天         | P3.1   |
|                                      | 双向内容同步引擎（debounce + diff）       | 1 周         | P3.2   |
|                                      | 滚动同步（remarkSourceLines + lineMap）   | 1 周         | P3.3   |
|                                      | IME 兼容 + 性能优化                       | 3 天         | P3.4   |
| **P4: 集成完善**                     |                                           | **2-3 周**   | P2, P3 |
|                                      | PDF 导出适配                              | 2 天         | P2     |
|                                      | 主题系统迁移                              | 3 天         | P1     |
|                                      | 图片调整大小 NodeView                     | 3 天         | P1     |
|                                      | Unsplash 集成（复用 Muya API 逻辑）       | 2 天         | P1     |
|                                      | 拼写检查 + 上下标                         | 2 天         | P1     |
| **P5: 测试与稳定**                   |                                           | **2-3 周**   | P4     |
|                                      | 单元测试（共享模块 + 插件）               | 1 周         | P4     |
|                                      | 集成测试（双引擎对比）                    | 1 周         | P4     |
|                                      | 回归测试 + Bug 修复                       | 1 周         | P5.2   |

### 11.2 总工期（含 i18n）

| 方案         | 工期                  | 说明                                 |
| ------------ | --------------------- | ------------------------------------ |
| **最乐观**   | 18 周（~4.5 个月）    | Pi 与 P0 并行，复用顺利              |
| **正常预期** | 24-28 周（~6-7 个月） | 含调试、返工、边缘情况               |
| **最悲观**   | 36 周（~9 个月）      | 遇到架构级问题 + Split View 性能问题 |

> **注：** i18n（Pi）增加 ~2 周工期，但因为可与 P0 并行执行，实际关键路径仅增加 ~1 周。

### 11.3 复用带来的节省

| 模块          | 从零开发 | 复用 Muya 后 | 节省          |
| ------------- | -------- | ------------ | ------------- |
| 图表渲染器 ×5 | 5 周     | 2.5 周       | 2.5 周        |
| 搜索替换      | 1.5 周   | 1 周         | 0.5 周        |
| HTML 导出     | 1 周     | 2 天         | 3 天          |
| Focus 模式    | 3 天     | 1 天         | 2 天          |
| 图片处理      | 1 周     | 3 天         | 2 天          |
| Front Matter  | 3 天     | 2 天         | 1 天          |
| **合计节省**  |          |              | **约 4-5 周** |

---

## 12. 迁移策略

### 12.1 总体路线图（含 i18n）

```
阶段 0: 国际化 + 抽象层（3 周，并行）
├─┬─ [并行 A] i18n 基础设施
│ ├── 安装 vue-i18n, 创建 en.json + zh-CN.json
│ ├── 提取 Vue 组件 / 偏好设置 / 上下文菜单字符串
│ ├── Rust 侧 i18n.rs + menu.rs 本地化
│ └── 启用语言选择器
│
└─┬─ [并行 B] 编辑器抽象层 + 引擎切换
  ├── 定义 IEditorEngine 接口
  ├── MuyaAdapter 实现（包装现有 API）
  ├── 重构 editor.vue 面向接口
  ├── 启动参数 --editor-engine + 设置项
  └── Milkdown 最小实现（基础编辑）

>>> 里程碑: 双语支持 + 双引擎启动 + 冷切换工作 <<<

阶段 1: 功能追平 + 复用（7-9 周）
├── 提取 Muya 可复用模块到 shared/
├── 基于复用模块构建 Milkdown 自定义插件
├── 新代码直接使用 $t() 国际化（i18n 框架已就绪）
├── 逐步实现 P1-P2 所有功能
└── 每完成一个模块，两个引擎对比测试

阶段 2: Split View 对照模式（4 周）
├── 基础 Split View 框架
├── 双向同步引擎
├── 滚动同步
└── 性能优化 + IME 兼容

阶段 3: 稳定 + 发布（4 周）
├── 集成测试
├── Beta 版本（Milkdown 为实验性）
├── 发起社区翻译（Crowdin/Weblate）
├── 收集反馈，修复 Bug
└── 视反馈决定是否移除 Muya
```

### 12.2 目录结构规划（含 i18n）

```
src/
├── locales/                         # ← 前后端共享的翻译文件
│   ├── en.json                      # 英文（主语言 / 源文件）
│   ├── zh-CN.json                   # 简体中文
│   └── _meta.json                   # 语言元数据（名称、方向、进度）
│
├── renderer/
│   ├── i18n/
│   │   ├── index.ts                 # createI18n 配置
│   │   └── loader.ts                # 语言懒加载
│   │
│   ├── editor/
│   ├── interface.ts              # IEditorEngine 接口
│   ├── types.ts                  # 共享类型（FormatType, SearchOptions 等）
│   ├── factory.ts                # 引擎工厂函数
│   │
│   ├── muya/
│   │   └── adapter.ts            # Muya → IEditorEngine 适配器
│   │
│   ├── milkdown/
│   │   ├── adapter.ts            # Milkdown → IEditorEngine 适配器
│   │   ├── setup.ts              # Milkdown 编辑器初始化
│   │   ├── plugins/
│   │   │   ├── search.ts         # 搜索替换（复用 shared/search/）
│   │   │   ├── diagramView.ts    # 图表 NodeView（复用 shared/renderers/）
│   │   │   ├── frontmatter.ts    # Front Matter
│   │   │   ├── toc.ts            # TOC 生成
│   │   │   ├── focusMode.ts      # Focus 模式（复用 shared/styles/）
│   │   │   ├── typewriter.ts     # Typewriter 模式
│   │   │   ├── imageResize.ts    # 图片调整
│   │   │   ├── exportHtml.ts     # HTML 导出（复用 shared/export/）
│   │   │   └── sourceLines.ts    # remarkSourceLines（Split View 用）
│   │   └── themes/
│   │       ├── light.css
│   │       └── dark.css
│   │
│   ├── splitView/
│   │   ├── SplitEditor.vue       # Split View 主组件
│   │   ├── SourcePane.ts         # CodeMirror 6 封装
│   │   ├── PreviewPane.ts        # Milkdown 封装
│   │   ├── SyncEngine.ts         # 双向内容同步
│   │   ├── ScrollSync.ts         # 滚动同步
│   │   ├── diffPatch.ts          # 最小差异算法
│   │   └── lineMap.ts            # 源码行 ↔ DOM 映射
│   │
│   └── shared/                   # ← 从 Muya 提取的引擎无关模块
│       ├── renderers/
│       │   ├── types.ts          # DiagramRenderer 接口
│       │   ├── mermaid.ts        # Mermaid 渲染（从 Muya 提取）
│       │   ├── flowchart.ts      # Flowchart 渲染（从 Muya 提取）
│       │   ├── vega.ts           # Vega-Lite 渲染（从 Muya 提取）
│       │   ├── plantuml.ts       # PlantUML 编码（从 Muya 提取）
│       │   └── sequence.ts       # Sequence 渲染（从 Muya 提取）
│       ├── search/
│       │   └── matchEngine.ts    # 搜索匹配算法（从 Muya 提取）
│       ├── export/
│       │   ├── htmlTemplate.ts   # HTML 导出模板（从 Muya 提取）
│       │   └── styles.ts         # 导出样式收集
│       ├── images/
│       │   ├── pathResolver.ts   # 图片路径解析（从 Muya 提取）
│       │   └── unsplash.ts       # Unsplash API（从 Muya 提取）
│       └── styles/
│           └── focusMode.css     # Focus 模式 CSS（从 Muya 提取）
│
src-tauri/
└── src/
    └── i18n.rs                      # Rust 侧翻译辅助（读取共享 locale JSON）
```

---

## 13. 结论与建议

### 13.1 优劣分析（v3.0）

**整体收益：**

- ✅ TypeScript 原生，类型安全
- ✅ ProseMirror 十年打磨的编辑体验
- ✅ Remark 生态，数百个 Markdown 扩展可用
- ✅ 协作编辑能力（Y.js）
- ✅ 代码块升级为 CodeMirror 6
- ✅ **Split View 对照模式**（JetBrains 风格，Muya 无此能力）
- ✅ **引擎冷切换**，平滑过渡，零风险试错
- ✅ Muya 独有逻辑可复用约 40-80%
- ✅ **中英双语国际化**，可扩展到任意语言
- ✅ i18n 框架先行，后续新代码直接国际化，不产生新债务

**整体成本：**

- ❌ 6-7 个月正常工期（含 i18n）
- ❌ 14 个功能需自定义开发（复用 Muya 节省 ~4-5 周）
- ❌ 图表插件官方已弃用，需完全自建
- ❌ 无桌面编辑器先例
- ❌ ~325 个硬编码字符串需提取（一次性工程）

### 13.2 最终建议

**i18n 先行 + 编辑器抽象并行，再决定后续。全部零风险，对任何路径都有价值：**

```
第 1 步（必做，3 周，并行进行）：

  [并行 A] i18n 基础设施（2 周）
  → 安装 vue-i18n，创建 en.json + zh-CN.json
  → 提取 ~325 个硬编码字符串
  → Rust 侧菜单/对话框本地化
  → 启用语言选择器
  ✓ 产出：MarkText 立即获得中英双语支持

  [并行 B] 编辑器抽象层（3 周）
  → 定义 IEditorEngine 接口
  → MuyaAdapter + MilkdownAdapter（最小版本）
  → 引擎冷切换机制
  ✓ 产出：双引擎可切换启动

第 2 步（强烈建议，2 周）：
  → 提取 Muya 可复用模块到 shared/
  → Milkdown 基础功能验证（CommonMark + GFM + 中文输入法）
  → 性能基准：大文档渲染、输入延迟
  → 基于实际数据决定是否继续

第 3 步（根据验证结果）：
  验证通过 → 执行完整迁移 + Split View + 发起社区翻译
  验证失败 → 保留 Muya，i18n 和 shared/ 模块仍然有价值
```

---

## 附录 A：Milkdown 官方插件清单

| 包名                           | 版本      | 周下载量 | 说明                                 |
| ------------------------------ | --------- | -------- | ------------------------------------ |
| `@milkdown/core`               | 7.18.0    | ~62k     | 核心框架                             |
| `@milkdown/ctx`                | 7.18.0    | ~62k     | 依赖注入容器                         |
| `@milkdown/prose`              | 7.18.0    | ~62k     | ProseMirror 封装                     |
| `@milkdown/transformer`        | 7.18.0    | ~62k     | Remark ↔ ProseMirror 转换            |
| `@milkdown/utils`              | 7.18.0    | ~62k     | 工具函数                             |
| `@milkdown/kit`                | 7.18.0    | ~62k     | All-in-one 包（推荐用于 Split View） |
| `@milkdown/crepe`              | 7.18.0    | ~61k     | 电池内置版（单面板推荐）             |
| `@milkdown/preset-commonmark`  | 7.18.0    | ~62k     | CommonMark 语法                      |
| `@milkdown/preset-gfm`         | 7.18.0    | ~62k     | GFM 语法                             |
| `@milkdown/plugin-history`     | 7.18.0    | ~18k     | 撤销/重做                            |
| `@milkdown/plugin-clipboard`   | 7.10.3    | ~27k     | 剪贴板                               |
| `@milkdown/plugin-cursor`      | 7.18.0    | ~18k     | 光标管理                             |
| `@milkdown/plugin-listener`    | 7.18.0    | ~18k     | 事件监听                             |
| `@milkdown/plugin-emoji`       | 7.10.3    | ~17k     | 表情                                 |
| `@milkdown/plugin-slash`       | 7.9.0     | ~13k     | 斜杠命令                             |
| `@milkdown/plugin-tooltip`     | 7.8.0     | ~9k      | 工具提示                             |
| `@milkdown/plugin-indent`      | 7.8.0     | ~8k      | 缩进                                 |
| `@milkdown/plugin-upload`      | 7.18.0    | ~7k      | 文件上传                             |
| `@milkdown/plugin-collab`      | 7.18.0    | ~2k      | 协作编辑                             |
| `@milkdown/plugin-block`       | 7.18.0    | ~7k      | Block 操作                           |
| `@milkdown/vue`                | 7.18.0    | ~4.7k    | Vue 3 集成                           |
| ~~`@milkdown/plugin-diagram`~~ | ~~7.7.0~~ | ~~360~~  | ~~**已弃用**~~                       |

## 附录 B：需自定义开发的插件预估（含复用）

| 插件            | 从零开发      | 复用 Muya 后 | 复用来源                         |
| --------------- | ------------- | ------------ | -------------------------------- |
| 搜索替换        | 1.5 周        | 1 周         | `searchCtrl.js` 匹配算法         |
| Mermaid 图表    | 1 周          | 3 天         | `renderers/` + `renderMermaid()` |
| Flowchart 图表  | 1 周          | 3 天         | `renderers/` + flowchart.js 集成 |
| Vega-Lite 图表  | 1 周          | 3 天         | `renderers/` + vega-embed 集成   |
| Sequence 图表   | 1 周          | 2 天         | 复用 Mermaid sequence            |
| PlantUML 图表   | 0.5 周        | 1 天         | `plantuml.js` 编码器             |
| Front Matter    | 0.5 周        | 2 天         | 解析正则 + `remark-frontmatter`  |
| TOC 生成        | 0.5 周        | 2 天         | 遍历逻辑简单                     |
| Focus 模式      | 3 天          | 1 天         | CSS 规则直接复用                 |
| Typewriter 模式 | 2 天          | 2 天         | Muya 未实现，需新写              |
| 图片调整大小    | 3 天          | 2 天         | 调整计算逻辑                     |
| HTML 导出       | 3 天          | 1 天         | 模板 + CSS 内联                  |
| 上标/下标       | 1 天          | 1 天         | `remark-supersub`                |
| **合计**        | **~10-12 周** | **~6-7 周**  | **节省 ~4-5 周**                 |

## 附录 C：Split View 依赖包

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
  "@codemirror/state": "^6.x",
  "@codemirror/view": "^6.x",
  "@codemirror/lang-markdown": "^6.x",
  "@codemirror/language": "^6.x",
  "@codemirror/language-data": "^6.x",
  "diff": "^5.x"
}
```

> **注意：** 当前 `package.json` 中的 `codemirror: ^5.65.2` 是 CodeMirror 5，被 Muya 代码块使用。Split View 需要 CodeMirror 6（`@codemirror/*` 作用域包），两者可以共存，互不冲突。

## 附录 D：i18n 依赖包

**前端（package.json）：**

```json
{
  "vue-i18n": "^10.0.0",
  "@intlify/unplugin-vue-i18n": "^5.0.0"
}
```

**后端（Cargo.toml）— 二选一：**

- 方案 A（推荐，轻量）：无新依赖，使用 `serde_json`（已有）+ `include_str!`
- 方案 B（功能更全）：`rust-i18n = "3"` — 提供 `t!()` 宏，支持 YAML/JSON/TOML

## 附录 E：添加新语言清单

社区贡献者只需 3 步即可添加新语言，**无需修改任何代码**：

| 步骤 | 操作                                                     | 文件                        |
| ---- | -------------------------------------------------------- | --------------------------- |
| 1    | 复制 `src/locales/en.json` → `src/locales/{locale}.json` | 新翻译文件                  |
| 2    | 翻译所有值（保持 key 不变）                              | `src/locales/{locale}.json` |
| 3    | 在 `_meta.json` 的 `languages` 数组中添加新条目          | `src/locales/_meta.json`    |

懒加载机制自动发现新文件，无需修改 `i18n/index.ts` 或任何组件。

**常见语言 BCP-47 代码参考：**
| 代码 | 语言 |
|------|------|
| `en` | English |
| `zh-CN` | 简体中文 |
| `zh-TW` | 繁體中文 |
| `ja` | 日本語 |
| `ko` | 한국어 |
| `fr` | Français |
| `de` | Deutsch |
| `es` | Español |
| `pt-BR` | Português (Brasil) |
| `ru` | Русский |
| `ar` | العربية (RTL) |
