# 📋 Project Handover - SD-WAN Traffic Generator

## 🎯 Current Status (as of 2026-01-23)
We are currently at version **v1.1.0-patch.61**.
Finalized voice simulation with unique UDP flows for deep visibility.

## ✅ Accomplishments & Solved Issues
1.  **Flow Separation (v61)**: Removed hardcoded source port 5060. Calls now use unique source ports, allowing the Echo server to correctly log and track multiple simultaneous calls.
2.  **Zero Pollution (v60)**: Orchestrator truncates logs and resets counters on startup.
3.  **Deep Inspection**: Call IDs are embedded in RTP payloads.
4.  **Host Networking**: Implemented for native Scapy performance.
5.  **Build Stability**: Switched to Amazon ECR Public mirrors.

## 🚀 Immediate Next Steps
1.  **Verify v56**: Ensure the build passes and the host networking mode doesn't create port conflicts (unlikely).

## 🔑 Crucial Notes
- **Stable vs Patch**: Do NOT auto-tag builds as `:stable`. Only use GitHub Actions manual trigger for official promotion.
- **Clock Skew**: The UI uses log-relative time for "Active Calls" detection to be immune to timezone differences between the browser and the server.
