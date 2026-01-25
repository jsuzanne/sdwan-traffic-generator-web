#!/bin/bash

echo "🚀 Starting SD-WAN Voice Echo Server..."
python3 /app/voip/echo_server.py --port 6100 &

echo "📊 Starting iperf3 Server..."
iperf3 -s &

# Keep container alive
wait -n

exit $?
