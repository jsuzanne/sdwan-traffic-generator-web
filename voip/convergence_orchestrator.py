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
        self.warmup_duration = 0.0 # Standardized to 0 by default for faster startup
        
        self.stop_event = threading.Event()
        self.metrics = {
            "test_id": self.test_id,
            "status": "starting",
            "start_time": self.start_time,
            "sent": 0,
            "received": 0,
            "server_received": 0,
            "loss_pct": 0,
            "tx_loss_pct": 0,
            "rx_loss_pct": 0,
            "tx_loss_ms": 0,
            "rx_loss_ms": 0,
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
            with open(self.stats_file, "w") as f:
                json.dump(self.metrics, f)
        except: pass

    def receiver(self, sock):
        sock.settimeout(0.5)
        while not self.stop_event.is_set():
            try:
                data, addr = sock.recvfrom(1024)
                now = time.time()
                
                # Payload format: TEST_ID:SEQ:TIMESTAMP[:S<server_count>]
                try:
                    payload = data.decode('utf-8', errors='ignore')
                    parts = payload.split(':')
                    if len(parts) >= 2:
                        seq = int(parts[1])
                        server_count = 0
                        
                        # Look for :S<count> suffix
                        for part in parts:
                            if part.startswith('S') and part[1:].isdigit():
                                server_count = int(part[1:])
                                break

                        with self.lock:
                            self.received_seqs.add(seq)
                            self.metrics["received"] += 1
                            if server_count > self.metrics["server_received"]:
                                self.metrics["server_received"] = server_count
                            
                            self.last_received_time = now
                            
                            self.metrics["history"].append(1)
                            if len(self.metrics["history"]) > 100:
                                self.metrics["history"].pop(0)

                except: pass
            except socket.timeout:
                continue
            except: break

    def run(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        source_port = random.randrange(30000, 60000)
        sock.bind(('0.0.0.0', source_port))
        self.metrics["source_port"] = source_port
        
        # Consistent label format: [CONV-XXX] Label
        log_id = self.test_id
        label = "Unknown"
        if " (" in log_id:
            label = log_id.split(" (")[0]
            log_id = log_id.split(" (")[-1].replace(")", "")
        elif "(" in log_id:
             log_id = log_id.split("(")[-1].replace(")", "")
        
        print(f"[{log_id}] [{time.strftime('%H:%M:%S')}] 📡 CONVERGENCE STARTED: {self.target_ip}:{self.target_port} | Rate: {self.rate}pps | Label: {label}", flush=True)
        print(f"[{log_id}] [{time.strftime('%H:%M:%S')}] ⚙️  Source Port: {source_port} | Warmup: {self.warmup_duration}s", flush=True)
        
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
                    
                    outage_duration = (ts - self.last_received_time) * 1000
                    if outage_duration > (self.interval * 2000):
                        cur_blackout = round(outage_duration)
                        self.metrics["current_blackout_ms"] = cur_blackout
                        
                        if not is_warmup:
                            if cur_blackout > self.metrics["max_blackout_ms"]:
                                self.metrics["max_blackout_ms"] = cur_blackout
                    else:
                        self.metrics["current_blackout_ms"] = 0
                    
                    if seq > 1:
                        denominator = seq - 1
                        total_rcvd = self.metrics["received"]
                        srv_rcvd = self.metrics["server_received"]
                        
                        # Overall Loss
                        loss_val = round((1 - (total_rcvd / denominator)) * 100, 1)
                        
                        # TX Loss (Client -> Server)
                        # Only calculate if we have server feedback
                        if srv_rcvd > 0:
                            tx_loss = round((1 - (srv_rcvd / denominator)) * 100, 1)
                            rx_loss = round((1 - (total_rcvd / srv_rcvd)) * 100, 1)
                            tx_lost_pkts = max(0, denominator - srv_rcvd)
                            rx_lost_pkts = max(0, srv_rcvd - total_rcvd)
                        else:
                            # If no server feedback yet, we can't separate but it's likely TX if total loss > 0
                            tx_loss = loss_val
                            rx_loss = 0
                            tx_lost_pkts = max(0, denominator - total_rcvd)
                            rx_lost_pkts = 0

                        if not is_warmup:
                            self.metrics["loss_pct"] = max(0, loss_val)
                            self.metrics["tx_loss_pct"] = max(0, tx_loss)
                            self.metrics["rx_loss_pct"] = max(0, rx_loss)
                            self.metrics["tx_loss_ms"] = round(tx_lost_pkts * self.interval * 1000)
                            self.metrics["rx_loss_ms"] = round(rx_lost_pkts * self.interval * 1000)

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
            print(f"[{log_id}] [{time.strftime('%H:%M:%S')}] ⏹️  CONVERGENCE STOPPED: Max Blackout: {self.metrics['max_blackout_ms']}ms", flush=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", required=True)
    parser.add_argument("--port", type=int, default=6100)
    parser.add_argument("--rate", type=int, default=50)
    parser.add_argument("--id", default="TEST-000")
    parser.add_argument("--stats-file", default="/tmp/convergence_stats.json")
    args = parser.parse_args()

    orchestrator = ConvergenceOrchestrator(args.target, args.port, args.rate, args.id)
    orchestrator.stats_file = args.stats_file # Override default
    orchestrator.run()
