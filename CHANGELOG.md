# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
## [v1.2.1-patch.19] - 2026-02-14
### Fixed
- **UI**: Removed enforced uppercase styling from input fields in Login and Configuration pages (Profile Name, Target URI, Interface) to allow mixed-case entry. 🔡

## [v1.2.1-patch.18] - 2026-02-14
### Changed
- No major changes.


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
