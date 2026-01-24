# 📋 Project Handover - SD-WAN Traffic Generator

## 🎯 Current Status (as of 2026-01-24)
We are currently at version **v1.1.0-patch.64**.
DNS Security, Voice Simulation, and Real-time Monitoring are fully hardened.

## ✅ Accomplishments & Solved Issues
1.  **Live Counters (v64)**: Implemented real-time updates for security gauges. Added background polling (30s) and immediate refresh after manual tests to ensure the dashboard always reflects current data.
2.  **Universal DNS (v63)**: Normalized DNS security tests across Linux, macOS, and Windows. Prioritized `nslookup` for consistent trace detection.
3.  **DNS Hardening (v62)**: Reliable "sinkhole" detection in stdout/stderr.
4.  **Flow Separation (v61)**: Unique source ports for voice calls.
5.  **Clean Slate (v60)**: Orchestrator reset at startup.

## 🚀 Tomorrow's Roadmap (Windows Testing)
1.  **Testing Environment**: Planning to test on Windows Docker Desktop.
2.  **Key Adjustments**: 
    - Need to disable `network_mode: host` (not supported on Windows).
    - Must open Windows Firewall for UDP 6100.
3.  **Validation**: Verify if Scapy Layer-3 sending works well through the WSL2 networking stack.

## 🔑 Crucial Notes
- **Stable Tag**: Reminder to only use the manual GitHub Action for `:stable` tags. Use patch versions for development.
- **Port 5060**: No longer hardcoded as source port to allow flow separation.
