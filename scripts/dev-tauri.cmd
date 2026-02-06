@echo off
chcp 65001 >nul 2>&1

title MarkText Tauri Debug
echo.
echo ==============================================================
echo             MarkText Tauri Debug Build and Run
echo ==============================================================
echo.

cd /d "%~dp0.."
echo Working directory: %CD%
echo.

:: ---------- Pre-checks ----------
where rustc >nul 2>&1
if errorlevel 1 (
    echo [MISSING] Rust - install from https://rustup.rs/
    goto :FAIL
)
where node >nul 2>&1
if errorlevel 1 (
    echo [MISSING] Node.js
    goto :FAIL
)
where yarn >nul 2>&1
if errorlevel 1 (
    echo [MISSING] Yarn
    goto :FAIL
)
echo [OK] All tools found
echo.

:: ---------- Step 1: Dependencies ----------
echo [Step 1/4] Installing dependencies...
cmd /c "yarn install" >nul 2>&1
echo [OK] Dependencies ready
echo.

:: ---------- Step 2: Build frontend ----------
echo [Step 2/4] Building frontend...
cmd /c "npx vite build --config vite.config.mjs"
if errorlevel 1 (
    echo [ERROR] Frontend build failed
    goto :FAIL
)
echo [OK] Frontend built
echo.

:: ---------- Step 3: Cargo build debug ----------
echo [Step 3/4] Building Tauri debug binary...
echo            First build may take several minutes...
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

:: ---------- Step 4: Run ----------
echo [Step 4/4] Starting Vite dev server + MarkText...
echo.

:: Start Vite in a minimized window
start "MarkText-Vite" /min cmd /c "npx vite --config vite.config.mjs --port 5173"

:: Wait for dev server
echo Waiting for Vite dev server...
set WAIT_COUNT=0
:WAIT_LOOP
timeout /t 1 /nobreak >nul
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
echo [OK] Dev server ready
echo.
echo ---------------------------------------------------------------
echo   MarkText is starting. Close the app window to stop.
echo ---------------------------------------------------------------
echo.

set RUST_LOG=info
"src-tauri\target\debug\marktext.exe"

:: ---------- Cleanup ----------
:CLEANUP
echo.
echo Stopping dev server...
taskkill /fi "WINDOWTITLE eq MarkText-Vite*" /f >nul 2>&1
echo [OK] Done
goto :DONE

:FAIL
echo.
echo [FAILED] Please check the errors above.

:DONE
echo.
pause
