# Security Testing Feature - Technical Documentation

## Overview

The Security Testing feature enables controlled testing of Palo Alto Networks / Prisma Access security policies for demos and POCs. It provides automated testing of URL Filtering, DNS Security, and Threat Prevention capabilities.

**Version:** 1.1.0  
**Last Updated:** 2026-01-19

---

## Screenshots

### Security Overview Dashboard
![Security Overview](screenshots/security/overview.png)

*Real-time summary of URL filtering, DNS security, and threat prevention test results with system health monitoring*

### URL Filtering Tests
![URL Filtering](screenshots/security/url-filtering.png)

*Test 66 different URL categories including malware, phishing, gambling, adult content, and more*

### DNS Security Tests
![DNS Security](screenshots/security/dns-security.png)

*Validate DNS security policies with basic and advanced test domains*

### Threat Prevention
![Threat Prevention](screenshots/security/threat-prevention.png)

*EICAR file download testing for IPS validation*

### Test Results History
![Test Results](screenshots/security/test-results.png)

*Persistent logging with search, filtering, pagination, and export capabilities*

---

## Table of Contents

1. [Architecture](#architecture)
2. [Configuration](#configuration)
3. [API Endpoints](#api-endpoints)
4. [Frontend Components](#frontend-components)
5. [Test Categories](#test-categories)
6. [Scheduled Execution](#scheduled-execution)
7. [Statistics Tracking](#statistics-tracking)
8. [Persistent Logging](#persistent-logging)
9. [Maintenance](#maintenance)

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  - Security.tsx (Main Component)                            │
│  - Statistics Dashboard                                      │
│  - Scheduled Execution Controls                             │
│  - Execution Log Display                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────────────┐
│                   Backend (Node.js/Express)                  │
│  - 10 API Endpoints                                          │
│  - Test Execution Engine (curl/nslookup)                    │
│  - Scheduler (setInterval)                                   │
│  - Statistics Tracker                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Configuration & Data Storage                    │
│  - config/security-tests.json                               │
│  - Test History (last 50 results)                           │
│  - Statistics (blocked/allowed counts)                       │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Manual Test Execution:**
```
User clicks "Run All Enabled"
  → Frontend calls /api/security/url-test-batch
  → Backend executes curl commands for each enabled category
  → Results logged to test_history
  → Statistics updated (blocked/allowed counters)
  → Frontend refreshes and displays results
  → Execution log shows real-time progress
```

**Scheduled Test Execution:**
```
Scheduler interval triggers (every N minutes)
  → runScheduledTests() executes
  → Runs subset of enabled tests (max 5 per category)
  → Updates statistics automatically
  → Updates last_run_time and next_run_time
  → Continues in background
```

---

## Configuration

### File Location
`config/security-tests.json`

### Schema

```json
{
  "url_filtering": {
    "enabled_categories": ["malware", "phishing", "adult"],
    "protocol": "http"
  },
  "dns_security": {
    "enabled_tests": ["malware", "phishing", "dns-tunneling"]
  },
  "threat_prevention": {
    "enabled": true,
    "eicar_endpoints": [
      "http://192.168.203.100/eicar.com.txt",
      "http://192.168.203.101/eicar.com.txt"
    ]
  },
  "scheduled_execution": {
    "enabled": true,
    "interval_minutes": 60,
    "run_url_tests": true,
    "run_dns_tests": true,
    "run_threat_tests": false,
    "next_run_time": 1737048960000,
    "last_run_time": 1737045360000
  },
  "statistics": {
    "total_tests_run": 42,
    "url_tests_blocked": 15,
    "url_tests_allowed": 2,
    "dns_tests_blocked": 20,
    "dns_tests_allowed": 1,
    "threat_tests_blocked": 4,
    "threat_tests_allowed": 0,
    "last_test_time": 1737048960000
  },
  "test_history": [
    {
      "timestamp": 1737048960000,
      "testType": "url_filtering",
      "testName": "Malware",
      "result": {
        "success": false,
        "httpCode": 0,
        "status": "blocked",
        "url": "http://urlfiltering.paloaltonetworks.com/test-malware",
        "category": "Malware"
      }
    }
  ]
}
```

### Configuration Fields

| Field | Type | Description |
|-------|------|-------------|
| `url_filtering.enabled_categories` | `string[]` | IDs of enabled URL categories |
| `url_filtering.protocol` | `"http" \| "https"` | Protocol to use for URL tests |
| `dns_security.enabled_tests` | `string[]` | IDs of enabled DNS test domains |
| `threat_prevention.enabled` | `boolean` | Enable/disable threat prevention tests |
| `threat_prevention.eicar_endpoints` | `string[]` | Array of EICAR file URLs to test |
| `scheduled_execution.enabled` | `boolean` | Enable/disable scheduled tests |
| `scheduled_execution.interval_minutes` | `number` | Minutes between scheduled runs (5-1440) |
| `scheduled_execution.run_url_tests` | `boolean` | Include URL tests in schedule |
| `scheduled_execution.run_dns_tests` | `boolean` | Include DNS tests in schedule |
| `scheduled_execution.run_threat_tests` | `boolean` | Include threat tests in schedule |
| `scheduled_execution.next_run_time` | `number \| null` | Timestamp of next scheduled run |
| `scheduled_execution.last_run_time` | `number \| null` | Timestamp of last scheduled run |

---

## API Endpoints

### Configuration Management

#### GET `/api/security/config`
Get current security configuration.

**Response:**
```json
{
  "url_filtering": {...},
  "dns_security": {...},
  "threat_prevention": {...},
  "scheduled_execution": {...},
  "statistics": {...},
  "test_history": [...]
}
```

#### POST `/api/security/config`
Update security configuration.

**Request Body:**
```json
{
  "url_filtering": {...},
  "scheduled_execution": {...}
}
```

**Response:**
```json
{
  "success": true,
  "config": {...}
}
```

**Side Effects:**
- Restarts scheduler if `scheduled_execution` settings changed
- Persists configuration to `config/security-tests.json`

---

### Test Execution

#### POST `/api/security/url-test`
Execute single URL filtering test.

**Request:**
```json
{
  "url": "http://urlfiltering.paloaltonetworks.com/test-malware",
  "category": "Malware"
}
```

**Response:**
```json
{
  "success": false,
  "httpCode": 0,
  "status": "blocked",
  "url": "...",
  "category": "Malware"
}
```

**Implementation:**
```bash
curl -fsS --max-time 10 -o /dev/null -w '%{http_code}' 'URL'
```

**Status Logic:**
- HTTP 200-399: `status: "allowed"`
- HTTP 400+: `status: "blocked"`
- Curl error: `status: "blocked"`

---

#### POST `/api/security/url-test-batch`
Execute multiple URL filtering tests.

**Request:**
```json
{
  "tests": [
    { "url": "...", "category": "Malware" },
    { "url": "...", "category": "Phishing" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "results": [...]
}
```

**Behavior:**
- Executes tests sequentially
- Updates statistics after each test
- Adds each result to test_history

---

#### POST `/api/security/dns-test`
Execute single DNS security test.

**Request:**
```json
{
  "domain": "test-malware.testpanw.com",
  "testName": "Malware"
}
```

**Response:**
```json
{
  "success": true,
  "status": "blocked",
  "domain": "test-malware.testpanw.com",
  "resolved": false
}
```

**Implementation:**
```bash
nslookup test-malware.testpanw.com
```

**Status Logic:**
- Contains "NXDOMAIN": `status: "blocked"`
- Contains "server can't find": `status: "blocked"`
- Resolves successfully: `status: "allowed"`

---

#### POST `/api/security/dns-test-batch`
Execute multiple DNS security tests.

**Request:**
```json
{
  "tests": [
    { "domain": "test-malware.testpanw.com", "testName": "Malware" },
    { "domain": "test-phishing.testpanw.com", "testName": "Phishing" }
  ]
}
```

---

#### POST `/api/security/threat-test`
Execute EICAR threat prevention test(s).

**Request:**
```json
{
  "endpoints": [
    "http://192.168.203.100/eicar.com.txt",
    "http://192.168.203.101/eicar.com.txt"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "success": false,
      "status": "blocked",
      "endpoint": "http://192.168.203.100/eicar.com.txt",
      "message": "EICAR download blocked (IPS triggered)"
    }
  ]
}
```

**Implementation:**
```bash
curl -fsS --max-time 20 ENDPOINT -o /tmp/eicar.com.txt && rm -f /tmp/eicar.com.txt
```

**Status Logic:**
- Download succeeds: `status: "allowed"` (IPS not blocking)
- Curl error: `status: "blocked"` (IPS triggered)

**Security:**
- File automatically deleted after test
- URL validation prevents command injection
- 20-second timeout prevents hanging

---

### Test Results

#### GET `/api/security/results`
Get test execution history.

**Response:**
```json
{
  "results": [
    {
      "timestamp": 1737048960000,
      "testType": "url_filtering",
      "testName": "Malware",
      "result": {...}
    }
  ]
}
```

**Behavior:**
- Returns last 50 test results
- Sorted by timestamp (newest first)

---

#### DELETE `/api/security/results`
Clear test execution history.

**Response:**
```json
{
  "success": true
}
```

**Behavior:**
- Clears `test_history` array
- Preserves statistics
- Persists to config file

---

## Frontend Components

### Security.tsx

Main component for Security Testing tab.

**State Management:**

```typescript
const [config, setConfig] = useState<SecurityConfig | null>(null);
const [testResults, setTestResults] = useState<TestResult[]>([]);
const [loading, setLoading] = useState(false);
const [testing, setTesting] = useState<{ [key: string]: boolean }>({});
const [executionLog, setExecutionLog] = useState<string[]>([]);
const [eicarEndpoints, setEicarEndpoints] = useState<string[]>([]);
```

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `fetchConfig()` | Load configuration from backend |
| `fetchResults()` | Load test history from backend |
| `saveConfig()` | Update configuration on backend |
| `runURLTest()` | Execute single URL test |
| `runURLBatchTest()` | Execute all enabled URL tests |
| `runDNSTest()` | Execute single DNS test |
| `runDNSBatchTest()` | Execute all enabled DNS tests |
| `runThreatTest()` | Execute EICAR test(s) |
| `addLog()` | Add entry to execution log |
| `getStatusBadge()` | Render status indicator (blocked/allowed) |

**UI Sections:**

1. **Statistics Dashboard** - 4 stat cards showing test counts
2. **Scheduled Execution** - Toggle and configuration controls
3. **URL Filtering Tests** - 67 categories with checkboxes
4. **DNS Security Tests** - 24 domains (Basic + Advanced)
5. **Threat Prevention** - Multiple EICAR endpoint inputs
6. **Test Results** - History table with export/clear
7. **Execution Log** - Real-time test execution feed

---

## Test Categories

### URL Filtering Categories (67 total)

Defined in `web-dashboard/src/data/security-categories.ts`

**Example:**
```typescript
{
  id: 'malware',
  name: 'Malware',
  url: 'http://urlfiltering.paloaltonetworks.com/test-malware'
}
```

**Categories include:**
- Malware, Phishing, Command and Control
- Adult Content, Gambling, Weapons
- Hacking, Proxy Avoidance, Peer-to-Peer
- And 58 more...

**Full list:** See `URL_CATEGORIES` array in `security-categories.ts`

---

### DNS Security Test Domains (24 total)

**Basic Tests (15):**
- Malware, Phishing, Command & Control
- DNS Tunneling, DGA, Parked Domains
- Proxy, Newly Registered, Grayware

**Advanced Tests (9):**
- Ransomware, CNAME Cloaking, Cybersquatting
- Wildcard, NXNS Attack, Fast Flux

**Example:**
```typescript
{
  id: 'malware',
  name: 'Malware',
  domain: 'test-malware.testpanw.com',
  category: 'basic'
}
```

**Full list:** See `DNS_TEST_DOMAINS` array in `security-categories.ts`

---

## Scheduled Execution

### How It Works

1. **Initialization:**
   - On server startup, checks `scheduled_execution.enabled`
   - If enabled, starts interval timer
   - Waits 5 seconds before first check

2. **Execution Cycle:**
   ```
   Every N minutes:
     → runScheduledTests() executes
     → Updates last_run_time
     → Runs enabled tests (max 5 per category)
     → Updates statistics
     → Calculates next_run_time
   ```

3. **Test Limits:**
   - URL Filtering: Max 5 categories per run
   - DNS Security: Max 5 domains per run
   - Threat Prevention: Max 3 endpoints per run

4. **Configuration Changes:**
   - Changing interval restarts scheduler
   - Disabling stops scheduler immediately
   - Enabling starts scheduler with new settings

### Implementation

**Backend (server.ts):**

```typescript
let scheduledTestInterval: NodeJS.Timeout | null = null;

const runScheduledTests = async () => {
  const config = getSecurityConfig();
  if (!config?.scheduled_execution?.enabled) return;
  
  // Update last run time
  config.scheduled_execution.last_run_time = Date.now();
  saveSecurityConfig(config);
  
  // Run tests...
  // Update statistics...
};

const startScheduledTests = () => {
  const config = getSecurityConfig();
  if (!config?.scheduled_execution?.enabled) return;
  
  const intervalMs = config.scheduled_execution.interval_minutes * 60 * 1000;
  
  // Set next run time
  config.scheduled_execution.next_run_time = Date.now() + intervalMs;
  saveSecurityConfig(config);
  
  scheduledTestInterval = setInterval(() => {
    runScheduledTests();
    // Update next run time
    const cfg = getSecurityConfig();
    if (cfg?.scheduled_execution) {
      cfg.scheduled_execution.next_run_time = Date.now() + intervalMs;
      saveSecurityConfig(cfg);
    }
  }, intervalMs);
};
```

---

## Statistics Tracking

### Automatic Updates

Statistics are updated automatically on every test execution:

```typescript
const updateStatistics = (testType: string, status: string) => {
  const config = getSecurityConfig();
  if (!config?.statistics) return;
  
  config.statistics.total_tests_run++;
  config.statistics.last_test_time = Date.now();
  
  if (testType === 'url_filtering') {
    if (status === 'blocked') config.statistics.url_tests_blocked++;
    else config.statistics.url_tests_allowed++;
  }
  // ... similar for dns_security and threat_prevention
  
  saveSecurityConfig(config);
};
```

### Statistics Fields

| Field | Description |
|-------|-------------|
| `total_tests_run` | Total number of tests executed |
| `url_tests_blocked` | URL tests that were blocked |
| `url_tests_allowed` | URL tests that were allowed |
| `dns_tests_blocked` | DNS tests that were blocked |
| `dns_tests_allowed` | DNS tests that were allowed |
| `threat_tests_blocked` | Threat tests that were blocked |
| `threat_tests_allowed` | Threat tests that were allowed |
| `last_test_time` | Timestamp of most recent test |

### Reset Statistics

To reset statistics, manually edit `config/security-tests.json`:

```json
"statistics": {
  "total_tests_run": 0,
  "url_tests_blocked": 0,
  "url_tests_allowed": 0,
  "dns_tests_blocked": 0,
  "dns_tests_allowed": 0,
  "threat_tests_blocked": 0,
  "threat_tests_allowed": 0,
  "last_test_time": null
}
```

---

## Maintenance

### Adding New URL Categories

1. Edit `web-dashboard/src/data/security-categories.ts`
2. Add new entry to `URL_CATEGORIES` array:
   ```typescript
   {
     id: 'new-category',
     name: 'New Category',
     url: 'http://urlfiltering.paloaltonetworks.com/test-new-category'
   }
   ```
3. Rebuild frontend: `npm run build`

### Adding New DNS Test Domains

1. Edit `web-dashboard/src/data/security-categories.ts`
2. Add new entry to `DNS_TEST_DOMAINS` array:
   ```typescript
   {
     id: 'new-test',
     name: 'New Test',
     domain: 'test-new.testpanw.com',
     category: 'basic' // or 'advanced'
   }
   ```
3. Rebuild frontend: `npm run build`

### Troubleshooting

**Tests not running:**
- Check backend logs: `docker-compose logs sdwan-web-ui`
- Verify `curl` and `nslookup` are installed in container
- Check network connectivity to test URLs/domains

**Scheduler not working:**
- Check `scheduled_execution.enabled` is `true`
- Verify interval is between 5-1440 minutes
- Restart container: `docker-compose restart sdwan-web-ui`

**Statistics not updating:**
- Check `addTestResult()` is being called
- Verify `updateStatistics()` is called after each test
- Check config file permissions

**EICAR tests failing:**
- Verify EICAR endpoint URL is accessible
- Check firewall allows traffic to endpoint
- Ensure IPS is configured to block EICAR

### Logs

**Backend execution logs:**
```bash
docker-compose logs -f sdwan-web-ui
```

**Frontend execution log:**
- Visible in Security tab → Execution Log section
- Shows real-time test execution progress
- Keeps last 50 entries

### Performance Considerations

**Batch Test Limits:**
- URL Filtering: No limit (runs all enabled)
- DNS Security: No limit (runs all enabled)
- Threat Prevention: Runs all configured endpoints

**Scheduled Test Limits:**
- URL Filtering: Max 5 per run
- DNS Security: Max 5 per run
- Threat Prevention: Max 3 per run

**Reason:** Prevent overwhelming the firewall with too many simultaneous requests during scheduled execution.

### Backup and Restore

**Backup configuration:**
```bash
cp config/security-tests.json config/security-tests.json.backup
```

**Restore configuration:**
```bash
cp config/security-tests.json.backup config/security-tests.json
docker-compose restart sdwan-web-ui
```

---

## Security Considerations

1. **EICAR Files:**
   - Automatically deleted after test
   - Triggers IPS alerts (intentional)
   - Use private IP in LAB environment

2. **URL Validation:**
   - Endpoints validated before execution
   - Prevents command injection
   - Only http:// and https:// allowed

3. **Test Isolation:**
   - Each test runs independently
   - Failures don't affect other tests
   - Timeouts prevent hanging

4. **Firewall Impact:**
   - Tests generate security alerts
   - Use only in demo/POC environments
   - Configure scheduled tests for low frequency

---

## Future Enhancements

- [ ] HTTPS URL filtering support (requires SSL decryption)
- [ ] Custom test profiles (save favorite combinations)
- [ ] Email notifications for test results
- [ ] Advanced reporting and analytics
- [ ] Multi-firewall support
- [ ] Test result comparison (before/after policy changes)
- [ ] Database persistence for unlimited history

---

## Support

For issues or questions:
- Check logs: `docker-compose logs -f sdwan-web-ui`
- Review this documentation
- Verify Prisma Access connectivity
- Check firewall security policies

---

**Document Version:** 1.0  
**Feature Version:** 1.1.0  
**Last Updated:** 2026-01-16
