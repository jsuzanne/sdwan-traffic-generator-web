#!/bin/bash

echo "🚀 Starting SD-WAN Voice Echo Server..."
python3 /app/voip/echo_server.py --ports 6100,6101 &

echo "📊 Starting iperf3 Server (Logging to /tmp/iperf3.log)..."
iperf3 -s > /tmp/iperf3.log 2>&1 &

# Keep container alive
wait -n

exit $?
