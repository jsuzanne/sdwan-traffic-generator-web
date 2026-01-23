# 📋 Project Handover - SD-WAN Traffic Generator

## 🎯 Current Status (as of 2026-01-23)
We are currently at version **v1.1.0-patch.58**.
Final polish of the Voice Dashboard and logging.

## ✅ Accomplishments & Solved Issues
1.  **Ghost Calls Fix**: Strict session-based filtering restored. The UI identifies the latest `session_start` and wipes all calls from previous sessions.
2.  **History Sorting**: Explicit descending sort (newest first) implemented in the UI.
3.  **Real-time Logs**: Added file flushing in the orchestrator and increased tail buffer to 1000 lines.
4.  **Host Networking**: Successfully implemented for native Scapy performance.
5.  **Bypass Docker Hub**: Full migration to Amazon ECR Public mirrors.

## 🚀 Immediate Next Steps
1.  **Verify v56**: Ensure the build passes and the host networking mode doesn't create port conflicts (unlikely).

## 🔑 Crucial Notes
- **Stable vs Patch**: Do NOT auto-tag builds as `:stable`. Only use GitHub Actions manual trigger for official promotion.
- **Clock Skew**: The UI uses log-relative time for "Active Calls" detection to be immune to timezone differences between the browser and the server.
