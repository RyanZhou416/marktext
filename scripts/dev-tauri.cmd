@echo off
:: Thin wrapper for Windows double-click convenience.
:: Equivalent to: npm run dev
cd /d "%~dp0.."
call npm run dev
pause
