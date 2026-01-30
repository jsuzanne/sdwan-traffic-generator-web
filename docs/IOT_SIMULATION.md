# 🤖 IoT Simulation & Device Management

The **SD-WAN Traffic Generator** includes a sophisticated IoT Simulation engine that allows network engineers to simulate a variety of IoT devices (cameras, sensors, smart plugs) on their network for testing security, segmentation, and failover.

## 🚀 Key Capabilities

### 📡 Layer-2/3 Simulation (Scapy)
Unlike standard traffic generators that use high-level HTTP libraries, our IoT engine uses **Scapy** to forge raw packets at the network layer.
- **DHCP Support**: Simulated devices can request and renew IP addresses from your real local DHCP server (Router/Core Switch).
- **ARP Handling**: Devices respond to ARP requests on the wire, making them appear "real" to networking equipment.
- **MAC Spoofing**: Each simulated device has its own unique, configurable MAC address.

### 🏠 Host Mode Advantage
Running in **Host Mode** (standard for Linux installs) allows the IoT engine to bypass the Docker bridge and talk directly to your physical network interface (e.g., `enp2s0`).
- **Zero Latency**: Direct access to the host's network stack.
- **Physical Wire Presence**: Devices are seen as local neighbors by your SD-WAN appliance or Switch.

## 🛠️ Use Cases

1. **SD-WAN Segmentation**: Verify that IoT traffic is correctly identified and placed into the "IoT VRF" or "Guest VLAN".
2. **Failover Testing**: See how IoT devices (which are often sensitive to jitter) behave when a circuit fails or a policy change occur.
3. **Security Validation**: Test your firewall rules against mock IoT traffic without having to purchase and wire up dozens of physical devices.

## 📝 Configuration

IoT devices are managed via the **IoT Tab** in the Dashboard. The configuration is stored in `config/iot-devices.json`.

### Network Settings
The system requires a global network configuration for the simulation:
- **Interface**: The physical NIC to use (e.g., `enp2s0`).
- **Gateway**: The default gateway for the devices (used for outbound traffic simulation).

### Device Profiles
Each device is defined by:
- **Name**: Human-readable label (e.g., "Warehouse Camera 01").
- **MAC Address**: Unique hardware identifier.
- **IP Mode**: `DHCP` (Automatic) or `Static`.
- **Type**: Camera, Sensor, Smart Plug, or Generic.

## 📥 Import / Export
You can easily migrate your IoT lab setup between different generator instances using the **Import/Export** buttons. The system ensures data integrity and automatically creates backups of your configuration.

---
*For more technical details on networking, see [SMART_NETWORKING.md](SMART_NETWORKING.md).*
