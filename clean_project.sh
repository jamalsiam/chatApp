#!/bin/bash

echo "🧹 Cleaning project thoroughly..."

# Stop any running processes
echo "1. Stopping Metro bundler..."
pkill -f "metro" || true

# Clean node modules
echo "2. Removing node_modules..."
rm -rf node_modules

# Clean package lock
echo "3. Removing package-lock.json..."
rm -f package-lock.json

# Clean expo cache
echo "4. Cleaning Expo cache..."
rm -rf .expo
rm -rf ~/.expo

# Clean metro cache
echo "5. Cleaning Metro cache..."
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*

# Clean watchman
echo "6. Cleaning Watchman..."
watchman watch-del-all 2>/dev/null || true

# Reinstall dependencies
echo "7. Installing dependencies..."
npm install

echo "✅ Clean complete! Now run: npm start -- --clear"
