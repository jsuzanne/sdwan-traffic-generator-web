#!/usr/bin/env python3
import argparse
from socket import *

# UDP Echo Server - Optimized for Docker
BUFSIZE = 1024

def get_version():
    try:
        if os.path.exists('/app/VERSION'):
            with open('/app/VERSION', 'r') as f:
                return f.read().strip()
    except: pass
    return "1.1.0-patch.37"

def run_server(ip, port):
    version = get_version()
    s = socket(AF_INET, SOCK_DGRAM)
    packet_count = 0
    try:
        s.bind((ip, port))
        print("="*60)
        print(f"🚀 SD-WAN VOICE ECHO SERVER v{version}")
        print(f"📡 Listening on: {ip}:{port}")
        print("="*60)
        while True:
            data, addr = s.recvfrom(BUFSIZE)
            s.sendto(data, addr)
            packet_count += 1
            if packet_count % 500 == 0:
                print(f"🔄 Processed {packet_count} packets (Latest from {addr[0]}:{addr[1]})")
    except Exception as e:
        print(f"Server error: {e}")
    finally:
        s.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--ip", help="IP to listen on", default="0.0.0.0")
    parser.add_argument("--port", help="Port to listen on (Default 6100)", type=int, default=6100)
    args = parser.parse_args()

    run_server(args.ip, args.port)
