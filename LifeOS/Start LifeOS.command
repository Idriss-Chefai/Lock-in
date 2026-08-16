#!/bin/bash
cd "$(dirname "$0")/app"

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies for the first time, this may take a minute..."
  npm install || { echo "Install failed. Make sure Node.js is installed: https://nodejs.org"; read -p "Press enter to close..."; exit 1; }
fi

echo "Starting LifeOS..."
npm run dev
