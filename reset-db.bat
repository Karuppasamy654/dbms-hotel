@echo off
echo ========================================
echo BookBuddy Backend - Database Reset
echo ========================================
echo.
echo WARNING: This will delete all data in the database!
echo.

set /p confirm="Are you sure you want to reset the database? (y/N): "
if /i not "%confirm%"=="y" (
    echo Database reset cancelled.
    pause
    exit /b 0
)

echo.
echo Dropping and recreating databases...

REM Drop databases
echo Dropping bookbuddy_dev database...
psql -U postgres -c "DROP DATABASE IF EXISTS bookbuddy_dev;"
if %errorlevel% neq 0 (
    echo WARNING: Could not drop bookbuddy_dev database
)

echo Dropping bookbuddy_test database...
psql -U postgres -c "DROP DATABASE IF EXISTS bookbuddy_test;"
if %errorlevel% neq 0 (
    echo WARNING: Could not drop bookbuddy_test database
)

REM Create databases
echo Creating bookbuddy_dev database...
createdb -U postgres bookbuddy_dev
if %errorlevel% neq 0 (
    echo ERROR: Could not create bookbuddy_dev database
    pause
    exit /b 1
)

echo Creating bookbuddy_test database...
createdb -U postgres bookbuddy_test
if %errorlevel% neq 0 (
    echo ERROR: Could not create bookbuddy_test database
    pause
    exit /b 1
)

echo.
echo Seeding database with sample data...
npm run seed
if %errorlevel% neq 0 (
    echo ERROR: Database seeding failed!
    echo Please check your database connection settings
    pause
    exit /b 1
)

echo.
echo ========================================
echo Database reset completed successfully!
echo ========================================
echo.
echo Default login credentials:
echo - Admin: admin@bookbuddy.com / admin123
echo - Manager: rajesh@bookbuddy.com / manager123
echo - Customer: amit@example.com / customer123
echo.
pause
