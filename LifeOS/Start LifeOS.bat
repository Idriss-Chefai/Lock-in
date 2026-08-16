@echo off
cd /d "%~dp0app"

if not exist node_modules (
  echo Installing dependencies for the first time, this may take a minute...
  call npm install
  if errorlevel 1 (
    echo.
    echo Install failed. Make sure Node.js is installed: https://nodejs.org
    pause
    exit /b 1
  )
)

echo Starting LifeOS...
call npm run dev
pause
