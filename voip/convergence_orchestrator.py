#!/usr/bin/env python3
import time
import argparse
import random
import logging
import warnings
import threading
import json
import os
import socket

# Disable warnings for clean logs
warnings.filterwarnings("ignore")
logging.getLogger("scapy").setLevel(logging.ERROR)

from scapy.layers.inet import IP, UDP
from scapy.packet import Raw
from scapy.sendrecv import send

class ConvergenceMetrics:
    def __init__(self, rate):
        self.sent_times = {} # seq -> sent_time
        self.rtts = []
        self.received_seqs = set()
        self.last_transit_time = None
        self.jitter = 0
        self.last_rcvd_time = time.time()
        self.max_blackout = 0
        self.server_received = 0
        self.history = [] # Success/Fail timeline (1 = success, 0 = fail)
        self.lock = threading.Lock()
        self.interval = 1.0 / rate

    def record_send(self, seq, timestamp):
        with self.lock:
            self.sent_times[seq] = timestamp

    def record_receive(self, seq, server_count, receive_time):
        with self.lock:
            if seq in self.received_seqs:
                return
            
            self.received_seqs.add(seq)
            self.last_rcvd_time = receive_time
            
            if server_count > self.server_received:
                self.server_received = server_count

            if seq in self.sent_times:
                sent_time = self.sent_times[seq]
                rtt = (receive_time - sent_time) * 1000 # ms
                self.rtts.append(rtt)
                
                # Jitter calculation (RFC 3550)
                transit_time = receive_time - sent_time
                if self.last_transit_time is not None:
                    d = abs(transit_time - self.last_transit_time)
                    self.jitter = self.jitter + (d - self.jitter) / 16
                self.last_transit_time = transit_time

def receiver_thread(port, metrics, stop_event):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(0.5)
    try:
        sock.bind(('0.0.0.0', port))
        while not stop_event.is_set():
            try:
                data, addr = sock.recvfrom(2048)
                now = time.time()
                
                # Payload: CONV:ID:LABEL:SEQ:TS[:S<count>]
                try:
                    payload = data.decode('utf-8', errors='ignore')
                    parts = payload.split(':')
                    if len(parts) >= 4:
                        seq = int(parts[3])
                        server_count = 0
                        for part in parts:
                            if part.startswith('S') and part[1:].isdigit():
                                server_count = int(part[1:])
                                break
                        metrics.record_receive(seq, server_count, now)
                except: pass
            except socket.timeout:
                continue
    except Exception as e:
        if not stop_event.is_set():
            print(f"Receiver error: {e}")
    finally:
        sock.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", "-D", required=True)
    parser.add_argument("--port", "-dport", type=int, default=6200)
    parser.add_argument("--rate", "-C", type=int, default=50)
    parser.add_argument("--id", default="CONV-000")
    parser.add_argument("--interface", "-i", default=None)
    parser.add_argument("--stats-file", default="/tmp/convergence_stats.json")
    args = parser.parse_args()

    metrics = ConvergenceMetrics(args.rate)
    stop_event = threading.Event()
    source_port = random.randrange(30000, 60000)

    # Start receiver
    t = threading.Thread(target=receiver_thread, args=(source_port, metrics, stop_event))
    t.daemon = True
    t.start()

    # Consistent label format: [CONV-XXX] [HH:MM:SS] Label
    log_id = args.id
    label = "Unknown"
    if " (" in log_id:
        label = log_id.split(" (")[0]
        log_id = log_id.split(" (")[-1].replace(")", "")
    elif "(" in log_id:
         log_id = log_id.split("(")[-1].replace(")", "")
    
    timestamp = time.strftime('%H:%M:%S')
    print(f"[{log_id}] 🚀 [{timestamp}] {label} - CONVERGENCE STARTED: {args.target}:{args.port} | Rate: {args.rate}pps | Interface: {args.interface or 'Auto'}", flush=True)
    print(f"[{log_id}] ⚙️  [{timestamp}] {label} - Source Port: {source_port} (Scapy L3)", flush=True)

    seq = 0
    start_time = time.time()
    
    try:
        while not stop_event.is_set():
            seq += 1
            now = time.time()
            ts = time.time()
            
            # Payload: CONV:ID:LABEL:SEQ:TIMESTAMP
            payload_str = f"CONV:{log_id}:{label}:{seq}:{ts}"
            packet = IP(dst=args.target)/UDP(sport=source_port, dport=args.port)/Raw(load=payload_str)
            
            metrics.record_send(seq, ts)
            
            # Send (L3)
            if args.interface:
                send(packet, iface=args.interface, verbose=False)
            else:
                send(packet, verbose=False)

            # Update Max Blackout & History
            with metrics.lock:
                now_ms = time.time() * 1000
                last_rcvd_ms = metrics.last_rcvd_time * 1000
                outage = now_ms - last_rcvd_ms
                
                # Jitter Tolerance Logic:
                # 1. Threshold is dynamic: 1.5x the packet interval (e.g., 1.5s for 1pps, 15ms for 100pps)
                # 2. We only mark as 'blackout' if there is an actual gap in sequence numbers
                rcvd_count = len(metrics.received_seqs)
                has_seq_gap = (seq > rcvd_count)
                
                threshold_ms = metrics.interval * 1500 # 1.5x interval
                is_blackout = (outage > threshold_ms) and has_seq_gap
                
                # Update history (Success = 1, Fail = 0)
                metrics.history.append(0 if is_blackout else 1)
                if len(metrics.history) > 100:
                    metrics.history.pop(0)

                if is_blackout:
                    metrics.max_blackout = max(metrics.max_blackout, round(outage))
                
                # Prepare stats export
                rcvd = len(metrics.received_seqs)
                total_loss = round((1 - (rcvd/seq)) * 100, 1) if seq > 0 else 0
                
                # Directional Loss (only if we have server feedback)
                tx_loss_pct = 0
                rx_loss_pct = 0
                tx_lost_pkts = 0
                rx_lost_pkts = 0
                
                if metrics.server_received > 0:
                    tx_loss_pct = round((1 - (metrics.server_received / seq)) * 100, 1)
                    rx_loss_pct = round((1 - (rcvd / metrics.server_received)) * 100, 1)
                    tx_lost_pkts = max(0, seq - metrics.server_received)
                    rx_lost_pkts = max(0, metrics.server_received - rcvd)
                else:
                    tx_loss_pct = total_loss
                    tx_lost_pkts = max(0, seq - rcvd)

                stats = {
                    "test_id": args.id,
                    "status": "running",
                    "sent": seq,
                    "received": rcvd,
                    "loss_pct": max(0, total_loss),
                    "tx_loss_pct": max(0, tx_loss_pct),
                    "rx_loss_pct": max(0, rx_loss_pct),
                    "max_blackout_ms": metrics.max_blackout,
                    "current_blackout_ms": round(outage) if is_blackout else 0,
                    "avg_rtt_ms": round(sum(metrics.rtts)/len(metrics.rtts), 2) if metrics.rtts else 0,
                    "jitter_ms": round(metrics.jitter * 1000, 2),
                    "source_port": source_port,
                    "rate_pps": args.rate,
                    "history": metrics.history,
                    "start_time": start_time
                }
                
                if seq % 2 == 0: # Faster stats export for real-time timer
                    try:
                        with open(args.stats_file, 'w') as f:
                            json.dump(stats, f)
                    except: pass

            time.sleep(metrics.interval)
            
    except KeyboardInterrupt:
        pass
    finally:
        stop_event.set()
        
        # Grace period for last pongs to return (200ms)
        time.sleep(0.2)
        
        # Final calculations for log summary and stats export
        with metrics.lock:
            rcvd = len(metrics.received_seqs)
            
            # Final Blackout Cleanup: 
            # If we received every single packet (Perfect Score), then any 
            # "blackout" detected during the test was just jitter. Reset it to 0.
            if rcvd == seq:
                metrics.max_blackout = 0
                metrics.history = [1] * len(metrics.history)
            
            tx_lost = max(0, seq - metrics.server_received) if metrics.server_received > 0 else (seq - rcvd)
            rx_lost = max(0, metrics.server_received - rcvd) if metrics.server_received > 0 else 0
            
            # Recalculate final JSON stats for the UI
            total_loss = round((1 - (rcvd/seq)) * 100, 1) if seq > 0 else 0
            tx_loss_pct = round((1 - (metrics.server_received / seq)) * 100, 1) if metrics.server_received > 0 else total_loss
            rx_loss_pct = round((1 - (rcvd / metrics.server_received)) * 100, 1) if metrics.server_received > 0 else 0
            
            final_stats = {
                "test_id": args.id,
                "status": "stopped",
                "sent": seq,
                "received": rcvd,
                "loss_pct": max(0, total_loss),
                "tx_loss_pct": max(0, tx_loss_pct),
                "rx_loss_pct": max(0, rx_loss_pct),
                "max_blackout_ms": metrics.max_blackout,
                "current_blackout_ms": 0,
                "avg_rtt_ms": round(sum(metrics.rtts)/len(metrics.rtts), 2) if metrics.rtts else 0,
                "jitter_ms": round(metrics.jitter * 1000, 2),
                "source_port": source_port,
                "rate_pps": args.rate,
                "history": metrics.history,
                "start_time": start_time
            }
            
            try:
                with open(args.stats_file, 'w') as f:
                    json.dump(final_stats, f)
            except: pass

        timestamp = time.strftime('%H:%M:%S')
        print(f"[{log_id}] ⏹️  [{timestamp}] {label} - CONVERGENCE STOPPED: TX: {seq} (Lost: {tx_lost}) | RX: {rcvd} (Lost: {rx_lost}) | Max Blackout: {metrics.max_blackout}ms", flush=True)
        t.join(1.0)
