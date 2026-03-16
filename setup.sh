#!/bin/bash
# Setup script for Private DAO Voting System

echo "🚀 Private DAO Voting System - Setup Script"
echo "================================================"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 16+"
    exit 1
fi
echo "✅ Node.js $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found"
    exit 1
fi
echo "✅ npm $(npm -v)"

# Install root dependencies
echo ""
echo "📦 Installing root dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install root dependencies"
    exit 1
fi
echo "✅ Root dependencies installed"

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi
cd ..
echo "✅ Frontend dependencies installed"

# Copy .env.example to .env
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env created (update with your values)"
else
    echo "⚠️  .env already exists"
fi

# Run tests
echo ""
echo "🧪 Running tests..."
npm test
if [ $? -ne 0 ]; then
    echo "⚠️  Tests failed - check contract code"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your RPC URL and keyholder addresses"
echo "2. Run: npx hardhat run scripts/deploy.js --network hardhat"
echo "3. Run: npm run frontend"
echo ""
echo "For more information, see README.md and QUICKSTART.md"
