# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
