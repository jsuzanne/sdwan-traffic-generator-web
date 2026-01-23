# 📋 Project Handover - SD-WAN Traffic Generator

## 🎯 Current Status (as of 2026-01-23)
We are currently at version **v1.1.0-patch.61**.
The Voice Simulation (RTP) is fully operational with deep tracing and resilient UI.

## ✅ Accomplishments & Solved Issues
1.  **Flow Separation (v61)**: Every call now uses a unique source port. This is CRITICAL for SD-WAN load balancing and allows the Echo Server to track multiple concurrent sessions.
2.  **Clean Slate (v60)**: Orchestrator resets everything (logs, counters) on startup to ensure the UI is always 1:1 with reality.
3.  **Deep Inspection**: Call IDs are injected into RTP payloads and decoded by the Echo Server for end-to-end tracing.
4.  **Resilient Dashboard**: UI sorting fixed (newest first), log buffer increased (1000 lines), and silent Scapy logs implemented.
5.  **Bypass Docker Hub**: Full migration to Amazon ECR Public mirrors to avoid 429 rate limits.
6.  **Documentation**: `docs/VOICE_SIMULATION.md` updated with all new features and Windows-specific deployment tips.

## 🚀 Tomorrow's Roadmap (Windows Testing)
1.  **Testing Environment**: Planning to test on Windows Docker Desktop.
2.  **Key Adjustments**: 
    - Need to disable `network_mode: host` (not supported on Windows).
    - Must open Windows Firewall for UDP 6100.
3.  **Validation**: Verify if Scapy Layer-3 sending works well through the WSL2 networking stack.

## 🔑 Crucial Notes
- **Stable Tag**: Reminder to only use the manual GitHub Action for `:stable` tags. Use patch versions for development.
- **Port 5060**: No longer hardcoded as source port to allow flow separation.
