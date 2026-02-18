# Traffic Generator Configuration Guide

Learn how to configure and optimize the SD-WAN Traffic Generator for realistic application traffic simulation.

## Overview

The Traffic Generator is a **separate component** from Security Tests. It generates continuous background HTTP/HTTPS traffic to simulate real user activity.

### Traffic Generator vs Security Tests

| Feature | Traffic Generator | Security Tests | Voice Simulation |
|---------|------------------|----------------|------------------|
| **Purpose** | Simulate user traffic | Test security policies | Test QoS / Voice QoS |
| **Port** | 80/443 (HTTP/S) | 80/443 (HTTP/S) | 6100 (Voice) / 6101 (CONV) |
| **Source** | `config/applications-config.json` | Hardcoded test URLs | `config/voice-config.json` |
| **Execution** | Continuous background | On-demand or scheduled | Continuous background |
| **Logs** | `traffic.log` | `test-results.jsonl` | `voice-stats.jsonl` |
| **Stats** | `stats.json` | Test history | Voice Tab / Dashboard |
| **Examples** | google.com, office365.com | urlfiltering.paloaltonetworks.com | CALL-0001 (RTP) |

### Key Documentation
- **[Voice Simulation (RTP) Guide](VOICE_SIMULATION.md)**
- **[Security Testing Guide](SECURITY_TESTING.md)**

---

## Configuration Format

The `config/applications-config.json` file is the unified configuration for all applications and traffic control settings.

### File Format (JSON)

```json
{
  "control": {
    "enabled": true,
    "sleep_interval": 1.0
  },
  "applications": [
    {
      "domain": "google.com",
      "weight": 100,
      "endpoint": "/search",
      "category": "Google Workspace"
    },
    {
      "domain": "outlook.office365.com",
      "weight": 68,
      "endpoint": "/",
      "category": "Microsoft 365 Suite"
    }
  ]
}
```

### Fields

| Field | Description | Example |
|-------|-------------|---------|
| **domain** | Domain or IP (optionally prefixed with `http://`) | `http://192.168.1.1` |
| **weight** | Traffic probability (balanced by UI) | `100` |
| **endpoint** | URL path to request | `/cgi-bin/test.sh` |
| **category** | Grouping for UI organization | `Microsoft 365 Suite` |

### Example Entry

```
# Google Mail - High priority (100), requests /mail/ endpoint
mail.google.com|100|/mail/
```

---

## Weight System

Weights determine the **probability** of each application being selected for traffic generation.

### How It Works

**Formula:** `Probability = (App Weight) / (Total Weight)`

**Example:**

```
google.com|100|/
microsoft.com|50|/
zoom.us|50|/
```

**Total Weight:** 100 + 50 + 50 = 200

**Traffic Distribution:**
- Google: 100/200 = **50%** of requests
- Microsoft: 50/200 = **25%** of requests
- Zoom: 50/200 = **25%** of requests

### Weight Guidelines

| Weight Range | Use Case | Example |
|--------------|----------|---------|
| **1-25** | Minimal traffic | Background apps, rarely used tools |
| **26-50** | Light traffic | Secondary apps, occasional use |
| **51-75** | Moderate traffic | Regular business apps |
| **76-100** | Heavy traffic | Primary productivity apps |
| **101-150** | Very heavy | Critical apps (email, collaboration) |
| **151-200** | Dominant | Demo scenarios (gaming, social media) |

---

## Configuration Examples

### Example 1: Enterprise Profile

Typical business environment with Microsoft 365 and Google Workspace.

```
# Microsoft 365 Suite - Primary productivity
outlook.office365.com|100|/
teams.microsoft.com|90|/api/mt/emea/beta/users/
login.microsoftonline.com|85|/
onedrive.live.com|75|/
sharepoint.com|70|/

# Google Workspace - Secondary
mail.google.com|80|/mail/
drive.google.com|70|/
docs.google.com|60|/document/

# Collaboration Tools
zoom.us|65|/
slack.com|60|/api/api.test
webex.com|45|/

# Business Apps
salesforce.com|50|/
hubspot.com|40|/
jira.atlassian.com|45|/

# Cloud Storage
dropbox.com|35|/
box.com|30|/
```

**Traffic Distribution:**
- Microsoft 365: ~35%
- Google Workspace: ~25%
- Collaboration: ~20%
- Business Apps: ~15%
- Storage: ~5%

---

### Example 2: Consumer/Gaming Profile

Heavy social media, gaming, and streaming for SD-WAN demos.

```
# Social Media - Very Heavy
facebook.com|150|/robots.txt
instagram.com|145|/robots.txt
tiktok.com|140|/
twitter.com|135|/robots.txt
snapchat.com|130|/
linkedin.com|125|/

# Gaming - Very Heavy
twitch.tv|150|/
steampowered.com|145|/
epicgames.com|140|/
fortnite.com|125|/
roblox.com|135|/

# Video Streaming
youtube.com|130|/feed/trending
netflix.com|90|/robots.txt
spotify.com|85|/
hulu.com|80|/

# Business Apps - Light
outlook.office365.com|60|/
mail.google.com|55|/
zoom.us|50|/
```

**Traffic Distribution:**
- Social Media: ~35%
- Gaming: ~30%
- Streaming: ~20%
- Business: ~15%

---

### Example: Balanced Profile (JSON)

```json
{
  "applications": [
    { "domain": "outlook.office365.com", "weight": 70, "endpoint": "/", "category": "Microsoft 365" },
    { "domain": "mail.google.com", "weight": 75, "endpoint": "/mail/", "category": "Google Workspace" },
    { "domain": "youtube.com", "weight": 90, "endpoint": "/feed/trending", "category": "Streaming" }
  ]
}
```

**Traffic Distribution:**
- Business Apps: ~30%
- Social Media: ~25%
- Streaming: ~20%
- Gaming: ~15%
- Collaboration: ~10%

---

## Traffic Analysis

### Calculate Your Distribution

**Total Weight:** Sum of all weights

**Example:**
```
google.com|100|/
microsoft.com|80|/
zoom.us|60|/
slack.com|50|/
```

**Total:** 100 + 80 + 60 + 50 = **290**

**Distribution:**
- Google: 100/290 = **34.5%** → ~345 requests per 1000
- Microsoft: 80/290 = **27.6%** → ~276 requests per 1000
- Zoom: 60/290 = **20.7%** → ~207 requests per 1000
- Slack: 50/290 = **17.2%** → ~172 requests per 1000

### View Current Stats

Check `logs/stats.json` to see actual traffic distribution:

```bash
cat logs/stats.json | jq '.requests_by_app'
```

---

## Advanced Configuration

### Multiple Endpoints per Domain

```
# Microsoft Graph API - Different endpoints
graph.microsoft.com|60|/v1.0/me
graph.microsoft.com|40|/v1.0/users
graph.microsoft.com|30|/v1.0/groups
```

### Protocol Selection

The traffic generator uses HTTPS by default. Endpoints are automatically prefixed with `https://` unless an explicit protocol is specified.

**Default (HTTPS):**
```
google.com|100|/search  =>  https://google.com/search
```

**Explicit HTTP (Internal Servers):**
```
http://192.168.203.100|50|/status  =>  http://192.168.203.100/status
```

### IP Address Identification

When using an IP address as a domain, the dashboard statistics will identify the application by its **full IP address** instead of just its first part.

### User Agents

Create `config/user_agents.txt` for custom user agent rotation:

```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36
Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36
```

If not provided, a default user agent is used.

### Network Interfaces

Create `config/interfaces.txt` to specify network interfaces:

```
eth0
wlan0
enp0s3
```

Or configure via the Web UI → Configuration tab.

---

## Logging and Statistics

### Traffic Logs

Location: `/var/log/sdwan-traffic-gen/traffic.log`

```
[2026-01-19 08:00:15] [INFO] client01 requesting https://google.com/ via eth0 (traceid: 1768778415-client01)
[2026-01-19 08:00:15] [INFO] client01 SUCCESS https://google.com/ - code: 200
[2026-01-19 08:00:17] [INFO] client01 requesting https://outlook.office365.com/ via eth0 (traceid: 1768778417-client01)
[2026-01-19 08:00:17] [INFO] client01 SUCCESS https://outlook.office365.com/ - code: 200
```

### Statistics File

Location: `/var/log/sdwan-traffic-gen/stats.json`

```json
{
  "timestamp": 1768778415,
  "client_id": "client01",
  "total_requests": 15420,
  "requests_by_app": {
    "google": 5234,
    "outlook": 4156,
    "zoom": 3102,
    "slack": 2928
  },
  "errors_by_app": {
    "google": 0,
    "outlook": 2,
    "zoom": 0,
    "slack": 1
  }
}
```

### View Stats in Real-Time

```bash
# Watch stats update
watch -n 5 'cat logs/stats.json | jq .'

# View request counts
cat logs/stats.json | jq '.requests_by_app'

# View error counts
cat logs/stats.json | jq '.errors_by_app'
```

---

## Backoff and Error Handling

The traffic generator implements intelligent backoff for failed requests:

| Failure Count | Backoff Time | Description |
|---------------|--------------|-------------|
| 1st failure | 1 minute | Temporary issue |
| 2nd failure | 5 minutes | Possible outage |
| 3rd failure | 30 minutes | Extended outage |
| 4th failure | 1 hour | Persistent issue |
| 5+ failures | 3 hours | Site unreachable |

**Behavior:**
- Failed apps are temporarily skipped
- Backoff resets on successful request
- Prevents overwhelming unreachable sites

---

## Performance Tuning

### Request Interval

Default: 1 second between requests

Adjust in `docker-compose.yml`:

```yaml
environment:
  - SLEEP_BETWEEN_REQUESTS=2  # 2 seconds (slower)
  - SLEEP_BETWEEN_REQUESTS=0.5  # 500ms (faster)
```

### Timeout

Default: 15 seconds per request

Modify in `traffic-generator.sh`:

```bash
MAX_TIMEOUT=15  # Change to desired timeout
```

---

## Best Practices

### 1. Start Small

Begin with 10-20 applications and adjust weights based on observed traffic.

### 2. Use Realistic Weights

Mirror actual user behavior:
- Email/collaboration: High weights (80-100)
- Business apps: Moderate weights (50-75)
- Social media: Variable (25-150 depending on demo)

### 3. Monitor Stats

Check `stats.json` regularly to ensure distribution matches expectations.

### 4. Avoid Overloading

Don't set `SLEEP_BETWEEN_REQUESTS` too low (<0.5s) to avoid overwhelming your network.

### 5. Test Incrementally

Add applications gradually and verify they're reachable before adding more.

---

## Troubleshooting

### No Traffic Generated

1. Check `applications-config.json` exists and has valid entries
2. Verify traffic generation is started (Dashboard → Active)
3. Check logs: `docker compose logs -f sdwan-traffic-gen`

### High Error Rates

1. Check `stats.json` for `errors_by_app`
2. Verify network connectivity
3. Check if domains are blocked by firewall
4. Review backoff logs in `traffic.log`

### Uneven Distribution

1. Recalculate total weights
2. Adjust individual app weights
3. Wait for stats to accumulate (>1000 requests)

---

## Related Documentation

- **[Quick Start Guide](QUICK_START.md)** - Installation and setup
- **[Security Testing](SECURITY_TESTING.md)** - Security test features (separate from traffic generator)
- **[Configuration Guide](CONFIGURATION.md)** - Advanced configuration
- **[Troubleshooting](TROUBLESHOOTING.md)** - Common issues

---

**Last Updated:** 2026-02-18  
**Version:** 1.2.1-patch.65
