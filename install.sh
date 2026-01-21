#!/bin/bash
# Quick install script for SD-WAN Traffic Generator

set -e

echo "🚀 SD-WAN Traffic Generator - Quick Install"
echo ""

# Create directory
mkdir -p sdwan-traffic-gen
cd sdwan-traffic-gen

# Download docker-compose.yml
echo "📦 Downloading docker-compose.yml..."
curl -sSL -o docker-compose.yml https://raw.githubusercontent.com/jsuzanne/sdwan-traffic-generator-web/main/docker-compose.example.yml

# Start services
echo "🔧 Starting services..."
docker compose up -d

echo ""
echo "✅ Installation complete!"
echo ""
echo "📊 Dashboard: http://localhost:8080"
echo "🔑 Login: admin / admin"
echo ""
echo "📝 Check logs: docker compose logs -f"
echo "🛑 Stop: docker compose down"

