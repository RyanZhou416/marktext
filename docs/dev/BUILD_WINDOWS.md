# Windows 构建指南

本文档介绍如何在 Windows 上构建 MarkText。

## 环境要求

### 必需软件

| 软件          | 版本要求 | 说明                                   |
| ------------- | -------- | -------------------------------------- |
| Node.js       | v18+     | 推荐使用 nvm-windows 管理版本          |
| npm           | v9+      | 随 Node.js 自带                        |
| Rust          | stable   | 通过 [rustup](https://rustup.rs/) 安装 |
| Visual Studio | 2022+    | 需要 C++ 构建工具                      |
| WebView2      | 最新版   | Windows 10/11 通常已预装               |

### 安装 Visual Studio 构建工具

1. 下载 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. 安装时选择 **"使用 C++ 的桌面开发"** 工作负载
3. 或者使用 npm 自动安装：
   ```powershell
   npm install -g windows-build-tools
   ```

## 快速开始

### 方法一：使用批处理脚本（推荐）

双击运行 `scripts/build-windows.bat`，按提示选择构建类型。

### 方法二：使用 PowerShell 脚本

```powershell
# 完整安装包（NSIS + ZIP）
.\scripts\build-windows.ps1 -BuildType installer

# 便携版（仅 ZIP）
.\scripts\build-windows.ps1 -BuildType portable

# 仅二进制（最快）
.\scripts\build-windows.ps1 -BuildType binary

# 快速构建（跳过测试）
.\scripts\build-windows.ps1 -BuildType installer -SkipTests

# 完全跳过检查（开发用）
.\scripts\build-windows.ps1 -BuildType binary -SkipInstall -SkipLint -SkipTests
```

### 方法三：手动命令

```powershell
# 1. 安装依赖
npm install

# 2. 代码检查
npm run lint
npm run validate-licenses

# 3. 运行测试
npm run test

# 4. 构建
npm run tauri:build
```

## GitHub Actions 自动构建

项目配置了 GitHub Actions 工作流，支持自动构建 Windows 版本。

### 触发方式

1. **手动触发**
   - 进入 GitHub 仓库 → Actions → "Build Windows"
   - 点击 "Run workflow"
   - 选择构建类型和选项

2. **自动触发**
   - 推送到 `build-windows` 或 `build-win-*` 分支

### 工作流配置

文件位置：`.github/workflows/build-windows.yml`

支持的选项：

- `build_type`: installer / portable / binary
- `skip_tests`: 是否跳过测试
- `is_stable`: 是否标记为稳定版本

### 下载构建产物

1. 进入 Actions 页面
2. 选择已完成的工作流运行
3. 在 Artifacts 部分下载：
   - `marktext-setup-exe` - NSIS 安装程序
   - `marktext-win-x64-zip` - 64位 ZIP
   - `marktext-win-ia32-zip` - 32位 ZIP

## 构建产物

构建完成后，文件位于 `build/` 目录：

| 文件                    | 说明               |
| ----------------------- | ------------------ |
| `marktext-setup.exe`    | NSIS 安装程序      |
| `marktext-x64-win.zip`  | 64位便携版         |
| `marktext-ia32-win.zip` | 32位便携版         |
| `win-unpacked/`         | 未打包的二进制目录 |

## 安装范围、后缀绑定与卸载清理（Windows）

### 安装范围

NSIS 安装器支持两种安装范围（由安装时选择）：

- **当前用户安装**：无需管理员权限，安装到当前用户目录。
- **所有用户安装**：需要管理员权限，通常安装到 `Program Files`。

### 后缀绑定

默认仅绑定 Markdown 相关后缀（`.md`、`.markdown` 等），不默认绑定 `.txt`，避免过度接管系统文本文件默认程序。

### 卸载清理策略

卸载程序时，安装器会提示是否删除“当前用户”的 MarkText 数据文件（偏好设置、最近文件、缓存）。

- 若选择删除：会清理用户配置目录中的 MarkText 数据。
- 若不删除：仅卸载程序文件，保留用户配置与数据。

## 常见问题

### 1. node-gyp 编译失败

```powershell
# 更新 node-gyp
npm install -g node-gyp@latest

# 设置 node-gyp 路径
npm prefix -g | % {npm config set node_gyp "$_\node_modules\node-gyp\bin\node-gyp.js"}

# 安装 Node.js 头文件
node-gyp install
```

### 2. Python 找不到

确保 Python 已添加到 PATH，或者设置环境变量：

```powershell
npm config set python "C:\Python39\python.exe"
```

### 3. 内存不足

Webpack 构建可能需要较多内存，可以增加 Node.js 内存限制：

```powershell
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run tauri:build
```

### 4. 杀毒软件干扰

某些杀毒软件可能会干扰构建过程，建议：

- 将项目目录添加到杀毒软件白名单
- 临时禁用实时保护

### 5. 网络问题

如果下载 Rust crates 或 npm 包失败，可以配置镜像加速：

```powershell
# npm 镜像
npm config set registry https://registry.npmmirror.com

# Rust crates 镜像（编辑 %USERPROFILE%\.cargo\config.toml）
# [source.crates-io]
# replace-with = 'ustc'
# [source.ustc]
# registry = "sparse+https://mirrors.ustc.edu.cn/crates.io-index/"
```

## 开发构建

如果只是开发调试，可以使用开发模式：

```powershell
# 启动开发服务器
npm run dev
```

这会启动热重载的开发环境，修改代码后自动刷新。

## 签名（可选）

如果需要对构建产物进行代码签名：

1. 准备代码签名证书（.pfx 文件）
2. 设置环境变量：

```powershell
$env:CSC_LINK="path/to/certificate.pfx"
$env:CSC_KEY_PASSWORD="your-password"
npm run tauri:build
```

## 相关链接

- [通用构建说明](./BUILD.md)
- [项目结构分析](./PROJECT_ANALYSIS.md)
- [Tauri 2.0 文档](https://v2.tauri.app/)
