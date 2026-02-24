@echo off
:: MarkText - Portable Debug Build
:: Produces a standalone .exe with devtools enabled (no installer).
:: Output: src-tauri\target\debug\marktext.exe
cd /d "%~dp0.."
call npm run build:portable-debug
echo.
echo Build output: src-tauri\target\debug\marktext.exe
pause
