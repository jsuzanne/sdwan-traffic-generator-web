# 📋 Project Handover - SD-WAN Traffic Generator

## 🎯 Current Status (as of 2026-01-23)
We are currently at version **v1.1.0-patch.56**.
The primary focus has been the **Voice Simulation (RTP)** integration and build reliability.

## ✅ Accomplishments & Solved Issues
1.  **Ghost Calls Fix**: Implemented `session_id` in the orchestrator to filter out old calls.
2.  **Host Networking**: `sdwan-voice-gen` is now in `network_mode: host` to access physical interfaces directly.
3.  **Bypass Docker Hub**: Switched all base images to **Amazon ECR Public** mirrors to avoid 429 rate limits.
4.  **Log Optimization**: Scapy simulation logs are now 100% silent.
5.  **Reachability**: Orchestrator pings targets before starting RTP streams.

## 🚀 Immediate Next Steps
1.  **Verify v56**: Ensure the build passes and the host networking mode doesn't create port conflicts (unlikely).

## 🔑 Crucial Notes
- **Stable vs Patch**: Do NOT auto-tag builds as `:stable`. Only use GitHub Actions manual trigger for official promotion.
- **Clock Skew**: The UI uses log-relative time for "Active Calls" detection to be immune to timezone differences between the browser and the server.
