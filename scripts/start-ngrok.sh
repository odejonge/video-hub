#!/bin/bash

# Start ngrok tunnel for mobile testing
# Usage: ./scripts/start-ngrok.sh

echo "🚀 Starting ngrok tunnel..."
echo ""
echo "After ngrok starts, copy the https URL and update:"
echo "  1. backend/.env: FRONTEND_URL and BACKEND_URL"
echo "  2. Google Cloud Console: OAuth redirect URI"
echo ""
echo "For Traefik subdomain routing, you'll need ngrok paid plan."
echo "Free plan: Use single URL with path-based routing."
echo ""

# Start ngrok on port 80 (Traefik)
ngrok http 80 --log=stdout


