@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

title MarkText Tauri Debug

echo.
echo ==============================================================
echo             MarkText Tauri Debug Build and Run
echo ==============================================================
echo.
echo   Responsibility: build debug binary, start dev server, launch app.
echo   Run setup-tauri-env.cmd first if this is your first time.
echo.

cd /d "%~dp0.."
echo Working directory: %CD%
echo.

:: ==============================================================
::                    Quick sanity check
:: ==============================================================
:: We don't do full environment checks here (that's setup's job).
:: Just verify the bare minimum so we fail fast with a clear message.

if not exist ".tauri-env-ready" (
    echo [WARN] Environment not set up yet.
    echo        Run scripts\setup-tauri-env.cmd first.
    echo.
    echo        Continuing anyway, tools may be available...
    echo.
)

where rustc >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Rust not found. Run scripts\setup-tauri-env.cmd first.
    goto :FAIL
)
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Run scripts\setup-tauri-env.cmd first.
    goto :FAIL
)

:: Ensure JS deps are present (fast no-op if already installed)
if not exist "node_modules\.package-lock.json" (
    echo [Step 0] Installing JS dependencies...
    cmd /c "npm install --legacy-peer-deps" >nul 2>&1
    echo [OK] Dependencies ready
    echo.
)

:: ==============================================================
::         Step 1: Build Rust debug binary (incremental)
:: ==============================================================
:: NOTE: We do NOT build the frontend here. Step 2 starts a Vite dev
:: server with hot-reload, which is much faster than a production build.

echo [Step 1/2] Building Tauri debug binary (incremental)...
echo.
pushd src-tauri
cmd /c "cargo build"
if errorlevel 1 (
    popd
    echo [ERROR] Cargo build failed
    goto :FAIL
)
popd

if not exist "src-tauri\target\debug\marktext.exe" (
    echo [ERROR] Debug executable not found
    goto :FAIL
)

echo.
echo [OK] Debug build complete
echo.

:: ==============================================================
::    Step 2: Start Vite dev server + launch MarkText
:: ==============================================================
echo [Step 2/2] Starting Vite dev server + MarkText...
echo.

:: Start Vite in a minimized window
start "MarkText-Vite" /min cmd /c "npx vite --config vite.config.mjs --port 5173"

:: Wait for dev server to be ready
echo Waiting for Vite dev server...
set WAIT_COUNT=0
:WAIT_LOOP
ping -n 2 127.0.0.1 >nul
set /a WAIT_COUNT+=1
netstat -an 2>nul | findstr ":5173 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 goto :SERVER_READY
if %WAIT_COUNT% geq 30 (
    echo [ERROR] Dev server did not start in 30 seconds
    goto :CLEANUP
)
echo   Waiting... %WAIT_COUNT%/30
goto :WAIT_LOOP

:SERVER_READY
echo [OK] Dev server ready on http://localhost:5173
echo.
echo ---------------------------------------------------------------
echo   MarkText is starting. Close the app window to stop.
echo ---------------------------------------------------------------
echo.

set RUST_LOG=info
"src-tauri\target\debug\marktext.exe"

:: ==============================================================
::                       Cleanup
:: ==============================================================
:CLEANUP
echo.
echo Stopping dev server...
taskkill /fi "WINDOWTITLE eq MarkText-Vite*" /f >nul 2>&1
echo [OK] Done
goto :DONE

:FAIL
echo.
echo [FAILED] Please check the errors above.
echo          If this is your first time, run: scripts\setup-tauri-env.cmd

:DONE
echo.
pause
