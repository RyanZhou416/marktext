@echo off
:: MarkText - Portable Release Build
:: Produces a standalone .exe without devtools (no installer).
:: Output: src-tauri\target\release\marktext.exe
cd /d "%~dp0.."
call npm run build:portable-release
echo.
echo Build output: src-tauri\target\release\marktext.exe
pause
