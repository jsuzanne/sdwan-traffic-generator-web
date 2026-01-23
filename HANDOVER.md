# 📋 Project Handover - SD-WAN Traffic Generator

## 🎯 Current Status (as of 2026-01-23)
We are currently at version **v1.1.0-patch.63**.
DNS Security tests and Voice Simulation are now fully cross-platform resilient.

## ✅ Accomplishments & Solved Issues
1.  **Universal DNS (v63)**: Normalized DNS security tests across Linux, macOS, and Windows. Prioritized `nslookup` as the standard tool to ensure identical sinkhole detection logic regardless of the host OS. Improved output parsing for Windows format.
2.  **DNS Hardening (v62)**: Added keyword detection for "sinkhole" in both stdout and stderr. Reliable for Palo Alto Networks redirections (even with SERVFAIL).
3.  **Flow Separation (v61)**: Unique source ports for every voice call. Improved SD-WAN traffic realism.
4.  **Clean Slate (v60)**: Orchestrator reset at startup for 100% UI accuracy.
5.  **Build Stability**: Switched to Amazon ECR Public mirrors.

## 🚀 Tomorrow's Roadmap (Windows Testing)
1.  **Testing Environment**: Planning to test on Windows Docker Desktop.
2.  **Key Adjustments**: 
    - Need to disable `network_mode: host` (not supported on Windows).
    - Must open Windows Firewall for UDP 6100.
3.  **Validation**: Verify if Scapy Layer-3 sending works well through the WSL2 networking stack.

## 🔑 Crucial Notes
- **Stable Tag**: Reminder to only use the manual GitHub Action for `:stable` tags. Use patch versions for development.
- **Port 5060**: No longer hardcoded as source port to allow flow separation.
