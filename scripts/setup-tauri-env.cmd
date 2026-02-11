@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

title MarkText Tauri Environment Setup

echo.
echo ==============================================================
echo           MarkText Tauri Development Environment Setup
echo ==============================================================
echo.
echo   Responsibility: check tools, install dependencies, warm caches.
echo   Run this ONCE before using dev-tauri.cmd or build-tauri-portable.cmd.
echo   Safe to re-run: skips steps that are already done.
echo.

:: Change to project root
cd /d "%~dp0.."
echo Working directory: %CD%
echo.

:: ==============================================================
::    Step 1: Check SYSTEM tools (must be pre-installed by user)
:: ==============================================================
echo [Step 1/4] Checking system tools...
echo.

set "MISSING_DEPS=0"
set "NEED_RUST=0"
set "NEED_WEBVIEW2=0"

:: ---------- Check Rust ----------
echo   Checking Rust...
where rustc >nul 2>&1
if errorlevel 1 (
    echo     [MISSING] Rust not installed
    set "MISSING_DEPS=1"
    set "NEED_RUST=1"
) else (
    for /f "tokens=*" %%v in ('rustc --version 2^>nul') do set "RUST_VER=%%v"
    echo     [OK] !RUST_VER!
)

:: ---------- Check Cargo ----------
echo   Checking Cargo...
where cargo >nul 2>&1
if errorlevel 1 (
    echo     [MISSING] Cargo not installed
    set "MISSING_DEPS=1"
    set "NEED_RUST=1"
) else (
    for /f "tokens=*" %%v in ('cargo --version 2^>nul') do set "CARGO_VER=%%v"
    echo     [OK] !CARGO_VER!
)

:: ---------- Check Node.js ----------
echo   Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo     [MISSING] Node.js not installed
    set "MISSING_DEPS=1"
) else (
    for /f "tokens=*" %%v in ('node --version 2^>nul') do set "NODE_VER=%%v"
    echo     [OK] Node.js !NODE_VER!
)

:: ---------- Check npm ----------
echo   Checking npm...
where npm >nul 2>&1
if errorlevel 1 (
    echo     [MISSING] npm not installed
    set "MISSING_DEPS=1"
) else (
    for /f "tokens=*" %%v in ('npm --version 2^>nul') do set "NPM_VER=%%v"
    echo     [OK] npm !NPM_VER!
)

:: ---------- Check WebView2 (Windows) ----------
echo   Checking WebView2 Runtime...
reg query "HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" /v pv >nul 2>&1
if errorlevel 1 (
    reg query "HKEY_CURRENT_USER\Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" /v pv >nul 2>&1
    if errorlevel 1 (
        if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
            echo     [OK] WebView2 available via Microsoft Edge
        ) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
            echo     [OK] WebView2 available via Microsoft Edge
        ) else (
            echo     [MISSING] WebView2 Runtime not found
            set "MISSING_DEPS=1"
            set "NEED_WEBVIEW2=1"
        )
    ) else (
        echo     [OK] WebView2 Runtime installed
    )
) else (
    echo     [OK] WebView2 Runtime installed
)

echo.

:: Show install guide if system tools are missing
if "!MISSING_DEPS!"=="0" goto :SYSTEM_OK

echo ==============================================================
echo              [ERROR] Missing System Dependencies
echo ==============================================================
echo.

if not "!NEED_RUST!"=="1" goto :SKIP_RUST
echo [Rust]
echo   1. Visit https://rustup.rs/
echo   2. Download and run rustup-init.exe
echo   3. Restart your terminal after installation
echo   Or: winget install Rustlang.Rustup
echo.
:SKIP_RUST

if not "!NEED_WEBVIEW2!"=="1" goto :SKIP_WEBVIEW2
echo [WebView2 Runtime]
echo   Install Microsoft Edge, or download from:
echo   https://developer.microsoft.com/en-us/microsoft-edge/webview2/
echo.
:SKIP_WEBVIEW2

echo Please install missing components and run this script again.
echo.
pause >nul
exit /b 1

:: ==============================================================
::    Step 2: Install JS dependencies
::    (must happen BEFORE Tauri CLI check, since Tauri CLI is
::     a devDependency in package.json — npx needs node_modules)
:: ==============================================================
:SYSTEM_OK
echo [Step 2/4] Installing JS dependencies...

if exist "node_modules\.package-lock.json" (
    echo   [SKIP] node_modules already exists
) else (
    echo   Running npm install...
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo   [ERROR] npm install failed
        goto :ERROR_EXIT
    )
    echo   [OK] JS dependencies installed
)

echo.

:: ==============================================================
::    Step 3: Check PROJECT tools + fetch Rust dependencies
::    (Tauri CLI comes from node_modules, so we check it here)
:: ==============================================================
echo [Step 3/4] Checking project tools and fetching Rust dependencies...
echo.

:: --- Check Tauri CLI (now node_modules exists) ---
echo   Checking Tauri CLI...
set "TAURI_FOUND=0"
where cargo-tauri >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=*" %%v in ('cargo-tauri --version 2^>nul') do set "TAURI_VER=%%v"
    set "TAURI_FOUND=1"
)
if "!TAURI_FOUND!"=="0" (
    call npx tauri --version >nul 2>&1
    if not errorlevel 1 (
        for /f "tokens=*" %%v in ('npx tauri --version 2^>nul') do set "TAURI_VER=%%v"
        set "TAURI_FOUND=1"
    )
)
if "!TAURI_FOUND!"=="1" (
    echo     [OK] Tauri CLI !TAURI_VER!
) else (
    echo     [ERROR] Tauri CLI not found even after npm install
    echo             Try: cargo install tauri-cli
    goto :ERROR_EXIT
)

:: --- Fetch Rust dependencies ---
if exist "src-tauri\target\.cargo-lock" (
    echo   [SKIP] Rust dependencies already fetched
) else (
    echo   Fetching Rust dependencies...
    pushd src-tauri
    call cargo fetch
    popd
    echo   [OK] Rust dependencies fetched
)

echo.

:: ==============================================================
::    Step 4: Write env-ready marker + show summary
:: ==============================================================
echo [Step 4/4] Finalizing...

echo %date% %time% > ".tauri-env-ready"
echo   [OK] Environment marker written
echo.

echo ==============================================================
echo          Tauri Development Environment Ready!
echo ==============================================================
echo.
echo   Rust:       !RUST_VER!
echo   Tauri CLI:  !TAURI_VER!
echo   Node.js:    !NODE_VER!
echo   npm:        !NPM_VER!
echo.
echo   Next steps:
echo     scripts\dev-tauri.cmd            Debug build + run
echo     scripts\build-tauri-portable.cmd Release build
echo.
goto :END

:ERROR_EXIT
echo.
echo [!] Setup failed. Please check the errors above.
echo.
pause >nul
exit /b 1

:END
echo Press any key to close...
pause >nul
exit /b 0
