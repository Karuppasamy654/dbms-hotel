@echo off
title BookBuddy - Easy Setup
color 0A
echo.
echo ==========================================
echo    🚀 BOOKBUDDY BACKEND - EASY SETUP
echo ==========================================
echo.
echo This will set up everything automatically!
echo.

REM Check Node.js
echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found!
    echo.
    echo Please install Node.js first:
    echo 1. Go to https://nodejs.org/
    echo 2. Download the LTS version
    echo 3. Install it
    echo 4. Run this script again
    echo.
    pause
    exit /b 1
)
echo ✅ Node.js found!

REM Check PostgreSQL
echo Checking PostgreSQL...
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PostgreSQL not found!
    echo.
    echo Please install PostgreSQL first:
    echo 1. Go to https://www.postgresql.org/download/windows/
    echo 2. Download and install PostgreSQL
    echo 3. Remember the password you set!
    echo 4. Run this script again
    echo.
    pause
    exit /b 1
)
echo ✅ PostgreSQL found!

echo.
echo Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed!

echo.
echo Setting up database...
echo Please enter your PostgreSQL password when prompted:

REM Create .env file
if not exist .env (
    echo Creating configuration file...
    (
        echo # Server Configuration
        echo PORT=5000
        echo NODE_ENV=development
        echo.
        echo # Database Configuration
        echo DB_HOST=localhost
        echo DB_PORT=5432
        echo DB_NAME=bookbuddy_dev
        echo DB_USER=postgres
        echo DB_PASSWORD=your-postgres-password
        echo DB_SSL=false
        echo.
        echo # JWT Configuration
        echo JWT_SECRET=your-super-secret-jwt-key-here
        echo JWT_EXPIRE=7d
        echo JWT_REFRESH_SECRET=your-refresh-secret-key-here
        echo JWT_REFRESH_EXPIRE=30d
        echo.
        echo # Email Configuration
        echo EMAIL_HOST=smtp.gmail.com
        echo EMAIL_PORT=587
        echo EMAIL_USER=your-email@gmail.com
        echo EMAIL_PASS=your-app-password
        echo EMAIL_FROM=BookBuddy ^<noreply@bookbuddy.com^>
        echo.
        echo # Payment Configuration
        echo RAZORPAY_KEY_ID=your-razorpay-key-id
        echo RAZORPAY_KEY_SECRET=your-razorpay-key-secret
        echo STRIPE_SECRET_KEY=your-stripe-secret-key
        echo.
        echo # Cloudinary Configuration
        echo CLOUDINARY_CLOUD_NAME=your-cloud-name
        echo CLOUDINARY_API_KEY=your-api-key
        echo CLOUDINARY_API_SECRET=your-api-secret
    ) > .env
    echo ✅ Configuration file created!
    echo.
    echo ⚠️  IMPORTANT: Please edit .env file and update the database password!
    echo.
)

REM Create databases
echo Creating databases...
createdb -U postgres bookbuddy_dev 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Database might already exist, continuing...
)
createdb -U postgres bookbuddy_test 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Test database might already exist, continuing...
)
echo ✅ Databases ready!

echo.
echo Adding sample data...
npm run seed
if %errorlevel% neq 0 (
    echo ❌ Failed to add sample data
    echo Please check your database password in .env file
    echo.
    echo To fix this:
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
echo           🎉 SETUP COMPLETE! 🎉
echo ==========================================
echo.
echo Your BookBuddy backend is ready!
echo.
echo 📍 Server: http://localhost:5000
echo 📍 Health: http://localhost:5000/health
echo 📍 API: http://localhost:5000/api/v1
echo.
echo 🔑 Login Credentials:
echo    Admin: admin@bookbuddy.com / admin123
echo    Manager: rajesh@bookbuddy.com / manager123
echo    Customer: amit@example.com / customer123
echo.
echo 🚀 To start the server, run: start-server.bat
echo.
pause
