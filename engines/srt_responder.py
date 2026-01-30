#!/usr/bin/env python3
import http.server
import time
import json
import argparse
import sys

class SRTResponderHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        # Extract delay from path /api/slow-app/delay/:ms
        delay_ms = 0
        if '/api/slow-app/delay/' in self.path:
            try:
                delay_ms = int(self.path.split('/')[-1])
            except:
                delay_ms = 0
        
        # Bounded delay 0-10s
        delay_ms = max(0, min(delay_ms, 10000))
        
        # Simulate processing delay
        if delay_ms > 0:
            time.sleep(delay_ms / 1000.0)
        
        # Send response
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {
            "message": "Hello from SD-WAN Light Responder",
            "delayed_ms": delay_ms,
            "timestamp": time.time()
        }
        self.wfile.write(json.dumps(response).encode('utf-8'))

    def log_message(self, format, *args):
        # Suppress default logging to keep console clean, or redirect to stdout if needed
        # sys.stderr.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), format%args))
        pass

def run(port):
    server_address = ('', port)
    httpd = http.server.HTTPServer(server_address, SRTResponderHandler)
    print(f"🚀 SRT Light Responder started on port {port}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n⏹️ SRT Light Responder stopped.")
        httpd.server_close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8081)
    args = parser.parse_args()
    run(args.port)
