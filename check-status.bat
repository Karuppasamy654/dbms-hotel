@echo off
echo ========================================
echo BookBuddy Backend - System Status Check
echo ========================================
echo.

REM Check Node.js
echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
) else (
    for /f "tokens=*" %%i in ('node --version') do echo ✓ Node.js version: %%i
)

REM Check npm
echo.
echo Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not available
) else (
    for /f "tokens=*" %%i in ('npm --version') do echo ✓ npm version: %%i
)

REM Check PostgreSQL
echo.
echo Checking PostgreSQL...
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PostgreSQL command line tools not found
    echo Please ensure PostgreSQL is installed and psql is in PATH
) else (
    for /f "tokens=*" %%i in ('psql --version') do echo ✓ PostgreSQL version: %%i
)

REM Check if .env file exists
echo.
echo Checking configuration...
if exist .env (
    echo ✓ .env file exists
) else (
    echo ❌ .env file not found
    echo Please run windows-setup.bat first
)

REM Check if node_modules exists
if exist node_modules (
    echo ✓ Dependencies installed
) else (
    echo ❌ Dependencies not installed
    echo Please run: npm install
)

REM Check if databases exist
echo.
echo Checking databases...
psql -U postgres -d bookbuddy_dev -c "SELECT 1;" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ bookbuddy_dev database not found
    echo Please create it using pgAdmin 4 or run: createdb -U postgres bookbuddy_dev
) else (
    echo ✓ bookbuddy_dev database exists
)

psql -U postgres -d bookbuddy_test -c "SELECT 1;" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ bookbuddy_test database not found
    echo Please create it using pgAdmin 4 or run: createdb -U postgres bookbuddy_test
) else (
    echo ✓ bookbuddy_test database exists
)

REM Check if server is running
echo.
echo Checking if server is running...
curl -s http://localhost:5000/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Server is not running
    echo Start the server with: npm run dev
) else (
    echo ✓ Server is running on http://localhost:5000
)

REM Check port usage
echo.
echo Checking port usage...
netstat -ano | findstr :5000 >nul 2>&1
if %errorlevel% neq 0 (
    echo ✓ Port 5000 is available
) else (
    echo ⚠️  Port 5000 is in use
    echo Run: netstat -ano ^| findstr :5000 to see which process is using it
)

netstat -ano | findstr :5432 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PostgreSQL is not running on port 5432
    echo Please start PostgreSQL service
) else (
    echo ✓ PostgreSQL is running on port 5432
)

echo.
echo ========================================
echo Status check completed!
echo ========================================
echo.
echo If you see any ❌ errors, please fix them before starting the server.
echo.
pause
