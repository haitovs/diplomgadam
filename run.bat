@echo off
title Gadam Restaurant Finder
echo ============================================
echo    Gadam Restaurant Finder
echo    Design ^& Implementation Template
echo ============================================
echo.

:: Change to the script directory
cd /d "%~dp0"

:: Check if node_modules exist, install if not
if not exist "node_modules" (
    echo [*] Installing root dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install root dependencies!
        pause
        exit /b 1
    )
)

if not exist "frontend\node_modules" (
    echo [*] Installing frontend dependencies...
    call npm install --prefix frontend
    if errorlevel 1 (
        echo [ERROR] Failed to install frontend dependencies!
        pause
        exit /b 1
    )
)

if not exist "server\node_modules" (
    echo [*] Installing server dependencies...
    call npm install --prefix server
    if errorlevel 1 (
        echo [ERROR] Failed to install server dependencies!
        pause
        exit /b 1
    )
)

echo.
echo [*] Starting servers...
echo.
echo    - Frontend: http://localhost:5173
echo    - Backend API: http://localhost:4000
echo.
echo    Press Ctrl+C to stop both servers
echo ============================================
echo.

:: Run the development servers
call npm run dev

pause
