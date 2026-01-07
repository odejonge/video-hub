#!/bin/bash

# Start ngrok tunnel and auto-update configuration
# Usage: ./scripts/start-ngrok.sh

cd "$(dirname "$0")/.."

echo "🚀 Starting ngrok tunnel on port 8082..."

# Kill any existing ngrok
pkill -f "ngrok http 8082" 2>/dev/null

# Start ngrok in background
ngrok http 8082 --log=stdout > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!

echo "⏳ Waiting for ngrok to start..."
sleep 3

# Get the ngrok URL from the API
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$NGROK_URL" ]; then
    echo "❌ Failed to get ngrok URL. Check if ngrok is running."
    echo "   Try: curl http://localhost:4040/api/tunnels"
    exit 1
fi

echo "✅ Ngrok URL: $NGROK_URL"

# Extract just the hostname
NGROK_HOST=$(echo "$NGROK_URL" | sed 's|https://||')

echo ""
echo "📝 Updating configuration files..."

# Update docker-compose.yml
sed -i '' "s|Host(\`[^']*\.ngrok-free\.app\`)|Host(\`$NGROK_HOST\`)|g" docker-compose.yml
echo "   ✅ docker-compose.yml updated"

# Update backend/.env
if [ -f backend/.env ]; then
    sed -i '' "s|FRONTEND_URL=https://[^[:space:]]*\.ngrok-free\.app|FRONTEND_URL=$NGROK_URL|g" backend/.env
    sed -i '' "s|BACKEND_URL=https://[^[:space:]]*\.ngrok-free\.app|BACKEND_URL=$NGROK_URL|g" backend/.env
    echo "   ✅ backend/.env updated"
fi

echo ""
echo "🔄 Restarting containers..."
docker compose up -d backend frontend

echo ""
echo "=========================================="
echo "✅ Done! Your app is available at:"
echo "   $NGROK_URL"
echo ""
echo "⚠️  Don't forget to update Google OAuth redirect URI:"
echo "   ${NGROK_URL}/auth/google/callback"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop ngrok"

# Keep script running and show ngrok logs
tail -f /tmp/ngrok.log
