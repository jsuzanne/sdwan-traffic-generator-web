# 🎙️ Voice Simulation (RTP) Guide

The SD-WAN Traffic Generator includes a sophisticated Voice over IP (VoIP) simulation engine. Unlike standard HTTP traffic, this module simulates real-time RTP (Real-time Transport Protocol) streams to test Quality of Service (QoS) and SD-WAN path selection policies.

## 🚀 Overview

The system consists of two main components:
1.  **Voice Orchestrator**: Manages multiple simultaneous calls, handles timing between calls, and logs start/end events.
2.  **RTP Engine (`rtp.py`)**: A Scapy-based engine that forges raw Ethernet/IP/UDP/RTP packets to simulate specific audio codecs.

## 🛠️ Configuration

### Server List (`voice-servers.txt`)
Located in your `config/` directory, this file defines where the traffic is sent.
**Format**: `target_ip:port|codec_name|weight|duration_sec`

Example:
```text
192.168.100.10:6100|G.711-ulaw|100|30
192.168.100.11:6100|G.729|50|60
```

*   **Target**: The IP and UDP port of the receiver (usually an `sdwan-voice-gen` in echo mode).
*   **Codec**: Display name for the UI.
*   **Weight**: Probability of picking this target (higher = more frequent).
*   **Duration**: How long the call lasts in seconds.

### Simulation Settings
Accessible via the **Voice** tab in the Web UI:
*   **Max Simultaneous Calls**: How many concurrent RTP streams to run.
*   **Sleep Between Calls**: Delay before starting a new call after one ends.
*   **Source Interface**: The network interface to use (must support RAW sockets).

## 📡 Technical Details

### RTP Packet Structure
The engine generates packets every **30ms** to simulate realistic voice jitter and timing:
*   **Layer 2**: Ethernet (RAW)
*   **Layer 3**: IPv4
*   **Layer 4**: UDP (Source Port: 5060 by default)
*   **Layer 5**: RTP (Version 2, Sequence numbers, Timestamps)

### Network Requirements
To work correctly, the Voice container requires:
*   `NET_ADMIN` and `NET_RAW` Docker capabilities.
*   Access to the physical/configured interface.

## 📊 Monitoring
Calls are tracked in real-time in the **Voice** tab:
*   **Active Calls**: Shows currently "Live" streams with their unique `CALL-ID`.
*   **Recent History**: Chronological log of all starts and ends.
