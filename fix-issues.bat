@echo off
title BookBuddy - Fix Issues
color 0E
echo.
echo ==========================================
echo    🔧 BOOKBUDDY - FIX ISSUES
echo ==========================================
echo.
echo This will try to fix common problems...
echo.

REM Check Node.js
echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found!
    echo.
    echo SOLUTION:
    echo 1. Go to https://nodejs.org/
    echo 2. Download and install Node.js
    echo 3. Restart your computer
    echo 4. Try again
    echo.
    pause
    exit /b 1
)
echo ✅ Node.js is working!

REM Check PostgreSQL
echo Checking PostgreSQL...
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PostgreSQL not found!
    echo.
    echo SOLUTION:
    echo 1. Go to https://www.postgresql.org/download/windows/
    echo 2. Download and install PostgreSQL
    echo 3. Remember the password you set!
    echo 4. Try again
    echo.
    pause
    exit /b 1
)
echo ✅ PostgreSQL is working!

REM Fix dependencies
echo.
echo Fixing dependencies...
if exist node_modules (
    echo Removing old dependencies...
    rmdir /s /q node_modules
)
if exist package-lock.json (
    echo Removing old lock file...
    del package-lock.json
)
echo Installing fresh dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    echo.
    echo SOLUTION:
    echo 1. Check your internet connection
    echo 2. Try running as Administrator
    echo 3. Clear npm cache: npm cache clean --force
    echo.
    pause
    exit /b 1
)
echo ✅ Dependencies fixed!

REM Fix database
echo.
echo Fixing database...
echo Please enter your PostgreSQL password when prompted:

REM Drop and recreate databases
echo Dropping old databases...
psql -U postgres -c "DROP DATABASE IF EXISTS bookbuddy_dev;" 2>nul
psql -U postgres -c "DROP DATABASE IF EXISTS bookbuddy_test;" 2>nul

echo Creating fresh databases...
createdb -U postgres bookbuddy_dev
if %errorlevel% neq 0 (
    echo ❌ Failed to create database
    echo.
    echo SOLUTION:
    echo 1. Check your PostgreSQL password
    echo 2. Make sure PostgreSQL is running
    echo 3. Try running as Administrator
    echo.
    pause
    exit /b 1
)
createdb -U postgres bookbuddy_test
echo ✅ Database fixed!

REM Fix configuration
echo.
echo Fixing configuration...
if not exist .env (
    echo Creating .env file...
    copy env.example .env
    echo ✅ Configuration file created!
    echo.
    echo ⚠️  IMPORTANT: Please edit .env file and update the database password!
    echo.
)

REM Add sample data
echo Adding sample data...
npm run seed
if %errorlevel% neq 0 (
    echo ❌ Failed to add sample data
    echo.
    echo SOLUTION:
    echo 1. Open .env file
    echo 2. Update DB_PASSWORD with your PostgreSQL password
    echo 3. Run this script again
    echo.
    pause
    exit /b 1
)
echo ✅ Sample data added!

echo.
echo ==========================================
echo           🎉 ALL ISSUES FIXED! 🎉
echo ==========================================
echo.
echo Your BookBuddy backend should work now!
echo.
echo 🚀 To start the server, run: start-server.bat
echo.
pause
