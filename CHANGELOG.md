# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2-patch.8] - 2026-01-27
### Fixed
- **System Robustness**: Improved Version Detection and Configuration Export with absolute path resolution and deep server-side logging.
- **Error Transparency**: Updated the UI to display descriptive error messages (instead of generic "Failed") for maintenance tasks.

## [1.1.2-patch.7] - 2026-01-27
### Fixed
- **DNS Parser**: Improved robustness of `nslookup` parsing to ignore Docker internal resolver addresses (`127.0.0.11`).
- **Sinkhole Detection**: Refined keyword-based detection to handle escaped characters in CNAMEs.

## [1.1.2-patch.6] - 2026-01-27
### Added
- **Native M1/M2 Support**: Official multi-platform Docker images (`linux/amd64` and `linux/arm64`) for all services.
- **Fixed Stable Tags**: Preserved multi-platform manifests when promoting versions to the `stable` tag.
- **Compose Cleanup**: Standardized `docker-compose.example.yml` to use `stable` tags consistently.

## [1.1.2-patch.5] - 2026-01-27
### Fixed
- **Log Formatting**: Standardized log format to `[HH:MM:SS] [ID] 🚀 Message` across all components (UI, Voice, Echo).
- **Log IDs**: Resolved `[CONV-???]` placeholder issue in server logs.
- **System Tab**: Fixed "Export failed" error and improved version detection robustness.
- **Install Script**: Added retry logic for Docker Hub timeouts and improved existing installation handling.
### Removed
- **UI Cleanup**: Removed "Remote Access" widget from the System tab (moved to documentation).

## [1.1.2-patch.4] - 2026-01-26
### Fixed
- **Critical Hotfix**: Resolved `ReferenceError: PORT is not defined` crash.
- **Port Standardization**: Changed default internal port to `8080` to align with Docker standards.

## [1.1.2-patch.3] - 2026-01-26
### Added
- **Backup & Restore**: Export the entire system configuration (apps, security, users, probes) into a single portable JSON file.
- **Site Cloning**: Easily clone configurations between different SD-WAN branches using the Restore feature.
- **Auto-Snapshot**: The system now creates an automatic snapshot of the current configuration before any restore operation (`config/.pre-import-backup-*`).

## [1.1.2-patch.2] - 2026-01-26
### Added
- **UI-Driven Maintenance**: New "System" section in the dashboard to check version status and trigger one-click upgrades.
- **One-Click Upgrade**: Automated `docker pull` and service restart via the dashboard (requires Docker socket mount).
- **Target Mode Installation**: `install.sh` now supports a slimmed-down "Target Only" mode for convergence lab echo servers.
- **Remote Access Guide**: Detailed documentation for Tailscale, Cloudflare Tunnels, and Reverse Proxies.
- **Docker Verification**: Installation script now validates Docker installation and status before starting.

### Fixed
- **Echo Server Bug**: Fixed a `NameError` crash in the maintenance loop due to an undefined variable.
- **Standardized Tags**: Switched example configuration to use `stable` image tags for consistent updates.
- **Backend Stability**: Cleaned up server-side route definitions and listener logic.

## [1.1.2-patch.1] - 2026-01-26

## [1.1.0-patch.103] - 2026-01-26

## [1.1.0-patch.102] - 2026-01-26

### Added
- **Detailed Convergence Summary**: Logs now show total TX/RX packets and packet losses when a test stops.
- **Log Formatting**: Standardized convergence log prefix to `[CONV-XXX] [HH:MM:SS] Label - ...` for better readability.

## [1.1.0-patch.101] - 2026-01-26

### Fixed
- **Dependency**: Added `python3-scapy` to the `web-dashboard` Docker image. This fixes the "ModuleNotFoundError" when starting convergence tests.

## [1.1.0-patch.100] - 2026-01-26

### Added
- **Scapy Convergence Engine**: New professional-grade convergence probe using Scapy L3 for better SD-WAN visibility.
- **Advanced Metrics**: Real-time **Jitter** (RFC 3550) and **Latency** (RTT) reporting in Convergence Lab.
- **Port 6200**: Standardized as the default port for performance/convergence testing.
- **Multi-Port Echo Server**: Updated `echo_server.py` to listen on multiple ports (6100 and 6200) simultaneously using threading.

### Changed
- **Default Convergence Port**: Changed from 6100 to 6200.
- **Dashboard Infrastructure**: Retained Bridge Mode but added required UDP 6200 mapping and Scapy capabilities (`NET_RAW`, `NET_ADMIN`).

## [1.1.0-patch.99] - 2026-01-26

### Fixed
- **Rollback**: Reverted all networking and port changes introduced in v97 and v98.
- **Port Stability**: Restored **UDP 6100** as the single port for both Voice and Convergence traffic.
- **Infrastructure**: Restored Dashboard to bridge mode (preserving port 8444 mapping) and reverted host networking changes.
- **Code**: Removed packet padding and argument aliases from the convergence orchestrator.

## [1.1.0-patch.98] - 2026-01-26

### Fixed
- **Traffic Visibility**: Fixed issue where convergence probes were not visible in SD-WAN flow browsers.
- **Packet Padding**: Added 170-byte padding to convergence probes to match realistic RTP packet sizes (helps SD-WAN DPI identification).
- **Host Networking**: Moved `web-ui` to `network_mode: host` to bypass Docker bridge NAT and ensure probes originate from the physical host IP.
- **Port Consistency**: Aligned internal dashboard port to `8444` for host mode compatibility.

## [1.1.0-patch.97] - 2026-01-25

### Changed
- **Port Separation**: Convergence Lab now defaults to **UDP 6101**. Voice Simulation remains on **UDP 6100**. This allows for granular SD-WAN steering policies based on port.
- **Echo Server**: Refactored `echo_server.py` to listen on multiple UDP ports simultaneously using threading. Default ports: 6100, 6101.
- **Infrastructure**: Updated `docker-compose.yml` to expose UDP port range `6100-6101` for the `voice-echo` service.

## [1.1.0-patch.96] - 2026-01-25

### Added
- **Log Timestamps**: Added `[HH:MM:SS]` timestamps to all server-side logs (Orchestrator, RTP Client, Echo Server, and Node.js spawn logs).
- **History Precision**: Added seconds to the History table date display (e.g., `25 janv., 20:29:45`).

### Fixed
- **Voice Metrics**: Fixed negative packet loss issue by removing duplicate echo in `echo_server.py` and implementing unique sequence tracking in `rtp.py`.
- **Startup Responsiveness**: Removed the 5s warmup burst in the convergence orchestrator (default=0) to improve UI responsiveness when starting multiple probes.
- **Echo Log Aesthetics**: Further refined `echo_server.py` log format for cleaner labeling of convergence tests (`[CONV-XXX]`).

## [1.1.0-patch.95] - 2026-01-25

### Added
- **Global Control**: Added "Stop All Probes" button to Convergence Lab.
- **Directional Loss Time**: History table now displays estimated "Loss Time" in ms for both RX and TX directions.
- **DEM Documentation**: Created **[Connectivity Probes Guide](docs/CONNECTIVITY_ENDPOINTS.md)** for background monitoring.

### Fixed
- **Startup Performance**: Optimized test initiation (parallelizing spawns) to reduce UI delay.
- **Selection Logic**: Fixed a bug where the selection counter would get out of sync after target deletion.
- **Log Aesthetics**: Harmonized all terminal logs (🚀, 📡, ⏹️, ✅) and fixed redundant `[CALL-CALL-XXX]` prefixes.
- **Visual Harmony**: Removed redundant parentheses and cleaned up `[CONV-XXX]` labels in Live Cards and History.

## [1.1.0-patch.94] - 2026-01-25

### Added
- **Directional Loss (TX/RX)**: Added support for calculating separate Transmit and Receive loss in Convergence probes.
- **Multi-Test Support**: Convergence Lab now supports starting multiple simultaneous tests with independent live cards.
- **Low-Precision PPS**: Added 1 PPS and 5 PPS options for long-term telemetry monitoring.
- **Interactive Sorting**: Added interactive column sorting (Date, Loss, Verdict, etc.) to both Convergence and Voice history tables.
- **UI Harmonization**: Harmonized labeling format to `[CONV-XXX]` and `[CALL-XXX]` across the entire platform.
- **Documentation**: Created dedicated **[Convergence Lab Guide](docs/CONVERGENCE_LAB.md)** explaining UDP probing theory, blackout analysis, and scoring.

### Fixed
- **Build Stability**: Fixed TypeScript build errors related to missing variable references and type mismatches.

## [1.1.0-patch.93] - 2026-01-25

### Fixed
- **Connectivity Monitor**: Fixed an issue where the background monitor would skip default/custom endpoints.

## [1.1.0-patch.92] - 2026-01-25

### Fixed
- **Orchestration**: Fixed `AttributeError` related to `rate` in the Convergence Orchestrator.

## [1.1.0-patch.91] - 2026-01-25

### Changed
- **Convergence Refinements**: Added 5s warmup period, redirected iperf3 logs, and refined loss calculation logic.
- **UI Enhancements**: Added PPS display to history table and improved active interface highlighting.

## [1.1.0-patch.90] - 2026-01-25

### Added
- **Stop Control**: Added "Stop Test" button to Convergence Lab dashboard.
- **Improved Monitoring**: Added active interface visibility indicator and improved echo server debug logging.

### Changed
- **Thresholds**: Adjusted convergence thresholds to 1s (Good) and 5s (Critical).

## [1.1.0-patch.89] - 2026-01-25

### Changed
- **Phase 7 Stability**: Minor lint fixes and internal version alignment.

## [1.1.0-patch.88] - 2026-01-25

### Changed
- **Backend Robustness**: Enhanced path resolution logging and error handling for orchestrator scripts.

## [1.1.0-patch.87] - 2026-01-25

### Fixed
- **Backend Stability (Phase 7 Hotfix)**:
  - Fixed `ENOENT` crash when starting convergence tests by installing `python3` in the web-ui container.
  - Fixed missing orchestration script in container by updating the Docker building process.
  - Implemented dynamic path resolution for scripts and robust spawn error handling.
  - Resolved TypeScript lint errors for connectivity probes (UDP/DNS metadata support).

## [1.1.0-patch.86] - 2026-01-25

### Added
- **Convergence Lab (Phase 7 Revision)**:
  - **Multi-Target Management**: Users can now save and name multiple failover targets (e.g., "DC1", "Branch Office").
  - **Decoupled IDs**: Convergence tests now use a dedicated `CONV-XXX` counter to avoid confusion with Security scans.
  - **Named Test Sessions**: Test IDs now include custom labels (e.g., "DC1 (CONV-001)") for perfect correlation with test plans.
  - **Improved Logging**: The echo server now provides clearer correlation between labels, source IPs, and ports.

## [1.1.0-patch.85] - 2026-01-25

## [1.1.0-patch.84] - 2026-01-25

### Added
- **Phase 6: VOIP MOS Score & Unified Server**: 
  - Integrated `iperf3` server into high-performance Voice Echo container.
  - Real-time **MOS Score** (Mean Opinion Score) calculation for voice calls based on ITU-T G.107 (E-Model).
  - Voice Echo server now supports both RTP Echo and UDP Quality (iperf3) tests.
- **Phase 5: UDP Quality Probes & UX Enhancements**:
  - New **UDP Quality Probe** type using `iperf3` for precision jitter/loss metrics.
  - **Probe Editing**: Full CRUD support for existing synthetic endpoints.
  - **Smart Bitrate Formatting**: Optimized bitrate display across all dashboard components.
  - **Unified Versioning**: Single Git Tag release strategy (`v*.*.*`) triggers synchronized multi-platform Docker builds for all components.

### Fixed
- **UDP Metrics Parsing**: Corrected latency and jitter extraction from iperf3 JSON output.
- **Dockerfile Standards**: Standardized all Dockerfiles at the root for GitHub Actions compatibility.
- **Voice Echo Paths**: Fixed server startup crashes by aligning container directory structures.

## [1.1.0-patch.34] - 2026-01-23

### Added
- **CI/CD Automation**: Updated GitHub Actions to automatically build and push `sdwan-voice-gen` and `sdwan-voice-echo` multi-platform images to Docker Hub.

## [1.1.0-patch.33] - 2026-01-23

### Added
- **Voice API Backend**: Implemented Express routes for voice configuration, control, and statistics.
- **Voice Component**: Created dedicated React tab for RTP/Voice simulation management (WIP).

## [1.1.0-patch.32] - 2026-01-23

### Added
- **Voice Orchestration**: Python wrapper (`voice_orchestrator.py`) to manage parallel RTP calls, weighted selection, and logs.

## [1.1.0-patch.31] - 2026-01-23

### Added
- **Voice Infrastructure**: Added `Dockerfile.voice`, initialized `voice-servers.txt` and `voice-control.json`.
- **RTP Update**: Modernized `rtp.py` for Python 3 compatibility (Scapy).
- **Docker Compose**: Integrated `voice-gen` and `voice-echo` services.

## [1.1.0-patch.30.2] - 2026-01-23

### Changed
- **Traffic UI Refresh**: Compact integrated slider for better layout.
- **Improved UX**: Coarser slider steps (0.5s instead of 0.1s) for easier speed control. Slider range extended to 10s.

## [1.1.0-patch.30.1] - 2026-01-23

### Fixed
- **CPU Monitoring**: Logic updated to use delta-based calculation (real-time %) instead of cumulative load.
- **Dynamic Defaults**: Traffic rate slider now defaults to `SLEEP_BETWEEN_REQUESTS` env var value if no config exists.

## [1.1.0-patch.30] - 2026-01-23

### Fixed
- **Critical Crash**: Resolved `ERR_MODULE_NOT_FOUND` in security scheduler by moving shared data to `/shared` directory.
- **Dynamic Imports**: Switched to static ESM imports for reliability.

### Added
- **Traffic Rate Control**: New UI slider on the Dashboard (real-time speed adjustment).
- **Resource Monitoring**: Real-time CPU and RAM gauges in Network Monitoring panel.
- **Scheduler "Next Run"**: Display of next scheduled execution time in Security tab.
- **Persistence**: Traffic settings preserved across container restarts.

## [1.1.0-patch.29] - 2026-01-23

### Fixed - Scheduler UI Stability 🛡️
- **Fixed Dropdown Flickering**: Moved `SchedulerSettings` component to the top level to prevent it from unmounting and closing its dropdown during periodic dashboard refreshes.
- **Improved React Patterns**: Eliminated nested component definitions in `Security.tsx` that were causing focus loss and UI instability.

## [1.1.0-patch.28] - 2026-01-23

### Fixed - Critical Robustness for Security Scheduler 🛠️
- **Bulletproof Migration**: Enhanced migration logic in `server.ts` to handle extremely old configuration formats (including legacy boolean schedulers) and corrupt JSON.
- **Frontend Crash Prevention**: Fixed a bug where the UI would crash and fail to render the scheduler if the server migration encountered issues.
- **Improved Logging**: Added server-side logs to track migration steps and errors.
- **Default Fallbacks**: Guaranteed valid configuration objects are returned even on major reading errors.

## [1.1.0-patch.27] - 2026-01-23

### Fixed - Security Scheduler Migration 🛠️
- Implemented automatic migration for `security-tests.json` from global to split-scheduler structure.
- Fixed missing scheduler UI by adding robustness to data expectations in the frontend.
- Updated backend default configuration to match the new split-scheduler model.

## [1.1.0-patch.26] - 2026-01-23

### Added - Security Split-Scheduler 🛡️
- Separated **URL Filtering**, **DNS Security**, and **Threat Prevention** into three independent cron jobs.
- Implemented per-section scheduler settings in the Security UI.
- Updated backend to manage multiple concurrent security test schedules.

### Fixed - Security Dashboard 🛠️
- Repaired JSX nesting and structure in `Security.tsx`.
- Integrated `SchedulerSettings` component across all security sections.
- Verified build and type safety.

## [1.1.0-patch.25] - 2026-01-22

### Fixed - Statistics UI 📊
- **Protocol Normalization**: Applications defined with `http://` or `https://` (like your "Slow App") are now correctly mapped to their groups in the Statistics table by normalizing names during lookup.

## [1.1.0-patch.24] - 2026-01-22

### Fixed - Statistics UI & Engine 📊
- **Mapping Robustness**: Fixed the "Uncategorized" bug by logging full domain names in the traffic generator and adding a fuzzy mapping fallback in the Web UI to handle legacy truncated names.

## [1.1.0-patch.23] - 2026-01-22

### Added - Statistics UI 📊
- **Application Groups**: Added a new "Group" column to the Statistics table to better categorize applications.
- **Enhanced Sorting**: New "By Group" sorting option and refined "By Name" sorting.
- **Improved Search**: Searching now matches both application names and group names.

## [1.1.0-patch.22] - 2026-01-22

### Fixed - Security UI 📋
- **Clipboard Fallback**: Fixed the "Copy CLI command" functionality for non-secure contexts (HTTP over IP) by implementing a legacy clipboard fallback.

## [1.1.0-patch.21] - 2026-01-22

### Fixed - Infrastructure 🧱
- **Multi-Arch Stability**: Switched `web-dashboard` Docker base image to `node:20-slim` (Debian-based) to resolve ARM64 build crashes (Illegal instruction) under QEMU emulation.

## [1.1.0-patch.20] - 2026-01-22

### Added - Security UI Productivity ⚡
- **Select All Checkboxes**: Added "Select All" functionality to both URL Filtering and DNS Security sections, allowing bulk toggling of test categories.
- **Header Synchronization**: The section headers now correctly reflect the count of enabled tests in real-time.

## [1.1.0-patch.19] - 2026-01-22

### Fixed - EICAR Test Robustness 🛡️
- **Unreachable Detection**: Implemented a pre-connectivity check and refined `curl` error analysis to distinguish between IPS blocks and network reachability issues.
- **Improved UI Feedback**: Added a new "Unreachable" status badge in the Security tab for clearer diagnostic reporting when the EICAR host is down.

## [1.1.0-patch.18] - 2026-01-22

### Documentation - Protocol & IP Clarity 📚
- **Updated Documentation**: Comprehensive updates to `README.md`, `CONFIGURATION.md`, and `TRAFFIC_GENERATOR.md` explaining HTTP support and IP-based statistics.
- **Visual Percentage Docs**: Reflected the new hierarchical percentage model in the configuration guides.

## [1.1.0-patch.17] - 2026-01-22

### Added - Protocol flexibility and IP Support 🌐
- **Explicit Protocol Support**: The traffic engine now honors `http://` or `https://` if specified in the applications configuration.
- **Improved IP Statistics**: Applications identified by IP addresses are no longer grouped by their first octet in the dashboard; the full IP is now used as a unique identifier.

## [1.1.0-patch.16] - 2026-01-22

### Fixed - Traffic Distribution Logic 🛡️
- **0% Deadlock Fix**: Resolved an issue where sliders could become stuck if a value reached 0%. 
- **Virtual Weight Normalization**: Implemented a fixed total virtual weight (1000) to ensure predictable redistribution even from zero/empty states.
- **Proportional Redistribution**: Refined the algorithm to better preserve relative ratios during scaling.

## [1.1.0-patch.15] - 2026-01-22

### Added - Hierarchical Traffic Distribution 🚦
- **Percentage-Based Configuration**: Replaced absolute weights with a hierarchical percentage model (Group % and App %).
- **Proportional Balancing**: Moving a slider now automatically re-balances other shares to maintain a consistent 100% total.
- **Bulk Config API**: New `/api/config/apps-bulk` endpoint for synchronized multi-application updates.
- **Improved UI**: New slider design with real-time percentage feedback and weight transparency.

## [1.1.0-patch.14] - 2026-01-22

### Fixed - Dashboard UI Stability 📈
- **Dancing Graph Fix**: Corrected a visualization issue where the traffic volume chart would "dance" or show sharp peaks due to multiple data points sharing the same timestamp.
- **Improved Timeline**: The graph now only pushes new points when fresh data is generated by the engine, ensuring a smooth and accurate timeline.

## [1.1.0-patch.13] - 2026-01-22

### Fixed - Dashboard Data Accuracy 🎯
- **Stale RPM Calculation**: Fixed a critical React closure bug where the 1s polling interval was stuck with old state, causing "0.0 req/min" to be displayed. Introduced `useRef` for reliable data tracking.
- **Accurate Success Rate**: Fixed `traffic-generator.sh` statistics logic to correctly count `000000` errors in the global error counter, ensuring the Success Rate metric is accurate.
- **Improved Lissage**: Refined the RPM calculation to stay stable between discrete file updates.

## [1.1.0-patch.12] - 2026-01-22

### Changed - Dashboard Metrics Strategy 📊
- **RPM instead of RPS**: Switched the primary traffic metric from "Requests Per Second" to **"Requests Per Minute" (RPM)** for more intuitive enterprise traffic visualization
- **Traffic Smoothing**: Improved frontend calculation to maintain a stable rate between discrete statistics file updates
- **Expanded Chart**: Main chart now shows the last 30 minutes of RPM activity

### Fixed - Traffic Engine Logic 🛠️
- **Error Code Detection**: Fixed a bug where connection failures (code `000000`) were incorrectly logged as `SUCCESS`
- **Increased Reporting Frequency**: Statistics are now updated in `stats.json` every 5 requests instead of 50, enabling near real-time dashboard updates

## [1.1.0-patch.11] - 2026-01-22

### Fixed - Docker Build & Core Engine 🛠️
- **Restored `traffic-generator.sh`**: Fixed critical build failure in GitHub Actions caused by missing core script
- Ensures the continuous traffic generator container (`sdwan-traffic-gen`) is correctly built and functional

### Changed - Dashboard UI Responsiveness ⚡
- **1-Second Refresh Rate**: Increased dashboard polling frequency from 2s to 1s for smoother RPS visualization
- **Configurable Refresh Interval**: Added support for `DASHBOARD_REFRESH_MS` environment variable
- **New API Endpoint**: `/api/config/ui` to serve dynamic UI configuration

## [1.1.0-patch.10] - 2026-01-22

### Changed - Dashboard Metrics Optimization 📈
- **Real-Time Traffic Rate**: Replaced static "Total Requests" with dynamic "Traffic Rate" (Requests Per Second)
  - Provides a better "heartbeat" observation of the traffic generator
  - Cumulative "Total Requests" remains visible as a sub-metric
- **RPS Visualization**: Main dashboard chart now plots Request Rate instead of cumulative totals
- **Calculated on Frontend**: Non-intrusive implementation using state deltas for performance

## [1.1.0-patch.1] - 2026-01-19

### Fixed - DNS Security Status Display 🐛
- **"Pending" Status Bug**: Fixed DNS security tests incorrectly showing "Pending" status
  - **Root Cause**: `getStatusBadge()` function didn't recognize "sinkholed" status
  - **Impact**: Tests with "sinkholed" status fell through to default "Pending" case
  - **Solution**: Added explicit handling for "sinkholed" status with yellow badge and AlertTriangle icon
- **Status Badge Improvements**:
  - ✅ **Blocked** (red, XCircle) - Domain blocked/NXDOMAIN
  - ✅ **Sinkholed** (yellow, AlertTriangle) - Domain redirected to sinkhole IP
  - ✅ **Resolved** (green, CheckCircle) - Domain resolved successfully
  - ✅ **Error** (orange, XCircle) - Test execution error
  - Added debug logging for unknown statuses to catch future issues

### Technical Details
- Modified `web-dashboard/src/Security.tsx` - `getStatusBadge()` function
- Changed "Allowed" label to "Resolved" for DNS tests (more accurate)
- Added console warning for unexpected status values
- Eliminated ambiguous "Pending" state for valid test results

### Known Issues
- **Duplicate URLs in Live Logs**: URLs appear duplicated in Live Logs view (e.g., `https://example.comhttps://example.com`)
  - Actual log file is correct
  - Deferred to v1.1.1 for investigation

## [1.1.0] - 2026-01-18

### Added - Persistent Test Logging 📝
- **JSONL Log Storage**: All test results now saved to persistent log files
  - Append-only format for fast writes
  - Survives container restarts
  - Searchable and filterable
- **Log Rotation**: Automatic rotation when files reach 100MB (configurable)
- **Auto-Cleanup**: Daily cleanup at 2 AM, 7-day retention by default
  - Configurable via `LOG_RETENTION_DAYS` environment variable
  - Configurable max file size via `LOG_MAX_SIZE_MB`
- **Search & Filter API**: Fast search by test#, name, or status
  - Pagination support (50 results per page)
  - Filter by test type (URL/DNS/Threat)
  - Filter by status (blocked/allowed/sinkholed/error)

### Added - Enhanced Test Results UI 🔍
- **Search Bar**: Search test results by test#, name, or status
  - Debounced input for performance
  - Real-time filtering
- **Infinite Scroll**: Load more results as you scroll
  - Loads 50 tests at a time
  - Smooth scrolling performance
  - "Load More" button for manual loading
- **Detailed Log Viewer**: Click any test row to view full details
  - Shows command executed
  - Shows raw output
  - Shows errors (if any)
  - Shows execution time
  - Shows resolved IPs for DNS tests
- **Result Counter**: Shows total results and currently displayed count

### Added - System Health Monitoring 💻
- **Memory Stats**: Total, used, free, usage percentage
- **Disk Stats**: Total, used, free, usage percentage for log directory
- **Log Directory Usage**: Bytes used by test logs
- **Enhanced `/api/system/health` endpoint** with all metrics

### Added - New API Endpoints
- `GET /api/security/results` - Paginated results with search/filters
  - Query params: `limit`, `offset`, `search`, `type`, `status`
  - Returns: `results`, `total`, `limit`, `offset`
- `GET /api/security/results/:id` - Get detailed test result by ID
- `GET /api/security/results/stats` - Get log statistics
  - Total tests, tests by type/status, disk usage
- `DELETE /api/security/results` - Manual cleanup (delete all logs)

### Changed - Docker Configuration
- **Environment Variables**: Added `LOG_RETENTION_DAYS` and `LOG_MAX_SIZE_MB`
  - Defaults: 7 days retention, 100MB max file size
  - Configurable via docker-compose.yml

### Technical Details
- Created `test-logger.ts` module for comprehensive logging
- Updated all test endpoints to log to persistent storage
- Backward compatible: maintains in-memory history for old API
- Daily cleanup scheduler runs at 2 AM
- Frontend uses debounced search for performance
- Infinite scroll with scroll event detection

## [1.1.0-beta.16] - 2026-01-18

### Added - Cross-Platform DNS Support 🌐
- **Platform Detection**: Auto-detects operating system (macOS, Linux, Windows)
- **Smart Command Selection**: Chooses best DNS command based on platform
  - **macOS**: Uses `dscacheutil` (native macOS DNS tool) with fallback to `dig` → `nslookup`
  - **Linux**: Uses `getent ahosts` with fallback to `dig` → `nslookup`
  - **Windows**: Uses `nslookup`
- **Command Availability Check**: Verifies which DNS commands are installed at startup
- **Dynamic Output Parsing**: Parses different command outputs correctly
- **System Health API**: `/api/system/health` now reports:
  - Detected platform (darwin/linux/win32)
  - Available DNS commands
  - Selected DNS command with full fallback chain
- **DNS Tests Now Work on macOS**: Previously failed due to missing `getent`, now fully functional

### Changed - UI/UX Improvements ✨
- **Removed Verbose Docker Logs**: Eliminated noisy Docker stats console logs
  - No more `[CONNECTIVITY] Docker stats:` spam every 2 seconds
  - Cleaner console output for debugging
- **Test Results Table Optimization**: Limited to 50 most recent tests
  - Added scrollable container (max-height: 384px)
  - Sticky table header stays visible while scrolling
  - Better performance with large test histories
- **Compact Scheduler UI**: Reduced vertical space by 60%
  - Single-line horizontal layout when enabled
  - Smaller padding (16px instead of 24px)
  - Compact labels: "URL", "DNS", "Threat" instead of full names
  - Inline interval input with label
  - **Before**: ~200px height → **After**: ~80px height

### Fixed
- **GitHub Actions Workflow**: Fixed VERSION file handling
  - Workflow now writes VERSION from git tag before build
  - Passes VERSION as build argument to Docker
  - Ensures Docker image displays correct version number
- **DNS Test Retry Logic**: Improved retry mechanism with better IP extraction
- **Scheduler Persistence**: Ensured scheduler config persists in Docker deployments

### Technical Details
- Added `os.platform()` detection for cross-platform support
- Implemented `checkCommand()` to verify command availability
- Created `getDnsCommand()` for dynamic command selection
- Created `parseDnsOutput()` for parsing different DNS command outputs
- Updated individual and batch DNS test endpoints to use new platform-aware logic

## [1.1.0-beta.5] - 2026-01-17

### Added - Enhanced DNS Debug Logging
- **DNS Command Output Logging**: Added detailed debug logs for DNS security tests
  - Logs the exact `getent ahosts` command being executed
  - Logs the raw stdout output from the command
  - Logs stderr output (if any)
  - Logs the sinkhole detection logic results (isSinkholed, isBlocked)
  - Helps troubleshoot why sinkhole detection may not be working

## [1.1.0] - 2026-01-16

### Added - Security Testing Feature
- **URL Filtering Tests**: Test 67 categories using Palo Alto Networks test pages
- **DNS Security Tests**: Test 24 malicious domains (Basic + Advanced)
- **Threat Prevention**: EICAR test file download to trigger IPS
- **Statistics Dashboard**: Track blocked/allowed counts per test type
- **Scheduled Execution**: Automatic test execution at configurable intervals (5-1440 minutes)
- **Toast Notifications**: Visual feedback when tests start/complete
- **Test Results History**: Last 50 test results with export to JSON
- **Comprehensive Documentation**: 
  - Technical documentation (`docs/SECURITY_TESTING.md`)
  - Quick reference guide (`docs/SECURITY_QUICK_REFERENCE.md`)
  - FAQ document (`docs/SECURITY_TESTING_FAQ.md`)

### Added - Network Interface Auto-Detection
- **Automatic Interface Detection**: Traffic generator now auto-detects default network interface
  - Works on both Linux (`eth0`) and macOS (`en0`)
  - Falls back to manual configuration if auto-detection fails
- **Interface Validation API**: New endpoint `/api/system/interfaces` that:
  - Lists all available network interfaces
  - Tests connectivity on each interface (ping test)
  - Identifies default route interface
  - Returns status: `active` / `inactive` / `unknown`
- **Enhanced Traffic Generator Script**: Updated `traffic-generator.sh` with smart interface detection
  - Tries `config/interfaces.txt` first
  - Auto-detects using `ip route` (Linux) or `route` (macOS)
  - Falls back to first active interface
  - Platform-aware defaults

### Fixed
- **Backend Module System**: Fixed "require is not defined" error
  - Converted CommonJS `require()` to ES Module `import` statements
  - Added `exec` and `promisify` to imports
  - Replaced 7 instances of inline `require()` calls
- **Threat Test API**: Fixed undefined `endpoints` variable
  - Changed to use `endpoint` from request body
  - Added support for both single endpoint and array
- **EICAR Test Frontend**: Fixed 400 Bad Request error
  - Frontend was sending `endpoints` (array) but backend expected `endpoint` (string)
  - Changed `Security.tsx` to send correct parameter format
  - Test now executes correctly and updates statistics

### Added - Debug Logging
- **Security Test Logging**: Added comprehensive debug logging to all security test endpoints
  - EICAR threat test: Logs request, execution, result (blocked/allowed), and errors
  - DNS security test: Logs request, domain resolution status, and results
  - URL filtering test: Logs request and validation
  - All logs prefixed with `[DEBUG]` for easy filtering
  - Helps troubleshoot test execution issues in production

### Added - Three-State DNS Detection
- **DNS Sinkhole Detection**: DNS security tests now properly detect sinkhole IPs
  - Detects Palo Alto Networks sinkhole IPs (198.135.184.22, 72.5.65.111)
  - Detects common sinkhole IPs (0.0.0.0, 127.0.0.1, ::1)
  - Three distinct states: **Resolved** (clean), **Sinkholed** (threat detected), **Blocked** (query blocked)
  - Statistics dashboard shows all three states separately
  - More accurate threat detection visibility

### Changed
- **Security Config Schema**: Changed from `eicar_endpoints` (array) to `eicar_endpoint` (string)
  - Simplified to single EICAR endpoint for initial release
  - Can be extended to multiple endpoints in future versions

### Documentation
- Created `docs/SECURITY_TESTING.md` - Comprehensive technical documentation
- Created `docs/SECURITY_QUICK_REFERENCE.md` - Quick reference guide
- Created `docs/SECURITY_TESTING_FAQ.md` - Frequently asked questions
- Updated deployment guide with security feature setup

## [1.0.2] - Previous Release
- Import/Export `applications.txt` functionality
- Speed Test feature
- Various bug fixes and improvements

---

## How to Use This Changelog

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security vulnerability fixes
