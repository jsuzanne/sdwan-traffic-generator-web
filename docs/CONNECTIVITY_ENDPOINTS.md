# Connectivity & Performance Monitoring (DEM)

## Overview

Configure synthetic endpoints to monitor network health and user experience. The system provides a **Digital Experience Management (DEM)** score (0-100) for each path, breaking down latency into protocol-level metrics.

## Configuration

Add environment variables to your `docker-compose.yml`:

### HTTP/HTTPS Endpoints
High-resolution metrics including DNS, TCP, TLS handshake, and TTFB:
```yaml
environment:
  - CONNECTIVITY_HTTP_1=DC-App:https://app.datacenter.local
  - CONNECTIVITY_HTTP_2=SaaS:https://api.salesforce.com
```

### ICMP Ping Endpoints
Network-layer reachability and round-trip time:
```yaml
environment:
  - CONNECTIVITY_PING_1=HQ-Firewall:10.0.0.1
```

### TCP Port Tests
Validate specific service availability:
```yaml
environment:
  - CONNECTIVITY_TCP_1=Database:10.0.0.200:5432
```

## Performance Scoring (DEM)

Each reachable endpoint receives a score based on a weighted algorithm:

| Metric | Weight | Description |
| :--- | :--- | :--- |
| **Total Latency** | 30% | Overall round-trip response time. |
| **TTFB** | 35% | Time To First Byte (Application/Backend latency). |
| **TLS/SSL** | 25% | Handshake timing (Path inspection overhead). |
| **DNS/TCP** | 10% | Network setup overhead. |

> [!NOTE]
> Scores above **80** are considered Excellent (Green). Scores below **50** indicate path degradation or heavy SSL inspection (Orange/Red).

## Timing Breakdown

When using HTTP/HTTPS probes, the system captures:
- **DNS Lookup**: Name resolution speed.
- **TCP Connect**: Three-way handshake timing.
- **App Connect (TLS)**: SSL negotiation duration (key for SASE analysis).
- **TTFB**: Time between request and first byte of response.
- **Total**: End-to-end execution time.

## Historical Logging

All results are logged with millisecond precision in:
`/app/logs/connectivity-results.jsonl`

History is accessible via the **Performance** tab in the dashboard, featuring:
- Time-series charts of timing breakdowns.
- Global Health Score summary.
- Reliability (Uptime %) per endpoint.

## Use Cases

- **SASE/SD-WAN Validation**: Measure the impact of SSL inspection on application performance.
- **Path Selection**: Compare performance across different ISP links or VPN tunnels.
- **SaaS Monitoring**: Track performance trends for critical cloud applications.
