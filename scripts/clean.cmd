@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

title MarkText Clean

echo.
echo ==============================================================
echo                  MarkText Clean Script
echo ==============================================================
echo.
echo   Clears all caches, build artifacts, and dependencies.
echo   After running this, you will need to re-run:
echo     1. scripts\setup-tauri-env.cmd
echo     2. scripts\dev-tauri.cmd  or  scripts\build-tauri-portable.cmd
echo.

cd /d "%~dp0.."
echo Working directory: %CD%
echo.

:: ==============================================================
::                    Confirm before cleaning
:: ==============================================================
echo The following will be deleted:
echo.
echo   [JS]    node_modules\              JS dependencies
echo   [JS]    out\                       Vite frontend build output
echo   [JS]    dist\                      Legacy dist output
echo   [JS]    .eslintcache               ESLint cache
echo   [Rust]  src-tauri\target\          Rust build artifacts (debug + release)
echo   [Rust]  src-tauri\gen\             Tauri generated code
echo   [Rust]  src-tauri\Cargo.lock       Rust dependency lock
echo   [Vite]  node_modules\.vite\        Vite dependency cache
echo   [Env]   .tauri-env-ready           Environment setup marker
echo   [Build] build\                     Electron build output (if any)
echo.

set /p "CONFIRM=Are you sure? [y/N] "
if /i not "!CONFIRM!"=="y" (
    echo.
    echo Cancelled.
    goto :END
)

echo.

:: ==============================================================
::                    Clean JS artifacts
:: ==============================================================
echo [1/5] Cleaning JS artifacts...

if exist "node_modules" (
    echo   Removing node_modules\ ...
    rmdir /s /q "node_modules" 2>nul
    echo   [OK] node_modules removed
) else (
    echo   [SKIP] node_modules not found
)

if exist "out" (
    echo   Removing out\ ...
    rmdir /s /q "out" 2>nul
    echo   [OK] out removed
) else (
    echo   [SKIP] out not found
)

if exist "dist" (
    echo   Removing dist\ ...
    rmdir /s /q "dist" 2>nul
    echo   [OK] dist removed
) else (
    echo   [SKIP] dist not found
)

if exist ".eslintcache" (
    del /f /q ".eslintcache" 2>nul
    echo   [OK] .eslintcache removed
)

echo.

:: ==============================================================
::                    Clean Rust artifacts
:: ==============================================================
echo [2/5] Cleaning Rust artifacts...

if exist "src-tauri\target" (
    echo   Removing src-tauri\target\ ...
    echo   This may take a moment for large build caches...
    rmdir /s /q "src-tauri\target" 2>nul
    echo   [OK] src-tauri\target removed
) else (
    echo   [SKIP] src-tauri\target not found
)

if exist "src-tauri\gen" (
    echo   Removing src-tauri\gen\ ...
    rmdir /s /q "src-tauri\gen" 2>nul
    echo   [OK] src-tauri\gen removed
) else (
    echo   [SKIP] src-tauri\gen not found
)

if exist "src-tauri\Cargo.lock" (
    del /f /q "src-tauri\Cargo.lock" 2>nul
    echo   [OK] src-tauri\Cargo.lock removed
) else (
    echo   [SKIP] src-tauri\Cargo.lock not found
)

echo.

:: ==============================================================
::                    Clean Electron build (legacy)
:: ==============================================================
echo [3/5] Cleaning Electron build output...

if exist "build" (
    echo   Removing build\ ...
    rmdir /s /q "build" 2>nul
    echo   [OK] build removed
) else (
    echo   [SKIP] build not found
)

echo.

:: ==============================================================
::                    Clean environment marker
:: ==============================================================
echo [4/5] Cleaning environment marker...

if exist ".tauri-env-ready" (
    del /f /q ".tauri-env-ready" 2>nul
    echo   [OK] .tauri-env-ready removed
) else (
    echo   [SKIP] .tauri-env-ready not found
)

echo.

:: ==============================================================
::                    Clean misc caches
:: ==============================================================
echo [5/5] Cleaning misc caches...

:: Yarn cache (project-level)
if exist ".yarn" (
    rmdir /s /q ".yarn" 2>nul
    echo   [OK] .yarn removed
)

:: Log files
del /f /q "yarn-error.log" 2>nul
del /f /q "npm-debug.log" 2>nul
del /f /q "npm-debug.log.*" 2>nul

echo   [OK] Log files cleaned
echo.

:: ==============================================================
::                    Summary
:: ==============================================================
echo ==============================================================
echo                     Clean Complete
echo ==============================================================
echo.
echo All caches and build artifacts have been removed.
echo.
echo Next steps:
echo   1. scripts\setup-tauri-env.cmd    Re-install dependencies
echo   2. scripts\dev-tauri.cmd          Debug build + run
echo      or
echo      scripts\build-tauri-portable.cmd  Release build
echo.

:END
echo Press any key to close...
pause >nul
exit /b 0
