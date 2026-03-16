# @echo off
REM Setup script for Windows users

echo Private DAO Voting System - Setup Script
echo ================================================

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found. Please install Node.js 16+
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do echo Node.js %%i

REM Check npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm not found
    exit /b 1
)
for /f "tokens=*" %%i in ('npm -v') do echo npm %%i

REM Install root dependencies
echo.
echo Installing root dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install root dependencies
    exit /b 1
)

REM Install frontend dependencies
echo.
echo Installing frontend dependencies...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install frontend dependencies
    cd ..
    exit /b 1
)
cd ..

REM Copy .env.example to .env
if not exist .env (
    echo.
    echo Creating .env file...
    copy .env.example .env
    echo .env created (update with your values)
) else (
    echo .env already exists
)

REM Run tests
echo.
echo Running tests...
call npm test

echo.
echo Setup complete!
echo.
echo Next steps:
echo 1. Update .env with your RPC URL and keyholder addresses
echo 2. Run: npx hardhat run scripts/deploy.js --network hardhat
echo 3. Run: npm run frontend
echo.
echo For more information, see README.md and QUICKSTART.md
