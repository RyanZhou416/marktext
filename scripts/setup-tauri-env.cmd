@echo off
:: Thin wrapper for Windows double-click convenience.
:: Equivalent to: npm run setup
cd /d "%~dp0.."
call node scripts/setup.mjs
pause
