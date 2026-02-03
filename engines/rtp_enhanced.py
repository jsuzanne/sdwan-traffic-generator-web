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
import math
import struct

# Disable all warnings for clean container logs
warnings.filterwarnings("ignore")
logging.getLogger("scapy").setLevel(logging.ERROR)
logging.getLogger("scapy.runtime").setLevel(logging.ERROR)

from scapy.layers.inet import IP, UDP
from scapy.layers.rtp import RTP
from scapy.packet import Raw
from scapy.sendrecv import send

# Codec specifications for realistic audio simulation
CODEC_SPECS = {
    'G.711-ulaw': {
        'payload_type': 0,
        'sample_rate': 8000,
        'ptime': 20,  # ms packetization time
        'payload_size': 160,  # bytes (20ms * 8000Hz * 1 byte/sample)
        'packets_per_sec': 50,
        'ie_factor': 0  # Equipment impairment factor for MOS
    },
    'G.711-alaw': {
        'payload_type': 8,
        'sample_rate': 8000,
        'ptime': 20,
        'payload_size': 160,
        'packets_per_sec': 50,
        'ie_factor': 0
    },
    'G.729': {
        'payload_type': 18,
        'sample_rate': 8000,
        'ptime': 20,
        'payload_size': 20,  # 10 bytes per 10ms frame, 2 frames
        'packets_per_sec': 50,
        'ie_factor': 10  # G.729 has higher impairment than G.711
    },
    'G.722': {
        'payload_type': 9,
        'sample_rate': 16000,
        'ptime': 20,
        'payload_size': 160,
        'packets_per_sec': 50,
        'ie_factor': 0
    },
    'Opus': {
        'payload_type': 111,  # Dynamic
        'sample_rate': 48000,
        'ptime': 20,
        'payload_size': 60,  # Variable, ~60 bytes typical
        'packets_per_sec': 50,
        'ie_factor': 0
    }
}


class VoiceMetrics:
    def __init__(self):
        self.sent_times = {}  # seq -> sent_time
        self.rtts = []
        self.received_seqs = set()
        self.last_arrival_time = None
        self.last_transit_time = None
        self.jitter = 0
        self.lock = threading.Lock()

    def record_send(self, seq, timestamp):
        with self.lock:
            self.sent_times[seq] = timestamp

    def record_receive(self, seq, receive_time):
        with self.lock:
            if seq in self.received_seqs:
                return  # Already counted

            if seq in self.sent_times:
                self.received_seqs.add(seq)
                sent_time = self.sent_times[seq]
                rtt = (receive_time - sent_time) * 1000  # ms
                self.rtts.append(rtt)

                # Jitter calculation (RFC 3550)
                transit_time = receive_time - sent_time
                if self.last_transit_time is not None:
                    d = abs(transit_time - self.last_transit_time)
                    self.jitter = self.jitter + (d - self.jitter) / 16
                self.last_transit_time = transit_time


class VADSimulator:
    """Simulates realistic Voice Activity Detection patterns"""
    def __init__(self, talk_spurt_duration=1.8, silence_duration=1.2):
        self.talk_spurt_duration = talk_spurt_duration  # Average talk duration (s)
        self.silence_duration = silence_duration  # Average silence duration (s)
        self.current_state = 'talking'
        self.state_start_time = time.time()
        self.next_transition = self._calculate_next_transition()

    def _calculate_next_transition(self):
        """Calculate when to switch states using exponential distribution"""
        if self.current_state == 'talking':
            duration = random.expovariate(1.0 / self.talk_spurt_duration)
        else:
            duration = random.expovariate(1.0 / self.silence_duration)
        return self.state_start_time + duration

    def is_talking(self):
        """Check if currently in talk spurt"""
        now = time.time()
        if now >= self.next_transition:
            # Switch states
            self.current_state = 'silence' if self.current_state == 'talking' else 'talking'
            self.state_start_time = now
            self.next_transition = self._calculate_next_transition()
        return self.current_state == 'talking'


def generate_audio_payload(codec_name, sequence, payload_size):
    """Generate codec-appropriate payload with audio-like characteristics"""

    if codec_name.startswith('G.711'):
        # μ-law/A-law: Simulate speech-like amplitude variations
        # Use sine wave with varying amplitude to simulate speech envelope
        amplitude_variation = abs(math.sin(sequence * 0.05)) * 0.7 + 0.3
        payload = bytearray(payload_size)
        for i in range(payload_size):
            # μ-law compressed values cluster around 0xFF and 0x7F
            base_value = 0xFF if (sequence + i) % 2 == 0 else 0x7F
            variation = int(random.gauss(0, 15) * amplitude_variation)
            payload[i] = max(0, min(255, base_value + variation))
        return bytes(payload)

    elif codec_name == 'G.729':
        # G.729: Compressed CELP format with structured frames
        payload = bytearray(payload_size)
        # First byte typically has higher entropy (LSP indices)
        payload[0] = random.randint(0x80, 0xFF)
        # Remaining bytes have moderate variation
        for i in range(1, payload_size):
            payload[i] = random.randint(0x20, 0xDF)
        return bytes(payload)

    elif codec_name == 'Opus':
        # Opus: Variable bitrate with TOC byte
        payload = bytearray(payload_size)
        # First byte is TOC (Table of Contents)
        payload[0] = 0x78  # Silk-only, 20ms, stereo
        # Rest is compressed data
        for i in range(1, payload_size):
            payload[i] = random.randint(0x00, 0xFF)
        return bytes(payload)

    else:
        # Fallback: Random with speech-like byte distribution
        return bytes([random.randint(0x40, 0xBF) for _ in range(payload_size)])


def generate_comfort_noise(size=13):
    """Generate RFC 3389 Comfort Noise payload"""
    payload = bytearray(size)
    # First byte is noise level
    payload[0] = random.randint(0x30, 0x50)  # -40 to -50 dBov
    # Rest is reflection coefficients
    for i in range(1, size):
        payload[i] = random.randint(0x00, 0xFF)
    return bytes(payload)


def calculate_mos(avg_rtt, jitter, loss_pct, ie_factor=0):
    """Calculate MOS score using ITU-T G.107 E-model (simplified)"""
    # Effective latency
    effective_latency = avg_rtt + (jitter * 2) + 10

    # Delay impairment (Id)
    if effective_latency < 160:
        id_factor = 0
    else:
        id_factor = 0.024 * effective_latency + 0.11 * (effective_latency - 160)

    # Packet loss impairment
    effective_loss = loss_pct / (1 + 0.1 * loss_pct) if loss_pct > 0 else 0
    loss_factor = 2.5 * effective_loss

    # R-factor calculation
    r_factor = 93.2 - id_factor - ie_factor - loss_factor
    r_factor = max(0, min(100, r_factor))

    # Convert R to MOS
    if r_factor < 0:
        mos = 1.0
    elif r_factor > 100:
        mos = 4.5
    else:
        mos = 1 + 0.035 * r_factor + 7e-6 * r_factor * (r_factor - 60) * (100 - r_factor)

    return round(max(1.0, min(4.5, mos)), 2)


def send_rtcp_sr(sock, ssrc, packets_sent, octets_sent, dest_ip, dest_port):
    """Send RTCP Sender Report (RFC 3550)"""
    try:
        # RTCP SR packet format
        version = 2
        padding = 0
        reception_report_count = 0
        packet_type = 200  # SR
        length = 6  # 28 bytes / 4 - 1

        # NTP timestamp (seconds since 1900)
        ntp_timestamp = int((time.time() + 2208988800) * (2**32))
        ntp_msw = (ntp_timestamp >> 32) & 0xFFFFFFFF
        ntp_lsw = ntp_timestamp & 0xFFFFFFFF
        rtp_timestamp = int(time.time() * 8000) & 0xFFFFFFFF

        rtcp_header = struct.pack('!BBHI',
                                  (version << 6) | (padding << 5) | reception_report_count,
                                  packet_type,
                                  length,
                                  ssrc)

        sender_info = struct.pack('!IIIII',
                                  ntp_msw,
                                  ntp_lsw,
                                  rtp_timestamp,
                                  packets_sent,
                                  octets_sent)

        rtcp_packet = rtcp_header + sender_info

        # Send to RTCP port (RTP port + 1)
        sock.sendto(rtcp_packet, (dest_ip, dest_port + 1))
    except Exception as e:
        pass  # Silently ignore RTCP errors


def rtcp_thread(sock, ssrc, metrics, dest_ip, dest_port, stop_event):
    """Background thread to send RTCP Sender Reports every 5 seconds"""
    packets_sent = 0
    octets_sent = 0

    while not stop_event.is_set():
        time.sleep(5)
        if not stop_event.is_set():
            with metrics.lock:
                packets_sent = len(metrics.sent_times)
                octets_sent = packets_sent * 200  # Approximate
            send_rtcp_sr(sock, ssrc, packets_sent, octets_sent, dest_ip, dest_port)


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
                pass  # Silently ignore receiver errors


if __name__ == "__main__":
    # parse arguments
    parser = argparse.ArgumentParser(description='Realistic RTP Audio Traffic Generator')

    # Binding options
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

    # Codec and traffic options
    options_group = parser.add_argument_group('Options', "Configurable options for traffic sending.")
    options_group.add_argument("--codec", help="Codec name (Default G.711-ulaw)",
                               type=str, default="G.711-ulaw",
                               choices=list(CODEC_SPECS.keys()))
    options_group.add_argument("--min-count", "-C", help="Minimum number of packets to send (Default 4500)",
                               type=int, default=4500)
    options_group.add_argument("--max-count", help="Maximum number of packets to send (Default 90000)",
                               type=int, default=90000)
    options_group.add_argument("--call-id", help="Call ID to embed in the payload for tracking",
                               type=str, default="NONE")
    options_group.add_argument("--enable-vad", help="Enable Voice Activity Detection simulation",
                               action='store_true', default=False)
    options_group.add_argument("--enable-rtcp", help="Enable RTCP Sender Reports",
                               action='store_true', default=False)

    args = vars(parser.parse_args())

    # Get codec specifications
    codec_name = args['codec']
    codec_spec = CODEC_SPECS.get(codec_name, CODEC_SPECS['G.711-ulaw'])

    # Calculate packet count
    min_count = args['min_count']
    max_count = args['max_count']
    count = random.randrange(min_count, max_count)

    # Determine source port
    source_port = args['source_port']
    if source_port == 0:
        # Derive deterministic source port from CALL-ID
        # Example: CALL-001 -> 31001, CALL-042 -> 31042
        call_num = 0
        call_id = args.get('call_id', 'NONE')
        if call_id.startswith("CALL-") and call_id[5:].isdigit():
            call_num = int(call_id[5:])

        if call_num > 0:
            source_port = 31000 + call_num
            if source_port > 65535:
                source_port = 65535  # Safety cap
        else:
            # Fallback to random port if CALL-ID format not recognized
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

    # Start receiver thread
    recv_thread = threading.Thread(target=receiver_thread, args=(recv_sock, metrics, stop_event))
    recv_thread.daemon = True
    recv_thread.start()

    # Start RTCP thread if enabled
    rtcp_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    rtp_ssrc = random.randint(0, 0xFFFFFFFF)  # Random SSRC per call

    if args['enable_rtcp']:
        rtcp_t = threading.Thread(target=rtcp_thread, 
                                   args=(rtcp_sock, rtp_ssrc, metrics, 
                                         args['destination_ip'], args['destination_port'], 
                                         stop_event))
        rtcp_t.daemon = True
        rtcp_t.start()

    # Initialize VAD if enabled
    vad = VADSimulator() if args['enable_vad'] else None

    # Log call start
    timestamp = time.strftime('%H:%M:%S')
    duration_estimate = int(count * codec_spec['ptime'] / 1000)
    print(f"[{timestamp}] [{args['call_id']}] 🚀 Executing: python3 rtp.py -D {args['destination_ip']} "
          f"-dport {args['destination_port']} --codec {codec_name} --min-count {args['min_count']} "
          f"--max-count {args['max_count']} --source-interface {args['source_interface']} "
          f"--call-id {args['call_id']}")
    print(f"[{timestamp}] [{args['call_id']}] 📞 CALL STARTED: {args['destination_ip']}:{args['destination_port']} "
          f"| {codec_name} | ~{duration_estimate}s | PPS:{codec_spec['packets_per_sec']}")

    # Pre-build base packet for performance
    if args['source_ip'] is None:
        base_ip = IP(dst=args['destination_ip'], proto=17, tos=184)  # DSCP EF (46)
    else:
        base_ip = IP(dst=args['destination_ip'], src=args['source_ip'], proto=17, tos=184)

    base_udp = UDP(sport=source_port, dport=args['destination_port'])
    rtp_base = RTP(version=2, payload_type=codec_spec['payload_type'], sourcesync=rtp_ssrc)

    # Calculate timing parameters
    ptime = codec_spec['ptime'] / 1000.0  # Convert to seconds
    timestamp_increment = codec_spec['sample_rate'] * codec_spec['ptime'] // 1000
    payload_size = codec_spec['payload_size']

    # Sending loop
    start_time = time.time()
    rtp_timestamp = random.randint(0, 0xFFFFFFFF)  # Random initial timestamp
    octets_sent = 0

    for i in range(1, count + 1):
        send_time = time.perf_counter()  # Single timestamp capture

        # VAD check
        if vad and not vad.is_talking():
            # Send Comfort Noise (CN) packet instead
            payload = generate_comfort_noise()
            rtp = rtp_base.copy()
            rtp.payload_type = 13  # CN payload type
        else:
            # Generate audio payload
            payload = generate_audio_payload(codec_name, i, payload_size)
            rtp = rtp_base.copy()
            rtp.payload_type = codec_spec['payload_type']

        # Update only changing fields
        rtp.sequence = i
        rtp.timestamp = rtp_timestamp

        packet = base_ip / base_udp / rtp / Raw(load=payload)

        # Clear checksums for kernel calculation
        del packet[IP].chksum
        del packet[UDP].chksum

        metrics.record_send(i, send_time)
        send(packet, verbose=False)

        octets_sent += len(payload)

        # Increment RTP timestamp by samples per packet
        rtp_timestamp = (rtp_timestamp + timestamp_increment) & 0xFFFFFFFF

        # Precise timing with codec-specific interval
        time.sleep(ptime)

    # Wait for the last echo to return
    time.sleep(1.0)
    stop_event.set()
    recv_thread.join(timeout=1.0)
    recv_sock.close()
    rtcp_sock.close()

    # Calculate final metrics
    received_count = len(metrics.received_seqs)
    loss = ((count - received_count) / count) * 100 if count > 0 else 0
    loss = max(0, min(100, loss))  # Clamp 0-100
    avg_rtt = sum(metrics.rtts) / len(metrics.rtts) if metrics.rtts else 0
    max_rtt = max(metrics.rtts) if metrics.rtts else 0
    min_rtt = min(metrics.rtts) if metrics.rtts else 0
    jitter = metrics.jitter * 1000  # ms

    # Calculate MOS score
    mos = calculate_mos(avg_rtt, jitter, loss, codec_spec['ie_factor'])

    # Formatting for summary log (Orchestrator will pick this up)
    summary = {
        "call_id": args['call_id'],
        "codec": codec_name,
        "sent": count,
        "received": received_count,
        "loss_pct": round(loss, 2),
        "avg_rtt_ms": round(avg_rtt, 2),
        "min_rtt_ms": round(min_rtt, 2),
        "max_rtt_ms": round(max_rtt, 2),
        "jitter_ms": round(jitter, 2),
        "mos": mos,
        "duration": round(time.time() - start_time, 2),
        "pps": codec_spec['packets_per_sec'],
        "vad_enabled": args['enable_vad'],
        "rtcp_enabled": args['enable_rtcp']
    }

    print(f"RESULT: {json.dumps(summary)}")
    timestamp = time.strftime('%H:%M:%S')
    print(f"[{timestamp}] [{args['call_id']}] ✅ Call finished. MOS: {mos} | Loss: {loss:.2f}% | "
          f"RTT: {avg_rtt:.2f}ms | Jitter: {jitter:.2f}ms")
