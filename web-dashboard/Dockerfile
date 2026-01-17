# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY web-dashboard/package*.json ./
RUN npm ci
COPY web-dashboard/ ./
RUN npm run build

# Runtime Stage
FROM node:20-alpine

WORKDIR /app

# Install system dependencies (curl for healthchecks and connectivity)
RUN apk add --no-cache curl

COPY web-dashboard/package*.json ./
# Install production deps with reduced memory usage
RUN npm ci --omit=dev --prefer-offline --no-audit
# Install tsx separately to reduce memory pressure
RUN npm install tsx --no-save

COPY --from=builder /app/dist ./dist
COPY web-dashboard/server.ts ./
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

