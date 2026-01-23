#! /usr/bin/env python
import time
import argparse
import random
import logging
import warnings

# Disable all warnings for clean container logs
warnings.filterwarnings("ignore")
logging.getLogger("scapy").setLevel(logging.ERROR)

from scapy.layers.inet import IP, UDP
from scapy.layers.rtp import RTP
from scapy.packet import Raw
from scapy.sendrecv import send

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

    args = vars(parser.parse_args())

    print("Setting up RTP Packets")
    udp_payload = []
    # 212 = 240 - IP headler len  - UDP header len - RTP header length ==> 240 - 20 - 8 - 12
    for i in range(200):
        tmp = "{:02x}".format(random.randrange(0, 255))
        udp_payload.append(bytes.fromhex(tmp))

    # pull args for count.
    min_count = args['min_count']
    max_count = args['max_count']
    count = random.randrange(min_count, max_count)
    print("sending: {0} packets".format(count))

    source_port = args['source_port']
    if source_port == 0:
        source_port = random.randrange(10000, 65535)

    # Pre-build packet template for performance
    if args['source_ip'] is None:
        base_packet = IP(dst=args['destination_ip'], proto=17, len=240)
    else:
        base_packet = IP(dst=args['destination_ip'], src=args['source_ip'], proto=17, len=240)
        
    base_packet = base_packet/UDP(sport=source_port, dport=args['destination_port'], len=220)

    # Sending loop
    for i in range(1, count, 1):
        packet = base_packet/RTP(version=2, payload_type=8, sequence=i, sourcesync=1, timestamp=int(time.time()))
        packet = packet/Raw(load=b"".join(udp_payload))

        del packet[IP].chksum
        del packet[UDP].chksum

        # Send using Layer 3 (Standard IP) - Let OS handle MAC/ARP/Interface
        # We don't pass iface here to avoid Scapy 'SyntaxWarning'
        send(packet, verbose=False)
        time.sleep(0.03)

    print("Call finished.")
