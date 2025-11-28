# SD-WAN Traffic Generator

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Bash](https://img.shields.io/badge/bash-5.0%2B-green.svg)
![Status](https://img.shields.io/badge/status-production-brightgreen.svg)

A realistic enterprise application traffic generator designed for SD-WAN demonstrations and testing. Generates weighted HTTP/HTTPS traffic to 60+ popular SaaS applications with configurable distribution patterns.

## 🎯 Features

- **60+ Enterprise Applications**: Microsoft 365, Google Workspace, Salesforce, Zoom, Slack, AWS, Azure, and more
- **Weighted Traffic Distribution**: Control exact traffic percentages per application category
- **Application-Specific Endpoints**: Uses real API endpoints for accurate SD-WAN application identification
- **Intelligent Backoff**: Progressive retry logic (1 min → 3 hours) for unreachable hosts
- **Real-time Statistics**: JSON metrics updated every 50 requests
- **Systemd Service**: Auto-start on boot with automatic restart on failure
- **Log Rotation**: Automatic log management to prevent disk space issues
- **User-Agent Variety**: Rotates between multiple realistic browser and application agents

## 📊 Use Cases

- **SD-WAN Demos**: Generate realistic traffic patterns for Palo Alto Prisma, Cisco Viptela, VMware VeloCloud, etc.
- **Policy Testing**: Validate application identification and steering policies
- **Capacity Planning**: Simulate enterprise traffic loads
- **Lab Environments**: Populate SD-WAN analytics with meaningful data

## 🚀 Quick Start

### Prerequisites

- Linux system (Ubuntu/Debian tested)
- Bash 4.0+
- `curl` installed
- Root/sudo access

### Installation
