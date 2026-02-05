FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/
COPY profiles/ ./profiles/

# Volumes will be mounted at runtime
VOLUME ["/app/config", "/app/logs", "/app/data"]

# Expose SSE port (for future remote access)
EXPOSE 3100

# Environment
ENV PYTHONUNBUFFERED=1
ENV MCP_PORT=3100
ENV LOG_LEVEL=INFO

# Run server
CMD ["python", "-m", "src.server"]
