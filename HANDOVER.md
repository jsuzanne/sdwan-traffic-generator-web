# 📋 Project Handover - SD-WAN Traffic Generator

## 🎯 Current Status (as of 2026-01-23)
We are currently at version **v1.1.0-patch.60**.
Finalized 'Clean Slate' architecture for 100% UI accuracy.

## ✅ Accomplishments & Solved Issues
1.  **Zero Pollution (v60)**: Orchestrator now truncates stats logs and resets counters on every startup. This guarantees that anything shown in the UI is from the current run.
2.  **UI Sync**: Simplified Dashboard logic to match the clean logs. No more session filtering needed.
3.  **Deep Inspection**: Call IDs are embedded in RTP payloads and decoded by the Echo server.
4.  **Host Networking**: Implemented for native performance.
5.  **Build Stability**: Switched to Amazon ECR Public mirrors to avoid Docker Hub rate limits.

## 🚀 Immediate Next Steps
1.  **Verify v56**: Ensure the build passes and the host networking mode doesn't create port conflicts (unlikely).

## 🔑 Crucial Notes
- **Stable vs Patch**: Do NOT auto-tag builds as `:stable`. Only use GitHub Actions manual trigger for official promotion.
- **Clock Skew**: The UI uses log-relative time for "Active Calls" detection to be immune to timezone differences between the browser and the server.
