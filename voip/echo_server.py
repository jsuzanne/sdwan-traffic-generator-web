#!/usr/bin/env python3
import argparse
from socket import *

# UDP Echo Server - Optimized for Docker
BUFSIZE = 1024

def run_server(ip, port):
    s = socket(AF_INET, SOCK_DGRAM)
    try:
        s.bind((ip, port))
        print(f"UDP echo server ready on {ip}:{port}")
        while True:
            data, addr = s.recvfrom(BUFSIZE)
            # Just bounce it back
            s.sendto(data, addr)
    except Exception as e:
        print(f"Server error: {e}")
    finally:
        s.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--ip", help="IP to listen on", default="0.0.0.0")
    parser.add_argument("--port", help="Port to listen on (Default 6100)", type=int, default=6100)
    args = parser.parse_args()

    run_server(args.ip, args.port)
