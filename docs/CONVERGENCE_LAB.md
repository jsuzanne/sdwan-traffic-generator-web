# Convergence Lab: SD-WAN Failover & Performance Probing

The **Convergence Lab** is a high-precision diagnostic tool designed to measure network failover times (convergence) and directional packet loss. It is specifically optimized for validating SD-WAN tunnel steering and circuit transition performance.

---

## 🔬 How it Works

The tool uses a **High-Frequency UDP Probe** strategy to identify sub-second network interruptions that traditional monitoring tools (like standard ICMP) often miss.

### 1. High-Frequency Probing
- **Default Rate**: 50 PPS (Packets Per Second), meaning a packet is sent every **20ms**.
- **Default Port**: **UDP 6101** (Separated from Voice traffic on 6100).
- **Payload**: Each packet contains a unique **Sequence Number** and a high-resolution **Timestamp**.
- **Echo Mechanism**: The destination `echo_server.py` receives the packet and echoes it back, appending its own reception counter to allow for directional loss analysis.

### 2. Sequence Gap Analysis
The core logic resides in the `convergence_orchestrator.py`. It detects "Blackouts" by monitoring gaps in the received sequence numbers:
- When a packet arrives, the orchestrator calculates the difference between the current sequence and the last received sequence.
- **Formula**: `Gap = (Current_Seq - Last_Seq - 1) * (1000 / PPS)`
- If `PPS = 50`, a gap of 5 missing packets equals a **100ms blackout**.

### 3. Directional Loss Calculation
Unlike standard "Round Trip" loss, the Convergence Lab breaks down loss by direction:
- **TX Loss (Uplink)**: Calculated by comparing the number of packets sent by the generator vs. the number received by the echo server (reported in the echoed payload).
- **RX Loss (Downlink)**: Calculated by comparing the number of packets echoed by the server vs. the number actually received back by the generator.
- **Loss Time (ms)**: The history table displays the estimated total "outage time" for each direction (e.g., `↑ 2% (240ms)`). This is calculated by multiplying the lost packet count by the sampling interval.

---

## ⚖️ Scoring & Verdicts

The "Verdict" of a test is determined by the **Maximum Blackout Duration** recorded during the session.

| Verdict | Blackout Time | Meaning |
|:-------:|:-------------:|:--------|
| **EXCELLENT** | 0ms | No measurable sequence gaps detected. |
| **GOOD** | < 1,000ms | Failover occurred within standard SD-WAN sub-second thresholds. |
| **CRITICAL** | > 5,000ms | Significant outage detected; circuit transition failed or was severely delayed. |

> [!NOTE]
> Even if total packet loss is low, a single high "Max Blackout" indicates a specific event (like a hard circuit failover) that impacted the real-time flow.

---

## 🛠️ Operational Tips

### Global Precision (Rate)
You can adjust the probe frequency based on your testing goals:
- **100 PPS (10ms)**: Ultra-high precision for voice-sensitive tunnel transitions.
- **50 PPS (20ms)**: Standard SD-WAN validation (Default).
- **1 PPS / 5 PPS**: Long-term "heartbeat" monitoring with minimal bandwidth impact.

### Correlation with Infrastructure
Each test is assigned a unique **Test ID** (e.g., `[CONV-042]`). 
- When a probe is active, the orchestrator binds to a specific **Source Port**.
- You can use this Source Port to search for specific flow logs in your SD-WAN Orchestrator (Viptela, Silver Peak, Velocloud, etc.) to verify which tunnel or circuit was used during the outage.

### Warmup Period
To ensure accurate "Failover" measurements, the tool implements a **5-second warmup period**. 
- During this window, the generator sends a burst of initial packets to stabilize the path.
- Sequence gaps occurring during the first 5 seconds are **ignored** in the Max Blackout calculation to prevent false positives from initial flow setup.
