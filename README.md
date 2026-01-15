# SD-WAN Traffic Generator

![SD-WAN Traffic Generator](docs/hero-banner.png)

A realistic enterprise application traffic generator designed for SD-WAN testing and demonstrations. It simulates various application traffic patterns (HTTP/HTTPS) to generate load and test application-aware network policies.

**Now featuring a modern Web Dashboard with real-time monitoring!**

## ✨ Features

-   **🎯 Real-time Dashboard**: Live traffic visualization, metrics, and status monitoring
-   **⚙️ Configuration UI**: Easily adjust application weights and network interfaces from your browser
-   **🐳 Docker Ready**: Single-command deployment using Docker Compose
-   **🌐 Realistic Patterns**: Randomly selected user agents and weighted application distribution (Microsoft 365, Google Workspace, Salesforce, and 50+ enterprise apps)
-   **📊 Live Logging**: Real-time log streaming and detailed statistics
-   **🔒 Secure**: Built-in authentication with JWT tokens

---

## 📸 Screenshots

### Login Interface
<img src="docs/screenshots/login.png" alt="Login Page" width="600">

### Dashboard - Real-time Monitoring
<img src="docs/screenshots/dashboard.png" alt="Dashboard" width="800">

*Monitor traffic generation status, total requests, success rate, and active applications in real-time*

### Live Logs & Statistics
<img src="docs/screenshots/logs-stats.png" alt="Logs and Statistics" width="800">

*View traffic volume charts and live log streaming*

### Configuration Management
<img src="docs/screenshots/configuration.png" alt="Configuration" width="800">

*Manage network interfaces and adjust traffic distribution weights for different application suites*

---

## 🚀 Quick Start

### Option 1: Using Docker Hub (Recommended)

Pull and run pre-built images directly from Docker Hub:

```bash
# Create a docker-compose.yml file
curl -O https://raw.githubusercontent.com/jsuzanne/sdwan-traffic-generator-web/main/docker-compose.yml

# Start the services
docker-compose up -d

# Access the dashboard
open http://localhost:8080
```

**Default credentials:** `admin` / `admin` (change after first login)

### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/jsuzanne/sdwan-traffic-generator-web.git
cd sdwan-traffic-generator-web

# Build and start
docker-compose up -d --build

# Access the dashboard
open http://localhost:8080
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file to customize your deployment:

```bash
# Web UI Port (default: 8080)
WEB_UI_PORT=8080

# JWT Secret (change in production!)
JWT_SECRET=your-secret-key-here

# Traffic Generation Settings
SLEEP_BETWEEN_REQUESTS=1

# Paths (usually don't need to change)
CONFIG_DIR=/app/config
LOG_DIR=/var/log/sdwan-traffic-gen
```

### Port Conflicts

If port 8080 is already in use:

```bash
# Option 1: Use .env file
echo "WEB_UI_PORT=8081" > .env
docker-compose up -d

# Option 2: Modify docker-compose.yml
# Change ports section to: "8081:8080"
```

---

## 📖 Usage

### Managing Traffic Generation

1. **Login** to the web dashboard at `http://localhost:8080`
2. **Dashboard Tab**: View real-time statistics and control traffic generation
3. **Configuration Tab**: 
   - Add network interfaces (e.g., `eth0`, `wlan0`)
   - Adjust traffic distribution weights for different application categories
   - Changes are applied immediately
4. **Start/Stop**: Use the toggle button on the dashboard

### Docker Management

```bash
# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f web-ui
docker-compose logs -f traffic-gen

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Update to latest version
docker-compose pull
docker-compose up -d
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         Web Dashboard (React)           │
│    Port 8080 - User Interface           │
└──────────────┬──────────────────────────┘
               │ REST API
┌──────────────▼──────────────────────────┐
│      Backend Server (Node.js)           │
│   - Authentication (JWT)                │
│   - Configuration Management            │
│   - Log Streaming                       │
└──────────────┬──────────────────────────┘
               │ Shared Volumes
┌──────────────▼──────────────────────────┐
│    Traffic Generator (Bash)             │
│   - HTTP/HTTPS Request Generation       │
│   - Multi-interface Support             │
│   - Weighted Application Distribution   │
└─────────────────────────────────────────┘
```

---

## 🛠️ Advanced Usage

### Manual / Headless Installation (No Docker)

For systems where Docker is not available:

```bash
# Install on Linux (Ubuntu/Debian/CentOS)
chmod +x install.sh
sudo ./install.sh

# Manage via systemd
sudo systemctl start sdwan-traffic-gen
sudo systemctl status sdwan-traffic-gen
sudo systemctl enable sdwan-traffic-gen

# View logs
tail -f /var/log/sdwan-traffic-gen/traffic.log
```

### Building Multi-Platform Images

```bash
# Build and push to Docker Hub (requires authentication)
./build-and-push.sh

# This builds for both AMD64 and ARM64 architectures
```

---

## 📁 Project Structure

```
sdwan-traffic-generator/
├── web-dashboard/          # React + TypeScript frontend
│   ├── src/               # React components
│   ├── server.ts          # Express backend API
│   └── Dockerfile         # Web UI container
├── traffic-generator.sh   # Core traffic generation script
├── config/                # Configuration files
│   ├── applications.txt   # Application URLs and weights
│   ├── interfaces.txt     # Network interfaces
│   └── user_agents.txt    # User agent strings
├── docs/                  # Documentation and screenshots
├── docker-compose.yml     # Docker orchestration
└── Dockerfile.traffic-gen # Traffic generator container
```

---

## 🔒 Security Notes

- **Change default credentials** after first login
- **Set custom JWT_SECRET** in production environments
- **Use HTTPS** if exposing to the internet (reverse proxy recommended)
- **Firewall rules**: Only expose port 8080 to trusted networks

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find what's using port 8080
lsof -i :8080

# Change to different port
echo "WEB_UI_PORT=8081" > .env
docker-compose up -d
```

### Container Won't Start
```bash
# Check logs
docker-compose logs web-ui
docker-compose logs traffic-gen

# Rebuild containers
docker-compose down
docker-compose up -d --build
```

### No Traffic Being Generated
1. Check that network interfaces are configured in the Configuration tab
2. Verify traffic generation is started (green "Active" status)
3. Check logs: `docker-compose logs -f traffic-gen`

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/jsuzanne/sdwan-traffic-generator-web/issues)
- **Documentation**: [GitHub Wiki](https://github.com/jsuzanne/sdwan-traffic-generator-web/wiki)

---

**Made with ❤️ for SD-WAN testing and demonstrations**
