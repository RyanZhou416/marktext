@echo off
setlocal EnableDelayedExpansion

title MarkText Dev Environment Setup

echo.
echo ==============================================================
echo           MarkText Development Environment Setup
echo ==============================================================
echo.
echo Run this script once to initialize the development environment
echo.

:: Change to project root
cd /d "%~dp0.."
echo Working directory: %CD%
echo.

:: Set PATH
set "PATH=%APPDATA%\npm;%ProgramFiles%\nodejs;%LOCALAPPDATA%\Programs\Python\Python312;%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python310;%PATH%"

:: ==============================================================
::                    Dependency Check
:: ==============================================================
echo [Pre-check] Checking dependencies...
echo.

set "MISSING_DEPS=0"
set "NEED_NODEJS=0"
set "NEED_YARN=0"
set "NEED_PYTHON=0"
set "NEED_VS=0"
set "NEED_VS_CPP=0"
set "NEED_SPECTRE=0"

:: ---------- Check Node.js ----------
echo   Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo     [MISSING] Node.js not installed
    set "MISSING_DEPS=1"
    set "NEED_NODEJS=1"
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
    set "NEED_NODEJS=1"
) else (
    for /f "tokens=*" %%v in ('npm --version 2^>nul') do set "NPM_VER=%%v"
    echo     [OK] npm !NPM_VER!
)

:: ---------- Check Yarn ----------
echo   Checking Yarn...
where yarn >nul 2>&1
if errorlevel 1 (
    echo     [MISSING] Yarn not installed
    set "MISSING_DEPS=1"
    set "NEED_YARN=1"
) else (
    for /f "tokens=*" %%v in ('yarn --version 2^>nul') do set "YARN_VER=%%v"
    echo     [OK] Yarn !YARN_VER!
)

:: ---------- Check Python ----------
echo   Checking Python...
where python >nul 2>&1
if errorlevel 1 (
    where py >nul 2>&1
    if errorlevel 1 (
        echo     [MISSING] Python not installed
        set "MISSING_DEPS=1"
        set "NEED_PYTHON=1"
    ) else (
        for /f "tokens=*" %%v in ('py --version 2^>nul') do set "PY_VER=%%v"
        echo     [OK] !PY_VER!
    )
) else (
    for /f "tokens=*" %%v in ('python --version 2^>nul') do set "PY_VER=%%v"
    echo     [OK] !PY_VER!
)

:: ---------- Check Visual Studio ----------
echo   Checking Visual Studio...
set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
if not exist "%VSWHERE%" (
    echo     [MISSING] Visual Studio not installed
    set "MISSING_DEPS=1"
    set "NEED_VS=1"
    goto :VS_CHECK_DONE
)

:: Look for VS with C++ tools installed (required for native modules)
:: Priority: VS 2022 with C++ > VS 2019 with C++ > Any VS with C++
echo     Scanning for Visual Studio with C++ Build Tools...
set "VSINSTALL="
set "VS_VER="
set "VS_YEAR="
set "VS_HAS_CPP=0"

:: Check VS 2022 editions with C++ tools
if exist "%ProgramFiles%\Microsoft Visual Studio\2022\Community\VC\Tools\MSVC" (
    set "VSINSTALL=%ProgramFiles%\Microsoft Visual Studio\2022\Community"
    set "VS_VER=2022 Community"
    set "VS_YEAR=2022"
    set "VS_HAS_CPP=1"
    echo     [OK] Found VS 2022 Community with C++ tools
    goto :VS_FOUND
)
if exist "%ProgramFiles%\Microsoft Visual Studio\2022\Professional\VC\Tools\MSVC" (
    set "VSINSTALL=%ProgramFiles%\Microsoft Visual Studio\2022\Professional"
    set "VS_VER=2022 Professional"
    set "VS_YEAR=2022"
    set "VS_HAS_CPP=1"
    echo     [OK] Found VS 2022 Professional with C++ tools
    goto :VS_FOUND
)
if exist "%ProgramFiles%\Microsoft Visual Studio\2022\Enterprise\VC\Tools\MSVC" (
    set "VSINSTALL=%ProgramFiles%\Microsoft Visual Studio\2022\Enterprise"
    set "VS_VER=2022 Enterprise"
    set "VS_YEAR=2022"
    set "VS_HAS_CPP=1"
    echo     [OK] Found VS 2022 Enterprise with C++ tools
    goto :VS_FOUND
)
if exist "%ProgramFiles%\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC" (
    set "VSINSTALL=%ProgramFiles%\Microsoft Visual Studio\2022\BuildTools"
    set "VS_VER=2022 Build Tools"
    set "VS_YEAR=2022"
    set "VS_HAS_CPP=1"
    echo     [OK] Found VS 2022 Build Tools with C++ tools
    goto :VS_FOUND
)

:: Check VS 2019 editions with C++ tools
if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\2019\Community\VC\Tools\MSVC" (
    set "VSINSTALL=%ProgramFiles(x86)%\Microsoft Visual Studio\2019\Community"
    set "VS_VER=2019 Community"
    set "VS_YEAR=2019"
    set "VS_HAS_CPP=1"
    echo     [OK] Found VS 2019 Community with C++ tools
    goto :VS_FOUND
)
if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\2019\Professional\VC\Tools\MSVC" (
    set "VSINSTALL=%ProgramFiles(x86)%\Microsoft Visual Studio\2019\Professional"
    set "VS_VER=2019 Professional"
    set "VS_YEAR=2019"
    set "VS_HAS_CPP=1"
    echo     [OK] Found VS 2019 Professional with C++ tools
    goto :VS_FOUND
)
if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\2019\BuildTools\VC\Tools\MSVC" (
    set "VSINSTALL=%ProgramFiles(x86)%\Microsoft Visual Studio\2019\BuildTools"
    set "VS_VER=2019 Build Tools"
    set "VS_YEAR=2019"
    set "VS_HAS_CPP=1"
    echo     [OK] Found VS 2019 Build Tools with C++ tools
    goto :VS_FOUND
)

:: No VS with C++ found, check what VS installations exist
echo     [WARN] No Visual Studio with C++ Build Tools found
echo.
echo     Installed Visual Studio versions (without C++ tools):

:: Check if VS 2022 exists but without C++
if exist "%ProgramFiles%\Microsoft Visual Studio\2022\Community" (
    echo       - VS 2022 Community [C++ NOT INSTALLED]
    set "VS_INSTALLED_NO_CPP=1"
)
if exist "%ProgramFiles%\Microsoft Visual Studio\2022\Professional" (
    echo       - VS 2022 Professional [C++ NOT INSTALLED]
    set "VS_INSTALLED_NO_CPP=1"
)

:: Check if VS 2019 exists but without C++
if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\2019\Community" (
    echo       - VS 2019 Community [C++ NOT INSTALLED]
    set "VS_INSTALLED_NO_CPP=1"
)

:: Check newer VS versions (not supported by node-gyp yet)
if exist "%ProgramFiles%\Microsoft Visual Studio\18\Community" (
    echo       - VS 2026 [NOT SUPPORTED by node-gyp yet]
)

if defined VS_INSTALLED_NO_CPP (
    echo.
    echo     [MISSING] C++ Build Tools required
    set "MISSING_DEPS=1"
    set "NEED_VS_CPP=1"
) else (
    echo     [MISSING] Visual Studio 2019 or 2022 with C++ tools required
    set "MISSING_DEPS=1"
    set "NEED_VS=1"
)
goto :VS_CHECK_DONE

:VS_FOUND
echo          Path: !VSINSTALL!

:: Check for Spectre-mitigated libraries
set "SPECTRE_FOUND=0"
for /d %%d in ("!VSINSTALL!\VC\Tools\MSVC\*") do (
    if exist "%%d\lib\spectre" (
        set "SPECTRE_FOUND=1"
    )
)
if "!SPECTRE_FOUND!"=="1" (
    echo          Spectre-mitigated libs: Installed
) else (
    echo     [MISSING] Spectre-mitigated libraries not installed
    set "MISSING_DEPS=1"
    set "NEED_SPECTRE=1"
)

:VS_CHECK_DONE

:: ---------- Check Git (optional) ----------
echo   Checking Git...
where git >nul 2>&1
if errorlevel 1 (
    echo     [WARN] Git not installed (optional)
) else (
    for /f "tokens=*" %%v in ('git --version 2^>nul') do set "GIT_VER=%%v"
    echo     [OK] !GIT_VER!
)

:: ---------- Check Rust (optional, for Tauri development) ----------
echo   Checking Rust (optional, for Tauri)...
where rustc >nul 2>&1
if errorlevel 1 (
    echo     [INFO] Rust not installed (only needed for Tauri development)
    echo            Run setup-tauri-env.cmd if you want to build the Tauri version
) else (
    for /f "tokens=*" %%v in ('rustc --version 2^>nul') do set "RUST_VER=%%v"
    echo     [OK] !RUST_VER! (for Tauri development)
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

if not "!NEED_NODEJS!"=="1" goto :SKIP_NODEJS
echo [Node.js]
echo   1. Visit https://nodejs.org/
echo   2. Download LTS version
echo   3. Check "Add to PATH" during installation
echo   4. Restart terminal after installation
echo.
:SKIP_NODEJS

if not "!NEED_YARN!"=="1" goto :SKIP_YARN
echo [Yarn]
echo   Run in a new terminal:
echo     npm install -g yarn
echo.
:SKIP_YARN

if not "!NEED_PYTHON!"=="1" goto :SKIP_PYTHON
echo [Python]
echo   1. Visit https://www.python.org/downloads/
echo   2. Check "Add Python to PATH" during installation
echo.
:SKIP_PYTHON

if not "!NEED_VS!"=="1" goto :SKIP_VS
echo [Visual Studio]
echo   1. Visit https://visualstudio.microsoft.com/downloads/
echo   2. Download Visual Studio 2022 Community - free
echo   3. Select "Desktop development with C++" workload
echo.
:SKIP_VS

if not "!NEED_VS_CPP!"=="1" goto :SKIP_VS_CPP
echo [Visual Studio C++ Build Tools]
echo   Your Visual Studio is missing C++ tools. To fix:
echo   1. Open "Visual Studio Installer" - search in Start menu
echo   2. Find your VS 2022 installation, click "Modify"
echo   3. Check "Desktop development with C++" workload
echo   4. Click "Modify" to install
echo.
echo   Note: VS 2026 is not yet supported by node-gyp.
echo   Please install C++ tools in VS 2022 or VS 2019.
echo.
:SKIP_VS_CPP

if not "!NEED_SPECTRE!"=="1" goto :SKIP_SPECTRE
echo [Spectre-mitigated Libraries]
echo   Your Visual Studio is missing Spectre-mitigated libraries. To fix:
echo   1. Open "Visual Studio Installer" - search in Start menu
echo   2. Find your VS !VS_YEAR! installation, click "Modify"
echo   3. Go to "Individual components" tab
echo   4. Search for "spectre" and check:
echo      "MSVC v143 - VS 2022 C++ x64/x86 Spectre-mitigated libs"
echo   5. Click "Modify" to install
echo.
:SKIP_SPECTRE

echo -------------------------------------------------------------
echo.
echo Please install missing components and run this script again.
echo.
pause
exit /b 1

:: ==============================================================
::              All dependencies OK, start initialization
:: ==============================================================
:DEPS_OK
echo [OK] All dependencies found!
echo.

:: Use detected VS version
set "npm_config_msvs_version=!VS_YEAR!"
set "GYP_MSVS_VERSION=!VS_YEAR!"
echo Using Visual Studio !VS_YEAR!
echo   VS Path: !VSINSTALL!
echo.

:: ---------- Step 1/5: Install dependencies ----------
echo [Step 1/5] Installing dependencies...
call yarn install --ignore-scripts
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    echo   Try: yarn config set registry https://registry.npmmirror.com
    pause
    exit /b 1
)
echo [OK] Dependencies installed
echo.

:: ---------- Step 2/5: Install Electron ----------
echo [Step 2/5] Installing Electron...
call node node_modules/electron/install.js
if errorlevel 1 (
    echo [ERROR] Failed to install Electron
    echo   Try: set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
    pause
    exit /b 1
)
echo [OK] Electron installed
echo.

:: ---------- Step 3/5: Rebuild native modules ----------
echo [Step 3/5] Rebuilding native modules...
if exist "node_modules\fontmanager-redux\build" rd /s /q "node_modules\fontmanager-redux\build" 2>nul
if exist "node_modules\native-keymap\build" rd /s /q "node_modules\native-keymap\build" 2>nul

:: Setup VS environment for node-gyp
echo   Setting up Visual Studio !VS_YEAR! environment...

:: Load VS environment
if exist "!VSINSTALL!\VC\Auxiliary\Build\vcvars64.bat" (
    echo   Loading vcvars64.bat...
    call "!VSINSTALL!\VC\Auxiliary\Build\vcvars64.bat" >nul 2>&1
)

:: Set environment variables for node-gyp
set "GYP_MSVS_VERSION=!VS_YEAR!"
set "npm_config_msvs_version=!VS_YEAR!"

echo   Rebuilding native modules with VS !VS_YEAR!...
call node node_modules/@electron/rebuild/lib/cli.js -f --msvs-version=!VS_YEAR!
if errorlevel 1 (
    echo [WARN] First attempt failed, trying with npm config...
    
    :: Set npm config and retry
    call npm config set msvs_version !VS_YEAR!
    call node node_modules/@electron/rebuild/lib/cli.js -f --msvs-version=!VS_YEAR!
    if errorlevel 1 (
        echo [ERROR] Failed to rebuild native modules
        echo.
        echo Possible solutions:
        echo   1. Open "Developer Command Prompt for VS !VS_YEAR!" and run this script
        echo   2. Make sure "Desktop development with C++" workload is installed
        echo   3. Run: npm config set msvs_version !VS_YEAR!
        echo.
        pause
        exit /b 1
    )
)
echo [OK] Native modules rebuilt
echo.

:: ---------- Step 4/5: Run postinstall ----------
echo [Step 4/5] Running postinstall...
call node .electron-vue/postinstall.js 2>nul
echo [OK] Postinstall done
echo.

:: ---------- Step 5/5: Lint fix ----------
echo [Step 5/5] Running lint fix...
call node node_modules/eslint/bin/eslint.js --ext .js,.vue -f ./node_modules/eslint-friendly-formatter --fix src test 2>nul
echo [OK] Lint fix done

echo.
echo ==============================================================
echo              Development Environment Ready!
echo ==============================================================
echo.
echo Environment:
echo   Node.js:       !NODE_VER!
echo   Yarn:          !YARN_VER!
echo   Visual Studio: !VS_VER!
echo.
echo You can now run: yarn dev
echo.
pause
exit /b 0
