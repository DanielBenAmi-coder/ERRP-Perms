@echo off
setlocal
title ERRP Perms - Vercel Deployment
echo ===================================================
echo          ERRP Perms - Vercel Deployment
echo ===================================================
echo.
echo [1/4] Installing packages...
call pnpm install
if errorlevel 1 goto failed

echo.
echo [2/4] Running tests...
call pnpm test
if errorlevel 1 goto failed

echo.
echo [3/4] Building production website...
call pnpm build
if errorlevel 1 goto failed

echo.
echo [4/4] Opening Vercel deployment...
call pnpm dlx vercel@latest --prod
if errorlevel 1 goto failed

echo.
echo ===================================================
echo DEPLOYMENT COMPLETE
echo ===================================================
pause
exit /b 0

:failed
echo.
echo ===================================================
echo DEPLOYMENT FAILED - read the error above.
echo ===================================================
pause
exit /b 1
