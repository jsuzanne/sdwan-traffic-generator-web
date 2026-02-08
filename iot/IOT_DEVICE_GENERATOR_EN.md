# IoT Device Profile Generator

🏭 **IoT device profile generator for Palo Alto Networks security testing**

This Python script generates JSON files containing realistic IoT device profiles, optimized for testing **Palo Alto IoT Security** (Prisma Access) and the **SD-WAN Traffic Generator**.

## 📋 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Options](#options)
- [Examples](#examples)
- [Device Categories](#device-categories)
- [Output Format](#output-format)
- [Use Cases](#use-cases)
- [Simulated Protocols](#simulated-protocols)

---

## ✨ Features

- **121 real IoT device models** (Hikvision, Philips Hue, Xiaomi, Amazon Echo, etc.)
- **13 device categories** (cameras, sensors, smart lighting, etc.)
- **4 predefined presets** (small, medium, large, enterprise)
- **Custom configuration** per category
- **Realistic IoT protocols** (MQTT, RTSP, mDNS, Modbus, SNMP, etc.)
- **Unique MAC and IP addresses** for each device
- Compatible with **SD-WAN Traffic Generator**
- Optimized for **Palo Alto IoT Security**

---

## 🚀 Installation

### Prerequisites

- Python 3.7 or higher
- No external dependencies (standard library only)

### Download

```bash
# Clone the repository
git clone https://github.com/jsuzanne/sdwan-traffic-generator-web.git
cd sdwan-traffic-generator-web

# Or download the script directly
wget https://raw.githubusercontent.com/jsuzanne/sdwan-traffic-generator-web/main/generate_iot_devices.py
chmod +x generate_iot_devices.py
```

---

## 📖 Usage

### Basic Syntax

```bash
python generate_iot_devices.py [OPTIONS]
```

### Display Help

```bash
python generate_iot_devices.py --help
```

### List Available Categories

```bash
python generate_iot_devices.py --list-categories
```

---

## ⚙️ Options

| Option | Alias | Description | Default Value |
|--------|-------|-------------|---------------|
| `--preset` | - | Predefined configuration (`small`, `medium`, `large`, `enterprise`) | - |
| `--custom` | - | Custom configuration `"Category:N,Category:N"` | - |
| `--output` | `-o` | Output file name | `iot-devices-{preset}.json` |
| `--base-ip` | - | First 3 octets of IP address (e.g., `192.168.207`) | `192.168.207` |
| `--start-ip` | - | Starting last octet (1-254) | `50` |
| `--list-categories` | - | Display available categories | - |
| `--help` | `-h` | Display full help | - |

### Important Rules

- ⚠️ `--preset` and `--custom` are **mutually exclusive**
- ⚠️ At least one of them must be specified
- ⚠️ Category names are **case-sensitive**
- ⚠️ Use **quotes** for `--custom` if spaces in names

---

## 💡 Examples

### Example 1: Simple Configuration

Generate a test lab with 30 devices:

```bash
python generate_iot_devices.py --preset small
```

**Output:** `iot-devices-small.json` (29 devices)

---

### Example 2: SMB Lab

Generate a small business environment with 65 devices and custom name:

```bash
python generate_iot_devices.py --preset medium --output lab-smb.json
```

**Output:** `lab-smb.json` (64 devices)

---

### Example 3: Custom Configuration

Create a surveillance-focused lab (cameras + sensors):

```bash
python generate_iot_devices.py --custom "Security Cameras:20,Sensors:30,Smart Lighting:10"
```

**Output:** `iot-devices-custom.json` (60 devices)

---

### Example 4: Change IP Network

Generate a lab with a specific network (10.20.30.x):

```bash
python generate_iot_devices.py --preset large --base-ip 10.20.30 --start-ip 100
```

**Generated IPs:** 10.20.30.100, 10.20.30.101, ... 10.20.30.209

---

### Example 5: Advanced Configuration

Create a comprehensive security lab:

```bash
python generate_iot_devices.py \
  --custom "Security Cameras:25,Sensors:35,Smart Locks & Doorbells:10,Hubs & Bridges:5" \
  --base-ip 192.168.100 \
  --start-ip 50 \
  --output advanced-security-lab.json
```

**Output:** `advanced-security-lab.json` (75 devices on 192.168.100.50-124)

---

### Example 6: Full Enterprise Lab

Generate a campus/industrial environment with 170 devices:

```bash
python generate_iot_devices.py --preset enterprise --base-ip 10.10.10 --output campus-iot.json
```

**Output:** `campus-iot.json` (169 devices including industrial PLCs)

---

## 📦 Device Categories

The script supports **13 categories** with **121 device models**:

| # | Category | Vendors | Models | Examples |
|---|----------|---------|--------|----------|
| 1 | **Smart Lighting** | Philips, LIFX, TP-Link, Yeelight | 17 | Hue White A19, LIFX Mini Color |
| 2 | **Smart Plugs & Switches** | TP-Link, Meross, Sonoff, Shelly | 13 | Kasa HS100, Sonoff Mini R2 |
| 3 | **Security Cameras** | Hikvision, Axis, Dahua, Arlo, Ring | 10 | DS-2CD2042FWD, Arlo Pro 3 |
| 4 | **Smart Speakers & Displays** | Amazon, Google, Sonos | 11 | Echo Dot 5th Gen, Nest Hub |
| 5 | **Sensors** | Xiaomi, Aqara, Samsung | 9 | LYWSD03MMC Temp, Motion P1 |
| 6 | **Thermostats & HVAC** | Google, Ecobee, Honeywell | 6 | Nest Learning, Ecobee SmartThermostat |
| 7 | **Smart TVs & Streaming** | Samsung, LG, Roku, Apple | 10 | OLED C2, Apple TV 4K |
| 8 | **Smart Locks & Doorbells** | Ring, August, Yale | 5 | Video Doorbell Pro 2, August Smart Lock |
| 9 | **Smart Appliances** | Samsung, LG, iRobot | 7 | Family Hub Fridge, Roomba j7+ |
| 10 | **Printers & Office** | HP, Epson, Canon | 7 | OfficeJet Pro 9015e, EcoTank ET-4760 |
| 11 | **Hubs & Bridges** | Philips, Samsung, Hubitat | 4 | Hue Bridge v2, SmartThings Hub |
| 12 | **Medical Devices** | Fitbit, Withings | 4 | Charge 5 Dock, Body+ Scale |
| 13 | **Industrial IoT** | Siemens, Schneider, Rockwell | 6 | SIMATIC S7-1200 PLC, Modicon M221 |

---

## 📊 Predefined Presets

### 🧪 Small (~30 devices)
Best for: **Test lab, development**

```
Smart Lighting          : 5
Smart Plugs & Switches  : 5
Security Cameras        : 3
Smart Speakers          : 3
Sensors                 : 5
Thermostats             : 2
Smart TVs               : 2
Printers                : 2
Hubs & Bridges          : 2
```

---

### 🏢 Medium (~65 devices)
Best for: **SMB, customer demo**

```
Smart Lighting          : 10
Smart Plugs & Switches  : 10
Security Cameras        : 6
Smart Speakers          : 5
Sensors                 : 10
Thermostats             : 4
Smart TVs               : 4
Smart Locks             : 3
Smart Appliances        : 4
Printers                : 5
Hubs & Bridges          : 3
```

---

### 🏭 Large (~110 devices)
Best for: **Enterprise, campus**

```
Smart Lighting          : 15
Smart Plugs & Switches  : 15
Security Cameras        : 10
Smart Speakers          : 8
Sensors                 : 20
Thermostats             : 6
Smart TVs               : 6
Smart Locks             : 5
Smart Appliances        : 8
Printers                : 8
Hubs & Bridges          : 5
Medical Devices         : 4
```

---

### 🏗️ Enterprise (~170 devices)
Best for: **Campus, industrial environment**

```
Smart Lighting          : 20
Smart Plugs & Switches  : 20
Security Cameras        : 15
Smart Speakers          : 10
Sensors                 : 30
Thermostats             : 10
Smart TVs               : 8
Smart Locks             : 8
Smart Appliances        : 10
Printers                : 15
Hubs & Bridges          : 8
Medical Devices         : 5
Industrial IoT          : 10  ← PLCs, SCADA
```

---

## 📄 Output Format

### JSON Structure

```json
{
  "devices": [
    {
      "id": "hikvision_security_camera_01",
      "name": "Hikvision DS-2CD2042FWD",
      "vendor": "Hikvision",
      "type": "Security Camera",
      "mac": "00:12:34:00:00:00",
      "ip_start": "192.168.207.50",
      "protocols": ["dhcp", "arp", "lldp", "snmp", "http", "rtsp", "cloud", "dns", "ntp"],
      "enabled": true,
      "traffic_interval": 120,
      "description": "Hikvision DS-2CD2042FWD - Security Cameras"
    },
    {
      "id": "xiaomi_sensor_01",
      "name": "Xiaomi LYWSD03MMC Temp",
      "vendor": "Xiaomi",
      "type": "Sensor",
      "mac": "4c:65:a8:01:00:01",
      "ip_start": "192.168.207.51",
      "protocols": ["dhcp", "arp", "lldp", "snmp", "mqtt", "cloud", "dns"],
      "enabled": true,
      "traffic_interval": 180,
      "mqtt_topic": "iot/sensors/xiaomi_sensor_01",
      "description": "Xiaomi LYWSD03MMC Temp - Sensors"
    }
  ]
}
```

### Fields per Device

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (format: `vendor_category_XX`) |
| `name` | string | Full model name |
| `vendor` | string | Manufacturer |
| `type` | string | Device type (category without 's') |
| `mac` | string | Unique MAC address |
| `ip_start` | string | Suggested IP address |
| `protocols` | array | List of simulated protocols |
| `enabled` | boolean | Active by default (always `true`) |
| `traffic_interval` | integer | Traffic interval in seconds (60-300) |
| `description` | string | Full description |
| `mqtt_topic` | string | MQTT topic (optional, if MQTT protocol) |

---

## 🎯 Use Cases

### 1. IoT Segmentation Testing
```bash
python generate_iot_devices.py --preset medium
```
→ Import into SD-WAN Traffic Generator  
→ Verify IoT devices are placed in correct VLAN/VRF

---

### 2. Security Policy Validation
```bash
python generate_iot_devices.py --custom "Security Cameras:15,Sensors:20"
```
→ Test firewall rules  
→ Verify blocking of inter-IoT communications

---

### 3. Device Detection by IoT Security
```bash
python generate_iot_devices.py --preset enterprise
```
→ Verify Prisma Access/IoT Security correctly identifies each device  
→ Validate automatic classification by vendor/type

---

### 4. SD-WAN Failover Testing
```bash
python generate_iot_devices.py --preset large --base-ip 10.10.10
```
→ Simulate 110 latency-sensitive IoT devices  
→ Test behavior during circuit failover

---

### 5. Training/Demo Lab
```bash
python generate_iot_devices.py --preset small --output training-demo.json
```
→ Reproducible environment for training  
→ 30 devices representative of all types

---

## 🔌 Simulated Protocols

Each device generates realistic traffic based on its type:

### Layer 2/3
- **DHCP**: IP address request and renewal
- **ARP**: MAC/IP resolution
- **LLDP**: Discovery protocol (switches/routers)

### Management
- **SNMP**: Monitoring and management (v2c/v3)
- **HTTP/HTTPS**: Web configuration interface

### IoT Specific
- **MQTT**: Telemetry for sensors and switches (Xiaomi, Sonoff)
- **mDNS**: Service discovery (Apple, Sonos, printers)
- **RTSP**: Video streaming (IP cameras)
- **Modbus**: Industrial protocol (PLCs, SCADA)
- **EtherNet/IP**: Industrial automation (Rockwell)

### Cloud
- **Cloud heartbeats**: Periodic connections to vendors (Philips, Amazon, Google)

### Time Sync
- **NTP**: Time synchronization

---

## 🔗 Integration with SD-WAN Traffic Generator

### Step 1: Generate the File
```bash
python generate_iot_devices.py --preset medium
```

### Step 2: Import into Web Interface
1. Open SD-WAN Traffic Generator dashboard (`http://localhost:8080`)
2. **IoT Devices** tab
3. Click **Import JSON**
4. Select `iot-devices-medium.json`
5. Validate import

### Step 3: Start Simulation
- Devices will perform real DHCP requests
- Respond to ARP requests with spoofed MAC
- Generate cloud/MQTT traffic according to configured protocols

### Step 4: Monitor in Palo Alto
- Verify detection in **IoT Security**
- Analyze logs in **Monitor > Traffic**
- Validate automatic classification

---

## 🛠️ Development and Customization

### Add a New Category

Edit the `IOT_DATABASE` dictionary in the script:

```python
"My Category": [
    {
        "vendor": "My Vendor",
        "models": ["Model A", "Model B"],
        "mac_prefix": "aa:bb:cc",
        "protocols": ["dhcp", "arp", "http", "dns"]
    }
]
```

### Add a New Vendor

```python
"Smart Lighting": [
    # ... existing entries ...
    {
        "vendor": "New Vendor",
        "models": ["Smart Bulb X1", "LED Strip Y2"],
        "mac_prefix": "dd:ee:ff",
        "protocols": ["dhcp", "arp", "http", "cloud", "dns"]
    }
]
```

---

## 📝 License

This script is part of the **SD-WAN Traffic Generator** project developed for Palo Alto Networks labs and demonstrations.

---

## 👤 Author

**Jean Suzanne**  
SASE Specialist @ Palo Alto Networks  
Former Cisco (21 years)

---

## 🤝 Contribution

Contributions are welcome! To add device models or new vendors:

1. Fork the repository
2. Create a branch (`git checkout -b feature/new-vendor`)
3. Edit `IOT_DATABASE` in the script
4. Commit and push
5. Open a Pull Request

---

## 📚 Related Documentation

- [SD-WAN Traffic Generator](https://github.com/jsuzanne/sdwan-traffic-generator-web)
- [IoT Simulation Guide](IOT_SIMULATION.md)
- [Palo Alto IoT Security Documentation](https://docs.paloaltonetworks.com/iot)

---

## ⚡ Quick Start (TL;DR)

```bash
# Installation
git clone https://github.com/jsuzanne/sdwan-traffic-generator-web.git
cd sdwan-traffic-generator-web

# Generate 65 IoT devices
python generate_iot_devices.py --preset medium

# Import into SD-WAN Traffic Generator
# → IoT Tab Dashboard → Import JSON → Select iot-devices-medium.json

# Profit! 🎉
```

---

**🔥 Pro Tip:** For customer demos, use `--custom` to target exactly their use cases (e.g., many cameras for a campus, industrial sensors for a factory).
