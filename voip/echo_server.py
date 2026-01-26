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
    return "1.1.0-patch.99"

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
                now = time.time()
                
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
                    label = detected_id
                    # Clean label for log prefix
                    log_id = detected_id
                    if " (CONV-" in log_id:
                        # Extract CONV-XXX for prefix and text for label
                        parts = log_id.split(" (")
                        label = parts[0]
                        log_id = parts[1].replace(")", "")
                    elif log_id.startswith("CONV-"): log_id = log_id
                    elif log_id.startswith("CALL-"): log_id = log_id
                    else:
                        prefix = "CONV" if session_type == "Convergence" else "CALL"
                        log_id = f"{prefix}-{log_id}"

                    print(f"[{log_id}] 📥 [{time.strftime('%H:%M:%S')}] RECEIVING: {addr[0]}:{addr[1]} | Label: {label}", flush=True)
                
                # Update session
                session = active_sessions.get(addr, {"packet_count": 0, "start_time": now})
                session["last_seen"] = now
                session["id"] = detected_id
                session["type"] = session_type
                session["packet_count"] += 1
                active_sessions[addr] = session

                # For convergence, append server's packet count for RX/TX loss calculation
                if session_type == "Convergence":
                    try:
                        # Append :S<count> to payload
                        echo_payload = data + f":S{session['packet_count']}".encode('utf-8')
                        s.sendto(echo_payload, addr)
                    except:
                        s.sendto(data, addr)
                else:
                    # Voice call - simple echo
                    s.sendto(data, addr)
                
            except timeout:
                pass # Just a tick for maintenance
            
            # Maintenance: Clean up old sessions (silence > 5s = end of call)
            now = time.time()
            to_remove = []
            for addr, session in active_sessions.items():
                if now - session['last_seen'] > 5.0:
                    icon = "✅"
                    id_val = session['id']
                    
                    # Harmonize prefix
                    if not (id_val.startswith("CONV-") or id_val.startswith("CALL-")):
                        prefix = "CONV" if session["type"] == "Convergence" else "CALL"
                        id_val = f"{prefix}-{id_val}"
                    
                    duration = int(now - session['start_time'] - 5.0) # Subtract silence period
                    print(f"[{id_val}] {icon} [{time.strftime('%H:%M:%S')}] COMPLETED: {addr[0]}:{addr[1]} | Duration: {duration}s | Packets: {session['packet_count']}", flush=True)
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
