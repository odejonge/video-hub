#!/bin/bash

# Start ngrok tunnel with static domain
# Usage: ./scripts/start-ngrok.sh
#
# Prerequisites:
#   1. Claim a free static domain at https://dashboard.ngrok.com/domains
#   2. Set NGROK_DOMAIN below to your claimed domain
#
# On exit (Ctrl+C, kill, crash): automatically restores .env to localhost

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

# ── Cleanup function: restore .env and restart backend ──
cleanup() {
    echo ""
    echo "🔄 Stopping ngrok and restoring localhost config..."

    # Kill ngrok
    pkill -f "ngrok http" 2>/dev/null

    # Restore .env to localhost
    if [ -f backend/.env ]; then
        sed -i '' "s|^FRONTEND_URL=.*|FRONTEND_URL=http://localhost:5173|" backend/.env
        sed -i '' "s|^BACKEND_URL=.*|BACKEND_URL=http://localhost:3000|" backend/.env
        echo "✅ backend/.env restored to localhost"
    fi

    # Recreate backend so it picks up the restored .env
    docker compose up -d --force-recreate backend 2>/dev/null
    echo "✅ Backend restarted with localhost config"

    exit 0
}

# Trap all exit signals (Ctrl+C, kill, terminal close, script errors)
trap cleanup EXIT INT TERM HUP

echo "🚀 Starting ngrok tunnel: https://$NGROK_DOMAIN → localhost:8082"

# Kill any existing ngrok
pkill -f "ngrok http" 2>/dev/null
sleep 1

# Update backend/.env with ngrok URLs
if [ -f backend/.env ]; then
    if grep -q "^FRONTEND_URL=" backend/.env; then
        sed -i '' "s|^FRONTEND_URL=.*|FRONTEND_URL=https://$NGROK_DOMAIN|" backend/.env
    else
        echo "FRONTEND_URL=https://$NGROK_DOMAIN" >> backend/.env
    fi
    if grep -q "^BACKEND_URL=" backend/.env; then
        sed -i '' "s|^BACKEND_URL=.*|BACKEND_URL=https://$NGROK_DOMAIN|" backend/.env
    else
        echo "BACKEND_URL=https://$NGROK_DOMAIN" >> backend/.env
    fi
    echo "✅ backend/.env updated to ngrok"
fi

# Export for docker-compose variable substitution
export NGROK_DOMAIN

echo "🔄 Restarting containers..."
docker compose up -d --force-recreate backend frontend

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
echo ""
echo "   On exit: .env will be restored to localhost automatically"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop"

# Wait for ngrok process (cleanup runs automatically on exit)
wait $NGROK_PID
