#!/bin/bash
# Build and push multi-platform Docker images to Docker Hub
# This script builds for both AMD64 (Intel/AMD) and ARM64 (Apple Silicon)

set -e  # Exit on error

echo "🔨 Building multi-platform Docker images..."
echo ""

# Ensure buildx is set up
docker buildx create --use --name multiplatform-builder 2>/dev/null || docker buildx use multiplatform-builder

echo "📦 Building Web UI..."
docker buildx build --platform linux/amd64,linux/arm64 \
  -t jsuzanne/sdwan-web-ui:latest \
  -f web-dashboard/Dockerfile \
  web-dashboard \
  --push

echo ""
echo "📦 Building Traffic Generator..."
docker buildx build --platform linux/amd64,linux/arm64 \
  -t jsuzanne/sdwan-traffic-gen:latest \
  -f Dockerfile.traffic-gen \
  . \
  --push

echo ""
echo "✅ Done! Images pushed to Docker Hub:"
echo "   - jsuzanne/sdwan-web-ui:latest"
echo "   - jsuzanne/sdwan-traffic-gen:latest"
echo ""
echo "📥 On your Ubuntu stations, run:"
echo "   docker-compose pull"
echo "   docker-compose up -d"
