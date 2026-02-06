@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

title MarkText Tauri Environment Setup

echo.
echo ==============================================================
echo           MarkText Tauri Development Environment Setup
echo ==============================================================
echo.
echo This script sets up the Tauri development environment.
echo Prerequisites: Node.js, Yarn, Visual Studio with C++ (for Electron)
echo.

:: Change to project root
cd /d "%~dp0.."
echo Working directory: %CD%
echo.

:: ==============================================================
::                    Dependency Check
:: ==============================================================
echo [Pre-check] Checking Tauri dependencies...
echo.

set "MISSING_DEPS=0"
set "NEED_RUST=0"
set "NEED_TAURI_CLI=0"
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

:: ---------- Check Tauri CLI ----------
echo   Checking Tauri CLI...
set "TAURI_FOUND=0"
where cargo-tauri >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=*" %%v in ('cargo-tauri --version 2^>nul') do set "TAURI_VER=%%v"
    set "TAURI_FOUND=1"
)
if "!TAURI_FOUND!"=="0" (
    :: Also check via npx (project-local install)
    call npx tauri --version >nul 2>&1
    if not errorlevel 1 (
        for /f "tokens=*" %%v in ('npx tauri --version 2^>nul') do set "TAURI_VER=%%v"
        set "TAURI_FOUND=1"
    )
)
if "!TAURI_FOUND!"=="1" (
    echo     [OK] Tauri CLI !TAURI_VER!
) else (
    echo     [MISSING] Tauri CLI not installed
    set "MISSING_DEPS=1"
    set "NEED_TAURI_CLI=1"
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

:: ---------- Check Yarn ----------
echo   Checking Yarn...
where yarn >nul 2>&1
if errorlevel 1 (
    echo     [MISSING] Yarn not installed
    set "MISSING_DEPS=1"
) else (
    for /f "tokens=*" %%v in ('yarn --version 2^>nul') do set "YARN_VER=%%v"
    echo     [OK] Yarn !YARN_VER!
)

:: ---------- Check WebView2 (Windows) ----------
echo   Checking WebView2 Runtime...
reg query "HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" /v pv >nul 2>&1
if errorlevel 1 (
    reg query "HKEY_CURRENT_USER\Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" /v pv >nul 2>&1
    if errorlevel 1 (
        :: Check if Edge is installed (WebView2 is bundled with Edge)
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

:: ==============================================================
::              Check if any dependencies are missing
:: ==============================================================
if "!MISSING_DEPS!"=="0" goto :DEPS_OK

echo ==============================================================
echo                 [ERROR] Missing Dependencies
echo ==============================================================
echo.
echo -------------------- Installation Guide --------------------
echo.

if not "!NEED_RUST!"=="1" goto :SKIP_RUST
echo [Rust]
echo   1. Visit https://rustup.rs/
echo   2. Download and run rustup-init.exe
echo   3. Follow the installation prompts (default options are fine)
echo   4. Restart your terminal after installation
echo.
echo   Or run this in PowerShell:
echo     winget install Rustlang.Rustup
echo.
:SKIP_RUST

if not "!NEED_TAURI_CLI!"=="1" goto :SKIP_TAURI_CLI
echo [Tauri CLI]
echo   Option 1 - Via Cargo (after installing Rust):
echo     cargo install tauri-cli
echo.
echo   Option 2 - Via npm (already included in devDependencies):
echo     yarn install
echo     (Then use: npx tauri or yarn tauri:dev)
echo.
:SKIP_TAURI_CLI

if not "!NEED_WEBVIEW2!"=="1" goto :SKIP_WEBVIEW2
echo [WebView2 Runtime]
echo   1. Install Microsoft Edge (recommended)
echo   Or:
echo   2. Download WebView2 Runtime from:
echo      https://developer.microsoft.com/en-us/microsoft-edge/webview2/
echo.
:SKIP_WEBVIEW2

echo -------------------------------------------------------------
echo.
echo Please install missing components and run this script again.
echo.
echo Press any key to close...
pause >nul
exit /b 1

:: ==============================================================
::              All dependencies OK, start setup
:: ==============================================================
:DEPS_OK
echo [OK] All Tauri dependencies found!
echo.

:: ---------- Step 1: Install frontend dependencies ----------
echo [Step 1/4] Installing frontend dependencies...
if not exist "node_modules" (
    call yarn install --ignore-scripts
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        goto :ERROR_EXIT
    )
)
echo [OK] Frontend dependencies ready
echo.

:: ---------- Step 2: Build frontend ----------
echo [Step 2/4] Building frontend...
call yarn build
if errorlevel 1 (
    echo [ERROR] Failed to build frontend
    goto :ERROR_EXIT
)
echo [OK] Frontend built
echo.

:: ---------- Step 3: Install Tauri dependencies ----------
echo [Step 3/4] Installing Tauri Rust dependencies...
cd src-tauri
call cargo fetch
if errorlevel 1 (
    echo [WARN] Failed to fetch Rust dependencies (this may be normal for first run)
)
cd ..
echo [OK] Tauri dependencies fetched
echo.

:: ---------- Step 4: Verify Tauri build ----------
echo [Step 4/4] Verifying Tauri configuration...
call npx tauri info
if errorlevel 1 (
    echo [WARN] Could not get Tauri info (this may be normal for first run)
)

echo.
echo ==============================================================
echo              Tauri Development Environment Ready!
echo ==============================================================
echo.
echo Environment:
echo   Rust:       !RUST_VER!
echo   Tauri CLI:  !TAURI_VER!
echo   Node.js:    !NODE_VER!
echo   Yarn:       !YARN_VER!
echo.
echo Available commands:
echo   yarn tauri:dev     - Run Tauri in development mode
echo   yarn tauri:build   - Build Tauri application
echo.
echo Note: For Electron development, run setup-dev-env.cmd instead.
echo.
goto :END

:ERROR_EXIT
echo.
echo [!] Setup failed. Please check the errors above.
echo.
echo Press any key to close...
pause >nul
exit /b 1

:END
echo.
echo Press any key to close...
pause >nul
exit /b 0
