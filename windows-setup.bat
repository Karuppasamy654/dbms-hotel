@echo off
echo ========================================
echo BookBuddy Backend - Windows Setup Script
echo ========================================
echo.

REM Check if Node.js is installed
echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo ✓ Node.js is installed

REM Check if npm is available
echo Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not available!
    pause
    exit /b 1
)
echo ✓ npm is available

REM Check if PostgreSQL is installed
echo Checking PostgreSQL installation...
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: PostgreSQL command line tools not found in PATH
    echo Please ensure PostgreSQL is installed and psql is accessible
    echo You can also use pgAdmin 4 to create databases
)

REM Install dependencies
echo.
echo Installing Node.js dependencies...
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)
echo ✓ Dependencies installed successfully

REM Create .env file if it doesn't exist
if not exist .env (
    echo.
    echo Creating .env file from template...
    copy env.example .env
    echo ✓ .env file created
    echo.
    echo IMPORTANT: Please edit .env file with your database credentials!
    echo.
) else (
    echo ✓ .env file already exists
)

REM Check if databases exist
echo.
echo Checking PostgreSQL databases...
echo Please enter your PostgreSQL password when prompted:

REM Try to connect to bookbuddy_dev database
psql -U postgres -d bookbuddy_dev -c "SELECT 1;" >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo Creating databases...
    echo Creating bookbuddy_dev database...
    createdb -U postgres bookbuddy_dev
    if %errorlevel% neq 0 (
        echo WARNING: Could not create bookbuddy_dev database
        echo Please create it manually using pgAdmin 4 or psql
    ) else (
        echo ✓ bookbuddy_dev database created
    )
    
    echo Creating bookbuddy_test database...
    createdb -U postgres bookbuddy_test
    if %errorlevel% neq 0 (
        echo WARNING: Could not create bookbuddy_test database
        echo Please create it manually using pgAdmin 4 or psql
    ) else (
        echo ✓ bookbuddy_test database created
    )
) else (
    echo ✓ bookbuddy_dev database exists
)

REM Run database seeding
echo.
echo Seeding database with sample data...
npm run seed
if %errorlevel% neq 0 (
    echo WARNING: Database seeding failed!
    echo Please check your database connection settings in .env file
) else (
    echo ✓ Database seeded successfully
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Edit .env file with your database credentials
echo 2. Run: npm run dev
echo 3. Visit: http://localhost:5000/health
echo.
echo Default login credentials:
echo - Admin: admin@bookbuddy.com / admin123
echo - Manager: rajesh@bookbuddy.com / manager123
echo - Customer: amit@example.com / customer123
echo.
pause
