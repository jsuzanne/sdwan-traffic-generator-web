# SD-WAN Traffic Generator Web

[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://hub.docker.com/r/jsuzanne/sdwan-traffic-gen)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.1.0--patch.7-blue.svg)](https://github.com/jsuzanne/sdwan-traffic-generator-web/releases)

A modern web-based SD-WAN traffic generator with real-time monitoring, customizable traffic patterns, and comprehensive connectivity testing. Perfect for testing SD-WAN deployments, network QoS policies, and application performance.

![SD-WAN Traffic Generator Dashboard](SDWAN%20Emulator.JPG)

## ✨ Features

### 🚀 Core Capabilities
- **67 Pre-configured Applications** - Popular SaaS apps (Google, Microsoft 365, Salesforce, Zoom, etc.)
- **Realistic Traffic Generation** - Authentic HTTP requests with proper headers, User-Agents, and Referers
- **Zero-Config Deployment** - Auto-detection of network interfaces and automatic configuration
- **Web Dashboard** - Modern React UI with real-time logs and statistics
- **Multi-Protocol Testing** - HTTP/HTTPS, PING (ICMP), and TCP port connectivity tests

### 📊 Monitoring & Analytics
- Real-time traffic logs with live updates
- Success/failure statistics with latency metrics
- Bandwidth usage tracking
- Custom connectivity test monitoring
- Historical data export (JSON/JSONL)

### 🔧 Customization
- Configurable request frequency (requests per second)
- Custom application lists
- Network interface selection
- JWT-based authentication
- Log retention and rotation policies

### 🐳 Deployment Options
- Pre-built Docker images on Docker Hub
- Docker Compose for easy orchestration
- Automatic healthchecks and dependency management
- Production-ready with resource limits

---

## 🚀 Quick Start

### Option 1: One-Liner Install (Fastest) ⭐

```bash
curl -sSL https://raw.githubusercontent.com/jsuzanne/sdwan-traffic-generator-web/main/install.sh | bash
```

This will:
- ✅ Download docker-compose.yml
- ✅ Start services with pre-built images
- ✅ Auto-generate configuration (67 apps + interface detection)
- ✅ Ready in 30 seconds

**Access:** http://localhost:8080  
**Credentials:** `admin` / `admin` (change after first login)

---

### Option 2: Manual Install (Docker Hub Images)

```bash
# Download docker-compose.yml
curl -sSL -o docker-compose.yml https://raw.githubusercontent.com/jsuzanne/sdwan-traffic-generator-web/main/docker-compose.example.yml

# Start services
docker compose up -d

# Access dashboard
open http://localhost:8080
```

**Default credentials:** `admin` / `admin`

---

### Option 3: Build from Source (For Developers)

```bash
# Clone the repository
git clone https://github.com/jsuzanne/sdwan-traffic-generator-web.git
cd sdwan-traffic-generator-web

# Build and start
docker compose up -d --build

# Access dashboard
open http://localhost:8080
```

---

## 📊 Verify Installation

```bash
# Check containers status
docker compose ps

# Check logs (should be clean, no [ERROR] messages)
docker compose logs -f

# Check health endpoint
curl http://localhost:8080/api/health
# Expected: {"status":"healthy","version":"1.1.0-patch.7"}

# Check auto-generated config
ls -la config/
cat config/interfaces.txt  # Your auto-detected interface
cat config/applications.txt | head -5  # 67 applications
```

**Expected:** No `[ERROR]` messages in logs ✅

---

## 🎯 What Happens on First Start?

The system auto-generates everything you need:

1. **`config/applications.txt`** - 67 popular SaaS applications (Google, Microsoft 365, Salesforce, etc.)
2. **`config/interfaces.txt`** - Auto-detected network interface (eth0, en0, ens4, etc.)
3. **`config/users.json`** - Default admin user with bcrypt-hashed password

**No manual configuration needed!** 🎉

Simply start the containers and access the dashboard at http://localhost:8080

---

## 📚 Documentation

- **[Installation Guide](INSTALLATION.md)** - Complete setup instructions with troubleshooting
- **[Configuration Guide](docs/CONFIGURATION.md)** - Advanced configuration options
- **[API Documentation](docs/API.md)** - REST API reference
- **[Development Guide](docs/DEVELOPMENT.md)** - Contributing and local development

---

## 🔧 Configuration

### Change Port

```yaml
# docker-compose.yml
ports:
  - "8081:8080"  # Use port 8081 instead of 8080
```

Or use environment variables:
```bash
echo "WEB_UI_PORT=8081" > .env
```

### Add Custom Connectivity Tests

```yaml
# docker-compose.yml - web-ui environment section
environment:
  # HTTP/HTTPS endpoints
  - CONNECTIVITY_HTTP_1=Production-App:https://myapp.company.com
  - CONNECTIVITY_HTTP_2=Staging-App:https://staging.company.com

  # PING tests (ICMP)
  - CONNECTIVITY_PING_1=HQ-Gateway:10.0.0.1
  - CONNECTIVITY_PING_2=Branch-Gateway:192.168.100.1

  # TCP port checks
  - CONNECTIVITY_TCP_1=SSH-Bastion:10.0.0.100:22
  - CONNECTIVITY_TCP_2=Database:10.0.0.50:3306
```

### Adjust Traffic Frequency

```yaml
# docker-compose.yml - traffic-gen environment section
environment:
  - SLEEP_BETWEEN_REQUESTS=2  # 1 request every 2 seconds (0.5 req/sec)
```

### Change Log Retention

```yaml
# docker-compose.yml - web-ui environment section
environment:
  - LOG_RETENTION_DAYS=30  # Keep logs for 30 days
  - LOG_MAX_SIZE_MB=500    # Max 500 MB per log file
```

---

## 🛠️ Useful Commands

```bash
# View logs in real-time
docker compose logs -f

# View logs for a specific service
docker compose logs -f web-ui
docker compose logs -f traffic-gen

# Restart services
docker compose restart

# Stop services
docker compose stop

# Stop and remove containers
docker compose down

# Rebuild after code changes
docker compose up -d --build

# Check resource usage
docker stats sdwan-web-ui sdwan-traffic-gen

# Access container shell
docker compose exec web-ui sh
docker compose exec traffic-gen sh

# Export logs
docker compose logs --no-color > logs-export.txt
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Browser                            │
│                  http://localhost:8080                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────┐
        │       Web Dashboard (React)            │
        │   - Authentication (JWT)               │
        │   - Real-time logs                     │
        │   - Statistics & monitoring            │
        │   - Configuration UI                   │
        │   Port: 8080                           │
        └────────────┬───────────────────────────┘
                     │
                     │ API Calls
                     ▼
        ┌────────────────────────────────────────┐
        │    Backend API (Node.js/Express)       │
        │   - Config management                  │
        │   - Log aggregation                    │
        │   - Connectivity testing               │
        │   - Stats calculation                  │
        └────────────┬───────────────────────────┘
                     │
                     │ Shared Volumes
                     ▼
        ┌────────────────────────────────────────┐
        │   Traffic Generator (Python)           │
        │   - HTTP/HTTPS requests                │
        │   - Multi-threading                    │
        │   - Realistic headers                  │
        │   - Network interface binding          │
        └────────────┬───────────────────────────┘
                     │
                     │ Network Traffic
                     ▼
        ┌────────────────────────────────────────┐
        │         Internet / SD-WAN              │
        │   (Google, Microsoft 365, etc.)        │
        └────────────────────────────────────────┘

Shared Volumes:
  • config/  - Configuration files (applications.txt, interfaces.txt)
  • logs/    - Traffic logs, test results, statistics
```

---

## 🐛 Troubleshooting

### Port 8080 already in use

```yaml
# Change port in docker-compose.yml
ports:
  - "8081:8080"
```

### Cannot connect to dashboard

```bash
# Check containers are running
docker compose ps

# Check logs for errors
docker compose logs web-ui
docker compose logs traffic-gen

# Check firewall (Linux)
sudo ufw allow 8080/tcp
```

### Traffic not generating

```bash
# Check network interface configuration
docker compose exec traffic-gen cat /opt/sdwan-traffic-gen/config/interfaces.txt

# Should show your interface (eth0, en0, ens4, etc.)
# If incorrect, edit config/interfaces.txt and restart
```

### [ERROR] Configuration file not found

This error should **NOT** appear in v1.1.0-patch.7 or later. If you see it:

```bash
# Update to latest version
git pull origin main
docker compose down
docker compose up -d
```

### Logs filling up disk space

```yaml
# Reduce retention in docker-compose.yml
environment:
  - LOG_RETENTION_DAYS=3
  - LOG_MAX_SIZE_MB=50
```

---

## 🔒 Security

### Production Deployment Checklist

- [ ] Change default admin password (Dashboard → Settings)
- [ ] Set strong JWT_SECRET in docker-compose.yml
- [ ] Use HTTPS with a reverse proxy (nginx, Traefik, Caddy)
- [ ] Restrict access with firewall rules
- [ ] Enable Docker resource limits
- [ ] Review and customize application list
- [ ] Set appropriate log retention policies

### JWT Secret

```yaml
# docker-compose.yml - web-ui environment
environment:
  - JWT_SECRET=your-super-secure-random-string-here
```

Generate a secure secret:
```bash
openssl rand -base64 32
```

---

## 📦 Docker Images

Pre-built images are available on Docker Hub:

- **Web UI:** [`jsuzanne/sdwan-web-ui:latest`](https://hub.docker.com/r/jsuzanne/sdwan-web-ui)
- **Traffic Generator:** [`jsuzanne/sdwan-traffic-gen:latest`](https://hub.docker.com/r/jsuzanne/sdwan-traffic-gen)

Images are automatically built and pushed on every release.

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone repository
git clone https://github.com/jsuzanne/sdwan-traffic-generator-web.git
cd sdwan-traffic-generator-web

# Install web dashboard dependencies
cd web-dashboard
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

- **Documentation:** [INSTALLATION.md](INSTALLATION.md)
- **Issues:** [GitHub Issues](https://github.com/jsuzanne/sdwan-traffic-generator-web/issues)
- **Discussions:** [GitHub Discussions](https://github.com/jsuzanne/sdwan-traffic-generator-web/discussions)

---

## 🙏 Acknowledgments

- Built with [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), and [Vite](https://vitejs.dev/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
- Traffic generation powered by Python [requests](https://requests.readthedocs.io/)

---

## 🎯 Use Cases

- **SD-WAN Testing** - Validate traffic routing, QoS policies, and failover scenarios
- **Network Performance** - Measure latency, bandwidth, and reliability
- **Security Testing** - Test firewall rules, DPI, and security policies
- **Load Testing** - Generate sustained traffic for capacity planning
- **Demo & Training** - Educational tool for network engineers
- **Compliance** - Verify network policies and application access

---

## 📈 Roadmap

- [ ] Multi-region deployment support
- [ ] Advanced traffic patterns (burst, gradual ramp-up)
- [ ] Custom protocol support (DNS, FTP, etc.)
- [ ] Grafana/Prometheus integration
- [ ] API for programmatic control
- [ ] Traffic replay from PCAP files
- [ ] Cloud provider integrations (AWS, Azure, GCP)

---

**Happy traffic generating! 🚀**

For detailed installation instructions, see [INSTALLATION.md](INSTALLATION.md)
