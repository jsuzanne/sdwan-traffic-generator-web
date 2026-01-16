# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
