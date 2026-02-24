@echo off
:: MarkText - Dev Run (hot reload + devtools)
:: Starts Vite dev server + Tauri with devtools enabled.
cd /d "%~dp0.."
call npm run dev
pause
