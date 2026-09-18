@echo off
setlocal
cd /d "%~dp0"
call npm ci --no-audit --no-fund
if errorlevel 1 goto failed
call npm run dist:win
if errorlevel 1 goto failed
echo Installer created in the release folder.
explorer "%~dp0release"
pause
exit /b 0
:failed
echo Build failed. Read the error above.
pause
exit /b 1
