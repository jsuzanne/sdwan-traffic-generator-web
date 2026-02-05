# 🤖 IoT Simulation & Device Management

The **SD-WAN Traffic Generator** includes a sophisticated IoT Simulation engine that allows network engineers to simulate a variety of IoT devices (cameras, sensors, smart plugs) on their network for testing security, segmentation, and failover.

## 🚀 Key Capabilities

### 📡 Layer-2/3 Simulation (Scapy)
Unlike standard traffic generators that use high-level HTTP libraries, our IoT engine uses **Scapy** to forge raw packets at the network layer.
- **DHCP Support**: Simulated devices can request and renew IP addresses from your real local DHCP server (Router/Core Switch).
- **ARP Handling**: Devices respond to ARP requests on the wire, making them appear "real" to networking equipment.
- **MAC Spoofing**: Each simulated device has its own unique, configurable MAC address.

## Platform Compatibility

### ✅ Full IoT Support (Host Mode - Linux Only)
IoT simulation with DHCP, ARP, and Layer 2 protocols requires **Host Mode networking**, which is only available on **native Linux installations**.

**Supported:**
- Ubuntu (bare metal or VM)
- Debian
- CentOS/RHEL
- Other native Linux distributions

**Requirements:**
- Native Linux (not WSL2)
- Docker installed
- Root/sudo access for network capabilities

### ⚠️ Limited IoT Support (Bridge Mode)
On macOS, Windows, and WSL2, IoT simulation runs in **Bridge Mode** with these limitations:

**Platforms:**
- macOS (Docker Desktop)
- Windows (Docker Desktop + WSL2)
- WSL2 (Windows Subsystem for Linux)

**Limitations:**
- ❌ No DHCP simulation
- ❌ No ARP spoofing
- ❌ No Layer 2 protocol simulation
- ✅ HTTP/HTTPS traffic simulation still works
- ✅ Voice/RTP simulation works (with reduced features)

**Why:** Docker's Host Mode networking is not supported on macOS and Windows. These platforms use a VM-based Docker engine that doesn't expose the host network stack directly.

## 🛠️ Use Cases

1. **SD-WAN Segmentation**: Verify that IoT traffic is correctly identified and placed into the "IoT VRF" or "Guest VLAN".
2. **Failover Testing**: See how IoT devices (which are often sensitive to jitter) behave when a circuit fails or a policy change occur.
3. **Security Validation**: Test your firewall rules against mock IoT traffic without having to purchase and wire up dozens of physical devices.

## 📝 Configuration

IoT devices are managed via the **IoT Tab** in the Dashboard. The configuration is stored in `config/iot-devices.json`.

### Technical JSON Format
Each device in the JSON array follows this structure:

```json
{
  "id": "camera_01",
  "name": "Hikvision DS-2CD2042FWD",
  "vendor": "Hikvision",
  "type": "IP Camera",
  "mac": "00:12:34:56:78:01",
  "ip_start": "192.168.207.100",
  "protocols": ["dhcp", "arp", "lldp", "snmp", "http", "rtsp", "cloud"],
  "enabled": true,
  "traffic_interval": 60,
  "description": "Hikvision outdoor camera simulation"
}
```

### 🤖 Generate Devices with AI (LLM Prompt)

You can use any LLM (ChatGPT, Claude, Gemini, etc.) to generate realistic IoT device configurations for your specific customer or industry. Simply use this prompt:

---

**Copy and paste this prompt into your LLM:**

```
Act as a Palo Alto IoT Security Specialist.

Task: Create a JSON file for a traffic generator using a specific format. The goal is to simulate realistic IoT/OT devices for a customer named [INSERT CUSTOMER NAME HERE].

Requirements:

Count: Generate exactly 16 devices.

Context: Use devices relevant to the customer's industry (e.g., Water, Healthcare, Manufacturing).

Format: Use the exact JSON structure provided below:

{
  "id": "unique_string_id",
  "name": "Full Device Model Name",
  "vendor": "Real Vendor Name",
  "type": "Specific Device Category",
  "mac": "XX:XX:XX:00:00:00 (Use real vendor OUI)",
  "ip_start": "192.168.207.X",
  "protocols": ["dhcp", "arp", "lldp", "snmp", "http", "dns", "cloud", "specific_industrial_proto"],
  "enabled": true,
  "traffic_interval": integer_between_30_and_600,
  "description": "Short description of the device's role in the site"
}

Fidelity: Use real-world MAC OUI prefixes for the vendors. For Industrial (OT) devices, include protocols like modbus, s7comm, bacnet, or profinet to help the Palo Alto IoT engine fingerprint them.

Customer Context: [INSERT DETAILS OR LEAVE BLANK FOR GENERIC]
```

---

**Example Usage:**

> "Act as a Palo Alto IoT Security Specialist. Create a JSON file for a traffic generator... for a customer named **Suez Water Treatment Plant**."

The LLM will generate 16 realistic water industry devices (PLCs, SCADA sensors, flow meters, etc.) with proper MAC OUIs and industrial protocols.

**Then:**
1. Copy the generated JSON
2. Go to the **IoT Tab** in the dashboard
3. Click **Import**
4. Paste the JSON
5. Start simulating!



### Protocol Support Details
- **`dhcp`**: Triggers a Scapy-based DHCP state machine (Discover -> Offer -> Request -> Ack).
- **`arp`**: Listens for ARP Who-Has requests and responds with the spoofed MAC.
- **`cloud`**: Simulates periodic outbound "heartbeat" traffic to a vendor-specific FQDN.
- **`mqtt`**: Simulates periodic telemetry updates to an MQTT broker.

## 📊 Live Log Examples

When a device starts, you can monitor the "Real-on-the-Wire" interaction in the UI logs:

### DHCP Sequence (Success)
```text
🔄 [IOT] Starting DHCP sequence for 'Smart Bulb' (ec:b5:fa:00:01:01)...
📤 [DHCP] Sending DISCOVER on enp2s0
✅ [DHCP] Received OFFER from 192.168.1.1 (Offered IP: 192.168.1.105)
✅ [DHCP] ACK received. Device 'Smart Bulb' is now LIVE on 192.168.1.105
```

### ARP Interaction
```text
🔍 [IOT] ARP Request from Router (192.168.1.1): Who has 192.168.1.105?
📤 [IOT] ARP Reply: 192.168.1.105 is at ec:b5:fa:00:01:01
```

## 📥 Import / Export
You can easily migrate your IoT lab setup between different generator instances using the **Import/Export** buttons. The system ensures data integrity and automatically creates backups of your configuration.

---
*For more technical details on networking, see [SMART_NETWORKING.md](SMART_NETWORKING.md).*
