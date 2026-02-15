#!/usr/bin/env python3
# generate_iot_devices.py
#
# IoT Device JSON generator for SD-WAN Traffic Generator & Palo Alto IoT Security

import json
import random
import argparse

# Extended IoT device database by category
IOT_DATABASE = {
    "Smart Lighting": [
        {
            "vendor": "Philips",
            "models": ["Hue White A19", "Hue Color E27", "Hue GU10 Spot", "Hue Lightstrip Plus", "Hue Go"],
            "mac_prefix": "ec:b5:fa",
            "protocols": ["dhcp", "arp", "lldp", "snmp", "http", "cloud", "dns"],
        },
        {
            "vendor": "LIFX",
            "models": ["A19", "Mini Color", "Z Strip", "Beam", "Tile"],
            "mac_prefix": "d0:73:d5",
            "protocols": ["dhcp", "arp", "lldp", "http", "cloud", "dns", "ntp"],
        },
        {
            "vendor": "TP-Link",
            "models": ["Kasa Smart Bulb KL130", "Kasa LB130", "Tapo L530E"],
            "mac_prefix": "50:c7:bf",
            "protocols": ["dhcp", "arp", "lldp", "http", "cloud", "dns", "ntp"],
        },
        {
            "vendor": "Yeelight",
            "models": ["Smart LED Bulb", "Lightstrip Plus", "Ceiling Light"],
            "mac_prefix": "34:ce:00",
            "protocols": ["dhcp", "arp", "lldp", "http", "cloud", "dns"],
        },
    ],

    "Smart Plugs & Switches": [
        {
            "vendor": "TP-Link",
            "models": ["Kasa Smart Plug HS100", "Kasa HS110", "Kasa Smart Power Strip KP303"],
            "mac_prefix": "50:c7:bf",
            "protocols": ["dhcp", "arp", "lldp", "snmp", "http", "cloud", "dns", "ntp"],
        },
        {
            "vendor": "Meross",
            "models": ["Smart Plug MSS110", "Smart Power Strip MSS425", "Smart Outlet"],
            "mac_prefix": "44:65:0d",
            "protocols": ["dhcp", "arp", "lldp", "snmp", "http", "cloud", "dns"],
        },
        {
            "vendor": "Sonoff",
            "models": ["Mini R2", "Basic R3", "S31", "Dual R3"],
            "mac_prefix": "34:94:54",
            "protocols": ["dhcp", "arp", "lldp", "snmp", "mqtt", "http", "cloud", "dns"],
        },
        {
            "vendor": "Shelly",
            "models": ["Plug S", "1PM", "2.5", "EM"],
            "mac_prefix": "c4:5b:be",
            "protocols": ["dhcp", "arp", "lldp", "http", "mqtt", "cloud", "dns"],
        },
    ],

    "Security Cameras": [
        {
            "vendor": "Hikvision",
            "models": ["DS-2CD2042FWD", "DS-2DE4A425IW-DE", "DS-2CD2385FWD-I"],
            "mac_prefix": "00:12:34",
            "protocols": ["dhcp", "arp", "lldp", "snmp", "http", "rtsp", "cloud", "dns", "ntp"],
        },
        {
            "vendor": "Axis",
            "models": ["M3045-V", "P3245-LVE", "Q1615 Mk III"],
            "mac_prefix": "00:40:8c",
            "protocols": ["dhcp", "arp", "lldp", "snmp", "http", "https", "rtsp", "dns", "ntp"],
        },
        {
            "vendor": "Dahua",
            "models": ["IPC-HDW4631C-A", "IPC-HFW4831E-SE"],
            "mac_prefix": "00:12:16",
            "protocols": ["dhcp", "arp", "lldp", "snmp", "http", "rtsp", "cloud", "dns"],
        },
        {
            "vendor": "Arlo",
            "models": ["Pro 3", "Essential", "Ultra 2"],
            "mac_prefix": "d0:73:d5",
            "protocols": ["dhcp", "arp", "http", "https", "cloud", "dns", "ntp"],
        },
        {
            "vendor": "Ring",
            "models": ["Stick Up Cam", "Indoor Cam", "Floodlight Cam"],
            "mac_prefix": "74:c6:3b",
            "protocols": ["dhcp", "arp", "http", "https", "cloud", "dns", "ntp"],
        },
    ],

    "Smart Speakers & Displays": [
        {
            "vendor": "Amazon",
            "models": ["Echo Dot 5th Gen", "Echo Show 8", "Echo Studio", "Echo Flex"],
            "mac_prefix": "50:f5:da",
            "protocols": ["dhcp", "arp", "lldp", "snmp", "http", "https", "mdns", "cloud", "dns", "ntp"],
        },
        {
            "vendor": "Google",
            "models": ["Nest Mini", "Nest Hub", "Nest Audio", "Nest Hub Max"],
            "mac_prefix": "18:b4:30",
            "protocols": ["dhcp", "arp", "lldp", "http", "https", "mdns", "cloud", "dns", "ntp"],
        },
        {
            "vendor": "Sonos",
            "models": ["One SL", "Beam Gen 2", "Roam", "Arc"],
            "mac_prefix": "54:2a:1b",
            "protocols": ["dhcp", "arp", "lldp", "http", "https", "mdns", "dns", "ntp"],
        },
    ],

    "Sensors": [
        {
            "vendor": "Xiaomi",
            "models": ["LYWSD03MMC Temp", "RTCGQ01LM Motion", "MCCGQ01LM Door", "WSDCGQ01LM Humidity"],
            "mac_prefix": "4c:65:a8",
            "protocols": ["dhcp", "arp", "lldp", "snmp", "mqtt", "cloud", "dns"],
        },
        {
            "vendor": "Aqara",
            "models": ["Temperature Sensor", "Motion Sensor P1", "Door/Window Sensor"],
            "mac_prefix": "54:ef:44",
            "protocols": ["dhcp", "arp", "lldp", "mqtt", "cloud", "dns"],
        },
        {
            "vendor": "Samsung",
            "models": ["SmartThings Motion", "SmartThings Multipurpose"],
            "mac_prefix": "d0:52:a8",
            "protocols": ["dhcp", "arp", "lldp", "http", "cloud", "dns"],
        },
    ],

    "Thermostats & HVAC": [
        {
            "vendor": "Google",
            "models": ["Nest Learning Thermostat", "Nest Thermostat E", "Nest Temperature Sensor"],
            "mac_prefix": "18:b4:30",
            "protocols": ["dhcp", "arp", "lldp", "snmp", "http", "cloud", "dns", "ntp"],
        },
        {
            "vendor": "Ecobee",
            "models": ["SmartThermostat", "3 Lite", "SmartSensor"],
            "mac_prefix": "44:61:32",
            "protocols": ["dhcp", "arp", "lldp", "http", "cloud", "dns", "ntp"],
        },
        {
            "vendor": "Honeywell",
            "models": ["T9 Smart Thermostat", "T6 Pro"],
            "mac_prefix": "00:d0:2d",
            "protocols": ["dhcp", "arp", "lldp", "http", "cloud", "dns"],
        },
    ],

    "Smart TVs & Streaming": [
        {
            "vendor": "Samsung",
            "models": ["Smart TV QN90B", "Smart TV AU8000", "The Frame"],
            "mac_prefix": "d0:52:a8",
            "protocols": ["dhcp", "arp", "lldp", "http", "https", "mdns", "cloud", "dns", "ntp"],
        },
        {
            "vendor": "LG",
            "models": ["OLED C2", "NanoCell 90", "UP7000"],
            "mac_prefix": "b8:bb:af",
            "protocols": ["dhcp", "arp", "lldp", "http", "https", "mdns", "cloud", "dns"],
        },
        {
            "vendor": "Roku",
            "models": ["Streaming Stick 4K", "Ultra LT", "Express"],
            "mac_prefix": "d8:31:cf",
            "protocols": ["dhcp", "arp", "http", "https", "mdns", "cloud", "dns"],
        },
        {
            "vendor": "Apple",
            "models": ["Apple TV 4K", "Apple TV HD"],
            "mac_prefix": "a4:d1:8c",
            "protocols": ["dhcp", "arp", "lldp", "http", "https", "mdns", "dns", "ntp"],
        },
    ],

    "Smart Locks & Doorbells": [
        {
            "vendor": "Ring",
            "models": ["Video Doorbell Pro 2", "Video Doorbell 4"],
            "mac_prefix": "74:c6:3b",
            "protocols": ["dhcp", "arp", "http", "https", "cloud", "dns", "ntp"],
        },
        {
            "vendor": "August",
            "models": ["Smart Lock Pro", "WiFi Smart Lock"],
            "mac_prefix": "70:ee:50",
            "protocols": ["dhcp", "arp", "http", "cloud", "dns"],
        },
        {
            "vendor": "Yale",
            "models": ["Assure Lock SL", "Smart Cabinet Lock"],
            "mac_prefix": "00:1e:c0",
            "protocols": ["dhcp", "arp", "http", "cloud", "dns"],
        },
    ],

    "Smart Appliances": [
        {
            "vendor": "Samsung",
            "models": ["Family Hub Fridge", "Smart Washer", "Smart Dryer"],
            "mac_prefix": "d0:52:a8",
            "protocols": ["dhcp", "arp", "lldp", "http", "https", "cloud", "dns", "ntp"],
        },
        {
            "vendor": "LG",
            "models": ["Smart Refrigerator", "ThinQ Washer", "ThinQ Dishwasher"],
            "mac_prefix": "b8:bb:af",
            "protocols": ["dhcp", "arp", "http", "cloud", "dns"],
        },
        {
            "vendor": "iRobot",
            "models": ["Roomba j7+", "Roomba i3", "Braava jet m6"],
            "mac_prefix": "50:14:79",
            "protocols": ["dhcp", "arp", "http", "https", "cloud", "dns"],
        },
    ],

    "Printers & Office": [
        {
            "vendor": "HP",
            "models": ["OfficeJet Pro 9015e", "LaserJet Pro M404n", "DeskJet 3755"],
            "mac_prefix": "00:1e:0b",
            "protocols": ["dhcp", "arp", "lldp", "snmp", "http", "https", "mdns", "dns"],
        },
        {
            "vendor": "Epson",
            "models": ["EcoTank ET-4760", "WorkForce Pro WF-4830"],
            "mac_prefix": "00:00:48",
            "protocols": ["dhcp", "arp", "lldp", "snmp", "http", "dns"],
        },
        {
            "vendor": "Canon",
            "models": ["PIXMA TR8620", "imageCLASS MF445dw"],
            "mac_prefix": "00:1e:8f",
            "protocols": ["dhcp", "arp", "lldp", "snmp", "http", "mdns", "dns"],
        },
    ],

    "Hubs & Bridges": [
        {
            "vendor": "Philips",
            "models": ["Hue Bridge v2", "Hue Bridge v3"],
            "mac_prefix": "ec:b5:fa",
            "protocols": ["dhcp", "arp", "lldp", "snmp", "http", "https", "cloud", "dns", "ntp"],
        },
        {
            "vendor": "Samsung",
            "models": ["SmartThings Hub", "SmartThings Station"],
            "mac_prefix": "d0:52:a8",
            "protocols": ["dhcp", "arp", "lldp", "http", "https", "cloud", "dns"],
        },
        {
            "vendor": "Hubitat",
            "models": ["Elevation Hub"],
            "mac_prefix": "00:1d:c9",
            "protocols": ["dhcp", "arp", "lldp", "http", "https", "dns"],
        },
    ],

    "Medical Devices": [
        {
            "vendor": "Fitbit",
            "models": ["Charge 5 Dock", "Sense 2 Dock"],
            "mac_prefix": "f8:04:2e",
            "protocols": ["dhcp", "arp", "http", "https", "cloud", "dns"],
        },
        {
            "vendor": "Withings",
            "models": ["Body+ Scale", "Sleep Analyzer"],
            "mac_prefix": "00:24:e4",
            "protocols": ["dhcp", "arp", "http", "cloud", "dns", "ntp"],
        },
    ],

    "Industrial IoT": [
        {
            "vendor": "Siemens",
            "models": ["SIMATIC S7-1200 PLC", "SCALANCE Switch"],
            "mac_prefix": "00:0e:8c",
            "protocols": ["dhcp", "arp", "lldp", "snmp", "http", "modbus", "dns"],
        },
        {
            "vendor": "Schneider",
            "models": ["Modicon M221 PLC", "PowerLogic Meter"],
            "mac_prefix": "00:80:f4",
            "protocols": ["dhcp", "arp", "snmp", "modbus", "http", "dns"],
        },
        {
            "vendor": "Rockwell",
            "models": ["CompactLogix PLC", "FactoryTalk Gateway"],
            "mac_prefix": "00:00:bc",
            "protocols": ["dhcp", "arp", "lldp", "http", "ethernetip", "dns"],
        },
    ],
}


def generate_mac(prefix: str, counter: int) -> str:
    """Generate a pseudo-unique MAC address based on prefix and counter."""
    # Simple expansion to 6 octets from a 3-octet OUI prefix
    # prefix is like "ec:b5:fa"
    high = (counter // 256) & 0xFF
    low = counter & 0xFF
    return f"{prefix}:{high:02x}:{low:02x}"


def generate_iot_devices(categories_config, base_ip="192.168.207", start_ip=50):
    """
    Generate a list of IoT devices.

    Args:
        categories_config: dict, category -> number of devices
        base_ip: first three octets (e.g. "192.168.207")
        start_ip: starting last octet (1-254)
    """
    devices = []
    device_counter = 0
    ip_counter = start_ip

    for category, count in categories_config.items():
        if category not in IOT_DATABASE:
            print(f"⚠️  Unknown category '{category}', skipping")
            continue

        category_devices = IOT_DATABASE[category]

        for i in range(count):
            template = random.choice(category_devices)
            model = random.choice(template["models"])

            vendor_short = template["vendor"].lower().replace(" ", "")[:6]
            cat_slug = category.lower().replace(" ", "_").replace("&", "")
            device_id = f"{vendor_short}_{cat_slug}_{i+1:02d}"

            mac_address = generate_mac(template["mac_prefix"], device_counter)

            device = {
                "id": device_id,
                "name": f"{template['vendor']} {model}",
                "vendor": template["vendor"],
                "type": category.rstrip("s"),
                "mac": mac_address,
                "ip_start": f"{base_ip}.{ip_counter}",
                "protocols": template["protocols"].copy(),
                "enabled": True,
                "traffic_interval": random.randint(60, 300),
                "description": f"{template['vendor']} {model} - {category}",
            }

            if "mqtt" in device["protocols"]:
                topic_base = cat_slug
                device["mqtt_topic"] = f"iot/{topic_base}/{device_id}"

            devices.append(device)
            device_counter += 1
            ip_counter += 1

    return devices


def main():
    parser = argparse.ArgumentParser(
        description="IoT device JSON generator for Palo Alto IoT Security / SD-WAN labs",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:

  # Generate with a preset
  python generate_iot_devices.py --preset medium
  python generate_iot_devices.py --preset enterprise --output my-lab.json

  # Custom configuration
  python generate_iot_devices.py --custom "Smart Lighting:10,Security Cameras:5,Sensors:15"

  # Specify network
  python generate_iot_devices.py --preset large --base-ip 10.10.10 --start-ip 100

  # List available categories
  python generate_iot_devices.py --list-categories
        """,
    )

    parser.add_argument(
        "--preset",
        choices=["small", "medium", "large", "enterprise"],
        help="Predefined configuration (small: ~30, medium: ~65, large: ~110, enterprise: ~170 devices)",
    )

    parser.add_argument(
        "--custom",
        type=str,
        help='Custom configuration: "Category1:number,Category2:number"',
    )

    parser.add_argument(
        "--output",
        "-o",
        type=str,
        default=None,
        help="Output JSON file name (default: iot-devices-{preset}.json)",
    )

    parser.add_argument(
        "--base-ip",
        type=str,
        default="192.168.207",
        help="First 3 octets of IP (default: 192.168.207)",
    )

    parser.add_argument(
        "--start-ip",
        type=int,
        default=50,
        help="Starting last octet (default: 50)",
    )

    parser.add_argument(
        "--list-categories",
        action="store_true",
        help="Show all available categories and exit",
    )

    args = parser.parse_args()

    if args.list_categories:
        print("Available categories:\n")
        for i, (category, devs) in enumerate(IOT_DATABASE.items(), 1):
            vendors = sorted({d["vendor"] for d in devs})
            total_models = sum(len(d["models"]) for d in devs)
            print(f"{i:2d}. {category}")
            print(f"    Vendors: {', '.join(vendors)}")
            print(f"    Models:  {total_models}\n")
        return

    presets = {
        "small": {
            "Smart Lighting": 5,
            "Smart Plugs & Switches": 5,
            "Security Cameras": 3,
            "Smart Speakers & Displays": 3,
            "Sensors": 5,
            "Thermostats & HVAC": 2,
            "Smart TVs & Streaming": 2,
            "Printers & Office": 2,
            "Hubs & Bridges": 2,
        },
        "medium": {
            "Smart Lighting": 10,
            "Smart Plugs & Switches": 10,
            "Security Cameras": 6,
            "Smart Speakers & Displays": 5,
            "Sensors": 10,
            "Thermostats & HVAC": 4,
            "Smart TVs & Streaming": 4,
            "Smart Locks & Doorbells": 3,
            "Smart Appliances": 4,
            "Printers & Office": 5,
            "Hubs & Bridges": 3,
        },
        "large": {
            "Smart Lighting": 15,
            "Smart Plugs & Switches": 15,
            "Security Cameras": 10,
            "Smart Speakers & Displays": 8,
            "Sensors": 20,
            "Thermostats & HVAC": 6,
            "Smart TVs & Streaming": 6,
            "Smart Locks & Doorbells": 5,
            "Smart Appliances": 8,
            "Printers & Office": 8,
            "Hubs & Bridges": 5,
            "Medical Devices": 4,
        },
        "enterprise": {
            "Smart Lighting": 20,
            "Smart Plugs & Switches": 20,
            "Security Cameras": 15,
            "Smart Speakers & Displays": 10,
            "Sensors": 30,
            "Thermostats & HVAC": 10,
            "Smart TVs & Streaming": 8,
            "Smart Locks & Doorbells": 8,
            "Smart Appliances": 10,
            "Printers & Office": 15,
            "Hubs & Bridges": 8,
            "Medical Devices": 5,
            "Industrial IoT": 10,
        },
    }

    if args.custom:
        config = {}
        try:
            for pair in args.custom.split(","):
                category, count = pair.split(":")
                config[category.strip()] = int(count.strip())
        except ValueError:
            print("Error: Invalid format for --custom")
            print("Expected: 'Category1:number,Category2:number'")
            return
        output_name = args.output or "iot-devices-custom.json"
    elif args.preset:
        config = presets[args.preset]
        output_name = args.output or f"iot-devices-{args.preset}.json"
    else:
        parser.print_help()
        return

    print("Generating IoT devices...")
    devices = generate_iot_devices(config, args.base_ip, args.start_ip)
    output = {"devices": devices}

    with open(output_name, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Done: {output_name}")
    print(f"  Devices: {len(devices)}")
    print(f"  Network: {args.base_ip}.{args.start_ip}-{args.start_ip + len(devices) - 1}")


if __name__ == "__main__":
    main()

