# 📋 Project Handover - SD-WAN Traffic Generator

## 🎯 Current Status (as of 2026-01-24)
We are currently at version **v1.1.0-patch.67**.
The system is now a full-featured network diagnostic and traffic simulation suite.

## ✅ Accomplishments & Solved Issues
1.  **Voice QoS (v67)**: Integrated real-time network measurement (Loss, RTT, Jitter) into voice calls using RTP echo reflection. Each call now provides a Precise SLA assessment (Excellent/Fair/Poor).
2.  **Global Reset (v66)**: Implemented "Reset Statistics" buttons across Traffic, Security, and Voice modules.
3.  **URL Deep Inspection (v65)**: Accurate distinction between Palo Alto Test Pages and security block pages.
4.  **Universal DNS (v63)**: Normalized DNS tests using `nslookup`.
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
