# Start Script for Windows
# This script starts both backend and frontend services

# Check if Node.js is installed
$node_check = node -v
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "   Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Node.js found: $node_check" -ForegroundColor Green

# Check if npm is installed
$npm_check = npm -v
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm is not installed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ npm found: $npm_check" -ForegroundColor Green

# Function to start a service
function Start-Service {
    param(
        [string]$ServiceName,
        [string]$ServicePath,
        [string]$Command
    )
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "Starting $ServiceName..." -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    
    Push-Location $ServicePath
    
    # Check if node_modules exists
    if (!(Test-Path "node_modules")) {
        Write-Host "📦 Installing dependencies for $ServiceName..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to install dependencies for $ServiceName" -ForegroundColor Red
            Pop-Location
            return $false
        }
    }
    
    # Start the service
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ServicePath'; $Command"
    
    Pop-Location
    Write-Host "✅ $ServiceName started in new window" -ForegroundColor Green
    return $true
}

# Main execution
Write-Host ""
Write-Host "🚀 Private Proposal Voting - Service Launcher" -ForegroundColor Magenta
Write-Host ""

$projectRoot = Get-Location

# Start Backend
$backendOk = Start-Service -ServiceName "Backend" -ServicePath "$projectRoot\backend" -Command "npm start"
if (!$backendOk) {
    exit 1
}

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start Frontend
$frontendOk = Start-Service -ServiceName "Frontend" -ServicePath "$projectRoot\frontend" -Command "npm run dev"
if (!$frontendOk) {
    exit 1
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✅ Both services are starting..." -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "📡 Backend API:        http://localhost:5000" -ForegroundColor Cyan
Write-Host "🌐 Frontend App:       http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Open http://localhost:3000 in your browser" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  Required:" -ForegroundColor Yellow
Write-Host "   - Polkadot.js extension installed" -ForegroundColor Yellow
Write-Host "   - Test account created in extension" -ForegroundColor Yellow
Write-Host ""
Write-Host "📖 Documentation:" -ForegroundColor Yellow
Write-Host "   - Quick Start:  QUICKSTART.md" -ForegroundColor Yellow
Write-Host "   - Full README:  README.md" -ForegroundColor Yellow
Write-Host "   - Testing:      TESTING.md" -ForegroundColor Yellow
Write-Host ""
