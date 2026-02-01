#!/bin/bash
# Quick install script for SD-WAN Traffic Generator (LATEST/TEST MODE)
# Version: 1.1.2-patch.33.36-RC

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

# 2. Configuration & Mode Selection
REPO_URL="https://raw.githubusercontent.com/jsuzanne/sdwan-traffic-generator-web/main"

# Handle command line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --target) INSTALL_MODE="2"; shift ;;
        --dashboard) INSTALL_MODE="1"; shift ;;
        *) shift ;;
    esac
done

# Default to Full Dashboard if no flag provided
if [ -z "$INSTALL_MODE" ]; then
    INSTALL_MODE="1"
    echo "📌 Installing Full Dashboard (use --target flag for Target Site only)"
fi

if [ "$INSTALL_MODE" == "2" ]; then
    echo "🎯 Mode: Target Site (Echo Server)"
    INSTALL_DIR="sdwan-target"
    
    # Platform-specific for target mode too
    if [[ "$OS_TYPE" == "Linux" ]] && ! grep -qi microsoft /proc/version 2>/dev/null; then
        COMPOSE_FILE="docker-compose.target-host.yml"
        echo "🐧 Native Linux detected - Using host mode for echo responder"
    else
        COMPOSE_FILE="docker-compose.target.yml"
    fi
else
    echo "🖥️  Mode: Full Dashboard (LATEST TEST)"
    INSTALL_DIR="sdwan-latest-test"
    
    # Select compose file based on platform
    if [[ "$OS_TYPE" == "Linux" ]]; then
        # Check if this is WSL2 (Windows Subsystem for Linux)
        if grep -qi microsoft /proc/version 2>/dev/null; then
            echo "🪟 WSL2 detected - Using bridge mode"
            COMPOSE_FILE="docker-compose.example.yml"
        else
            echo "🐧 Native Linux detected - Using host mode (LATEST)"
            COMPOSE_FILE="docker-compose.example.latest.yml"
        fi
    elif [[ "$OS_TYPE" == "Darwin" ]]; then
        echo "🍎 macOS detected - Using bridge mode"
        COMPOSE_FILE="docker-compose.example.yml"
    else
        echo "💻 Unknown platform - Using bridge mode"
        COMPOSE_FILE="docker-compose.example.yml"
    fi
fi

# 3. Check for Existing Installation
if [ -d "$INSTALL_DIR" ] && [ -f "$INSTALL_DIR/docker-compose.yml" ]; then
    echo ""
    echo "📂 Existing installation detected in $INSTALL_DIR"
    echo "1) Update config & restart services (Upgrade)"
    echo "2) Fresh Re-install (Overwrite configuration)"
    echo "3) Exit"
    read -p "Select an option [1-3]: " EXIST_CHOICE
    
    case $EXIST_CHOICE in
        1)
            echo "🔄 Upgrading existing installation..."
            cd "$INSTALL_DIR"
            echo "📦 Syncing configuration ($COMPOSE_FILE)..."
            curl -sSL -o docker-compose.yml "$REPO_URL/$COMPOSE_FILE"
            
            echo "🔧 Pulling latest images..."
            docker compose pull || echo "⚠️  Pull failed, trying to start anyway..."
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

# 4. Setup Directory
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 5. Download Configuration
echo "📦 Downloading configuration ($COMPOSE_FILE)..."
curl -sSL -o docker-compose.yml "$REPO_URL/$COMPOSE_FILE"

# 6. Start Services
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

# Create config directory
mkdir -p ./config

# Start services
echo "🔧 Starting services..."
docker compose up -d

# Wait for containers to initialize
echo "⏳ Waiting for containers to be ready..."
sleep 5

# Detect network interface INSIDE the container (not on host)
echo "🔍 [INSTALLER] Detecting network interface from container..."

# Determine which container to query based on installation mode
if [[ "$INSTALL_MODE" == "2" ]]; then
    CONTAINER_SERVICE="sdwan-voice-echo"
else
    CONTAINER_SERVICE="sdwan-traffic-gen"
fi

# Query the container for its default network interface
CONTAINER_IFACE=$(docker compose exec -T "$CONTAINER_SERVICE" sh -c "ip route 2>/dev/null | grep '^default' | awk '{print \$5}' | head -n 1" 2>/dev/null || echo "")

# Fallback to eth0 if detection fails
if [[ -z "$CONTAINER_IFACE" ]] || [[ "$CONTAINER_IFACE" == "lo" ]]; then
    echo "⚠️  [INSTALLER] Auto-detection failed, using eth0 (Docker default)"
    CONTAINER_IFACE="eth0"
else
    echo "✅ [INSTALLER] Detected interface: ${CONTAINER_IFACE}"
fi

# Write the detected interface to config file
echo "$CONTAINER_IFACE" > ./config/interfaces.txt

# Restart containers to apply the interface configuration
echo "🔄 Applying network configuration..."
docker compose restart

echo "✅ Network interface configured: $CONTAINER_IFACE"

echo ""
echo "=========================================="
echo "✅ Installation / Update complete!"
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
