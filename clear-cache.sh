#!/bin/bash

# Force Clear Webpack Cache and Rebuild
# This script will clear all caches and force webpack to rebuild everything

echo "🧹 Clearing webpack cache..."

# Navigate to PWA client directory
cd /Users/wweber/Source/reactory/reactory-pwa-client

# Remove webpack cache
rm -rf node_modules/.cache
echo "✓ Cleared node_modules/.cache"

# Remove build directory
rm -rf build
echo "✓ Cleared build directory"

# Also clear any .webpack cache in the project
find . -type d -name ".webpack" -prune -exec rm -rf {} \;
echo "✓ Cleared .webpack directories"

echo ""
echo "✅ Cache cleared successfully!"
echo ""
echo "Now restart your dev server with: bin/start.sh"
echo "Or run a production build with: npm run build"
