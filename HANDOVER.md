# 📋 Project Handover - SD-WAN Traffic Generator

## 🎯 Current Status (as of 2026-01-30)
We are currently at version **v1.1.2-patch.33.7**.
The system is now optimized for **Host Mode** with Smart Networking and IoT Simulation.

## ✅ Accomplishments & Solved Issues
1.  **Smart Upgrades (v33.7)**: Implemented non-blocking background upgrades with real-time log streaming in the UI.
2.  **IoT Simulation (v33.7)**: Added Layer-2/3 device simulation (DHCP/ARP/Scapy) for physical network testing.
3.  **Host Mode & Port Fix (v33.7)**: Resolved port 8080 conflicts and standardized Host Mode for all generators.
4.  **UX & Analytics (v68)**: Implemented batch progress indicators and QoS Summary widgets.

## 🚀 Tomorrow's Roadmap (Windows Testing)
1.  **Testing Environment**: Planning to test on Windows Docker Desktop.
2.  **Key Adjustments**: 
    - Need to disable `network_mode: host` (not supported on Windows).
    - Must open Windows Firewall for UDP 6100.
3.  **Validation**: Verify if Scapy Layer-3 sending works well through the WSL2 networking stack.

## 🔑 Crucial Notes
- **Stable Tag**: Reminder to only use the manual GitHub Action for `:stable` tags. Use patch versions for development.
- **Port 5060**: No longer hardcoded as source port to allow flow separation.
