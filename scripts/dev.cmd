@echo off
chcp 65001 >nul 2>&1
setlocal

title MarkText 开发模式

:: 切换到项目根目录
cd /d "%~dp0.."

:: 初始化 VS 环境（静默）
if not defined VCINSTALLDIR (
    if exist "C:\Program Files\Microsoft Visual Studio\18\Community\VC\Auxiliary\Build\vcvarsall.bat" (
        call "C:\Program Files\Microsoft Visual Studio\18\Community\VC\Auxiliary\Build\vcvarsall.bat" x64 >nul 2>&1
    )
)

:: 检查依赖
if not exist "node_modules" (
    echo 请先运行 scripts\setup-dev-env.cmd 初始化开发环境
    pause
    exit /b 1
)

:: 启动开发服务器
echo 正在启动 MarkText 开发模式...
echo.
call node node_modules/cross-env/src/bin/cross-env.js node .electron-vue/dev-runner.js
