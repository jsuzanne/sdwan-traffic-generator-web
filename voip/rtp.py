#! /usr/bin/env python
import time
import argparse
import random
import logging
import warnings
import threading
import socket
import json
import os

# Disable all warnings for clean container logs
warnings.filterwarnings("ignore")
logging.getLogger("scapy").setLevel(logging.ERROR)

from scapy.layers.inet import IP, UDP
from scapy.layers.rtp import RTP
from scapy.packet import Raw
from scapy.sendrecv import send

class VoiceMetrics:
    def __init__(self):
        self.sent_times = {} # seq -> sent_time
        self.rtts = []
        self.received_count = 0
        self.last_arrival_time = None
        self.last_transit_time = None
        self.jitter = 0
        self.lock = threading.Lock()

    def record_send(self, seq, timestamp):
        with self.lock:
            self.sent_times[seq] = timestamp

    def record_receive(self, seq, receive_time):
        with self.lock:
            if seq in self.sent_times:
                sent_time = self.sent_times[seq]
                rtt = (receive_time - sent_time) * 1000 # ms
                self.rtts.append(rtt)
                self.received_count += 1
                
                # Jitter calculation (RFC 3550)
                # D(i,j) = (Rj - Ri) - (Sj - Si) = (Rj - Sj) - (Ri - Si)
                transit_time = receive_time - sent_time
                if self.last_transit_time is not None:
                    d = abs(transit_time - self.last_transit_time)
                    self.jitter = self.jitter + (d - self.jitter) / 16
                self.last_transit_time = transit_time

def receiver_thread(sock, metrics, stop_event):
    sock.settimeout(0.5)
    while not stop_event.is_set():
        try:
            data, addr = sock.recvfrom(2048)
            receive_time = time.perf_counter()
            
            # Basic RTP decoding to get sequence (bytes 2-3)
            if len(data) >= 12:
                seq = (data[2] << 8) + data[3]
                metrics.record_receive(seq, receive_time)
        except socket.timeout:
            continue
        except Exception as e:
            if not stop_event.is_set():
                print(f"Receiver error: {e}")

if __name__ == "__main__":
    # parse arguments
    parser = argparse.ArgumentParser()

    # Allow Controller modification and debug level sets.
    binding_group = parser.add_argument_group('Binding', 'These options change how traffic is bound/sent')
    binding_group.add_argument("--destination-ip", "-dip", "-D", help="Destination IP for the RTP stream",
                               type=str, required=True)
    binding_group.add_argument("--destination-port", "-dport",
                               help="Destination port for the RTP stream (Default 6100)", type=int,
                               default=6100)
    binding_group.add_argument("--source-ip", "-sip", "-S", help="Source IP for the RTP stream. If not specified, "
                                                                 "the kernel will auto-select.",
                               type=str, default=None)
    binding_group.add_argument("--source-port", "-sport",
                               help="Source port for the RTP stream. If not specified, "
                                    "the kernel will auto-select.", type=int,
                               default=0)
    binding_group.add_argument("--source-interface",
                               help="Source interface RTP stream. (Ignored for L3 send)", type=str,
                               default=None)
    options_group = parser.add_argument_group('Options', "Configurable options for traffic sending.")
    options_group.add_argument("--min-count", "-C", help="Minimum number of packets to send (Default 4500)",
                               type=int, default=4500)
    options_group.add_argument("--max-count", help="Maximum number of packets to send (Default 90000)",
                               type=int, default=90000)
    options_group.add_argument("--call-id", help="Call ID to embed in the payload for tracking",
                               type=str, default="NONE")

    args = vars(parser.parse_args())

    # pull args for count.
    min_count = args['min_count']
    max_count = args['max_count']
    count = random.randrange(min_count, max_count)
    
    source_port = args['source_port']
    if source_port == 0:
        # Use a random port but fixed for this entire call session
        source_port = random.randrange(10000, 65535)

    # Setup receiving socket to capture echoes
    metrics = VoiceMetrics()
    stop_event = threading.Event()
    recv_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # If source_ip is specified, bind to it. Else bind to all.
        bind_ip = args['source_ip'] if args['source_ip'] else '0.0.0.0'
        recv_sock.bind((bind_ip, source_port))
    except Exception as e:
        print(f"Warning: Could not bind receiver socket to port {source_port}: {e}")
        # We continue anyway, but RTT/Loss metrics will be 0/100%
    
    t = threading.Thread(target=receiver_thread, args=(recv_sock, metrics, stop_event))
    t.daemon = True
    t.start()

    # Generate jittery random payload padding
    udp_payload_parts = []
    for i in range(200):
        tmp = "{:02x}".format(random.randrange(0, 255))
        udp_payload_parts.append(bytes.fromhex(tmp))
    payload_padding = b"".join(udp_payload_parts)

    # Create payload with embedded Call ID
    call_id_tag = f"CID:{args.get('call_id', 'NONE')}:".encode()
    final_payload = (call_id_tag + payload_padding)[:200]
    
    print(f"Setting up RTP Packets for {args['call_id']}")
    print(f"Sending {count} packets to {args['destination_ip']}:{args['destination_port']} from port {source_port}")

    # Pre-build packet template for performance
    if args['source_ip'] is None:
        base_packet = IP(dst=args['destination_ip'], proto=17, len=240)
    else:
        base_packet = IP(dst=args['destination_ip'], src=args['source_ip'], proto=17, len=240)
        
    base_packet = base_packet/UDP(sport=source_port, dport=args['destination_port'], len=220)

    # Sending loop
    start_time = time.time()
    for i in range(1, count + 1):
        packet = base_packet/RTP(version=2, payload_type=8, sequence=i, sourcesync=1, timestamp=int(time.time()))
        packet = packet/Raw(load=final_payload)

        del packet[IP].chksum
        del packet[UDP].chksum

        # Record send time using high precision counter
        metrics.record_send(i, time.perf_counter())

        # Send using Layer 3 (Standard IP)
        send(packet, verbose=False)
        time.sleep(0.03) # ~33 packets per second (Standard G.711 / 30ms)

    # Wait a bit for the last echo to return
    time.sleep(1.0)
    stop_event.set()
    t.join(1.0)
    recv_sock.close()

    # Final metrics
    loss = ((count - metrics.received_count) / count) * 100 if count > 0 else 0
    avg_rtt = sum(metrics.rtts) / len(metrics.rtts) if metrics.rtts else 0
    max_rtt = max(metrics.rtts) if metrics.rtts else 0
    jitter = metrics.jitter * 1000 # ms

    # Formatting for summary log (Orchestrator will pick this up)
    summary = {
        "call_id": args['call_id'],
        "sent": count,
        "received": metrics.received_count,
        "loss_pct": round(loss, 2),
        "avg_rtt_ms": round(avg_rtt, 2),
        "max_rtt_ms": round(max_rtt, 2),
        "jitter_ms": round(jitter, 2),
        "duration": round(time.time() - start_time, 2)
    }

    print(f"RESULT: {json.dumps(summary)}")
    print(f"Call {args['call_id']} finished.")
