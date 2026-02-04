@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

title MarkText 开发环境初始化

echo.
echo ══════════════════════════════════════════════════════════
echo            MarkText 开发环境 一键初始化
echo ══════════════════════════════════════════════════════════
echo.
echo 此脚本只需运行一次，用于初始化开发环境
echo.

:: 切换到项目根目录
cd /d "%~dp0.."
echo 工作目录: %CD%
echo.

:: 设置 PATH (使用环境变量，自动适配不同电脑)
set "PATH=%APPDATA%\npm;%ProgramFiles%\nodejs;%PATH%"

:: 使用 vswhere 动态查找 Visual Studio
echo [步骤 1/5] 初始化 Visual Studio 环境...
set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
if not exist "%VSWHERE%" (
    echo [错误] 找不到 vswhere.exe，请安装 Visual Studio
    pause
    exit /b 1
)

:: 查找最新版本的 Visual Studio
for /f "usebackq tokens=*" %%i in (`"%VSWHERE%" -latest -property installationPath`) do set "VSINSTALL=%%i"

if not defined VSINSTALL (
    echo [错误] 找不到 Visual Studio 安装
    pause
    exit /b 1
)

set "VCVARSALL=%VSINSTALL%\VC\Auxiliary\Build\vcvarsall.bat"
if exist "%VCVARSALL%" (
    call "%VCVARSALL%" x64 >nul 2>&1
    echo [OK] Visual Studio 环境已初始化: %VSINSTALL%
) else (
    echo [错误] 找不到 vcvarsall.bat
    pause
    exit /b 1
)

echo.
echo [步骤 2/5] 安装依赖 (跳过脚本)...
call yarn install --ignore-scripts
if errorlevel 1 (
    echo [错误] 依赖安装失败
    pause
    exit /b 1
)
echo [OK] 依赖安装完成

echo.
echo [步骤 3/5] 修补 node-gyp (VS 2026 支持)...
call node .electron-vue/patch-node-gyp.js
echo [OK] 修补完成

echo.
echo [步骤 4/5] 编译原生模块...
call node node_modules/electron-rebuild/lib/src/cli.js -f
if errorlevel 1 (
    echo [错误] 原生模块编译失败
    pause
    exit /b 1
)
echo [OK] 原生模块编译完成

echo.
echo [步骤 5/5] 代码格式化...
call node node_modules/eslint/bin/eslint.js --ext .js,.vue -f ./node_modules/eslint-friendly-formatter --fix src test
echo [OK] 格式化完成

echo.
echo ══════════════════════════════════════════════════════════
echo                 开发环境初始化完成！
echo ══════════════════════════════════════════════════════════
echo.
echo 现在可以:
echo   - 双击 scripts\dev.cmd 启动开发模式
echo   - 双击 scripts\build-win-portable.cmd 构建便携版
echo   - 在 WebStorm 中使用运行配置
echo.
pause
