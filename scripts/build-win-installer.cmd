@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

title MarkText Windows 安装包构建

echo.
echo ══════════════════════════════════════════════════════════
echo            MarkText Windows 安装包 一键构建
echo ══════════════════════════════════════════════════════════
echo.

:: 切换到项目根目录
cd /d "%~dp0.."
echo 工作目录: %CD%
echo.

:: 设置 PATH (使用环境变量，自动适配不同电脑)
set "PATH=%APPDATA%\npm;%ProgramFiles%\nodejs;%PATH%"

:: 指定 Visual Studio 版本 (用于 node-gyp)
set "npm_config_msvs_version=2022"

:: 检查是否在 VS 开发者命令提示符中
if not defined VCINSTALLDIR (
    echo [警告] 未检测到 Visual Studio 环境
    echo [信息] 正在尝试初始化 Visual Studio 环境...
    
    :: 使用 vswhere 动态查找 Visual Studio
    set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
    if not exist "!VSWHERE!" (
        echo [错误] 找不到 vswhere.exe，请安装 Visual Studio
        pause
        exit /b 1
    )
    
    :: 查找最新版本的 Visual Studio
    for /f "usebackq tokens=*" %%i in (`"!VSWHERE!" -latest -property installationPath`) do set "VSINSTALL=%%i"
    
    if not defined VSINSTALL (
        echo [错误] 找不到 Visual Studio 安装
        pause
        exit /b 1
    )
    
    set "VCVARSALL=!VSINSTALL!\VC\Auxiliary\Build\vcvarsall.bat"
    if exist "!VCVARSALL!" (
        call "!VCVARSALL!" x64 >nul 2>&1
        echo [OK] Visual Studio 环境已初始化: !VSINSTALL!
    ) else (
        echo [错误] 找不到 vcvarsall.bat
        pause
        exit /b 1
    )
)

echo.
echo [步骤 1/4] 检查 node-gyp...
where node-gyp >nul 2>&1
if errorlevel 1 (
    echo [信息] 正在安装 node-gyp...
    call npm install -g node-gyp
)
echo [OK] node-gyp 已就绪

echo.
echo [步骤 2/4] 检查依赖...
if not exist "node_modules" (
    echo [信息] 正在安装依赖，请稍候...
    call yarn install
    if errorlevel 1 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
)
echo [OK] 依赖已就绪

echo.
echo [步骤 3/4] 构建应用...
call node .electron-vue/build.js
if errorlevel 1 (
    echo [错误] 构建失败
    pause
    exit /b 1
)
echo [OK] 应用构建完成

echo.
echo [步骤 4/4] 打包安装程序...
call npx electron-builder --win -c.buildDependenciesFromSource=false
if errorlevel 1 (
    echo [警告] 打包遇到问题，尝试重新编译原生模块...
    echo   - 清除编译缓存...
    if exist "node_modules\fontmanager-redux\build" rd /s /q "node_modules\fontmanager-redux\build" 2>nul
    if exist "node_modules\native-keymap\build" rd /s /q "node_modules\native-keymap\build" 2>nul
    del /s /q "node_modules\*.forge-meta" 2>nul
    call node node_modules/@electron/rebuild/lib/cli.js -f --msvs-version=2022
    call npx electron-builder --win
    if errorlevel 1 (
        echo [错误] 打包失败
        pause
        exit /b 1
    )
)

echo.
echo ══════════════════════════════════════════════════════════
echo                    构建成功完成！
echo ══════════════════════════════════════════════════════════
echo.
echo 构建产物位置: %CD%\build\
echo.
dir /b build\*.exe build\*.zip 2>nul
echo.
pause
