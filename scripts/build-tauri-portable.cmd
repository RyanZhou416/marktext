@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

title MarkText Tauri Portable Build

echo.
echo ==============================================================
echo           MarkText Tauri Portable Build Script
echo ==============================================================
echo.
echo This script builds a portable version of MarkText using Tauri.
echo Prerequisites: Rust, Cargo, Tauri CLI, Node.js, Yarn
echo.

:: Change to project root
cd /d "%~dp0.."
echo Working directory: %CD%
echo.

:: ==============================================================
::                    Pre-Build Checks
:: ==============================================================
echo [Pre-check] Verifying build environment...
echo.

set "BUILD_READY=1"

:: ---------- Check Rust ----------
echo   Checking Rust...
where rustc >nul 2>&1
if errorlevel 1 (
    echo     [MISSING] Rust not installed
    echo              Install from: https://rustup.rs/
    set "BUILD_READY=0"
) else (
    for /f "tokens=*" %%v in ('rustc --version 2^>nul') do set "RUST_VER=%%v"
    echo     [OK] !RUST_VER!
)

:: ---------- Check Cargo ----------
echo   Checking Cargo...
where cargo >nul 2>&1
if errorlevel 1 (
    echo     [MISSING] Cargo not installed
    set "BUILD_READY=0"
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
    echo              Run: cargo install tauri-cli
    set "BUILD_READY=0"
)

:: ---------- Check Node.js ----------
echo   Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo     [MISSING] Node.js not installed
    set "BUILD_READY=0"
) else (
    for /f "tokens=*" %%v in ('node --version 2^>nul') do set "NODE_VER=%%v"
    echo     [OK] Node.js !NODE_VER!
)

:: ---------- Check Yarn ----------
echo   Checking Yarn...
where yarn >nul 2>&1
if errorlevel 1 (
    echo     [MISSING] Yarn not installed
    set "BUILD_READY=0"
) else (
    for /f "tokens=*" %%v in ('yarn --version 2^>nul') do set "YARN_VER=%%v"
    echo     [OK] Yarn !YARN_VER!
)

echo.

if "!BUILD_READY!"=="0" (
    echo [ERROR] Missing dependencies. Please install the above components.
    echo         Run: scripts\setup-tauri-env.cmd for detailed setup instructions.
    goto :ERROR_EXIT
)

:: ==============================================================
::                    Build Process
:: ==============================================================

:: ---------- Step 1: Install Dependencies ----------
echo [Step 1/4] Installing JavaScript dependencies...
call yarn install
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    goto :ERROR_EXIT
)
echo [OK] Dependencies installed
echo.

:: ---------- Step 2: Build Frontend ----------
echo [Step 2/4] Building frontend (electron-vite)...
call npx electron-vite build
if errorlevel 1 (
    echo [ERROR] Failed to build frontend
    goto :ERROR_EXIT
)
echo [OK] Frontend built
echo.

:: ---------- Step 3: Build Tauri Application ----------
echo [Step 3/4] Building Tauri application (Release)...
echo            This may take several minutes on first build...
echo.

:: Run tauri build (beforeBuildCommand is empty, frontend already built above)
call npx tauri build
:: Note: tauri build may return non-zero even on success (due to warnings)
:: We check for the actual executable to determine success

echo.

:: ---------- Step 4: Report Build Results ----------
echo [Step 4/4] Build results...
echo.

set "BUILD_DIR=src-tauri\target\release"
set "BUNDLE_DIR=src-tauri\target\release\bundle"

if exist "!BUILD_DIR!\marktext.exe" (
    echo [OK] Tauri executable built successfully!
    for %%A in ("!BUILD_DIR!\marktext.exe") do (
        set "SIZE_BYTES=%%~zA"
        set /a "SIZE_MB=!SIZE_BYTES! / 1048576"
    )
    echo     Executable: !BUILD_DIR!\marktext.exe
    echo     Size: ~!SIZE_MB! MB
    echo.
) else (
    echo [ERROR] Tauri build failed - executable not found in !BUILD_DIR!
    echo.
    echo Common issues:
    echo   - WebView2 not installed (required for Windows)
    echo   - Visual Studio C++ build tools missing
    echo   - Cargo build errors in src-tauri
    echo.
    goto :ERROR_EXIT
)

:: Check for bundled installers
if exist "!BUNDLE_DIR!\msi" (
    echo   MSI installer directory: !BUNDLE_DIR!\msi
    dir /b "!BUNDLE_DIR!\msi\*.msi" 2>nul
    echo.
)

if exist "!BUNDLE_DIR!\nsis" (
    echo   NSIS installer directory: !BUNDLE_DIR!\nsis
    dir /b "!BUNDLE_DIR!\nsis\*.exe" 2>nul
    echo.
)

:: ==============================================================
::                    Comparison with Electron
:: ==============================================================
echo.
echo ==============================================================
echo                  Build Size Comparison
echo ==============================================================
echo.

set "ELECTRON_DIR=build\win-unpacked"
if exist "!ELECTRON_DIR!\MarkText.exe" (
    echo Electron build:
    echo     Directory: !ELECTRON_DIR!
    for %%A in ("!ELECTRON_DIR!\MarkText.exe") do (
        set /a "ESIZE_MB=%%~zA / 1048576"
        echo     Main executable: ~!ESIZE_MB! MB
    )
) else (
    echo Electron build not found. Run build-win-portable.cmd first to compare.
)

echo.

if exist "!BUILD_DIR!\marktext.exe" (
    echo Tauri build:
    echo     Directory: !BUILD_DIR!
    echo     Main executable: ~!SIZE_MB! MB
)

echo.
echo ==============================================================
echo                     Build Complete
echo ==============================================================
echo.
echo To test the Tauri build:
echo   !BUILD_DIR!\marktext.exe
echo.
goto :END

:ERROR_EXIT
echo.
echo [ERROR] Build failed. Please check the errors above.

:END
echo.
echo Press any key to close...
pause >nul
exit /b 0
