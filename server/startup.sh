#!/bin/sh

# Wait for Azure Files mount to be ready
echo "🔍 Checking Azure Files mount..."

# Check if /app/data is mounted and writable
if [ ! -d "/app/data" ]; then
    echo "⚠️  /app/data directory does not exist, creating..."
    mkdir -p /app/data
fi

# Test write permissions
if touch /app/data/test-write 2>/dev/null; then
    rm -f /app/data/test-write
    echo "✅ /app/data is writable"
else
    echo "❌ /app/data is not writable"
    echo "🔍 Checking mount status..."
    mount | grep /app/data || echo "No mount found for /app/data"
    ls -la /app/data || echo "Cannot list /app/data"
    echo "🔍 Checking permissions..."
    ls -la /app/ | grep data || echo "data directory not visible"
fi

# List environment variables for debugging
echo "🔍 Database configuration:"
echo "DATABASE_PATH: ${DATABASE_PATH:-not set}"
echo "USE_SEED_DATA_MODE: ${USE_SEED_DATA_MODE:-not set}"

# Start the Node.js application
echo "🚀 Starting Node.js application..."
exec node dist/index.js
