#!/bin/bash

echo "🚀 Starting SD-WAN Voice Echo Server..."
python3 -u /app/engines/echo_server.py --ports 6100,6200 &

echo "📊 Starting iperf3 Server (Logging to /tmp/iperf3.log)..."
iperf3 -s > /tmp/iperf3.log 2>&1 &

echo "🌐 Starting HTTP Service (Port ${TARGET_HTTP_PORT:-8082})..."
python3 -u /app/engines/http_server.py > /tmp/http_server.log 2>&1 &

# Keep container alive and exit if ANY background process exits
wait -n

exit $?
