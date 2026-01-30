#!/bin/bash
# Quick install script for SD-WAN Traffic Generator
# Version: 1.1.2-patch.6

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

# OS Detection
OS_TYPE=$(uname)
if [[ "$OS_TYPE" == "Darwin" ]]; then
    echo "🍎 Platform: macOS detected. (Host Mode has limitations on macOS)"
elif [[ "$OS_TYPE" == "Linux" ]]; then
    echo "🐧 Platform: Linux detected."
else
    echo "💻 Platform: $OS_TYPE detected."
fi

# 2. Select Installation Mode
INSTALL_DIR="sdwan-traffic-gen"
REPO_URL="https://raw.githubusercontent.com/jsuzanne/sdwan-traffic-generator-web/main"

if [ -d "$INSTALL_DIR" ] && [ -f "$INSTALL_DIR/docker-compose.yml" ]; then
    echo ""
    echo "📂 Existing installation detected in $INSTALL_DIR"
    echo "1) Update images and restart services (Upgrade)"
    echo "2) Fresh Re-install (Overwrite configuration)"
    echo "3) Exit"
    read -p "Select an option [1-3]: " EXIST_CHOICE
    
    case $EXIST_CHOICE in
        1)
            echo "🔄 Upgrading existing installation..."
            cd "$INSTALL_DIR"
            docker compose pull
            docker compose up -d
            echo "✅ Upgrade complete!"
            exit 0
            ;;
        2)
            echo "⚠️  Overwriting existing installation..."
            ;;
        *)
            echo "👋 Exiting."
            exit 0
            ;;
    esac
fi

# Handle command line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --target) INSTALL_MODE="2"; shift ;;
        --dashboard) INSTALL_MODE="1"; shift ;;
        *) shift ;;
    esac
done

if [ -z "$INSTALL_MODE" ]; then
    echo "What would you like to install?"
    echo "1) Full Dashboard (UI + Generator + Echo Server)"
    echo "2) Target Site Only (Echo Server for Convergence Lab)"
    read -p "Select an option [1-2]: " INSTALL_MODE
fi

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
MAX_RETRIES=3
RETRY_COUNT=0
PULL_SUCCESS=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker compose pull; then
        PULL_SUCCESS=true
        break
    else
        RETRY_COUNT=$((RETRY_COUNT+1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "⚠️  Docker Hub timeout or network error (Attempt $RETRY_COUNT/$MAX_RETRIES). Retrying in 10s..."
            sleep 10
        fi
    fi
done

if [ "$PULL_SUCCESS" = false ]; then
    echo "❌ Pull failed after $MAX_RETRIES attempts. Trying to start with existing images if any..."
fi

docker compose up -d

echo ""
echo "=========================================="
echo "✅ Installation / Update complete!"
echo ""

if [ "$INSTALL_MODE" == "2" ] || [[ "$PWD" == *"sdwan-target"* ]]; then
    echo "🎯 Target Site is active on port 6200/UDP (Echo)."
    echo "📝 Check logs: docker compose logs -f"
else
    echo "📊 Dashboard: http://localhost:8080"
    echo "🔑 Login: admin / admin"
    echo "📝 Check logs: docker compose logs -f"
fi
echo "=========================================="
