@echo off
:: MarkText - Installer Release Build
:: Produces an installer (NSIS/MSI) without devtools.
:: Output: src-tauri\target\release\bundle\
cd /d "%~dp0.."
call npm run build:installer-release
echo.
echo Build output: src-tauri\target\release\bundle\
pause
