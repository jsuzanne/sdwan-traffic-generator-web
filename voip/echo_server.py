#!/usr/bin/env python3
import argparse
import os
import time
import threading
from socket import *

# UDP Echo Server - Optimized for Docker & Multi-port
BUFSIZE = 1024

def get_version():
    try:
        if os.path.exists('/app/VERSION'):
            with open('/app/VERSION', 'r') as f:
                return f.read().strip()
    except: pass
    return "1.1.0-patch.100"

def handle_port(ip, port, active_sessions, lock):
    s = socket(AF_INET, SOCK_DGRAM)
    s.settimeout(1.0)
    try:
        s.bind((ip, port))
        print(f"📡 [PORT {port}] Listening...")
        while True:
            try:
                data, addr = s.recvfrom(BUFSIZE)
                now = time.time()
                
                # Extract IDs
                detected_id = "Unknown"
                session_type = "Voice"
                try:
                    payload_str = data.decode('utf-8', errors='ignore')
                    if "CID:" in payload_str:
                        detected_id = payload_str.split("CID:")[1].split(":")[0]
                    elif "CONV:" in payload_str:
                        # Format: CONV:TEST-ID:LABEL:SEQ:TS
                        parts = payload_str.split(':')
                        if len(parts) >= 2:
                            detected_id = parts[1]
                            session_type = "Convergence"
                    elif "TEST-" in payload_str:
                        detected_id = payload_str.split(":")[0]
                        session_type = "Convergence"
                except: pass

                with lock:
                    if addr not in active_sessions:
                        log_id = detected_id
                        prefix = "CONV" if session_type == "Convergence" else "CALL"
                        if not (log_id.startswith("CONV-") or log_id.startswith("CALL-")):
                            log_id = f"{prefix}-{log_id}"
                        
                        print(f"[{log_id}] 📥 [{time.strftime('%H:%M:%S')}] RECEIVED ON PORT {port}: {addr[0]}:{addr[1]}", flush=True)
                    
                    session = active_sessions.get(addr, {"packet_count": 0, "start_time": now, "port": port})
                    session["last_seen"] = now
                    session["id"] = detected_id
                    session["type"] = session_type
                    session["packet_count"] += 1
                    active_sessions[addr] = session

                # Echo back
                if session_type == "Convergence":
                    try:
                        # Append :S<count> for RX/TX loss calculation
                        echo_payload = data + f":S{session['packet_count']}".encode('utf-8')
                        s.sendto(echo_payload, addr)
                    except:
                        s.sendto(data, addr)
                else:
                    s.sendto(data, addr)
                    
            except timeout:
                pass
    except Exception as e:
        print(f"Error on port {port}: {e}")
    finally:
        s.close()

def maintenance(active_sessions, lock):
    while True:
        time.sleep(1)
        now = time.time()
        to_remove = []
        with lock:
            for addr, session in active_sessions.items():
                if now - session['last_seen'] > 5.0:
                    id_val = session['id']
                    prefix = "CONV" if session["type"] == "Convergence" else "CALL"
                    if not (id_val.startswith("CONV-") or id_val.startswith("CALL-")):
                        id_val = f"{prefix}-{id_val}"
                    
                    duration = int(now - session['start_time'] - 5.0)
                    print(f"[{id_val}] ✅ [{time.strftime('%H:%M:%S')}] COMPLETED ON PORT {session['port']}: {addr[0]}:{addr[1]} | Duration: {duration}s | Packets: {session['packet_count']}", flush=True)
                    to_remove.append(addr)
            
            for addr in to_remove:
                del active_sessions[addr]

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--ip", help="IP to listen on", default="0.0.0.0")
    parser.add_argument("--ports", help="Comma-separated ports (Default: 6100,6200)", default="6100,6200")
    args = parser.parse_args()

    version = get_version()
    port_list = [int(p.strip()) for p in args.ports.split(',')]
    active_sessions = {}
    lock = threading.Lock()

    print("="*60)
    print(f"🚀 SD-WAN VOICE ECHO SERVER v{version}")
    print(f"📡 Multi-port mode: {port_list}")
    print("="*60)

    for p in port_list:
        t = threading.Thread(target=handle_port, args=(args.ip, p, active_sessions, lock))
        t.daemon = True
        t.start()

    maintenance(active_sessions, lock)
