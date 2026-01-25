# Connectivity Probes: Digital Experience Monitoring (DEM)

The **Connectivity Probes** (formerly Synthetic Endpoints) provide real-time visibility into the health and performance of critical application targets by simulating user traffic patterns.

---

## 📡 Available Probe Types

The platform supports three primary probe types, each measuring different aspects of the digital experience:

### 1. HTTP (Digital Experience)
- **Mechanism**: Performs a standard HTTP/HTTPS `GET` request to the target.
- **Metrics**: 
  - **Latency (ms)**: Time to first byte.
  - **Status**: Success (2xx/3xx) or Failure (4xx/5xx/Timeout).
- **Scoring**: Impacted by DNS resolution time, TCP handshake, and TLS negotiation.

### 2. PING (Network Reachability)
- **Mechanism**: Sends standard ICMP Echo Requests.
- **Metrics**: 
  - **RTT (ms)**: Round-trip time.
  - **Loss (%)**: Percentage of packets timed out.
- **Scoring**: Basic network layer reachability across the SD-WAN fabric.

### 3. DNS (Resolution Speed)
- **Mechanism**: Queries the target domain against the system's configured DNS servers.
- **Metrics**:
  - **Resolution Time (ms)**: How long it takes to map the hostname to an IP.
- **Scoring**: Critical for monitoring umbrella/SIG performance or local DNS cache issues.

---

## ⚙️ How it Works

### 1. Background Execution
Probes are managed by the **Background Monitor** in the Node.js backend (`server.ts`).
- **Interval**: Probes run every **60 seconds** (default) or at the specified interval.
- **Lifecycle**: The monitor iterates through all configured endpoints, executes the specialized probe, and updates the shared global state.

### 2. Flaky Detection
The platform tracks "Flakiness" to distinguish between a temporary blip and a hard outage:
- An endpoint is marked as **FLAKY** if it fails a probe but recently succeeded.
- It is marked as **DOWN** if it fails multiple consecutive probes.

### 3. Automatic Updates
The UI (`Dashboard.tsx`) receives these updates in real-time via the `/api/status` endpoint. The labels and status colors (Green = UP, Yellow = FLAKY, Red = DOWN) are adjusted dynamically.

---

## 🛠️ Configuration

You can add custom probes via the **Configuration** tab:
- **Name**: A descriptive label (e.g., "Webex", "Office 365").
- **Type**: Select from HTTP, PING, or DNS.
- **Target**: The FQDN (google.com) or IP address. For HTTP, the `http://` prefix is added automatically if missing.

> [!TIP]
> Use the **HTTP (Scoring)** type for public SaaS applications to get a realistic measure of application-level latency.
