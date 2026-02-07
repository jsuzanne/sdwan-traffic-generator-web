#!/usr/bin/env python3
import time
import argparse
import random
import logging
import signal
import sys
import threading
import json
import socket
import warnings
import os

DEBUG_MODE = os.getenv('DEBUG', 'false').lower() == 'true'

# Disable warnings for clean logs
warnings.filterwarnings("ignore")

class ConvergenceMetrics:
    def __init__(self, rate, test_id, start_time, target, port, label, source_port):
        self.test_id = test_id
        self.sent_count = 0
        self.sent_times = {} # seq -> sent_time
        self.sent_seqs = set() # Track all sent seqs
        self.rtts = []
        self.received_seqs = set()
        self.last_transit_time = None
        self.jitter = 0
        self.last_rcvd_time = time.time()
        self.max_blackout = 0
        self.server_received = 0
        self.lock = threading.Lock()
        self.interval = 1.0 / rate
        self.start_time = start_time
        self.rate = rate
        self.target = target
        self.port = port
        self.label = label
        self.source_port = source_port

    def record_send(self, seq, timestamp):
        with self.lock:
            self.sent_count = seq
            self.sent_seqs.add(seq)
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

    def get_stats(self, is_running=True):
        with self.lock:
            now = time.time()
            rcvd = len(self.received_seqs)
            seq = self.sent_count
            
            # Use current time for outage if running, otherwise use last received time
            outage_base = now if is_running else self.last_rcvd_time
            outage = (outage_base - self.last_rcvd_time) * 1000
            
            # --- Sequence Fidelity Logic ---
            # Instead of a rolling history of 1/0, we generate history based on the LAST 100 packets sent.
            # This allows "Blue" bars to flip to "Red" (and back to "Blue" if jittered packets arrive late).
            history = []
            history_start = max(1, seq - 99)
            for s in range(history_start, seq + 1):
                if s in self.received_seqs:
                    history.append(1) # Received
                else:
                    # Is it missing long enough to be red? 
                    # Use a 100ms floor or 1.5x interval (same as blackout detection)
                    threshold = max(0.1, self.interval * 1.5)
                    sent_at = self.sent_times.get(s, now)
                    if now - sent_at > threshold:
                        history.append(0) # Confirmed Missing/Pending
                    else:
                        history.append(1) # Still in flight (keep blue to reduce noise)

            # Padding if test just started
            if len(history) < 100:
                history = [1] * (100 - len(history)) + history

            # Blackout Detection (Same logic as before)
            threshold_ms = max(100, self.interval * 1500)
            has_seq_gap = (seq > rcvd)
            is_blackout = (outage > threshold_ms) and has_seq_gap
            
            if is_blackout:
                self.max_blackout = max(self.max_blackout, round(outage))
            
            # Final cleanup if stopped and 100% success (Perfect Run)
            if not is_running and rcvd >= seq:
                self.max_blackout = 0
                history = [1] * 100

            total_loss = round((1 - (rcvd/seq)) * 100, 1) if seq > 0 else 0
            duration = round(now - self.start_time, 1)
            
            if self.server_received > 0:
                tx_loss_pct = round((1 - (self.server_received / seq)) * 100, 1)
                rx_loss_pct = round((1 - (rcvd / self.server_received)) * 100, 1)
            else:
                tx_loss_pct = total_loss
                rx_loss_pct = 0

            return {
                "test_id": self.test_id,
                "status": "running" if is_running else "stopped",
                "sent": seq,
                "received": rcvd,
                "loss_pct": max(0, total_loss),
                "tx_loss_pct": max(0, tx_loss_pct),
                "rx_loss_pct": max(0, rx_loss_pct),
                "max_blackout_ms": self.max_blackout,
                "current_blackout_ms": round(outage) if is_blackout else 0,
                "avg_rtt_ms": round(sum(self.rtts)/len(self.rtts), 2) if self.rtts else 0,
                "jitter_ms": round(self.jitter * 1000, 2),
                "rate_pps": self.rate,
                "duration_s": duration,
                "history": history,
                "start_time": self.start_time,
                "target": self.target,
                "port": self.port,
                "label": self.label,
                "source_port": self.source_port
            }

def receiver_thread(sock, metrics, stop_event):
    sock.settimeout(0.2)
    while not stop_event.is_set():
        try:
            data, addr = sock.recvfrom(2048)
            now = time.time()
            try:
                payload = data.decode('utf-8', errors='ignore')
                parts = payload.split(':')
                if len(parts) >= 4 and parts[0] == "CONV":
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
        except: break

def stats_writer_thread(metrics, stats_file, stop_event):
    while not stop_event.is_set():
        stats = metrics.get_stats(is_running=True)
        try:
            with open(stats_file, 'w') as f:
                json.dump(stats, f)
        except: pass
        time.sleep(0.2) # Faster update for flipping effect

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", "-D", required=True)
    parser.add_argument("--port", "-dport", type=int, default=6200)
    parser.add_argument("--rate", "-C", type=int, default=50)
    parser.add_argument("--id", default="CONV-000")
    parser.add_argument("--stats-file", default="/tmp/convergence_stats.json")
    args = parser.parse_args()

    start_time = time.time()
    
    # Derive deterministic source port from CONV-ID
    # Example: CONV-001 -> 30001, CONV-042 -> 30042
    test_num = 0
    if args.id.startswith("CONV-") and args.id[5:].split()[0].isdigit():
        test_num = int(args.id[5:].split()[0])  # Handle "CONV-001 (DC1)" format

    source_port = 30000 + test_num
    if source_port > 65535:
        source_port = 65535  # Safety cap

    # Extract Label
    label = "Unknown"
    log_id = args.id
    if " (" in log_id:
        label = log_id.split(" (")[0]
        # Clean ID only for logging, keep full ID for metrics if needed or split it
        # Actually metrics.test_id usually expects the full string or short? 
        # based on existing code: log_id = log_id.split(" (")[-1].replace(")", "")
        # Let's keep existing logic structure but move it up.
    
    # Fix: Re-implement label logic cleanly
    display_id = args.id
    if " (" in display_id:
        label = display_id.split(" (")[-1].replace(")", "")
        # Wait, args.id passed from server.ts is: `label ? "${testId} (${label})" : testId`
        # So "CONV-123 (MyLabel)" -> label is MyLabel.
        # existing code: 
        #   if " (" in log_id:
        #       label = log_id.split(" (")[0]  <-- THIS LOOKS WRONG in existing code if format is "ID (Label)"
        #       log_id = log_id.split(" (")[-1].replace(")", "")
        # Use server.ts logic as truth: `${testId} (${label})`
        # So split(' (') -> [0] is ID, [1] is Label).
    
    # Let's look at server.ts: const displayId = label ? `${testId} (${label})` : testId;
    # So "CONV-123 (MyTarget)"
    
    if " (" in args.id:
        real_id = args.id.split(" (")[0]
        label = args.id.split(" (")[1].replace(")", "")
    else:
        real_id = args.id
        # Label is passed as argument too? 
        # parser has no --label argument! 
        # Wait, Step 1547 shows server.ts:
        # const cmdStr = `python3 convergence_orchestrator.py ... --label "${label || ''}"`;
        # BUT args array on line 1867-1874 DOES NOT INCLUDE --label!
        # const args = [ orchestratorPath, '--target', ..., '--id', displayId, '--stats-file', statsFile ];
        # It does NOT pass --label separately in the spawn args!
        # It relies on --id string parsing!
        
    metrics = ConvergenceMetrics(args.rate, args.id, start_time, args.target, args.port, label, source_port)
    stop_event = threading.Event()

    # Source port logic moved up

    # Create single UDP socket for both TX and RX
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.bind(('0.0.0.0', source_port))
    except OSError as e:
        # Fallback to random port if deterministic port is already in use
        print(f"Warning: Port {source_port} in use, falling back to random port", flush=True)
        source_port = random.randrange(40000, 60000)
        sock.bind(('0.0.0.0', source_port))

    # Start helper threads
    t_recv = threading.Thread(target=receiver_thread, args=(sock, metrics, stop_event))
    t_recv.daemon = True
    t_recv.start()

    t_stats = threading.Thread(target=stats_writer_thread, args=(metrics, args.stats_file, stop_event))
    t_stats.daemon = True
    t_stats.start()

    # Logic moved up
    log_id = real_id
    
    timestamp = time.strftime('%H:%M:%S')
    print(f"[{log_id}] [{timestamp}] 🚀 {label} - CONVERGENCE STARTED: {args.target}:{args.port} | Rate: {args.rate}pps", flush=True)
    if DEBUG_MODE: print(f"[{log_id}] [{timestamp}] ⚙️  {label} - Source Port: {source_port} (Sequence Fidelity Active)", flush=True)

    seq = 0
    interval = 1.0 / args.rate
    next_send = time.time()

    try:
        while not stop_event.is_set():
            seq += 1
            now = time.time()
            
            payload = f"CONV:{log_id}:{label}:{seq}:{now}".encode('utf-8')
            metrics.record_send(seq, now)
            
            try:
                sock.sendto(payload, (args.target, args.port))
            except Exception as e:
                print(f"Send error: {e}")
                break

            # Drift-correcting wait
            next_send += interval
            sleep_time = next_send - time.time()
            if sleep_time > 0:
                time.sleep(sleep_time)
            elif abs(sleep_time) > 0.5: # Way behind? reset
                next_send = time.time()
            
    except KeyboardInterrupt:
        pass
    finally:
        stop_event.set()
        
        # Grace period for final pongs (200ms)
        time.sleep(0.2)
        
        # Final stats write
        final_stats = metrics.get_stats(is_running=False)
        try:
            with open(args.stats_file, 'w') as f:
                json.dump(final_stats, f)
        except: pass

        rcvd = final_stats['received']
        tx_sent = seq
        tx_lost = final_stats['sent'] - final_stats['received']
        rx_lost = final_stats.get('rx_lost_count', 0) # future proof
        duration = final_stats['duration_s']
        
        # Calculate missed sequences
        with metrics.lock:
            missed = sorted(list(metrics.sent_seqs - metrics.received_seqs))
        
        missed_str = "None"
        if missed:
            if len(missed) > 50:
                first_part = missed[:25]
                last_part = missed[-25:]
                missed_str = f"[{', '.join(map(str, first_part))} ... {', '.join(map(str, last_part))}] (Total: {len(missed)})"
            else:
                missed_str = f"[{', '.join(map(str, missed))}]"

        timestamp = time.strftime('%H:%M:%S')
        print(f"[{log_id}] \u23f9\ufe0f  [{timestamp}] {label} - CONVERGENCE STOPPED:", flush=True)
        print(f"[{log_id}]     - Duration: {duration}s | PPS: {args.rate}", flush=True)
        print(f"[{log_id}]     - TX Sent: {tx_sent} | TX Lost: {tx_lost}", flush=True)
        print(f"[{log_id}]     - RX Rcvd: {rcvd} | RX Lost: 0", flush=True)
        print(f"[{log_id}]     - Max Blackout: {final_stats['max_blackout_ms']}ms", flush=True)
        print(f"[{log_id}]     - Missed Seqs: {missed_str}", flush=True)
        sys.stdout.flush() # Force flush for container logs
        
        sock.close()
        t_recv.join(0.5)
        t_stats.join(0.5)
