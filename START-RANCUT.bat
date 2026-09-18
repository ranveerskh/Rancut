@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js 22 LTS, then run this file again.
 pause
 exit /b 1
)
if not exist node_modules\.rancut-v040-ready (
 echo Installing RanCut dependencies. Internet is needed on the first run.
 call npm.cmd ci --no-audit --no-fund
 if errorlevel 1 (
  echo Setup failed. Read the error above and try again.
  pause
  exit /b 1
 )
 echo ready>node_modules\.rancut-v040-ready
)
echo RanCut opens at http://127.0.0.1:5173
echo Keep this window open while editing.
call npm.cmd run dev -- --open
pause
