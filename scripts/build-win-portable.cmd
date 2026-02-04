@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

title MarkText Windows 便携版构建

echo.
echo ══════════════════════════════════════════════════════════
echo            MarkText Windows 便携版 一键构建
echo ══════════════════════════════════════════════════════════
echo.

:: 切换到项目根目录
cd /d "%~dp0.."
echo 工作目录: %CD%
echo.

:: 设置 PATH (使用环境变量，自动适配不同电脑)
set "PATH=%APPDATA%\npm;%ProgramFiles%\nodejs;%PATH%"

:: 初始化 Visual Studio 环境
if not defined VCINSTALLDIR (
    echo [步骤 1/5] 初始化 Visual Studio 环境...
    
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
        if errorlevel 1 (
            echo [错误] VS 环境初始化失败
            pause
            exit /b 1
        )
        echo [OK] Visual Studio 环境已初始化: !VSINSTALL!
    ) else (
        echo [错误] 找不到 vcvarsall.bat
        pause
        exit /b 1
    )
) else (
    echo [步骤 1/5] Visual Studio 环境已就绪
)

echo.
echo [步骤 2/5] 安装依赖...
if not exist "node_modules" (
    call yarn install --ignore-scripts
    if errorlevel 1 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
)
echo [OK] 依赖已就绪

echo.
echo [步骤 3/5] 修补 node-gyp (VS 2026 支持)...
call node .electron-vue/patch-node-gyp.js
echo [OK] 修补完成

echo.
echo [步骤 4/5] 编译原生模块...
call node node_modules/@electron/rebuild/lib/cli.js -f
if errorlevel 1 (
    echo [错误] 原生模块编译失败
    pause
    exit /b 1
)
echo [OK] 原生模块编译完成

echo.
echo [步骤 5/5] 构建便携版...
call node .electron-vue/build.js
if errorlevel 1 (
    echo [错误] 应用构建失败
    pause
    exit /b 1
)

call node node_modules/electron-builder/out/cli/cli.js --win zip -c.buildDependenciesFromSource=false
if errorlevel 1 (
    echo [错误] 打包失败
    pause
    exit /b 1
)

echo.
echo ══════════════════════════════════════════════════════════
echo                    构建成功完成！
echo ══════════════════════════════════════════════════════════
echo.
echo 构建产物位置: %CD%\build\
echo.
dir /b build\*.zip 2>nul
echo.
pause
