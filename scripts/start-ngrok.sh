#!/bin/bash

# Start ngrok tunnel with static domain
# Usage: ./scripts/start-ngrok.sh
#
# Prerequisites:
#   1. Claim a free static domain at https://dashboard.ngrok.com/domains
#   2. Set NGROK_DOMAIN below to your claimed domain

# ──────────────────────────────────────────────
# CONFIG: Set your ngrok static domain here (claim at https://dashboard.ngrok.com/domains)
NGROK_DOMAIN="${NGROK_DOMAIN:-confirmatory-aliza-radially.ngrok-free.dev}"
# ──────────────────────────────────────────────

if [[ "$NGROK_DOMAIN" == "CHANGEME"* ]]; then
    echo "❌ NGROK_DOMAIN is not set!"
    echo ""
    echo "   1. Claim a free static domain at https://dashboard.ngrok.com/domains"
    echo "   2. Set it in this script or via environment variable:"
    echo "      export NGROK_DOMAIN=your-domain.ngrok-free.app"
    echo "      ./scripts/start-ngrok.sh"
    exit 1
fi

cd "$(dirname "$0")/.."

echo "🚀 Starting ngrok tunnel: https://$NGROK_DOMAIN → localhost:8082"

# Kill any existing ngrok
pkill -f "ngrok http" 2>/dev/null
sleep 1

# Update backend/.env with ngrok URLs
if [ -f backend/.env ]; then
    # Update or add FRONTEND_URL
    if grep -q "^FRONTEND_URL=" backend/.env; then
        sed -i '' "s|^FRONTEND_URL=.*|FRONTEND_URL=https://$NGROK_DOMAIN|" backend/.env
    else
        echo "FRONTEND_URL=https://$NGROK_DOMAIN" >> backend/.env
    fi
    # Update or add BACKEND_URL
    if grep -q "^BACKEND_URL=" backend/.env; then
        sed -i '' "s|^BACKEND_URL=.*|BACKEND_URL=https://$NGROK_DOMAIN|" backend/.env
    else
        echo "BACKEND_URL=https://$NGROK_DOMAIN" >> backend/.env
    fi
    echo "✅ backend/.env updated"
fi

# Export for docker-compose variable substitution
export NGROK_DOMAIN

echo "🔄 Restarting containers..."
docker compose up -d backend frontend

# Start ngrok with static domain
echo "🔗 Starting ngrok..."
ngrok http 8082 --domain="$NGROK_DOMAIN" --log=stdout &
NGROK_PID=$!

sleep 2

echo ""
echo "=========================================="
echo "✅ Done! Your app is available at:"
echo "   https://$NGROK_DOMAIN"
echo ""
echo "   OAuth callback (already registered once):"
echo "   https://$NGROK_DOMAIN/auth/google/callback"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop ngrok"

# Wait for ngrok process
wait $NGROK_PID
