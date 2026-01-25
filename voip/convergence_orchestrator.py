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
        self.rate = rate
        self.interval = 1.0 / rate
        self.test_id = test_id
        self.start_time = time.time()
        self.warmup_duration = 5.0
        
        self.stop_event = threading.Event()
        self.metrics = {
            "test_id": self.test_id,
            "status": "starting",
            "start_time": self.start_time,
            "sent": 0,
            "received": 0,
            "loss_pct": 0,
            "current_blackout_ms": 0,
            "max_blackout_ms": 0,
            "last_seq": 0,
            "source_port": 0,
            "history": [],
            "rate_pps": rate
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
        
        print(f"[{self.test_id}] Starting convergence test to {self.target_ip}:{self.target_port}", flush=True)
        print(f"[{self.test_id}] Source Port: {source_port}, Rate: {self.rate} pkts/sec", flush=True)
        print(f"[{self.test_id}] Warmup period: {self.warmup_duration}s (ignoring initial bursts)", flush=True)
        
        t = threading.Thread(target=self.receiver, args=(sock,))
        t.daemon = True
        t.start()
        
        seq = 0
        self.metrics["status"] = "running"
        
        try:
            while not self.stop_event.is_set():
                seq += 1
                ts = time.time()
                is_warmup = (ts - self.start_time) < self.warmup_duration
                
                payload = f"{self.test_id}:{seq}:{ts}".encode()
                sock.sendto(payload, (self.target_ip, self.target_port))
                
                with self.lock:
                    self.metrics["sent"] = seq
                    
                    # Check for blackout logic
                    outage_duration = (ts - self.last_received_time) * 1000
                    
                    # We detect blackout if we missed > 2 packets (roughly)
                    if outage_duration > (self.interval * 2000):
                        cur_blackout = round(outage_duration)
                        self.metrics["current_blackout_ms"] = cur_blackout
                        
                        if not is_warmup:
                            if cur_blackout > self.metrics["max_blackout_ms"]:
                                self.metrics["max_blackout_ms"] = cur_blackout
                    else:
                        self.metrics["current_blackout_ms"] = 0
                    
                    # Refined Loss Calculation: Use sent-1 as denominator to avoid flight-offset
                    if seq > 1:
                        denominator = seq - 1 # We don't expect the packet we JUST sent yet
                        loss_val = round((1 - (self.metrics["received"] / denominator)) * 100, 1)
                        if not is_warmup:
                            self.metrics["loss_pct"] = max(0, loss_val)

                    # Add loss to history (this part was removed from the original, but the instruction didn't explicitly remove it,
                    # and it's good to keep some history update logic, though the new loss calculation is separate)
                    # The original logic for history update based on blackout was a bit simplified.
                    # For now, we'll keep the history update only in the receiver for received packets.
                    # If a packet is sent but not received, it's implicitly a loss in the overall loss_pct.

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
