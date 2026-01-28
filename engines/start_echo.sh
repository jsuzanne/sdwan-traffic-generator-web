#!/bin/bash

echo "🚀 Starting SD-WAN Voice Echo Server..."
python3 /app/engines/echo_server.py --ports 6100,6200 &

echo "🐌 Starting SRT Light Responder on port 8080..."
python3 /app/engines/srt_responder.py --port 8080 &

echo "📊 Starting iperf3 Server (Logging to /tmp/iperf3.log)..."
iperf3 -s > /tmp/iperf3.log 2>&1 &

# Keep container alive
wait -n

exit $?
