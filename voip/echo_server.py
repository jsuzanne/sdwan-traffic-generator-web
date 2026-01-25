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
                
                # Basic RTP decoding (Seq is bytes 2-3)
                seq = -1
                if len(data) >= 4:
                    seq = (data[2] << 8) + data[3]
                
                # Extract embedded IDs (Voice CID or Convergence TEST-ID)
                detected_id = "Unknown"
                session_type = "Voice"
                try:
                    payload_str = data.decode('utf-8', errors='ignore')
                    if "CID:" in payload_str:
                        detected_id = payload_str.split("CID:")[1].split(":")[0]
                    elif "CONV-" in payload_str:
                        detected_id = payload_str.split(":")[0]
                        session_type = "Convergence"
                    elif payload_str.startswith("TEST-"):
                        detected_id = payload_str.split(":")[0]
                        session_type = "Convergence"
                except: pass

                if addr not in active_sessions:
                    icon = "📉" if session_type == "Convergence" else "📞"
                    print(f"{icon} [{time.strftime('%H:%M:%S')}] Incoming {session_type}: {detected_id} from {addr[0]}:{addr[1]}", flush=True)
                
                active_sessions[addr] = {
                    "last_seen": now,
                    "id": detected_id,
                    "type": session_type,
                    "packet_count": active_sessions.get(addr, {}).get("packet_count", 0) + 1
                }
                
                # Heartbeat log every 100 packets for convergence to show activity
                if session_type == "Convergence" and active_sessions[addr]["packet_count"] % 100 == 0:
                    print(f"🔄 [{time.strftime('%H:%M:%S')}] {detected_id}: Still receiving traffic... ({active_sessions[addr]['packet_count']} pkts total)", flush=True)
                
            except timeout:
                pass # Just a tick for maintenance
            
            # Maintenance: Clean up old sessions (silence > 5s = end of call)
            now = time.time()
            to_remove = []
            for addr, session in active_sessions.items():
                if now - session['last_seen'] > 5.0:
                    icon = "✅" if session['type'] == "Voice" else "🏁"
                    print(f"{icon} [{time.strftime('%H:%M:%S')}] {session['type']} {session['id']} finished (last from {addr[0]}:{addr[1]}). Total packets: {session['packet_count']}", flush=True)
                    to_remove.append(addr)
            
            for addr in to_remove:
                del active_sessions[addr]
                
    except Exception as e:
        print(f"Server error: {e}", flush=True)
    finally:
        s.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--ip", help="IP to listen on", default="0.0.0.0")
    parser.add_argument("--port", help="Port to listen on (Default 6100)", type=int, default=6100)
    args = parser.parse_args()

    run_server(args.ip, args.port)
