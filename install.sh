#!/bin/bash
# Quick install script for SD-WAN Traffic Generator
# Version: 1.1.2-patch.33.32

set -e

# Fix stdin for interactive prompts when piped from curl
# Works on Linux, macOS, and WSL2
if [ ! -t 0 ] && [ -t 1 ]; then
    if [ -e /dev/tty ]; then
        exec < /dev/tty
    fi
fi

echo "🚀 SD-WAN Traffic Generator - Installation"
echo "=========================================="

# 1. Prerequisite Check: Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed."
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

function detect_and_setup_interface() {
    local config_dir="./config"
    local interfaces_file="${config_dir}/interfaces.txt"
    
    mkdir -p "$config_dir"
    
    # Only detect if file is missing or empty
    if [[ ! -s "$interfaces_file" ]]; then
        echo "🔍 [INSTALLER] Detecting default network interface..."
        local detected_iface=""
        
        # Linux detection
        if [[ "$(uname)" == "Linux" ]]; then
            detected_iface=$(ip route | grep '^default' | awk '{print $5}' | head -n 1)
        # macOS detection
        elif [[ "$(uname)" == "Darwin" ]]; then
            detected_iface=$(route -n get default 2>/dev/null | grep 'interface:' | awk '{print $2}')
        fi
        
        if [[ -n "$detected_iface" ]]; then
            echo "✅ [INSTALLER] Found interface: ${detected_iface}"
            echo "$detected_iface" > "$interfaces_file"
        else
            echo "⚠️ [INSTALLER] Could not detect default interface. Defaulting to eth0."
            echo "eth0" > "$interfaces_file"
        fi
    else
        echo "📡 [INSTALLER] interfaces.txt already exists. Skipping auto-detection."
    fi
}

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

if [ -z "$INSTALL_MODE" ]; then
    echo ""
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
    INSTALL_DIR="sdwan-traffic-gen"
    COMPOSE_FILE="docker-compose.example.yml"
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

# Ensure config/interfaces.txt exists before starting
detect_and_setup_interface

docker compose up -d

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
