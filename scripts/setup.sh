#!/bin/bash
# Setup script for Private Proposal Voting application

set -e

echo "🚀 Setting up Private Proposal Voting Application"
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..
echo "✅ Backend dependencies installed"
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..
echo "✅ Frontend dependencies installed"
echo ""

echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "1. In one terminal: cd backend && npm start"
echo "2. In another terminal: cd frontend && npm run dev"
echo ""
echo "Then open http://localhost:3000 in your browser"
echo ""
echo "Don't forget to:"
echo "- Install Polkadot.js extension: https://polkadot.js.org/extension/"
echo "- Create a test account in the extension"
