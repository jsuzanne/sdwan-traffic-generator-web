# 📋 Project Handover - SD-WAN Traffic Generator

## 🎯 Current Status (as of 2026-01-23)
We are currently at version **v1.1.0-patch.62**.
The Voice Simulation and DNS Security tests are now production-ready.

## ✅ Accomplishments & Solved Issues
1.  **DNS Hardening (v62)**: Re-engineered DNS security tests to prioritize explicit tools (`nslookup`, `dig`) and added keyword detection for "sinkhole". This solves issues where Palo Alto Networks redirects were misreported as execution failures.
2.  **Flow Separation (v61)**: Every call now uses a unique source port for realistic SD-WAN load balancing and accurate Echo Server tracking.
3.  **Clean Slate (v60)**: Orchestrator resets logs and counters at startup for 100% UI accuracy.
4.  **Deep Inspection**: Call IDs are injected into RTP payloads for end-to-end tracing.
5.  **Build Reliability**: Full migration to Amazon ECR Public mirrors.

## 🚀 Tomorrow's Roadmap (Windows Testing)
1.  **Testing Environment**: Planning to test on Windows Docker Desktop.
2.  **Key Adjustments**: 
    - Need to disable `network_mode: host` (not supported on Windows).
    - Must open Windows Firewall for UDP 6100.
3.  **Validation**: Verify if Scapy Layer-3 sending works well through the WSL2 networking stack.

## 🔑 Crucial Notes
- **Stable Tag**: Reminder to only use the manual GitHub Action for `:stable` tags. Use patch versions for development.
- **Port 5060**: No longer hardcoded as source port to allow flow separation.
