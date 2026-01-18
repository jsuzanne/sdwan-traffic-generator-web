# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
