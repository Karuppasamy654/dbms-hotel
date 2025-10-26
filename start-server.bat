@echo off
title BookBuddy - Server
color 0B
echo.
echo ==========================================
echo    🚀 BOOKBUDDY BACKEND SERVER
echo ==========================================
echo.
echo Starting the server...
echo.
echo 📍 Server: http://localhost:5000
echo 📍 Health: http://localhost:5000/health
echo 📍 API: http://localhost:5000/api/v1
echo.
echo Press Ctrl+C to stop the server
echo.

REM Check if .env exists
if not exist .env (
    echo ❌ Configuration file not found!
    echo Please run easy-setup.bat first
    echo.
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist node_modules (
    echo ❌ Dependencies not installed!
    echo Please run easy-setup.bat first
    echo.
    pause
    exit /b 1
)

REM Start the server
npm run dev
