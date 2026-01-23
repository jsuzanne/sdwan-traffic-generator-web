# Build Stage
FROM node:20-slim AS builder

WORKDIR /app
COPY web-dashboard/package*.json ./
RUN npm ci
COPY web-dashboard/ ./
RUN npm run build

# Runtime Stage
FROM node:20-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    iputils-ping \
    dnsutils \
    netcat-openbsd \
    iperf3 \
    && rm -rf /var/lib/apt/lists/*

COPY web-dashboard/package*.json ./
# Install production deps
RUN npm ci --omit=dev --prefer-offline --no-audit
# Install tsx separately
RUN npm install tsx --no-save

COPY --from=builder /app/dist ./dist
COPY web-dashboard/server.ts ./
COPY web-dashboard/test-logger.ts ./
COPY web-dashboard/shared ./shared
COPY web-dashboard/tsconfig.json ./
# Copy VERSION file from root of build context
COPY VERSION ./VERSION

# Labels for Docker Hub
LABEL org.opencontainers.image.title="SD-WAN Traffic Generator - Web UI"
LABEL org.opencontainers.image.description="Modern web dashboard for SD-WAN traffic generation and monitoring"
LABEL org.opencontainers.image.source="https://github.com/jsuzanne/sdwan-traffic-generator-web"
LABEL org.opencontainers.image.vendor="jsuzanne"

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/version || exit 1

CMD ["npx", "tsx", "server.ts"]

