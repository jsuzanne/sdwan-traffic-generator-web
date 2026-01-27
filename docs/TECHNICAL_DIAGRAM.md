# Technical Communication Flow

This diagram illustrates the flows between the various containers and external targets.

```mermaid
graph TD
    subgraph "Branch Site (Source)"
        UI["sdwan-web-ui<br/>(Dashboard & API :8080)"]
        HTTP_GEN["sdwan-traffic-gen<br/>(HTTP Generator)"]
        VOICE_GEN["sdwan-voice-gen<br/>(RTP Generator)"]
    end

    subgraph "SD-WAN Fabric (Underlay/Overlay)"
        Tunnel["Encrypted Tunnels<br/>(IPsec / GRE / SD-WAN)"]
    end

    subgraph "Target Site / Data Center"
        ECHO["sdwan-voice-echo<br/>(UDP Echo Server :6200)"]
        IPERF["iperf3 Server<br/>(:5201)"]
    end

    subgraph "Public Internet"
        CLOUD["SaaS / Cloud Apps<br/>(Google, AWS, etc.)"]
    end

    %% Flow Definitions
    UI -- "1. Monitor / Control" --> HTTP_GEN
    UI -- "1. Monitor / Control" --> VOICE_GEN
    
    HTTP_GEN -- "HTTP/S Traffic" --> Tunnel
    VOICE_GEN -- "RTP (UDP/6200)" --> Tunnel
    UI -- "iperf3 Client / Speedtest" --> Tunnel
    
    Tunnel -- "Relayed Packets" --> ECHO
    Tunnel -- "Bandwidth Tests" --> IPERF
    Tunnel -- "SaaS Simulation" --> CLOUD

    ECHO -- "RTP Loopback" --> Tunnel
    Tunnel -- "Echo Result" --> VOICE_GEN
```

## Protocol & Port Table

| Flow Type | Protocol | Port(s) | Source | Target |
|-----------|----------|---------|--------|--------|
| **Dashboard UI** | TCP | 8080 / 8444 | User Browser | `sdwan-web-ui` |
| **Background HTTP**| TCP | 80, 443 | `sdwan-traffic-gen` | Internet / Cloud |
| **Convergence/Voice**| UDP | 6200 | `sdwan-voice-gen` | `sdwan-voice-echo` |
| **Iperf3 Test** | TCP/UDP | 5201 | `sdwan-web-ui` | `iperf3 server` |
| **Speedtest** | TCP | 80, 443 | `sdwan-web-ui` | Public Ookla Servers |
| **API Control** | TCP | 8080 | Dashboard | Orchestrator Engine |

## Site Cloning (v1.1.2-patch.3+)
When using the **Backup & Restore** feature, you are essentially exporting the logic and site categories from one **Branch Site** (UI side) and importing it into another UI instance to ensure consistent performance testing across the entire SD-WAN fabric.
