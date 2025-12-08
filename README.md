# SD-WAN Traffic Generator

A realistic enterprise application traffic generator designed for SD-WAN testing and demonstrations. It simulates various application traffic patterns (HTTP/HTTPS) to generate load and test application-aware network policies.

**Now featuring a modern Web Dashboard!**

![Dashboard Preview](https://raw.githubusercontent.com/jsuzanne/sdwan-traffic-generator-web/main/dashboard_final_final_check_1765222448411.png)

## Features

-   **Web Dashboard**: Real-time traffic visualization, live logs, and status monitoring.
-   **Configuration UI**: Easily adjust application weights and network interfaces from your browser.
-   **Docker Ready**: Single-command deployment using Docker Compose.
-   **Realistic Patterns**: Randomly selected user agents and weighted application distribution (Google, Office365, Salesforce, etc.).
-   **Logging**: Detailed activity logging (`traffic.log`) and statistics (`stats.json`).

## 🚀 Quick Start (Recommended)

The easiest way to run the generator is using Docker. This installs both the traffic engine and the web interface.

### Prerequisites
-   Docker & Docker Compose

### Installation
1.  Clone this repository:
    ```bash
    git clone https://github.com/jsuzanne/sdwan-traffic-generator-web.git
    cd sdwan-traffic-generator-web
    ```
2.  Start the service:
    ```bash
    docker-compose up -d
    ```
3.  Open the Dashboard:
    **http://localhost:8080**

### Management
-   **Start/Stop**: `docker-compose up -d` / `docker-compose down`
-   **View Logs**: `docker-compose logs -f`
-   **Update Config**: Use the **Configuration** tab in the web interface.

---

## ⚙️ Manual / Headless Installation (Legacy)

If you only need the command-line traffic generator engine (without the Web UI) or cannot use Docker, you can install the script directly on a Linux machine (Ubuntu/Debian/CentOS).

### Prerequisites
-   `curl`, `jq`, `net-tools`

### Installation
```bash
chmod +x install.sh
sudo ./install.sh
```
This will set up the `sdwan-traffic-gen` systemd service.

### Configuration (Manual)
Edit the files in `/opt/sdwan-traffic-gen/config/`:
-   `applications.txt`: List of target URLs and weights.
-   `interfaces.txt`: Network interfaces to bind to.
-   `user_agents.txt`: User agent strings.

### Usage
```bash
sudo systemctl start sdwan-traffic-gen
sudo systemctl status sdwan-traffic-gen
tail -f /var/log/sdwan-traffic-gen/traffic.log
```

## Structure
-   `web-dashboard/`: Source code for the React/Node.js web interface.
-   `traffic-generator.sh`: Core Bash script for generating traffic.
-   `config/`: Configuration files.
-   `logs/`: Log output directory.

## License
MIT
