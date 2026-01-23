#! /usr/bin/env python
import time
import argparse
import random

# Set log level to benefit from Scapy warnings
import logging

from scapy.layers.inet import IP, UDP
from scapy.layers.l2 import Ether
from scapy.layers.rtp import RTP
from scapy.packet import Raw
from scapy.sendrecv import send, sendp

logging.getLogger("scapy").setLevel(1)

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
                               help="Source interface RTP stream. If not specified, "
                                    "the kernel will auto-select.", type=str,
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
    # delete IP and UDP checksum so that they can be re computed.
    for i in range(1, count, 1):

        if args['source_interface'] is None:
            if args['source_ip'] is None:
                packet = IP(dst=args['destination_ip'], proto=17, len=240)
            else:
                packet = IP(dst=args['destination_ip'], src=args['source_ip'], proto=17, len=240)
        else:
            if args['source_ip'] is None:
                packet = Ether() / IP(dst=args['destination_ip'], proto=17, len=240)
            else:
                packet = Ether() / IP(dst=args['destination_ip'], src=args['source_ip'], proto=17, len=240)
        # do this for all streams
        packet = packet/UDP(sport=source_port, dport=args['destination_port'], len=220)
        packet = packet/RTP(version=2, payload_type=8, sequence=i, sourcesync=1, timestamp=int(time.time()))
        packet = packet/Raw(load=b"".join(udp_payload))

        if args['source_interface'] is not None:
            del packet[Ether].chksum
        del packet[IP].chksum
        del packet[UDP].chksum

        if args['source_interface'] is None:
            output = send(packet, verbose=False)
        else:
            output = sendp(packet, iface=args['source_interface'], verbose=False)
        # output = send(packet, verbose=False)
        time.sleep(0.03)

    # enable these for additional debugs
    # print(packet.show())
    # print("Sending the above packet on interface {0}".format(args['source_interface']))
