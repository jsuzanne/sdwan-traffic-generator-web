# 📋 Project Handover - SD-WAN Traffic Generator

## 🎯 Current Status (as of 2026-01-24)
We are currently at version **v1.1.0-patch.65**.
All security engines (URL, DNS, Threat) are fully hardened with deep inspection.

## ✅ Accomplishments & Solved Issues
1.  **URL Deep Inspection (v65)**: Enhanced URL filtering to distinguish between legitimate Palo Alto Test Pages (Allowed) and actual Block Pages (Blocked). The engine now inspects response content for signatures, eliminating false positives for branded test URLs.
2.  **Live Counters (v64)**: Real-time update for security gauges with 30s background polling.
3.  **Universal DNS (v63)**: Normalized DNS tests for Linux, macOS, and Windows using `nslookup`.
4.  **DNS Hardening (v62)**: Reliable "sinkhole" detection in stdout/stderr.
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
