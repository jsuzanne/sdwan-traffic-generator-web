# 📋 Project Handover - SD-WAN Traffic Generator

## 🎯 Current Status (as of 2026-01-23)
We are currently at version **v1.1.0-patch.57**.
The primary focus has been solving UI display issues for active voice calls.

## ✅ Accomplishments & Solved Issues
1.  **Ghost Calls Fix**: Implemented `session_id` filter (optimized in v57 to use a 2-hour sliding window).
2.  **UI Resilience**: The UI now detects active calls based on time rather than strict session matching, ensuring visibility even after orchestrator restarts.
3.  **Log Buffer**: Increased retrieved voice stats from 100 to 500 lines to ensure enough history is available.
4.  **Host Networking**: `sdwan-voice-gen` is now in `network_mode: host` for native performance.
5.  **Bypass Docker Hub**: Switched all base images to **Amazon ECR Public** mirrors.

## 🚀 Immediate Next Steps
1.  **Verify v56**: Ensure the build passes and the host networking mode doesn't create port conflicts (unlikely).

## 🔑 Crucial Notes
- **Stable vs Patch**: Do NOT auto-tag builds as `:stable`. Only use GitHub Actions manual trigger for official promotion.
- **Clock Skew**: The UI uses log-relative time for "Active Calls" detection to be immune to timezone differences between the browser and the server.
