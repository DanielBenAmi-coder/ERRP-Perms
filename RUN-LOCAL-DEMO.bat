@echo off
setlocal
title ERRP Perms - Local Demo
cd /d "%~dp0"

echo ===================================================
echo          ERRP Perms - Local Demo
echo ===================================================
echo.
echo This preview runs only on this computer.
echo Nothing is uploaded or permanently saved.
echo.
echo Normal staff: leave Higher Staff code empty.
echo Higher Staff demo code: ERPermissionReport
echo.

set "LOCAL_DEMO_MODE=true"
set "AUTH_SECRET=local-demo-secret-for-preview-only-do-not-use-in-production"
set "APP_URL=http://localhost:3000"
set "APP_TIMEZONE=Asia/Jerusalem"

echo Installing packages if needed...
call pnpm install
if errorlevel 1 goto failed

echo Opening http://localhost:3000 ...
start "" "http://localhost:3000"
echo.
echo Keep this window open while using the demo.
echo Press Ctrl+C to stop the website.
echo.
call pnpm dev
exit /b 0

:failed
echo.
echo Could not start the local demo. Read the error above.
pause
exit /b 1
