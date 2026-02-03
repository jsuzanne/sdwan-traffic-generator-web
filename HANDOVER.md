# 📋 Project Handover - SD-WAN Traffic Generator

## 🎯 Current Status (as of 2026-02-03)
We are currently at version **v1.1.2-patch.33.72**.
The system is now fully optimized with **VyOS Firewall Integration**, **Smart Logging**, and **Light/Dark Mode**.

## ✅ Accomplishments & Solved Issues
1.  **VyOS Firewall (v33.65)**: Implemented `block`, `unblock`, and `show-denied` commands with frontend validation and `--force` override.
2.  **Log Optimization (v33.68-70)**: 
    - Standardized `[HH:MM:SS]` timestamps across all modules.
    - Caching for `/api/system/health` (5s).
    - Deduplication of Maintenance, Internet, and GitHub fetch logs.
    - IoT protocol warning filtering and debug-mode stats.
3.  **UI/UX (v33.71)**: Added a premium **Light/Dark Mode** switch with persistence and smooth transitions.
4.  **Critical Fixes (v33.69)**: Resolved `TypeError: log2 is not a function` and fixed Docker module resolution errors.
5.  **Cleanup**: Removed obsolete `voip/convergence_orchestrator.py` and redundant `voip/` directory.

## 🚀 Tomorrow's Roadmap (Windows Testing)
1.  **Testing Environment**: Planning to test on Windows Docker Desktop.
2.  **Key Adjustments**: 
    - Need to disable `network_mode: host` (not supported on Windows).
    - Must open Windows Firewall for UDP 6100.
3.  **Validation**: Verify if Scapy Layer-3 sending works well through the WSL2 networking stack.

## 🔑 Crucial Notes
- **Stable Tag**: Reminder to only use the manual GitHub Action for `:stable` tags. Use patch versions for development.
- **Port 5060**: No longer hardcoded as source port to allow flow separation.
- **Log Utility**: Always use the `log()` utility from `./utils/logger` instead of `console.log` for consistent formatting.
