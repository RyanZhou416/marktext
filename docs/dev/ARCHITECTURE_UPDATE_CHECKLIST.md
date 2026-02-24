# 底层架构更新清单

> Milkdown 已验证可编辑，本文档列出待更新的底层架构项及完整升级路线图。
> 更新日期：2026-02-23

---

## 一、已完成的迁移 ✅

- Tauri 2.0（替代 Electron）
- Vue 3 + Pinia + Vite 5
- TypeScript（渲染器层 ~65%）
- 双引擎架构（Muya / Milkdown 可切换）
- IEditorEngine 抽象 + 工厂模式
- 移除/更新过时的构建工具引用（`tools/checkEsmModules.js` 已重写）
- 提取 Muya 共享工具到 `src/common`（大部分完成）
- 清理旧 Vuex Store，统一到 Pinia（`store/` 目录已删除）
- 重写废弃工具脚本（`validateLicenses.js`、`generateThirdPartyLicense.js`，删除 `karma.conf.js`）
- DOMPurify 2.x → 3.3.1 升级

---

## 二、当前架构现状

| 层级       | 技术                                | 状态               |
| ---------- | ----------------------------------- | ------------------ |
| 前端框架   | Vue 3.4 + Pinia + Vue Router 4      | ✅ 现代            |
| 构建工具   | Vite 5                              | ✅ 现代            |
| 后端       | Tauri 2.0 (Rust)                    | ✅ 现代            |
| 编辑器引擎 | Muya (自研, 纯 JS) + Milkdown (MVP) | ⚠️ Muya 无类型安全 |
| 类型系统   | TypeScript ~65%                     | ⚠️ 部分完成        |
| 单元测试   | Karma 已删除，待迁移 Vitest         | ❌ 缺失            |
| E2E 测试   | Playwright（2 个测试文件）          | ⚠️ 覆盖不足        |
| Rust 后端  | 13 个命令模块，依赖版本较新         | ✅ 无明显问题      |

---

## 三、阶段 1 — 立即处理（P0：死代码与废弃引用）✅ 已完成

### 3.1 清理旧 Vuex Store，统一到 Pinia ✅

- 删除了 9 个无引用的旧 Vuex store 文件（`editor.js`, `preferences.js`, `layout.js`, `commandCenter.js`, `tweet.js`, `listenForMain.js`, `autoUpdates.js`, `notification.js`, `project.js`），释放约 62KB 死代码
- 将仍在使用的 2 个工具文件（`help.js`, `treeCtrl.js`）迁移到 `stores/` 目录
- 更新了 `stores/editor.ts` 和 `stores/project.ts` 的导入路径
- `store/` 目录已完全清空并删除

### 3.2 修复/删除废弃工具脚本 ✅

| 文件                                 | 操作                                                      |
| ------------------------------------ | --------------------------------------------------------- |
| `tools/validateLicenses.js`          | ✅ 重写为使用 `npx license-checker`，检查禁止许可证       |
| `tools/generateThirdPartyLicense.js` | ✅ 重写为使用 `npx license-checker`，生成第三方许可证文件 |
| `test/unit/karma.conf.js`            | ✅ 已删除（依赖 Electron+webpack，已标记废弃）            |

### 3.3 升级 DOMPurify ✅

- `dompurify@^2.3.6` → `dompurify@^3.3.1`
- 无 API 变更（仅移除 IE 支持），两处使用点无需改动
- Vite 构建验证通过

---

## 四、阶段 2 — 短期（1-2 周）

### 4.1 依赖升级（安全/功能）

| 依赖             | 当前版本 | 目标版本 | 原因                |
| ---------------- | -------- | -------- | ------------------- |
| **mermaid**      | 10.0.0   | 11.x     | 10.x 仅接收安全补丁 |
| **katex**        | 0.15.3   | 0.16.x   | Bug 修复 + 性能改进 |
| **prismjs**      | 1.27.0   | 1.30.x   | 代码高亮更新        |
| **marked** (dev) | 1.2.9    | 最新     | 测试用，差距过大    |

### 4.2 移除不必要的依赖

| 依赖                      | 原因                                               | 替代方案                 |
| ------------------------- | -------------------------------------------------- | ------------------------ |
| `underscore`              | 仅在 `sequence-diagram-snap.js` 用了 `_.isArray()` | `Array.isArray()`        |
| `element-resize-detector` | 代码中已有 ResizeObserver 注释准备迁移             | 原生 `ResizeObserver`    |
| `eve`                     | 仅被 Snap.svg 间接使用                             | 随 Snap.svg 方案一起评估 |

### 4.3 提取剩余 Muya 共享工具

| 文件                              | 依赖                | 操作                          |
| --------------------------------- | ------------------- | ----------------------------- |
| `renderer/util/markdownToHtml.ts` | `ExportHtml` (muya) | 提取到 `src/common/markdown/` |
| `renderer/util/pdf.ts`            | `Slugger` (muya)    | 提取到 `src/common/markdown/` |

### 4.4 Composables 迁移到 TypeScript

| 文件                                      | 状态              |
| ----------------------------------------- | ----------------- |
| `composables/useTabs.js`                  | ❌ 待迁移为 `.ts` |
| `composables/useFile.js`                  | ❌ 待迁移为 `.ts` |
| `composables/useLoadingPage.js`           | ❌ 待迁移为 `.ts` |
| `composables/useCreateFileOrDirectory.js` | ❌ 待迁移为 `.ts` |

---

## 五、阶段 3 — 中期（1-2 月）

### 5.1 精简 Node.js Polyfills

当前 `vite.config.mjs` 包含 16 个 Node.js polyfills，以下可能不需要：

| Polyfill         | 建议                             |
| ---------------- | -------------------------------- |
| `http` / `https` | 浏览器环境通常不需要，排查后移除 |
| `zlib`           | 检查是否实际使用                 |
| `vm`             | 浏览器环境通常不需要             |
| `querystring`    | 可用 `URLSearchParams` 替代      |
| `string_decoder` | 检查是否实际使用                 |

目标：减少打包体积，仅保留实际需要的 polyfills。

### 5.2 清理 Electron 遗留命名与注释

| 位置                                   | 问题                                                 | 操作                    |
| -------------------------------------- | ---------------------------------------------------- | ----------------------- |
| `src/renderer/util/tauri.ts` (1854 行) | 大量注释提到 "Electron"，`window.electronAPI` 兼容层 | 更新注释为 "Tauri"      |
| `src/common/envPaths.ts`               | `electronUserDataPath` 属性名                        | 重命名为 `userDataPath` |
| `contextMenu/sideBar/actions.js`       | 函数签名中未使用的 `browserWindow` 参数              | 移除参数                |
| `contextMenu/sideBar/menuItems.js`     | `click(menuItem, browserWindow)`                     | 移除 `browserWindow`    |
| `contextMenu/tabs/menuItems.js`        | 同上                                                 | 移除 `browserWindow`    |
| `src/renderer/bootstrap.ts`            | Electron 相关注释                                    | 更新注释                |
| `src/renderer/util/logger.ts`          | 注释提到 "electron-log"                              | 更新注释                |

### 5.3 引入 Vitest 替代 Karma 单元测试

- 当前 `test/unit/` 基于 Karma + webpack，依赖已删除的 `.electron-vue`，完全无法运行
- 建议迁移到 **Vitest**（与 Vite 生态无缝衔接）
- 优先为核心模块补充测试：Markdown 解析、store 逻辑、工具函数

### 5.4 评估 `build:muya` 的必要性

- 当前 Vite 通过 `resolve.alias` 直接引用 `src/muya` 源码
- `build:muya`（Webpack 独立构建）在 `build` / `tauri:build` 流程中并未被调用
- 若不需要独立发布 Muya 为 npm 包，可移除 `build:muya` 脚本和 `src/muya/webpack.config.js`

### 5.5 文档更新

- `docs/dev/ARCHITECTURE.md`：更新 "Muya 单独 Webpack 构建" 为 Vite 直接引用
- `docs/dev/UPGRADE_ROADMAP.md`：阶段 11 已基本完成，更新状态
- 清理代码中残留的 Electron 注释

---

## 六、阶段 4 — 长期规划

### 6.1 CodeMirror 5 → 6 迁移

- 当前：`codemirror@^5.65.2`（CM5 已停止主要开发）
- 目标：CodeMirror 6（模块化架构，性能大幅提升）
- 影响范围：`src/renderer/codeMirror/` 源代码编辑模式
- 工作量：**大**，需要完全重构

### 6.2 Milkdown 适配器功能补全

当前 Milkdown 适配器（`src/renderer/editor/milkdown/adapter.ts`）仅实现 MVP：

| 功能                       | 状态        |
| -------------------------- | ----------- |
| mount / destroy            | ✅ 已实现   |
| getMarkdown / setMarkdown  | ✅ 已实现   |
| change 事件 / focus / blur | ✅ 已实现   |
| undo / redo / selectAll    | ✅ 已实现   |
| format（部分）             | ⚠️ 部分实现 |
| TOC                        | ❌ 未实现   |
| 搜索替换                   | ❌ 未实现   |
| 表格操作                   | ❌ 未实现   |
| 图片插入                   | ❌ 未实现   |
| 导出 styled HTML           | ❌ 未实现   |
| 拼写检查                   | ❌ 未实现   |

若计划将 Milkdown 升级为默认引擎，需补齐上述功能。

### 6.3 编辑器引擎默认策略

- 当前默认：`muya`
- 若 Milkdown 功能成熟：
  - 新用户默认 Milkdown
  - 旧用户保留 Muya 选项
- 需同步修改：`preferences.ts`、`static/preference.json`、`preference.json`

### 6.4 Muya 引擎渐进式 TypeScript 化

- Muya 有 ~152 个纯 JS 文件，占项目 JS 的大部分
- 如果 Muya 是长期维护的核心引擎，TypeScript 化能显著提升可维护性
- 建议渐进式迁移：先添加 JSDoc 类型注释，再逐步迁移为 `.ts`

### 6.5 替换 Snap.svg 序列图方案

- `eve` + `snap.svg` 已过时（最后更新 2015）
- 考虑用 Mermaid 的序列图功能替代，或寻找现代替代库

---

## 七、已知技术债（TODO / FIXME）

### FIXME（已知 Bug / 禁用功能）

| 位置                                                            | 内容                     |
| --------------------------------------------------------------- | ------------------------ |
| `muya/lib/eventHandler/resize.js:11`                            | Disabled due to #1648    |
| `muya/lib/contentState/codeBlockCtrl.js:159`                    | Disabled due to #1648    |
| `muya/lib/index.js:384`                                         | Disabled due to #1648    |
| `muya/lib/utils/resizeCodeLineNumber.js:28`                     | Heavy performance issues |
| `muya/lib/parser/render/renderBlock/renderContainerBlock.js:74` | Disabled due to #1648    |
| `renderer/prefComponents/editor/index.vue:61`                   | Disabled due to #1648    |

### TODO（待实现）

| 位置                                            | 内容                                 |
| ----------------------------------------------- | ------------------------------------ |
| `muya/lib/contentState/dragDropCtrl.js:191`     | Notify user about an error           |
| `muya/lib/contentState/pasteCtrl.js:65,153,222` | Import HTML / Notify error           |
| `muya/lib/ui/imageSelector/index.js:272`        | Notify user about an error           |
| `muya/lib/eventHandler/clipboard.js:46`         | `document.execCommand` is deprecated |

### DEPRECATED（已废弃 API）

| 位置                                   | 内容                                        |
| -------------------------------------- | ------------------------------------------- |
| `renderer/util/index.ts:159`           | `cloneObj()` 标记为 @deprecated             |
| `muya/lib/parser/marked/options.js:21` | sanitize / sanitizer deprecated since 0.7.0 |

---

## 八、快速验证命令

```bash
# 1. 依赖安装
npm install

# 2. 开发模式（双引擎）
npm run dev

# 3. 发布构建
npm run build

# 4. 构建产物
# src-tauri/target/release/bundle/

# 5. 代码检查
npm run lint

# 6. E2E 测试
npm run e2e

# 7. 规范测试
npm run test:specs
```
