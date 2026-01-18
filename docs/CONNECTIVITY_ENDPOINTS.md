# Custom Connectivity Endpoints (Beta.14+)

## Overview

Configure custom connectivity test endpoints to verify network reachability before running security tests. Supports HTTP/HTTPS, ICMP Ping, and TCP port tests.

## Configuration

Add environment variables to your `docker-compose.yml`:

### HTTP/HTTPS Endpoints
Test web applications and APIs:
```yaml
environment:
  - CONNECTIVITY_HTTP_1=DC-App:https://app.datacenter.local
  - CONNECTIVITY_HTTP_2=API-Server:https://api.company.com:8443
```

### ICMP Ping Endpoints
Test network-layer connectivity to routers, firewalls, gateways:
```yaml
environment:
  - CONNECTIVITY_PING_1=HQ-Firewall:10.0.0.1
  - CONNECTIVITY_PING_2=Branch-Router:192.168.1.1
  - CONNECTIVITY_PING_3=Backup-Link:192.168.2.1
```

### TCP Port Tests
Test specific service availability:
```yaml
environment:
  - CONNECTIVITY_TCP_1=DC-SSH:10.0.0.100:22
  - CONNECTIVITY_TCP_2=DC-RDP:10.0.0.100:3389
  - CONNECTIVITY_TCP_3=DB-Server:10.0.0.200:5432
```

## Format

```
CONNECTIVITY_<TYPE>_<NUMBER>=<Name>:<Target>
```

- **TYPE**: `HTTP`, `PING`, or `TCP`
- **NUMBER**: Sequential number (1, 2, 3, ...)
- **Name**: Display name for the endpoint
- **Target**: 
  - HTTP: Full URL (e.g., `https://app.local`)
  - PING: IP address (e.g., `10.0.0.1`)
  - TCP: IP:Port (e.g., `10.0.0.1:22`)

## UI Display

The connectivity status badge shows:
- ✅ **Green checkmark**: Endpoint reachable
- ❌ **Red X**: Endpoint unreachable
- **Type badge**: HTTP, PING, or TCP
- **Latency**: Response time in milliseconds
- **Error**: Failure reason if unreachable

## Example

```yaml
services:
  sdwan-web-ui:
    image: jsuzanne/sdwan-web-ui:1.1.0-beta.14
    environment:
      # Test DC application
      - CONNECTIVITY_HTTP_1=DC-App:https://app.dc.local
      
      # Test HQ firewall
      - CONNECTIVITY_PING_1=HQ-FW:10.0.0.1
      
      # Test SSH access
      - CONNECTIVITY_TCP_1=SSH:10.0.0.100:22
```

## Default Endpoints

These are always tested (cannot be disabled):
- Cloudflare DNS (1.1.1.1)
- Google DNS (8.8.8.8)
- Google.com

## Use Cases

- **SD-WAN Testing**: Verify branch-to-HQ connectivity
- **POC Demos**: Ensure demo environment is ready
- **Multi-site**: Test reachability to remote sites
- **Pre-flight Checks**: Validate network before security tests
