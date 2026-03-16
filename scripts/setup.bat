@echo off
REM Setup script for Private Proposal Voting application (Windows)

echo 🚀 Setting up Private Proposal Voting Application
echo.

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
call npm install
cd ..
echo ✅ Backend dependencies installed
echo.

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
call npm install
cd ..
echo ✅ Frontend dependencies installed
echo.

echo ✅ Setup complete!
echo.
echo To start the application:
echo 1. Open a new PowerShell window and run: cd backend ^&^& npm start
echo 2. In another PowerShell window run: cd frontend ^&^& npm run dev
echo.
echo Then open http://localhost:3000 in your browser
echo.
echo Don't forget to:
echo - Install Polkadot.js extension: https://polkadot.js.org/extension/
echo - Create a test account in the extension
echo.
pause
