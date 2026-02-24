@echo off
:: MarkText - Installer Debug Build
:: Produces an installer (NSIS/MSI) with devtools enabled.
:: Output: src-tauri\target\debug\bundle\
cd /d "%~dp0.."
call npm run build:installer-debug
echo.
echo Build output: src-tauri\target\debug\bundle\
pause
