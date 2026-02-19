# XFR Speedtest & Throughput Testing

The XFR tool is a high-performance throughput and latency testing engine integrated into the SD-WAN Traffic Generator. It is designed for validating path quality, detecting maximum bandwidth, and performing bidirectional diagnostic tests.

## Features
- **Deterministic Port Mapping**: Source ports are mapped as `40000 + sequence_id` for easy identification in firewall/flow logs (Only UDP Tests).
- **Micro-Interval Telemetry**: Real-time throughput (Mbps), RTT (ms), and Packet Loss (%) tracking.
- **Directional Modes**: Supports Upload (Client to Server), Download (Reverse), and Bidirectional testing.
- **Protocol Support**: TCP, UDP, and QUIC testing capabilities.
- **Max Bandwidth Detection**: Leave the bitrate as "0" or "Max" to detect the peak throughput of a path.

## Deployment Configuration

For best results, XFR should be run with **Host Networking** to avoid NAT overhead and accurately measure latency.

### Target Setup (Echo Server)
On your target machine, use the standard `docker-compose.target.yml`:

```yaml
services:
  # XFR Speedtest Target
  xfr-target:
    image: jsuzanne/xfr-target:latest
    container_name: xfr-target
    network_mode: "host"
    restart: unless-stopped
    environment:
      - XFR_PORT=9000
      - XFR_MAX_DURATION=60
      - XFR_RATE_LIMIT=2
      - XFR_ALLOW_CIDR=0.0.0.0/0
```

## Quick Targets (Reusability)
You can pre-configure target hosts in your `web-ui` configuration using the `XFR_QUICK_TARGETS` environment variable:

```bash
XFR_QUICK_TARGETS="Production-DC:10.0.0.5,Backup-DC:10.0.0.10,Office-Branch:192.168.1.1"
```
These will appear as a dropdown menu next to the Host input field in the dashboard.

## Protocol Specifics
- **UDP & QUIC**: Supports the `--cport` (source port) option for fixed-port mapping.
- **TCP**: Uses standard OS ephemeral port selection (source port mapping is not supported for TCP).

## External Resources
For more details on the underlying engine, visit the official [XFR GitHub Repository](https://github.com/lance0/xfr).
