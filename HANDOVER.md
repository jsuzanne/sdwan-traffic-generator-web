# 📋 Project Handover - SD-WAN Traffic Generator

## 🎯 Current Status (as of 2026-01-24)
We are currently at version **v1.1.0-patch.68**.
Enhanced UX for batch testing and advanced Voice QoS analytics are now live.

## ✅ Accomplishments & Solved Issues
1.  **UX & Analytics (v68)**: Implemented batch progress indicators for Security tests and a comprehensive QoS Summary widget (Avg/Min/Max) for Voice simulation. Added advanced filtering/search for voice history.
2.  **Voice QoS (v67)**: Integrated real-time network measurement (Loss, RTT, Jitter) into voice calls.
3.  **Global Reset (v66)**: Added "Reset Statistics" buttons across all modules.
4.  **Universal DNS (v63)**: Normalized DNS tests using `nslookup`.
5.  **Flow Separation (v61)**: Unique source ports for voice calls.
6.  **Clean Slate (v60)**: Orchestrator reset at startup.

## 🚀 Tomorrow's Roadmap (Windows Testing)
1.  **Testing Environment**: Planning to test on Windows Docker Desktop.
2.  **Key Adjustments**: 
    - Need to disable `network_mode: host` (not supported on Windows).
    - Must open Windows Firewall for UDP 6100.
3.  **Validation**: Verify if Scapy Layer-3 sending works well through the WSL2 networking stack.

## 🔑 Crucial Notes
- **Stable Tag**: Reminder to only use the manual GitHub Action for `:stable` tags. Use patch versions for development.
- **Port 5060**: No longer hardcoded as source port to allow flow separation.
