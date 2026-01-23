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

## 📡 Echo Server Setup (Targets)

To measure end-to-end voice performance, you should deploy the **Voice Echo Server** on your target sites (Branch offices, Cloud VPCs, etc.). This server simply bounces back every RTP packet it receives.

### Quick Deployment on Target
If you have a fresh Ubuntu machine, you can deploy the echo server in 2 minutes:

1.  **Install Docker & Docker Compose**:
    ```bash
    curl -fsSL https://get.docker.com | sh
    ```
2.  **Create a `docker-compose.yml`**:
    ```yaml
    services:
      voice-echo:
        image: jsuzanne/sdwan-voice-echo:stable
        container_name: sdwan-voice-echo
        ports:
          - "6100:6100/udp"
        restart: unless-stopped
    ```
3.  **Start it**:
    ```bash
    docker compose up -d
    ```

---

## 🔧 Technical Details

### RTP Packet Structure
The engine generates packets every **20-30ms** to simulate realistic voice timing:
*   **Layer 3**: IPv4 (Direct L3 sending for better compatibility).
*   **Layer 4**: UDP (Default Source Port: 5060 / Destination Port: 6100).
*   **Layer 5**: RTP v2 (Sequence numbers, Timestamps, Payload Type 8 - G.711).

### Network Requirements
To work correctly, the Voice container requires:
*   `NET_ADMIN` and `NET_RAW` Docker capabilities (pre-configured in our compose).
*   The target machine must allow UDP 6100 in its firewall (Security Groups / IPTables).

---

## 📊 Monitoring & Logs

### Web UI
Calls are tracked in real-time in the **Voice** tab. The dashboard uses **Session IDs** to ensure that only "Live" calls from the current run are displayed, eliminating ghost calls after a restart.

### CLI Debugging
You can monitor the activity of both the **Generator** and the **Echo Server** using Docker logs:

**On the Generator side:**
```bash
docker compose logs -f sdwan-voice-gen
```
*Expected output:*
```text
[CALL-0102] 📞 CALL STARTED: 192.168.217.5:6100 | G.711-ulaw | 30s
[CALL-0102] ✅ CALL ENDED: 192.168.217.5:6100
```

**On the Echo Server side (Target site):**
```bash
docker compose logs -f sdwan-voice-echo
```
*Expected output:*
```text
📞 [18:53:07] Incoming call from 192.168.206.10:31861
📞 [18:53:15] Incoming call from 192.168.217.5:20431
✅ [18:53:45] Call from 192.168.206.10:31861 finished
```

### ⚠️ Troubleshooting
*   **Active Calls not showing up?** Check if the date/time on your Ubuntu machine is synchronized (NTP).
*   **Logs say "Skipping call"?** The destination IP is probably unreachable (no ping). Check your SD-WAN routing or target firewall.
