#!/usr/bin/env python3
import argparse
import os
import time
from socket import *

# UDP Echo Server - Optimized for Docker
BUFSIZE = 1024

def get_version():
    try:
        if os.path.exists('/app/VERSION'):
            with open('/app/VERSION', 'r') as f:
                return f.read().strip()
    except: pass
    return "1.1.0-patch.47"

def run_server(ip, port):
    version = get_version()
    s = socket(AF_INET, SOCK_DGRAM)
    s.settimeout(1.0) # Set timeout for maintenance tasks
    
    active_sessions = {} # (ip, port) -> last_seen
    
    try:
        s.bind((ip, port))
        print("="*60)
        print(f"🚀 SD-WAN VOICE ECHO SERVER v{version}")
        print(f"📡 Listening on: {ip}:{port}")
        print("="*60)
        
        while True:
            try:
                data, addr = s.recvfrom(BUFSIZE)
                s.sendto(data, addr)
                
                now = time.time()
                if addr not in active_sessions:
                    print(f"📞 [{time.strftime('%H:%M:%S')}] Incoming call from {addr[0]}:{addr[1]}")
                active_sessions[addr] = now
                
            except timeout:
                pass # Just a tick for maintenance
            
            # Maintenance: Clean up old sessions (silence > 5s = end of call)
            now = time.time()
            to_remove = []
            for addr, last_seen in active_sessions.items():
                if now - last_seen > 5.0:
                    print(f"✅ [{time.strftime('%H:%M:%S')}] Call from {addr[0]}:{addr[1]} finished")
                    to_remove.append(addr)
            
            for addr in to_remove:
                del active_sessions[addr]
                
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
