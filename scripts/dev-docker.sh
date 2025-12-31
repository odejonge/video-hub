#!/bin/bash

# Development with Docker + Traefik
# Usage: ./scripts/dev-docker.sh

set -e

echo "🐳 Starting Video Hub in Docker..."
echo ""

# Check if .env exists
if [ ! -f "backend/.env" ]; then
  echo "❌ Error: backend/.env not found"
  echo "   Copy backend/.env.example to backend/.env and fill in your secrets"
  exit 1
fi

# Source backend .env for docker-compose
export $(grep -v '^#' backend/.env | xargs)

# Stop any existing containers
docker compose down 2>/dev/null || true

# Build and start
docker compose up --build -d

echo ""
echo "✅ Services started!"
echo ""
echo "📍 Local access:"
echo "   Frontend: http://localhost"
echo "   Backend:  http://localhost/api"
echo "   Traefik:  http://localhost:8080"
echo ""
echo "📱 For mobile testing with ngrok:"
echo "   1. Run: ngrok http 80"
echo "   2. Copy the https URL"
echo "   3. Update backend/.env:"
echo "      FRONTEND_URL=https://your-url.ngrok-free.app"
echo "      BACKEND_URL=https://your-url.ngrok-free.app"
echo "   4. Add to Google OAuth redirect URIs:"
echo "      https://your-url.ngrok-free.app/auth/google/callback"
echo "   5. Restart backend: docker compose restart backend"
echo ""
echo "📋 Logs: docker compose logs -f"
echo "🛑 Stop: docker compose down"

