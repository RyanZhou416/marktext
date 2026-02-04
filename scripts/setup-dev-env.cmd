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

:: 指定 Visual Studio 版本 (用于 node-gyp)
set "npm_config_msvs_version=2022"
set "GYP_MSVS_VERSION=2022"

:: 检查 Visual Studio 是否安装
echo [步骤 1/5] 检查 Visual Studio...
set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
if not exist "%VSWHERE%" (
    echo [错误] 找不到 vswhere.exe，请安装 Visual Studio
    pause
    exit /b 1
)
for /f "usebackq tokens=*" %%i in (`"%VSWHERE%" -latest -property installationPath`) do set "VSINSTALL=%%i"
if not defined VSINSTALL (
    echo [错误] 找不到 Visual Studio 安装
    pause
    exit /b 1
)
echo [OK] 找到 Visual Studio: %VSINSTALL%

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
echo [步骤 3/5] 安装 Electron 二进制文件...
call node node_modules/electron/install.js
if errorlevel 1 (
    echo [错误] Electron 安装失败
    pause
    exit /b 1
)
echo [OK] Electron 安装完成

echo.
echo [步骤 4/5] 编译原生模块...
echo   - 清除编译缓存...
if exist "node_modules\keytar\build" rd /s /q "node_modules\keytar\build" 2>nul
if exist "node_modules\fontmanager-redux\build" rd /s /q "node_modules\fontmanager-redux\build" 2>nul
if exist "node_modules\native-keymap\build" rd /s /q "node_modules\native-keymap\build" 2>nul
del /s /q "node_modules\*.forge-meta" 2>nul
echo   - 编译中 (使用 VS 2022)...
call node node_modules/@electron/rebuild/lib/cli.js -f --msvs-version=2022
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
