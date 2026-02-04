@echo off
chcp 65001 >nul 2>&1
title MarkText Windows 构建

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║           MarkText Windows 快速构建                      ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

:: 切换到项目根目录
cd /d "%~dp0.."

:: 检查是否存在 package.json
if not exist "package.json" (
    echo [ERROR] 未找到 package.json，请确保在正确的目录
    pause
    exit /b 1
)

echo 请选择构建类型:
echo.
echo   [1] 完整安装包 (installer) - 包含 NSIS 安装程序和 ZIP
echo   [2] 便携版 (portable)     - 仅生成 ZIP 压缩包
echo   [3] 仅二进制 (binary)     - 最快，仅构建不打包
echo   [4] 快速构建              - 跳过测试的完整安装包
echo   [5] 退出
echo.

set /p choice="请输入选项 [1-5]: "

if "%choice%"=="1" (
    echo.
    echo 开始构建完整安装包...
    powershell -ExecutionPolicy Bypass -File "%~dp0build-windows.ps1" -BuildType installer
) else if "%choice%"=="2" (
    echo.
    echo 开始构建便携版...
    powershell -ExecutionPolicy Bypass -File "%~dp0build-windows.ps1" -BuildType portable
) else if "%choice%"=="3" (
    echo.
    echo 开始构建二进制...
    powershell -ExecutionPolicy Bypass -File "%~dp0build-windows.ps1" -BuildType binary
) else if "%choice%"=="4" (
    echo.
    echo 开始快速构建（跳过测试）...
    powershell -ExecutionPolicy Bypass -File "%~dp0build-windows.ps1" -BuildType installer -SkipTests
) else if "%choice%"=="5" (
    echo 退出
    exit /b 0
) else (
    echo 无效选项
)

echo.
echo 构建完成！
pause
