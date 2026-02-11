@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

title MarkText Tauri Portable Build

echo.
echo ==============================================================
echo           MarkText Tauri Portable Build Script
echo ==============================================================
echo.
echo   Responsibility: produce a release build (frontend + Rust).
echo   Run setup-tauri-env.cmd first if this is your first time.
echo.

:: Change to project root
cd /d "%~dp0.."
echo Working directory: %CD%
echo.

:: ==============================================================
::                    Quick sanity check
:: ==============================================================
:: We don't duplicate the full environment check here (that's setup's job).
:: Just verify the minimum so we fail fast with a clear message.

if not exist ".tauri-env-ready" (
    echo [WARN] Environment not set up yet.
    echo        Run scripts\setup-tauri-env.cmd first.
    echo.
    echo        Continuing anyway, tools may be available...
    echo.
)

set "BUILD_READY=1"
where rustc >nul 2>&1 || (echo   [MISSING] Rust & set "BUILD_READY=0")
where cargo >nul 2>&1 || (echo   [MISSING] Cargo & set "BUILD_READY=0")
where node  >nul 2>&1 || (echo   [MISSING] Node.js & set "BUILD_READY=0")
where npm   >nul 2>&1 || (echo   [MISSING] npm & set "BUILD_READY=0")

if "!BUILD_READY!"=="0" (
    echo.
    echo [ERROR] Missing tools. Run scripts\setup-tauri-env.cmd first.
    goto :ERROR_EXIT
)
echo [OK] Tools available
echo.

:: ==============================================================
::                    Build Process
:: ==============================================================

:: ---------- Step 1: Ensure JS dependencies ----------
:: Fast no-op if already installed; needed for tauri's beforeBuildCommand.
if not exist "node_modules\.package-lock.json" (
    echo [Step 1/2] Installing JS dependencies...
    cmd /c "npm install --legacy-peer-deps"
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        goto :ERROR_EXIT
    )
    echo [OK] Dependencies installed
    echo.
) else (
    echo [Step 1/2] JS dependencies already installed
    echo.
)

:: ---------- Step 2: Build Tauri Application (frontend + Rust) ----------
:: NOTE: "npx tauri build" automatically runs beforeBuildCommand ("npm run vite:build")
:: to build the frontend, then compiles Rust in release mode.
:: We do NOT build the frontend separately, that would compile it twice!
echo [Step 2/2] Building Tauri application (Release)...
echo            Frontend + Rust will be built by Tauri.
echo            This may take several minutes...
echo.

call npx tauri build

echo.

:: ==============================================================
::                    Build Results
:: ==============================================================

set "BUILD_DIR=src-tauri\target\release"
set "BUNDLE_DIR=src-tauri\target\release\bundle"

if exist "!BUILD_DIR!\marktext.exe" (
    echo [OK] Build successful!
    for %%A in ("!BUILD_DIR!\marktext.exe") do (
        set "SIZE_BYTES=%%~zA"
        set /a "SIZE_MB=!SIZE_BYTES! / 1048576"
    )
    echo     Executable: !BUILD_DIR!\marktext.exe
    echo     Size: ~!SIZE_MB! MB
    echo.
) else (
    echo [ERROR] Build failed - executable not found in !BUILD_DIR!
    echo.
    echo Common issues:
    echo   - WebView2 not installed, required for Windows
    echo   - Visual Studio C++ build tools missing
    echo   - Cargo build errors in src-tauri
    echo.
    goto :ERROR_EXIT
)

:: Check for bundled installers
if exist "!BUNDLE_DIR!\msi" (
    echo   MSI installer: !BUNDLE_DIR!\msi
    dir /b "!BUNDLE_DIR!\msi\*.msi" 2>nul
    echo.
)
if exist "!BUNDLE_DIR!\nsis" (
    echo   NSIS installer: !BUNDLE_DIR!\nsis
    dir /b "!BUNDLE_DIR!\nsis\*.exe" 2>nul
    echo.
)

:: ==============================================================
::                    Size Comparison
:: ==============================================================
echo.
set "ELECTRON_DIR=build\win-unpacked"
if exist "!ELECTRON_DIR!\MarkText.exe" (
    echo --- Build Size Comparison ---
    for %%A in ("!ELECTRON_DIR!\MarkText.exe") do (
        set /a "ESIZE_MB=%%~zA / 1048576"
    )
    echo   Electron: ~!ESIZE_MB! MB
    echo   Tauri:    ~!SIZE_MB! MB
    echo.
)

echo ==============================================================
echo                     Build Complete
echo ==============================================================
echo.
echo To test: !BUILD_DIR!\marktext.exe
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
