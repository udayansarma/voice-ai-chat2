#!/bin/sh

# Substitute environment variables in config.js
echo "🔧 Configuring runtime environment..."
echo "VITE_API_URL: ${VITE_API_URL:-not set}"

# Replace placeholder with actual environment variable
envsubst '${VITE_API_URL}' < /usr/share/nginx/html/config.js > /usr/share/nginx/html/config.js.tmp
mv /usr/share/nginx/html/config.js.tmp /usr/share/nginx/html/config.js

echo "✅ Runtime configuration complete"
cat /usr/share/nginx/html/config.js

# Start nginx
echo "🚀 Starting nginx..."
exec nginx -g 'daemon off;'
