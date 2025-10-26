@echo off
echo ========================================
echo BookBuddy Backend - Development Server
echo ========================================
echo.

REM Check if .env file exists
if not exist .env (
    echo ERROR: .env file not found!
    echo Please run windows-setup.bat first or create .env file manually
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist node_modules (
    echo ERROR: Dependencies not installed!
    echo Please run: npm install
    pause
    exit /b 1
)

REM Start the development server
echo Starting BookBuddy backend server...
echo.
echo Server will be available at: http://localhost:5000
echo Health check: http://localhost:5000/health
echo API base: http://localhost:5000/api/v1
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev
