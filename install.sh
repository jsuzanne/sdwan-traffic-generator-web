#!/bin/bash
# Quick install script for SD-WAN Traffic Generator
# Version: 1.1.2-patch.2

set -e

echo "🚀 SD-WAN Traffic Generator - Installation"
echo "=========================================="

# 1. Prerequisite Check: Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed."
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Error: Docker is installed but not running."
    echo "Please start the Docker Desktop / Daemon and try again."
    exit 1
fi

echo "✅ Docker is running."

# 2. Select Installation Mode
echo ""
echo "What would you like to install?"
echo "1) Full Dashboard (UI + Generator + Echo Server)"
echo "2) Target Site Only (Echo Server for Convergence Lab)"
read -p "Select an option [1-2]: " INSTALL_MODE

INSTALL_DIR="sdwan-traffic-gen"
REPO_URL="https://raw.githubusercontent.com/jsuzanne/sdwan-traffic-generator-web/main"

if [ "$INSTALL_MODE" == "2" ]; then
    echo "🎯 Mode: Target Site (Echo Server)"
    INSTALL_DIR="sdwan-target"
    COMPOSE_FILE="docker-compose.target.yml"
else
    echo "🖥️  Mode: Full Dashboard"
    COMPOSE_FILE="docker-compose.example.yml"
fi

# 3. Setup Directory
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 4. Download Configuration
echo "📦 Downloading configuration ($COMPOSE_FILE)..."
curl -sSL -o docker-compose.yml "$REPO_URL/$COMPOSE_FILE"

# 5. Start Services
echo "🔧 Pulling images and starting services..."
docker compose pull
docker compose up -d

echo ""
echo "=========================================="
echo "✅ Installation complete!"
echo ""

if [ "$INSTALL_MODE" == "2" ]; then
    echo "🎯 Target Site is active on port 6200/UDP (Echo)."
    echo "📝 Check logs: docker compose logs -f"
else
    echo "📊 Dashboard: http://localhost:8080"
    echo "🔑 Login: admin / admin"
    echo "📝 Check logs: docker compose logs -f"
fi
echo "=========================================="
