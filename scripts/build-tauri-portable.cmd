@echo off
:: Thin wrapper for Windows double-click convenience.
:: Equivalent to: npm run build
cd /d "%~dp0.."
call npm run build
echo.
echo Build output: src-tauri\target\release\marktext.exe
pause
