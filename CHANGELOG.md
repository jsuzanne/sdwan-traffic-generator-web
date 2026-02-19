# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
## [v1.2.1-patch.81] - 2026-02-19
### Fixed
- **System Maintenance**: Implemented robust project root detection (`PROJECT_ROOT`) to correctly locate `docker-compose.yml` and configuration directories in both containerized and local environments. Fixed the `FileNotFoundError: /docker-compose.yml` error. 📂
- **System Robustness**: Standardized all internal paths to use detected project root instead of brittle relative paths.

## [v1.2.1-patch.80] - 2026-02-19
### Fixed
- **System Maintenance**: Further improved restart reliability by explicitly installing `docker-compose` in the container and adding robust binary detection (checking both standalone and plugin versions). 🛡️
- **System Maintenance**: Increased reliability of GitHub version detection by adding retries and a 10s timeout to the API fetch. 📡

## [v1.2.1-patch.78] - 2026-02-19
### Fixed
- **System Maintenance**: Improved version detection logic by switching to GitHub Tags API. 🔍
- **System Maintenance**: Fixed service restart and reload failures (exit code 125) by mounting `docker-compose.yml` into the dashboard container and implementing command fallback logic. 🛠️🔄

## [v1.2.1-patch.77] - 2026-02-19
### Changed
- **Documentation**: Updated README.md with detailed macOS installation output example and platform-specific bridge mode notices. 🍎📦

## [v1.2.1-patch.75] - 2026-02-18
### Added
- **VyOS Control**: Implemented manual "Refresh Info" for routers, enabling real-time detection of interface changes, hostname updates, and version changes. 🔄📡
- **VyOS Control**: Added safety dependency checks to prevent deleting routers that are still referenced by mission sequences. 🛡️🚫

## [v1.2.1-patch.74] - 2026-02-18
### Added
- **VyOS Control**: Implemented "Step-by-Step" sequence mode, allowing manual advancement of actions via "Next", "Rewind", and "Restart" controls in the timeline. ⏯️🪜
- **UI**: Added conditional Mission Parameters and interactive manual control bar for sequential demonstrations. 📊🕹️

## [v1.2.1-patch.73] - 2026-02-18
### Changed
- **Logs**: Enhanced server-side debug logging for Voice and VyOS import/export workflows to facilitate troubleshooting in production environments. 📝🔍

## [v1.2.1-patch.72] - 2026-02-18
### Fixed
- **Voice & VyOS**: Fixed configuration import processes by switching to JSON payloads and implementing real-time scheduler reloads in the backend. 📥🔄

## [v1.2.1-patch.71] - 2026-02-18
### Fixed
- **Dashboard**: Fixed weight persistence for object-based configurations in `server.ts`, ensuring UI changes are correctly saved and applied to traffic generation. ⚖️💾

## [v1.2.1-patch.70] - 2026-02-18
### Changed
- **Import/Export**: Modernized application configuration export/import to use structured JSON format by default, replacing legacy text formats. 📥📤

## [v1.2.1-patch.69] - 2026-02-18
### Added
- **Configuration**: Implemented robust migration logic for application configurations and standardized object-based defaults for new installations. 📦⚙️

## [v1.2.1-patch.68] - 2026-02-18
### Fixed
- **Traffic Engine**: Fixed `jq` parsing for legacy string formats in `traffic-generator.sh` to prevent script crashes. 🛠️🐚

## [v1.2.1-patch.67] - 2026-02-18
### Changed
- **Maintenance**: General stability updates and version alignment across all engine components. 🔢

## [v1.2.1-patch.66] - 2026-02-18
### Fixed
- **Traffic Engine**: Resolved parsing issues in the traffic generator and forced categorical migration for application configurations. 🚦⚙️
### Changed
- **UI**: General cleanup and refinement of dashboard components for better visual consistency. ✨

## [v1.2.1-patch.65] - 2026-02-18
### Fixed
- **Migration**: Refined categorized configuration migration logic and performed UI styling updates in the dashboard. 🛠️🎨

## [v1.2.1-patch.64] - 2026-02-18
### Changed
- **VyOS**: Unified VyOS configuration management and improved UI component interaction for sequences and routers. 🛡️⚙️

## [v1.2.1-patch.63] - 2026-02-18
### Fixed
- **Traffic Generator**: Fixed `jq` raw output handling in `traffic-generator.sh` to ensure correct application matching. 🛠️🐚

## [v1.2.1-patch.62] - 2026-02-18
### Added
- **Traffic Generator**: Added support for reading `applications-config.json` directly in the shell-based traffic generator. 🚦📦

## [v1.2.1-patch.61] - 2026-02-18
### Changed
- **Healthcheck**: Synchronized healthcheck syntax with user preferences and standard system requirements. 🩺🔄

## [v1.2.1-patch.60] - 2026-02-18
### Fixed
- **Healthcheck**: Improved healthcheck resilience during configuration migrations to prevent false positives. 🩺🛡️

## [v1.2.1-patch.59] - 2026-02-18
### Fixed
- **Deployment**: Fixed Docker healthcheck configuration and synchronized version strings across all service components. 🐳🔢

## [v1.2.1-patch.58] - 2026-02-18
### Fixed
- **Orchestrator**: Resolved `interfacesFile` ReferenceError and updated IoT device types for better simulation accuracy. 🛠️🤖

## [v1.2.1-patch.57] - 2026-02-18
### Added
- **Convergence & VyOS**: Implemented convergence testing fixes, configuration consolidation, and VyOS pre-flight connectivity checks. 📉🛡️

## [v1.2.1-patch.56] - 2026-02-17
### Fixed
- **Backend**: Resolved critical `TransformError` (variable redeclaration) causing container startup failure. 🛠️🔥
- **UI Versioning**: Fixed stale version reporting in the dashboard by updating API fallbacks and synchronizing `VERSION` files across all directories. 🔢🔄

## [v1.2.1-patch.55] - 2026-02-17
### Added
- **Voice UI**: Added specialized **Import/Export** buttons for Voice configuration bundles. 📥📤
### Changed
- **Voice Architecture**: Finalized configuration consolidation by moving the call counter from a standalone file into the unified `voice-config.json`. 🎙️⚙️
- **Version Sync**: Synchronized versioning across all components (`engines`, `web-dashboard`, root).

## [v1.2.1-patch.54] - 2026-02-17
### Fixed
- **Voice Control**: Fixed state synchronization issue where UI toggles were not persisting to the unified configuration file. 🎙️🔄
- **Backend**: Removed obsolete legacy configuration files (`voice-control.json`, `voice-servers.txt`) and updated all API endpoints to use `voice-config.json`.

## [v1.2.1-patch.53] - 2026-02-17
### Fixed
- **Voice Orchestrator**: Fixed a critical Python syntax error (indentation) introduced in the voice consolidation refactor. 🛠️🐛

## [v1.2.1-patch.52] - 2026-02-17
### Added
- **Voice Configuration Consolidation**: Merged `voice-control.json` and `voice-servers.txt` into a single `voice-config.json` for easier management. 🎙️📦
- **Security History Refactor**: Moved security test results to a dedicated line-delimited JSON log file (`security-history.jsonl`) for better persistence and observability. 🛡️📋
### Changed
- **Backend Architecture**: Optimized configuration handlers to support unified data structures and automated migration for legacy files. 🚀
- **Performance**: Improved security statistics tracking with dedicated counters and historical trend logging.

## [v1.2.1-patch.51] - 2026-02-17
### Fixed
- **IoT Device Launch**: Corrected argument passing to `iot_emulator.py`. 🛠️
  - Fixed `--behavior-type` error (replaced with `--security` JSON structure).
  - Restored missing `--fingerprint` argument for proper DHCP identification.
  - Ensured `--enable-bad-behavior` flag is passed when security is active.
- **Documentation**: Updated `README.md` with latest feature list and version info. 📚

## [v1.2.1-patch.50] - 2026-02-17
### Added
- **IoT Lab Generation**: Updated `generate_iot_devices.py` with new security options. 🔐
  - Added `--enable-security` to force enable attack mode on all devices.
  - Added `--security-percentage` to randomize security configuration in large labs.
- **Security Protocols**: Added official PAN-test-domains to IoT attack profiles for guaranteed detection. 🛡️

## [v1.2.1-patch.49] - 2026-02-17
### Changed
- **IoT Engine**: Included the latest version of the Scapy emulator script in the core package. 🚀
- **Version Alignment**: Standardized versioning across all engines and documentation.

## [v1.2.1-patch.48] - 2026-02-17
### Added
- **IoT Security Testing**: Initial release of "Bad Behavior" mode for IoT devices. 💀
  - New attack profiles: DNS Flood, C2 Beacon, Port Scan, Data Exfiltration.
  - Interactive UI with security toggles in device settings.
  - "ATTACK MODE" visual badges for real-time threat identification on cards.

## [v1.2.1-patch.47] - 2026-02-17
### Fixed
- **Rollback to Stable**: Reverted to `v1.2.1-patch.43` logic for Convergence Lab. 🛡️
  - Reverted recent stop sequence optimizations (patch.44, .45, .46) due to history reporting regressions.
  - Restored stable baseline for further investigation.

## [v1.2.1-patch.46] - 2026-02-17
### Fixed
- **Convergence History**: Restored history persistence that was broken in recent optimizations. 📋
- **Performance**: Optimized PPS (Packets Per Second) limit handling for more reliable high-load testing. ⚡

## [v1.2.1-patch.45] - 2026-02-17
### Fixed
- **Convergence Lab**: Finalized stop sequence logic and corrected packet counter discrepancies. 🔢
- **Regression Fix**: Resolved a critical regression that prevented correct RX loss calculation.

## [v1.2.1-patch.44] - 2026-02-16
### Changed
- **UX Optimization**: Improved the Convergence Lab stop sequence for a smoother user experience. ✨

## [v1.2.1-patch.43] - 2026-02-16
### Added
- **Traffic Volume History**: Persisted real-time stats to `traffic-history.jsonl` on the backend. 📈
  - New API endpoint `GET /api/traffic/history` with time range support.
  - Snapshot collector saves traffic metricsEvery 60 seconds.
- **Improved Dashboard UI**:
  - Added time range selector (1h, 6h, 24h) for traffic visualization.
  - Upgraded "Traffic Volume" chart with monotone area gradients and smooth curves.
  - Added glassmorphism effects and loading states for historical data synchronization.

## [v1.2.1-patch.42] - 2026-02-16
### Added
- **DC Cluster Discovery**: Enabled discovery of multiple IPs for Data Center (DC) sites. 🏢🏢
  - DC sites now generate distinct probes for every discovered IP/interface.
  - New naming convention for DC probes: `Site Name (IP Address)`.
  - Unique `discoveryKey` per IP to independently track enabled/disabled status in clusters.
  - Maintained single-probe logic for Branch sites.

## [v1.2.1-patch.41] - 2026-02-16
### Changed
- **Site Discovery UI Tuning**: Renamed "Sync Discovery" back to "Sync Prisma SD-WAN" for better clarity. ⚡
- **Discovery Metadata**: Added support for `interface_label` (e.g., "1 (Users VLAN)") in Site Discovery probes.
  - Updated `DiscoveryManager` to capture and persist the new `interface_label` field.
  - Enhanced detailed modal in Connectivity dashboard to display discovery parameters (Site ID, Interface, Network).
  - Config view now displays interface labels next to IP targets for discovered probes.

## [v1.2.1-patch.40] - 2026-02-16
### Fixed
- **Docker Build**: Fixed `ERR_MODULE_NOT_FOUND` by adding `discovery-manager.ts` to the Dockerfile runtime stage. 🐳

## [v1.2.1-patch.39] - 2026-02-16
### Added
- **Site Discovery Probes (DEM)**: Automatic discovery of Prisma SD-WAN sites. 🌐
  - New `DiscoveryManager` to fetch LAN interfaces via `getflow.py`.
  - Deterministic selection of one ICMP probe per site (Interface '1' preference).
  - Separate persistence in `connectivity-discovered.json` with user overrides support.
  - "Sync Discovery (ICMP)" action in the Connectivity dashboard with real-time status reporting.
  - "DISCOVERED" and "STALE" badges in performance and configuration views.

## [v1.2.1-patch.38] - 2026-02-15
### Fixed
- **Endpoint Status Display**: Fixed critical bug where disabled endpoints showed as "Active". 🐛
  - Corrected endpoint ID mapping to use name-based format matching backend (server.ts:1499)
  - Disabled endpoints now properly display "Inactive" status badge
- **UI Cosmetics**: Fixed horizontal shift and icon spacing issues. ✨
  - Added permanent scrollbar to prevent page shift when toggling inactive filter
  - Improved trash icon spacing in probe cards with better right padding

### Changed
- **Navigation Menu**: Improved menu organization and removed beta flags. 🎯
  - Removed "BETA" badge from IoT menu item
  - Reordered menu: Performance now appears before Security
  - New order: Dashboard → Statistics → Configuration → Performance → Security → IoT → Voice → Failover → NTOP → System

## [v1.2.1-patch.30] - 2026-02-15
### Fixed
- **Connectivity Performance**: Endpoint status now correctly displays Active/Inactive based on enabled field. 🐛
  - Fixed endpoint ID mapping to use name-based format matching backend
  - Disabled endpoints now properly show "Inactive" status badge

### Changed
- **Config Page UX**: Improved form layout and labels. ✨
  - Renamed "Profile Name" → "Probe Name"
  - Renamed "Protocol Type" → "Protocol"
  - Replaced Save icon with Edit (pen) icon
  - Widened "Target URI/IP" field (2 columns)
  - Renamed "Commit Update" → "Update"
  - Better vertical alignment of form fields
- **Performance Metrics**: Reduced font sizes for better visual balance. 📊
  - Global Experience: text-5xl → text-4xl
  - HTTP Coverage: text-4xl → text-3xl
- **Widget Layout**: Separated "Recent Performance Trends" from "Flaky Endpoints" widget. 🎨

## [v1.2.1-patch.29] - 2026-02-15
### Added
- **Connectivity Endpoints**: Enable/disable functionality for proactive monitoring control. 🔌
  - Power toggle in Config page and bulk "Enable/Disable All" actions.
  - "Show/Hide Inactive" filter and reduced opacity for disabled items.
- **IoT Emulator**: Added `--fingerprint` CLI support for manual device simulation. 🔐
### Changed
- **Config UX**: Improved form layout with better labels, wider fields, and edit icons. ✨
### Fixed
- **UI Styling**: Balanced font sizes in performance cards and fixed IoT markdown formatting. 📊

### Added
- **Convergence Lab**: Sync loss detection for long outages (>60s). 🕵️
- **UI**: Conditional display hiding directional ms metrics if server sync is lost, ensuring data reliability. 🛡️

## [v1.2.1-patch.24] - 2026-02-14
### Fixed
- **Convergence Tracking**: Improved tracking for long outages (>60s) with sync loss safety hooks. ⏱️
- **Echo Server**: Increased maintenance timeout and implemented cumulative counter logic. 🛡️
- **UI**: Refined metric casing ("ms") and polished directional loss labels. ✨

## [v1.2.1-patch.23] - 2026-02-14
### Fixed
- **Session Tracking**: Echo server now uses Test ID to maintain counters during failovers. 🔄
- **Safety**: Added safeguards to prevent artificial TX loss reporting on invalid counters. 🛡️

## [v1.2.1-patch.22] - 2026-02-14
### Added
- **Enriched Metrics**: Added directional loss duration (ms) and packet loss counters to history. ⏱️
### Changed
- **UI**: Refined Convergence History layout with dedicated source port columns. ✨

## [v1.2.1-patch.21] - 2026-02-14
### Fixed
- **Server**: Resolved `ReferenceError: require is not defined` in API endpoints (full migration to ESM for child_process calls). 🚀

## [v1.2.1-patch.20] - 2026-02-14
### Fixed
- **Orchestrator**: Restored missing `server_received` counter in stats output (fixes "Echo: -" display). 🛠️
- **UI**: Improved clarity in Convergence Lab history by renaming "TX" and "RX" to "TX Loss" and "RX Loss". 🔢

## [v1.2.1-patch.19] - 2026-02-14
### Fixed
- **UI**: Removed enforced uppercase styling from input fields in Login and Configuration pages (Profile Name, Target URI, Interface) to allow mixed-case entry. 🔡

## [v1.2.1-patch.18] - 2026-02-14
### Added
- **Convergence History**: Enhanced UI with detailed packet loss statistics and visual indicators. 🔢
- **UI Build**: Fixed missing Globe icon import preventing build in patch.17. 🌐


## [1.2.1-patch.17] - 2026-02-14
### Added
- **Networking**: Added Public IP detection and display in the main dashboard 🌍
- **Maintenance**: Added "Power & Restart" controls (Restart Services / Full System Reload) 🔌
### Fixed
- **UI**: Fixed version display format (removed duplicate 'v') 🔢
### Changed
- **UX**: Removed "Export" button from Connectivity Performance component 🗑️

## [1.2.1-patch.16] - 2026-02-14
### Added
- **Voice**: Added "Reset ID" button to reset CALL-ID counter to 0000 🔄
- **Failover**: Added "RESET ID" button to reset CONV-ID counter to 0000 🔄
## [1.2.1-patch.15] - 2026-02-08
### Fixed
- **System Maintenance**: Fixed version detection to use GitHub Releases API instead of Tags API for correct chronological ordering (was showing v1.2.1 instead of latest patch version) 🔧

## [1.2.1-patch.14] - 2026-02-08
### Fixed
- **CRITICAL**: Restored `/iot` directory and IoT emulator that was accidentally deleted in patch.9 🚨
- **Dockerfile**: Re-added IoT directory COPY and pip install commands
- **IoT Manager**: Reverted unnecessary safety check (script is now present)

## [1.2.1-patch.13] - 2026-02-08
### Fixed
- **IoT Manager**: Added safety check to prevent attempting to spawn missing Python emulator script (gracefully handles IoT feature removal) 🛡️

## [1.2.1-patch.12] - 2026-02-08
### Fixed
- **Docker Build**: Removed `/iot` directory references from Dockerfile (directory was deleted in patch.9 causing build failures since patch.8) 🔧

## [1.2.1-patch.11] - 2026-02-08
### Changed
- **VyOS Control**: New mission sequences now default to "Manual Trigger Only" instead of "60 Minute Cycle" for better UX 🎯

## [1.2.1-patch.10] - 2026-02-08
### Fixed
- **VyOS Controller**: Made discovery timeout configurable via `VYOS_DISCOVERY_TIMEOUT_MS` env var (default 30s, was hardcoded 15s with incorrect error message) 🔧
- **Web UI Container**: Added `vim-tiny` editor for easier debugging and troubleshooting inside the container 📝

## [1.2.1-patch.9] - 2026-02-08
### Changed
- **Documentation**: Comprehensive README.md improvements with table of contents, organized screenshot gallery (9 categories), What's New section, and reorganized documentation by user journey 📚

## [1.2.1-patch.8] - 2026-02-08
### Changed
- **Voice Dashboard**: Renamed "Diagnostic Monitoring" to "Call Monitoring" and "Commit Configuration" to "Save" for better clarity 📝

## [1.2.1-patch.7] - 2026-02-08
### Fixed
- **Docker Build**: Fixed syntax error in `ConnectivityPerformance.tsx` that caused build failure in v1.2.1-patch.6 🏗️

## [1.2.1-patch.6] - 2026-02-08
### Fixed
- **Security Dashboard**: Added "Allowed" statistics column to the DNS dashboard to visualize allowed DNS queries 🛡️
- **Connectivity Performance**: Fixed "Flaky Endpoints" widget to correctly filter out deleted endpoints unless "Show Deleted" is enabled 🐛

## [1.2.1-patch.5] - 2026-02-08
### Added
- **Synthetic Probes Import/Export**: Added full JSON configuration export and import for Synthetic Probes (DEM) in the Configuration tab. 📤📥
- **Voice MOS Score**: Real-time **Average MOS Score** display in the Voice Dashboard QoS summary. 🎙️📊
- **Green Favicon**: Implemented a new Green Digital Globe favicon for the Target App (`engines/http_server.py`). 🌍💚
### Fixed
- **Version Synchronization**: Aligned version numbers across all components (`engines`, `web-dashboard`, documentation) to `v1.2.1-patch.5`. 🔄✅

## [1.2.1-patch.4] - 2026-02-08
### Fixed
- **Security Configuration**: Resolved EICAR config overwrite issue preventing proper threat prevention test execution. 🛡️
- **Help Integration**: Added help link button to Security tab for quick access to documentation. 📚

## [1.2.1-patch.3] - 2026-02-08
### Added
- **HTTP Target Service**: Introduced dedicated HTTP echo service for application testing scenarios. 🎯
- **Target Server Improvements**: Enhanced target infrastructure for more realistic testing patterns.

## [1.2.1-patch.2] - 2026-02-08
### Fixed
- **Version Rollback**: Rolled back to stable v1.2.0-patch.5 due to instability detected in v1.2.1. ⏪
- **Stability Priority**: Ensured production reliability by reverting breaking changes.

## [1.2.1-patch.1] - 2026-02-08
### Fixed
- **DEM Status Badge**: Corrected status badge logic for synthetic probe endpoints with no history. 🏷️
- **UI Consistency**: Improved display of monitoring status across all probe types.

## [1.2.1] - 2026-02-08
### Added
- **Enhanced DEM Scoring**: Implemented improved Digital Experience Monitoring (DEM) scoring algorithm. 📊
- **Advanced Metrics**: Enhanced synthetic probe analytics with more granular scoring methodology.

## [1.2.0-patch.5] - 2026-02-08
### Fixed
- **Convergence Engine**: Disabled debug mode by default to reduce log verbosity in production environments. 🔇

## [1.2.0-patch.4] - 2026-02-08
### Added
- **Failover Display**: Enhanced failover visualization with improved status indicators. 📡
### Fixed
- **Flaky Endpoints**: Improved detection and handling of intermittently unreachable endpoints. 🔍

## [1.2.0-patch.3] - 2026-02-08
### Added
- **Convergence Debug Mode**: Added debug mode toggle for convergence testing with detailed packet logging. 🐛
- **Signal Handling**: Improved graceful shutdown and signal handling for long-running tests.

## [1.2.0-patch.2] - 2026-02-08
### Fixed
- **Packet Loss Accuracy**: Improved packet loss count accuracy in convergence test results. 📈

## [1.2.0-patch.1] - 2026-02-08
### Fixed
- **UI Consistency**: Standardized BETA badge colors to blue across all beta features. 🎨

## [1.1.2-patch.33.104] - 2026-02-08
### Changed
- **Performance Limit**: Increased global PPS (Packets Per Second) limit from 500 to 1000 for high-throughput failover testing. ⚡

## [1.1.2-patch.33.103] - 2026-02-08
### Fixed
- **VyOS UI**: Hidden parameters display for `clear-blocks` and `get-blocks` commands (no parameters required). 🔧

## [1.1.2-patch.33.102] - 2026-02-08
### Added
- **VyOS UI Polish**: Added BETA badge to VyOS features and improved interface display with enhanced labeling. ✨

## [1.1.2-patch.33.101] - 2026-02-08
### Fixed
- **VyOS Parameters**: Removed parameters from `clear-blocks` and `get-blocks` commands (not required by API). 🛠️

## [1.1.2-patch.33.100] - 2026-02-08
### Fixed
- **CRITICAL VyOS Fix**: Stopped sending `--iface` parameter for block/unblock commands (causes command failures). 🚨

## [1.1.2-patch.33.99] - 2026-02-07
### Added
- **VyOS Save Tooltip**: Added tooltip to save button showing requirements (at least one router configured). 💡

## [1.1.2-patch.33.98] - 2026-02-07
### Fixed
- **VyOS Interface Handling**: Improved default interface selection for newly created VyOS actions. 🔧

## [1.1.2-patch.33.97] - 2026-02-07
### Changed
- **VyOS Script Update**: Replaced control script with updated version supporting global blackhole routes. 🚀

## [1.1.2-patch.33.96] - 2026-02-07
### Fixed
- **VyOS Block Actions**: Hidden interface field for block/unblock actions (uses global routing). 🔒
- **Enhanced Logging**: Added detailed execution logging for troubleshooting.

## [1.1.2-patch.33.95] - 2026-02-07
### Added
- **Global Blackhole Routes**: Simplified VyOS block/unblock with system-wide blackhole routing instead of per-interface rules. 🌐

## [1.1.2-patch.33.94] - 2026-02-07
### Fixed
- **Voice Icons**: Added missing imports for voice call status icons (call active, completed, failed). 📞

## [1.1.2-patch.33.93] - 2026-02-07
### Changed
- **Route Validation**: Removed unreliable route validation log that caused false positive warnings. 🗑️

## [1.1.2-patch.33.92] - 2026-02-07
### Added
- **Voice Call Status**: Refined voice call status symbols with intuitive icons. 🎙️
### Fixed
- **IoT Log Viewer**: Fixed theme inconsistency in IoT device log viewer. 🎨

## [1.1.2-patch.33.91] - 2026-02-07
### Fixed
- **Convergence Metadata**: Properly populated convergence test metadata in stats JSON output. 📝

## [1.1.2-patch.33.90] - 2026-02-07
### Added
- **Failover Display v3**: Further refined failover status display with improved visual hierarchy. 📊
### Changed
- **Modal Ports**: Disabled modal port configuration (moved to advanced settings).

## [1.1.2-patch.33.89] - 2026-02-07
### Fixed
- **Failover Layout**: Rolled back experimental failover layout and added descriptive details text. ⏪

## [1.1.2-patch.33.88] - 2026-02-07
### Added
- **Failover Redundancy**: Refined failover redundancy visualization. 🔄
- **Voice Alignment**: Improved voice metrics alignment in dashboard.

## [1.1.2-patch.33.87] - 2026-02-07
### Changed
- **Voice History Layout**: Refined voice call history table layout for better readability. 📋

## [1.1.2-patch.33.86] - 2026-02-07
### Changed
- **VyOS Sequence Display**: Refined command display in VyOS sequence timeline. 📅

## [1.1.2-patch.33.85] - 2026-02-07
### Fixed
- **Voice Call ID Display**: Display full voice call ID without truncation in web dashboard. 🔍

## [1.1.2-patch.33.84] - 2026-02-07
### Added
- **MCP with SSE Transport**: Implemented Server-Sent Events (SSE) transport for MCP server using FastMCP. 🌐
### Documentation
- **LLM Prompt Section**: Added LLM prompt guidance to IoT simulation documentation. 🤖

## [1.1.2-patch.33.83] - 2026-02-06
### Fixed
- **MCP Container**: Changed Dockerfile CMD to keep MCP server container running continuously. 🐳

## [1.1.2-patch.33.82] - 2026-02-06
### Changed
- **MCP Configuration**: Configured MCP server to use pre-built Docker images from registry. 📦

## [1.1.2-patch.33.81] - 2026-02-06
### Added
- **MCP Server**: Added Model Context Protocol (MCP) server for multi-agent orchestration via Claude Desktop. 🤝

## [1.1.2-patch.33.80] - 2026-02-06
### Changed
- **Auto-Start Traffic**: Enabled automatic traffic generation on startup by default. 🚀

## [1.1.2-patch.33.79] - 2026-02-06
### Added
- **Live Streaming Logs**: Improved background contrast for Live Streaming Logs in light mode. ☀️
- **VyOS Sequence Display**: Enhanced sequence timeline with smart command labels and filtering capabilities. 🎯

## [1.1.2-patch.33.78] - 2026-02-05
### Removed
- **UI Cleanup**: Removed redundant Environment Discovery block from Configuration page. 🗑️

## [1.1.2-patch.33.77] - 2026-02-05
### Added
- **Compact Sequences UI**: Implemented compact VyOS sequences interface for better space utilization. 📐
- **Professional Terminology**: Finalized professional naming conventions across VyOS features. 📖
- **IoT Documentation**: Updated IoT generator documentation and tooling. 📚

## [1.1.2-patch.33.76] - 2026-02-04
### Fixed
- **VyOS Control**: Fixed a bug in `vyos_sdwan_ctl.py` where clearing combined QoS policies could fail due to incorrect argument handling. 🛠️🐛
- **Version Display**: Removed redundant 'v' prefix in version display across all modules. 🔢
### Changed
- **Script Refactoring**: Refactored `vyos_sdwan_ctl.py` for better CLI ergonomics, streamlined argument descriptions, and improved auto-detection logic for router versions. 🚀📝
- **VyOS Beta Warning**: Added a caution regarding VyOS Firewall automation. Still in **Beta** due to significant CLI disparities between legacy (1.4 2021/2022) and modern (1.5) releases. 🛡️⚠️
### Documentation
- **Version Backfill**: Added missing version entries to CHANGELOG and documentation updates.


## Earlier Versions

_For versions 1.1.2-patch.33.75 and earlier, please refer to the existing CHANGELOG.md file._

_Full version history continues with entries for v1.1.2-patch.33.75, v1.1.2-patch.33.71-74, v1.1.2-patch.33.65-70, and all earlier releases down to v1.0.0._
