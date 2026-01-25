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
                    print(f"📉 [{time.strftime('%H:%M:%S')}] [{detected_id}] START: Incoming traffic from {addr[0]}:{addr[1]}", flush=True)
                
                # Update session
                session = active_sessions.get(addr, {"packet_count": 0})
                session["last_seen"] = now
                session["id"] = detected_id
                session["type"] = session_type
                session["packet_count"] += 1
                active_sessions[addr] = session

                # For convergence, append server's packet count for RX/TX loss calculation
                if session_type == "Convergence":
                    try:
                        # Append :S<count> to payload
                        # Original: CONV-021:Hetzner DC:1737827186000:seq
                        # New:      CONV-021:Hetzner DC:1737827186000:seq:S123
                        echo_payload = data + f":S{session['packet_count']}".encode('utf-8')
                        s.sendto(echo_payload, addr)
                    except:
                        s.sendto(data, addr)
                else:
                    s.sendto(data, addr)
                
            except timeout:
                pass # Just a tick for maintenance
            
            # Maintenance: Clean up old sessions (silence > 5s = end of call)
            now = time.time()
            to_remove = []
            for addr, session in active_sessions.items():
                if now - session['last_seen'] > 5.0:
                    icon = "✅" if session['type'] == "Voice" else "🏁"
                    prefix = "CALL" if session['type'] == "Voice" else "CONV"
                    id_val = session['id']
                    if id_val.startswith('CONV-'): id_val = id_val[5:]
                    
                    print(f"{icon} [{time.strftime('%H:%M:%S')}] [{prefix}-{id_val}] FINISH: {session['type']} from {addr[0]}:{addr[1]}. Total packets: {session['packet_count']}", flush=True)
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
