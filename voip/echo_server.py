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

import threading

def run_server(ip, ports):
    version = get_version()
    active_sessions = {} # (ip, port) -> last_seen
    lock = threading.Lock()
    
    print("="*60)
    print(f"🚀 SD-WAN VOICE ECHO SERVER v{version}")
    print(f"📡 Listening on: {ip} [Ports: {', '.join(map(str, ports))}]")
    print("="*60)

    def handle_port(port):
        s = socket(AF_INET, SOCK_DGRAM)
        s.settimeout(1.0)
        try:
            s.bind((ip, port))
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
                        elif "CONV-" in payload_str:
                            detected_id = payload_str.split(":")[0]
                            session_type = "Convergence"
                        elif payload_str.startswith("TEST-"):
                            detected_id = payload_str.split(":")[0]
                            session_type = "Convergence"
                    except: pass

                    with lock:
                        if addr not in active_sessions:
                            label = detected_id
                            log_id = detected_id
                            if " (CONV-" in log_id:
                                parts = log_id.split(" (")
                                label = parts[0]
                                log_id = parts[1].replace(")", "")
                            elif log_id.startswith("CONV-"): pass
                            elif log_id.startswith("CALL-"): pass
                            else:
                                prefix = "CONV" if session_type == "Convergence" else "CALL"
                                log_id = f"{prefix}-{log_id}"

                            print(f"[{log_id}] 📥 [{time.strftime('%H:%M:%S')}] RECEIVED ON PORT {port}: {addr[0]}:{addr[1]} | Label: {label}", flush=True)
                        
                        session = active_sessions.get(addr, {"packet_count": 0, "start_time": now, "port": port})
                        session["last_seen"] = now
                        session["id"] = detected_id
                        session["type"] = session_type
                        session["packet_count"] += 1
                        active_sessions[addr] = session

                    # Echo back
                    if session_type == "Convergence":
                        try:
                            echo_payload = data + f":S{session['packet_count']}".encode('utf-8')
                            s.sendto(echo_payload, addr)
                        except:
                            s.sendto(data, addr)
                    else:
                        s.sendto(data, addr)
                    
                except timeout:
                    pass
        except Exception as e:
            print(f"Port {port} error: {e}")
        finally:
            s.close()

    # Maintenance thread
    def maintenance():
        while True:
            time.sleep(1)
            now = time.time()
            to_remove = []
            with lock:
                for addr, session in active_sessions.items():
                    if now - session['last_seen'] > 5.0:
                        icon = "✅"
                        id_val = session['id']
                        if not (id_val.startswith("CONV-") or id_val.startswith("CALL-")):
                            prefix = "CONV" if session["type"] == "Convergence" else "CALL"
                            id_val = f"{prefix}-{id_val}"
                        
                        duration = int(now - session['start_time'] - 5.0)
                        print(f"[{id_val}] {icon} [{time.strftime('%H:%M:%S')}] COMPLETED ON PORT {session['port']}: {addr[0]}:{addr[1]} | Duration: {duration}s | Packets: {session['packet_count']}", flush=True)
                        to_remove.append(addr)
                
                for addr in to_remove:
                    del active_sessions[addr]

    # Start per-port threads
    threads = []
    for p in ports:
        t = threading.Thread(target=handle_port, args=(p,))
        t.daemon = True
        t.start()
        threads.append(t)
    
    # Start maintenance in main thread
    maintenance()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--ip", help="IP to listen on", default="0.0.0.0")
    parser.add_argument("--ports", help="Comma-separated ports (Default: 6100,6101)", default="6100,6101")
    args = parser.parse_args()

    port_list = [int(p.strip()) for p in args.ports.split(',')]
    run_server(args.ip, port_list)
