#!/bin/bash
set -e

echo "🔍 Verifying CI environment..."

# Check for Node.js
echo "Checking Node.js..."
node --version

# Check for Yarn
echo "Checking Yarn..."
yarn --version

# Check hardhat installation
echo "Checking Hardhat..."
yarn hardhat --version

# Run a simple hardhat compile
echo "Testing Hardhat compile..."
yarn hardhat compile --show-stack-traces

echo "✅ CI environment verification complete!" 