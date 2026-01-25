#!/usr/bin/env python3
import time
import socket
import json
import argparse
import threading
import os
import random

class ConvergenceOrchestrator:
    def __init__(self, target_ip, target_port, rate=50, test_id="TEST-000"):
        self.target_ip = target_ip
        self.target_port = target_port
        self.interval = 1.0 / rate
        self.test_id = test_id
        
        self.stop_event = threading.Event()
        self.metrics = {
            "test_id": self.test_id,
            "status": "starting",
            "start_time": time.time(),
            "sent": 0,
            "received": 0,
            "loss_pct": 0,
            "current_blackout_ms": 0,
            "max_blackout_ms": 0,
            "last_seq": 0,
            "source_port": 0,
            "history": [] # Moving window of last 100 packets for the UI
        }
        
        self.received_seqs = set()
        self.last_received_time = time.time()
        self.lock = threading.Lock()

    def update_stats_file(self):
        try:
            with open("/tmp/convergence_stats.json", "w") as f:
                json.dump(self.metrics, f)
        except: pass

    def receiver(self, sock):
        sock.settimeout(0.5)
        while not self.stop_event.is_set():
            try:
                data, addr = sock.recvfrom(1024)
                now = time.time()
                
                # Payload format: TEST_ID:SEQ:TIMESTAMP
                try:
                    payload = data.decode('utf-8', errors='ignore')
                    parts = payload.split(':')
                    if len(parts) >= 2:
                        seq = int(parts[1])
                        with self.lock:
                            self.received_seqs.add(seq)
                            self.metrics["received"] += 1
                            self.last_received_time = now
                            
                            # Update history (bitmask of last 100)
                            # 1 = success, 0 = loss
                            self.metrics["history"].append(1)
                            if len(self.metrics["history"]) > 100:
                                self.metrics["history"].pop(0)

                except: pass
            except socket.timeout:
                continue
            except: break

    def run(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Random source port for correlation
        source_port = random.randrange(30000, 60000)
        sock.bind(('0.0.0.0', source_port))
        self.metrics["source_port"] = source_port
        
        print(f"[{self.test_id}] Starting convergence test to {self.target_ip}:{self.target_port}")
        print(f"[{self.test_id}] Source Port: {source_port}, Rate: {1/self.interval} pkts/sec")

        t = threading.Thread(target=self.receiver, args=(sock,))
        t.daemon = True
        t.start()

        seq = 0
        self.metrics["status"] = "running"
        
        try:
            while not self.stop_event.is_set():
                seq += 1
                ts = time.time()
                payload = f"{self.test_id}:{seq}:{ts}".encode()
                sock.sendto(payload, (self.target_ip, self.target_port))
                
                with self.lock:
                    self.metrics["sent"] = seq
                    self.metrics["last_seq"] = seq
                    
                    # Check for blackout
                    outage_duration = (ts - self.last_received_time) * 1000
                    if outage_duration > (self.interval * 2000): # > 2 packets missed roughly
                        self.metrics["current_blackout_ms"] = round(outage_duration)
                        if outage_duration > self.metrics["max_blackout_ms"]:
                            self.metrics["max_blackout_ms"] = round(outage_duration)
                        
                        # Add loss to history
                        if len(self.metrics["history"]) < seq:
                             # This is simplified; real logic needs to align seq with history
                             # For now we just push 0 if significant time passed
                             self.metrics["history"].append(0)
                             if len(self.metrics["history"]) > 100:
                                 self.metrics["history"].pop(0)
                    else:
                        self.metrics["current_blackout_ms"] = 0
                    
                    self.metrics["loss_pct"] = round((1 - (self.metrics["received"] / seq)) * 100, 1)

                if seq % 10 == 0:
                    self.update_stats_file()
                
                time.sleep(self.interval)
        except KeyboardInterrupt:
            pass
        finally:
            self.stop_event.set()
            self.metrics["status"] = "finished"
            self.metrics["end_time"] = time.time()
            self.update_stats_file()
            sock.close()
            print(f"[{self.test_id}] Test finished. Max Blackout: {self.metrics['max_blackout_ms']}ms")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", required=True)
    parser.add_argument("--port", type=int, default=6100)
    parser.add_argument("--rate", type=int, default=50)
    parser.add_argument("--id", default="TEST-000")
    args = parser.parse_args()

    orchestrator = ConvergenceOrchestrator(args.target, args.port, args.rate, args.id)
    orchestrator.run()
