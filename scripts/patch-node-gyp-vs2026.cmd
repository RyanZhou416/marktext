@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

echo.
echo ══════════════════════════════════════════════════════════
echo        修补 node-gyp 以支持 Visual Studio 2026
echo ══════════════════════════════════════════════════════════
echo.

cd /d "%~dp0.."

:: 修补项目内的 node-gyp
set "TARGET=node_modules\node-gyp\lib\find-visualstudio.js"

if not exist "%TARGET%" (
    echo [错误] 找不到 %TARGET%
    echo 请先运行 yarn install --ignore-scripts
    pause
    exit /b 1
)

:: 检查是否已修补
findstr /C:"versionMajor === 18" "%TARGET%" >nul 2>&1
if not errorlevel 1 (
    echo [OK] 已经修补过，无需重复操作
    pause
    exit /b 0
)

echo [信息] 正在修补 %TARGET%...

:: 使用 PowerShell 修补文件
powershell -Command ^
    "$content = Get-Content '%TARGET%' -Raw; ^
    $content = $content -replace 'if \(ret\.versionMajor === 17\) \{\s+ret\.versionYear = 2022\s+return ret\s+\}', ^
        'if (ret.versionMajor === 17) { ret.versionYear = 2022; return ret } if (ret.versionMajor === 18) { ret.versionYear = 2026; return ret }'; ^
    $content = $content -replace 'else if \(versionYear === 2022\) \{\s+return ''v143''\s+\}', ^
        'else if (versionYear === 2022) { return ''v143'' } else if (versionYear === 2026) { return ''v145'' }'; ^
    Set-Content '%TARGET%' -Value $content -NoNewline"

:: 验证修补
findstr /C:"versionMajor === 18" "%TARGET%" >nul 2>&1
if errorlevel 1 (
    echo [错误] 修补失败
    pause
    exit /b 1
)

echo [OK] 修补成功！
echo.
pause
