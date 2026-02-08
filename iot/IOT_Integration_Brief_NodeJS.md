# IoT Device Emulator - Integration Brief pour Antigravity
## Version Node.js + Python (Scapy Subprocess)

## 🎯 Objectif Global

Intégrer le script Python `iot_emulator.py` dans la solution web React existante (simulateur de Branch Prisma SD-WAN) en tant que nouvel onglet **"IoT Devices"** avec une UX complète de gestion, simulation et monitoring en temps réel.

---

## 📋 Context & Architecture

### État actuel
- Solution React existante simulant un **Branch Prisma SD-WAN**
- Backend en **Node.js** (Express ou Nest.js)
- Besoin d'ajouter un **onglet IoT** pour simuler des appareils IoT
- Script Python autonome (`iot_emulator.py`) fonctionnant avec **Scapy (L2/L3)**

### 🏗️ Architecture proposée (HYBRIDE Node.js + Python)

```
┌────────────────────────────────────────────────────────────┐
│              React Web App (Simulateur Branch)              │
├────────────────────────────────────────────────────────────┤
│   [Branch] [Network] [IoT Devices] [Settings] [Logs]       │
│                         ↓ (HTTP + WebSocket)                │
├────────────────────────────────────────────────────────────┤
│                                                              │
│         Node.js Backend (Express/Nest.js)                  │
│         ┌────────────────────────────────────┐             │
│         │ Device Manager (orchestration)     │             │
│         │ REST API endpoints                 │             │
│         │ WebSocket Server (Socket.io)       │             │
│         │ Stats Collector                    │             │
│         └────────────────────────────────────┘             │
│                    ↓ (Child Process)                        │
├────────────────────────────────────────────────────────────┤
│                                                              │
│    Python iot_emulator.py (Scapy - Host Network Mode)     │
│    └─ Per-device threads (ARP, DHCP, HTTP, Cloud, etc.)   │
│    └─ Outputs JSON stats via stdout                        │
│                                                              │
├────────────────────────────────────────────────────────────┤
│  Physical/Virtual Network Interface (eth0, ens4, etc.)     │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

### Stack Technique

| Composant | Technologie | Rôle |
|-----------|------------|------|
| Frontend | React + TypeScript | UI/UX gestion devices |
| Backend API | Node.js (Express/Nest.js) | Orchestration + REST API |
| Core Simulation | Python + Scapy | Génération trafic L2/L3 |
| IPC | Child Process + stdio | Node.js ↔ Python communication |
| DB/Storage | JSON (fichiers) | Config devices persistance |
| Real-time | WebSocket (Socket.io) | Stats & logs temps réel |
| Container | Docker (host mode) | Scapy nécessite accès réseau direct |

---

## 🔄 Communication Flow: Node.js ↔ Python

### 1. Démarrage (Start Device)

```
React UI
  ↓
POST /api/devices/{id}/start
  ↓
Node.js DeviceManager.startDevice(id)
  ↓
child_process.spawn('python3', ['iot_emulator.py', '--device', 'camera_01', ...])
  ↓
Python process starts, listens on stdout
  ↓
Node.js attache listeners:
  - stdout: Parse JSON stats/logs
  - stderr: Capture errors
  - on('message'): Handle device events
  ↓
Python envoie:
  {"type": "started", "device_id": "camera_01", "timestamp": "..."}
  ↓
Node.js broadcasts via WebSocket to React
  ↓
React UI updates: Status = RUNNING ✓
```

### 2. Stats Collection (Real-time)

```
Python (running device)
  ↓ (every 5s)
Sends JSON: {"type": "stats", "device_id": "camera_01", "stats": {...}}
  ↓
Node.js reads from stdout
  ↓
Stores in-memory or cache (Redis optional)
  ↓
WebSocket broadcast to all connected clients
  ↓
React updates charts/stats in real-time
```

### 3. Arrêt (Stop Device)

```
React UI [Stop Button]
  ↓
POST /api/devices/{id}/stop
  ↓
Node.js: childProcess.kill('SIGTERM')
  ↓
Python: Cleanup threads, flush final stats
  ↓
Python sends: {"type": "stopped", "device_id": "camera_01"}
  ↓
childProcess exits
  ↓
Node.js WebSocket: device:stopped event
  ↓
React UI updates: Status = STOPPED ◻️
```

---

## 📊 Node.js ↔ Python Message Format (JSON over stdout)

### Messages du Python vers Node.js

**Device Lifecycle:**
```json
{"type": "started", "device_id": "camera_01", "timestamp": "2025-01-29T16:45:23Z"}
{"type": "stopped", "device_id": "camera_01", "timestamp": "2025-01-29T16:47:15Z"}
{"type": "error", "device_id": "camera_01", "error": "DHCP timeout", "severity": "error"}
```

**Stats Update (envoyé périodiquement):**
```json
{
  "type": "stats",
  "device_id": "camera_01",
  "timestamp": "2025-01-29T16:45:30Z",
  "stats": {
    "packets_sent": 1247,
    "bytes_sent": 523000,
    "packet_rate": 4.2,
    "current_ip": "192.168.207.180",
    "uptime_seconds": 30,
    "protocols": {
      "dhcp": 8,
      "arp": 256,
      "http": 512,
      "rtsp": 384,
      "dns": 87
    }
  }
}
```

**DHCP Events:**
```json
{
  "type": "dhcp_discover",
  "device_id": "camera_01",
  "xid": "0x3bbff79e",
  "mac": "00:12:34:56:78:01"
}

{
  "type": "dhcp_offer",
  "device_id": "camera_01",
  "server_id": "192.168.207.1",
  "offered_ip": "192.168.207.180",
  "lease_time": 86400
}

{
  "type": "dhcp_ack",
  "device_id": "camera_01",
  "assigned_ip": "192.168.207.180",
  "server_id": "192.168.207.1",
  "lease_time": 86400
}
```

**Log Events:**
```json
{
  "type": "log",
  "device_id": "camera_01",
  "level": "info",
  "message": "📤 Sending DHCP DISCOVER (xid: 0x3bbff79e, MAC: 00:12:34:56:78:01)",
  "timestamp": "2025-01-29T16:45:23.123Z"
}

{
  "type": "log",
  "device_id": "camera_01",
  "level": "error",
  "message": "❌ DHCP sequence error: timeout waiting for OFFER",
  "timestamp": "2025-01-29T16:45:26.456Z"
}
```

### Messages du Node.js vers Python (via command-line args)

```bash
# Start device
python3 iot_emulator.py \
  --device camera_01 \
  --vendor Hikvision \
  --mac 00:12:34:56:78:01 \
  --interface eth0 \
  --gateway 192.168.207.1 \
  --dhcp-mode auto \
  --protocols arp,dhcp,http,rtsp,cloud,dns,ntp \
  --traffic-interval 60 \
  --json-output  # Force JSON output instead of colored logs

# Stop device
# Via signal: kill(pid, SIGTERM)
```

---

## 🎨 UX/UI Components (Inchangés)

### 1️⃣ **IoT Devices Tab - Main View**

```
┌────────────────────────────────────────────────────────┐
│ IoT DEVICES                                             │
├────────────────────────────────────────────────────────┤
│  [▶ Play All] [⏹ Stop All] [➕ Add Device] [⬇️ Import]  │
├────────────────────────────────────────────────────────┤
│                                                         │
│  Device List (Tableau/Datagrid):                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ID    │ Name          │ Type      │ IP       │ ⚡ │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ ✓ cam │ Hikvision DS  │ Camera    │ 192...   │ ON │   │
│  │   sen │ Xiaomi Sensor │ Sensor    │ -        │ ◻️  │   │
│  │ ✓ sw  │ TP-Link Plug  │ Switch    │ 192...   │ ON │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└────────────────────────────────────────────────────────┘
```

*(Voir document complet précédent pour détail des autres components)*

---

## 🏗️ Architecture Technique Détaillée (Node.js Version)

### Backend Structure (Node.js + Express)

```
backend/
├── src/
│   ├── app.ts                          # Express app
│   ├── server.ts                       # Server + WebSocket setup
│   ├── config.ts                       # Configuration
│   ├── routes/
│   │   ├── devices.ts                  # CRUD devices
│   │   ├── simulation.ts               # Start/Stop
│   │   └── stats.ts                    # Stats endpoints
│   ├── services/
│   │   ├── deviceManager.ts            # Orchestration
│   │   ├── pythonProcessManager.ts     # Child process wrapper
│   │   ├── statsCollector.ts           # Real-time stats
│   │   └── configService.ts            # Load/save JSON
│   ├── models/
│   │   ├── Device.ts                   # Device interface
│   │   ├── Stats.ts                    # Stats interface
│   │   └── Message.ts                  # IPC message types
│   ├── websocket/
│   │   └── socketManager.ts            # WebSocket handlers
│   ├── utils/
│   │   ├── logger.ts                   # Structured logging
│   │   └── messageParser.ts            # Parse Python JSON
│   └── types/
│       └── index.ts                    # TypeScript definitions
├── dist/                               # Compiled JS
├── python/
│   ├── iot_emulator.py                 # (Refactorisé avec JSON output)
│   └── requirements.txt
├── config/
│   └── devices.json                    # Device config
├── package.json
└── tsconfig.json
```

### Python Refactoring (JSON Output Mode)

**Actuellement:** Logs colorés dans stdout

**À faire:** Ajouter mode `--json-output` pour communiquer avec Node.js:

```python
#!/usr/bin/env python3
"""
IoT Device Emulator - REFACTORED for Node.js integration
"""
import json
import sys
import argparse
from datetime import datetime

class IoTEmulatorNode:
    """Version refactorisée pour intégration Node.js"""
    
    def __init__(self, device_config, interface="eth0", json_output=False):
        self.device = device_config
        self.interface = interface
        self.json_output = json_output  # NEW: JSON mode for Node.js
        self.running = False
        self.stats = {}
        self.process_id = os.getpid()
    
    def log_json(self, log_type, level, message, extra=None):
        """Envoie logs en JSON à Node.js"""
        if not self.json_output:
            return
        
        msg = {
            "type": "log",
            "device_id": self.device['id'],
            "level": level,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }
        if extra:
            msg.update(extra)
        
        print(json.dumps(msg), flush=True)  # stdout → Node.js
    
    def emit_stats(self):
        """Envoie stats périodiquement en JSON"""
        if not self.json_output:
            return
        
        stats_msg = {
            "type": "stats",
            "device_id": self.device['id'],
            "timestamp": datetime.now().isoformat(),
            "stats": {
                "packets_sent": self.stats.get('packets_sent', 0),
                "bytes_sent": self.stats.get('bytes_sent', 0),
                "current_ip": self.stats.get('current_ip'),
                "uptime_seconds": self.stats.get('uptime_seconds', 0),
                "protocols": self.stats.get('protocols', {})
            }
        }
        print(json.dumps(stats_msg), flush=True)
    
    async def start(self):
        """Lance simulation"""
        try:
            self.emit_event("started")
            # ... simulation logic ...
        except Exception as e:
            self.emit_event("error", error=str(e))
    
    def emit_event(self, event_type, **kwargs):
        """Envoie event JSON à Node.js"""
        msg = {
            "type": event_type,
            "device_id": self.device['id'],
            "timestamp": datetime.now().isoformat(),
            **kwargs
        }
        print(json.dumps(msg), flush=True)

# Main
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--device', required=True)
    parser.add_argument('--vendor')
    parser.add_argument('--mac')
    parser.add_argument('--interface', default='eth0')
    parser.add_argument('--gateway', default='192.168.207.1')
    parser.add_argument('--dhcp-mode', default='auto')
    parser.add_argument('--protocols')
    parser.add_argument('--traffic-interval', type=int, default=60)
    parser.add_argument('--json-output', action='store_true')
    
    args = parser.parse_args()
    
    device_config = {
        'id': args.device,
        'vendor': args.vendor,
        'mac': args.mac,
        'gateway': args.gateway,
        'dhcp_mode': args.dhcp_mode,
        'protocols': args.protocols.split(',') if args.protocols else [],
        'traffic_interval': args.traffic_interval
    }
    
    emulator = IoTEmulatorNode(device_config, args.interface, args.json_output)
    asyncio.run(emulator.start())
```

### Node.js Device Manager (TypeScript)

```typescript
// services/deviceManager.ts
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';

export class DeviceManager extends EventEmitter {
    private devices: Map<string, ChildProcess> = new Map();
    private pythonScriptPath: string;
    private interface: string;
    private statsCache: Map<string, any> = new Map();

    constructor(interface: string = 'eth0') {
        super();
        this.interface = interface;
        this.pythonScriptPath = path.join(__dirname, '../../python/iot_emulator.py');
    }

    async startDevice(deviceConfig: any): Promise<void> {
        if (this.devices.has(deviceConfig.id)) {
            throw new Error(`Device ${deviceConfig.id} already running`);
        }

        // Spawn Python process
        const args = [
            '--device', deviceConfig.id,
            '--vendor', deviceConfig.vendor,
            '--mac', deviceConfig.mac,
            '--interface', this.interface,
            '--gateway', deviceConfig.gateway,
            '--dhcp-mode', deviceConfig.dhcp_mode || 'auto',
            '--protocols', deviceConfig.protocols.join(','),
            '--traffic-interval', String(deviceConfig.traffic_interval),
            '--json-output'  // IMPORTANT: JSON mode
        ];

        const pythonProcess = spawn('python3', [this.pythonScriptPath, ...args], {
            stdio: ['ignore', 'pipe', 'pipe'], // ignore stdin, pipe stdout/stderr
            detached: false
        });

        // Handle stdout (JSON messages from Python)
        pythonProcess.stdout?.on('data', (data: Buffer) => {
            const lines = data.toString().split('\n').filter(l => l);
            lines.forEach(line => {
                try {
                    const msg = JSON.parse(line);
                    this.handlePythonMessage(msg);
                } catch (e) {
                    console.error(`Failed to parse JSON from device ${deviceConfig.id}:`, line);
                }
            });
        });

        // Handle stderr (errors)
        pythonProcess.stderr?.on('data', (data: Buffer) => {
            console.error(`Python stderr [${deviceConfig.id}]:`, data.toString());
            this.emit('device:error', {
                device_id: deviceConfig.id,
                error: data.toString(),
                severity: 'error'
            });
        });

        pythonProcess.on('exit', (code) => {
            this.devices.delete(deviceConfig.id);
            if (code !== 0) {
                this.emit('device:error', {
                    device_id: deviceConfig.id,
                    error: `Python process exited with code ${code}`,
                    severity: 'error'
                });
            }
        });

        this.devices.set(deviceConfig.id, pythonProcess);
        this.emit('device:started', { device_id: deviceConfig.id });
    }

    async stopDevice(deviceId: string): Promise<void> {
        const process = this.devices.get(deviceId);
        if (!process) {
            throw new Error(`Device ${deviceId} not running`);
        }

        // Graceful shutdown
        process.kill('SIGTERM');
        
        // Force kill after 5s
        setTimeout(() => {
            if (!process.killed) {
                process.kill('SIGKILL');
            }
        }, 5000);

        this.devices.delete(deviceId);
    }

    async stopAll(): Promise<void> {
        const promises = Array.from(this.devices.keys()).map(
            deviceId => this.stopDevice(deviceId)
        );
        await Promise.all(promises);
    }

    private handlePythonMessage(msg: any): void {
        const { type, device_id } = msg;

        switch (type) {
            case 'started':
                this.emit('device:started', msg);
                break;
            case 'stopped':
                this.emit('device:stopped', msg);
                break;
            case 'stats':
                this.statsCache.set(device_id, msg.stats);
                this.emit('device:stats', msg);
                break;
            case 'log':
                this.emit('device:log', msg);
                break;
            case 'dhcp_offer':
            case 'dhcp_ack':
            case 'dhcp_discover':
                this.emit(`device:${type}`, msg);
                break;
            case 'error':
                this.emit('device:error', msg);
                break;
            default:
                console.warn(`Unknown message type: ${type}`);
        }
    }

    getStats(deviceId: string): any {
        return this.statsCache.get(deviceId);
    }

    isRunning(deviceId: string): boolean {
        return this.devices.has(deviceId);
    }
}
```

### Express Routes

```typescript
// routes/simulation.ts
import { Router } from 'express';
import { DeviceManager } from '../services/deviceManager';

const router = Router();
const deviceManager = new DeviceManager(process.env.IOT_INTERFACE || 'eth0');

// Start specific device
router.post('/devices/:id/start', async (req, res) => {
    try {
        const device = getDeviceConfig(req.params.id); // Load from JSON
        await deviceManager.startDevice(device);
        res.json({ status: 'started', device_id: req.params.id });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// Stop specific device
router.post('/devices/:id/stop', async (req, res) => {
    try {
        await deviceManager.stopDevice(req.params.id);
        res.json({ status: 'stopped', device_id: req.params.id });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// Start all devices
router.post('/devices/start-all', async (req, res) => {
    // Load all enabled devices from config
    const devices = getAllEnabledDevices();
    const results = await Promise.allSettled(
        devices.map(d => deviceManager.startDevice(d))
    );
    res.json({ started: results.filter(r => r.status === 'fulfilled').length });
});

// Stop all devices
router.post('/devices/stop-all', async (req, res) => {
    await deviceManager.stopAll();
    res.json({ status: 'all_stopped' });
});

export default router;
```

### WebSocket Integration (Socket.io)

```typescript
// websocket/socketManager.ts
import { io } from 'socket.io';
import { DeviceManager } from '../services/deviceManager';

export function setupWebSocket(server: any, deviceManager: DeviceManager) {
    const socketIo = io(server, {
        cors: { origin: '*' }
    });

    // Forward all device events to connected clients
    deviceManager.on('device:started', (msg) => {
        socketIo.emit('device:started', msg);
    });

    deviceManager.on('device:stats', (msg) => {
        socketIo.emit('device:stats', msg);
    });

    deviceManager.on('device:log', (msg) => {
        socketIo.emit('device:log', msg);
    });

    deviceManager.on('device:error', (msg) => {
        socketIo.emit('device:error', msg);
    });

    deviceManager.on('device:dhcp_offer', (msg) => {
        socketIo.emit('device:dhcp_offer', msg);
    });

    socketManager.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        // Client requests stats for specific device
        socket.on('request:stats', (deviceId) => {
            const stats = deviceManager.getStats(deviceId);
            socket.emit('stats:response', { device_id: deviceId, stats });
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
}
```

### React Frontend (Hooks + Socket.io)

```typescript
// hooks/useIoTDevices.ts
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export function useIoTDevices() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [socket, setSocket] = useState<any>(null);

    useEffect(() => {
        // Connect to WebSocket
        const newSocket = io(process.env.REACT_APP_API_URL);
        setSocket(newSocket);

        // Listen for device events
        newSocket.on('device:started', (msg) => {
            console.log('Device started:', msg);
            updateDeviceStatus(msg.device_id, 'RUNNING');
        });

        newSocket.on('device:stats', (msg) => {
            console.log('Stats received:', msg);
            updateDeviceStats(msg.device_id, msg.stats);
        });

        newSocket.on('device:log', (msg) => {
            console.log('Log:', msg.message);
            addLog(msg.device_id, msg);
        });

        return () => newSocket.close();
    }, []);

    const startDevice = async (deviceId: string) => {
        await fetch(`/api/devices/${deviceId}/start`, { method: 'POST' });
    };

    const stopDevice = async (deviceId: string) => {
        await fetch(`/api/devices/${deviceId}/stop`, { method: 'POST' });
    };

    return {
        devices,
        startDevice,
        stopDevice,
        socket
    };
}
```

---

## 📈 Phase d'Implémentation

### Phase 1: Backend Foundation (1-2 semaines)
- [ ] Refactoriser Python script avec JSON output mode
- [ ] Créer DeviceManager (spawn + stdout parsing)
- [ ] Setup Express routes (start/stop/status)
- [ ] WebSocket EventEmitter intégration
- [ ] Docker config (host network)

**Livrable:** Backend Node.js ↔ Python communication OK (testable via Postman)

### Phase 2: Frontend Basics (1-2 semaines)
- [ ] Créer composant IoTDevices tab
- [ ] DeviceList (affichage + enable/disable)
- [ ] DeviceForm (Add/Edit)
- [ ] ImportModal
- [ ] REST API client

**Livrable:** UI de base (sans WebSocket temps réel)

### Phase 3: Real-time & Stats (1-2 semaines)
- [ ] Socket.io integration React
- [ ] StatsPanel avec graphiques live (Recharts)
- [ ] LogViewer avec filters
- [ ] DHCP Timeline
- [ ] Export CSV

**Livrable:** Full real-time monitoring

### Phase 4: Polish & Optimization (1 semaine)
- [ ] Tests E2E (Cypress)
- [ ] Performance (virtualized lists)
- [ ] Error handling robuste
- [ ] Documentation

**Livrable:** Production-ready

---

## 🔧 Technical Considerations (Node.js + Python)

### 1. Child Process Management

**Problèmes courants:**
- Processus zombie si pas tué proprement
- Mémoire leak si stats pas nettoyées
- Orphaned processes si parent meurt

**Solutions:**
```typescript
// Graceful shutdown
process.on('SIGTERM', async () => {
    await deviceManager.stopAll();
    process.exit(0);
});

// Kill timeouts
setTimeout(() => {
    process.kill('SIGKILL');
}, 10000);
```

### 2. JSON Stream Parsing

**Problème:** Python envoie plusieurs JSON par seconde, peuvent arriver fragmentés

**Solution:**
```typescript
const lines = buffer.toString().split('\n');
lines.forEach(line => {
    if (line.trim()) {
        JSON.parse(line);  // Une seule JSON par ligne
    }
});
```

### 3. Error Handling

```typescript
pythonProcess.on('error', (err) => {
    console.error('Failed to start process:', err);
    this.emit('device:error', { error: err.message });
});

pythonProcess.stderr?.on('data', (data) => {
    // Capture Python errors/warnings
});
```

### 4. Resource Limits

```typescript
// Max 30 devices per container (Scapy limitation)
if (this.devices.size >= 30) {
    throw new Error('Maximum number of concurrent devices reached');
}
```

### 5. Docker Compose

```yaml
version: '3.8'
services:
  iot-app:
    build: .
    ports:
      - "3000:3000"   # React
      - "8000:8000"   # Node.js
    network_mode: "host"  # IMPORTANT pour Scapy !
    environment:
      - IOT_INTERFACE=eth0
      - NODE_ENV=production
    volumes:
      - ./config:/app/config
      - ./logs:/app/logs
    restart: unless-stopped
```

---

## 🎯 Default Devices Library

*Inchangé du brief précédent - voir section "Default Devices Library"*

---

## ✅ Success Criteria

- [ ] Onglet IoT intégré dans solution React existante
- [ ] 10+ devices pré-configurés disponibles
- [ ] Ajout/édition/suppression devices fonctionnel
- [ ] Import/export JSON fonctionnel
- [ ] Start/Stop all et par device (< 1s latence)
- [ ] Stats temps réel via WebSocket (< 500ms latence)
- [ ] DHCP events détaillés affichés
- [ ] Graphiques live (Recharts) mis à jour en temps réel
- [ ] Container Docker host network fonctionnel
- [ ] 95%+ uptime 24h simulation
- [ ] Logs détaillés (stdout + fichier)
- [ ] Documentation API complète

---

## 📞 RECOMMANDATION D'ARCHITECTURE

### Option recommandée: **Node.js + Python Subprocess**

**Pourquoi:**
✅ Réutilise l'infrastructure Node.js existante
✅ Pas besoin de refactoriser complètement Scapy
✅ Simple communication via stdout JSON
✅ IPC fiable avec child_process
✅ Scaling horizontal facile (1 Node container = 20-30 devices max)

**Avantages:**
- Python reste responsable UNIQUEMENT de Scapy (son job)
- Node.js fait l'orchestration, APIs, WebSocket (son job)
- Separation of concerns claire
- Easy to debug (logs separés Python/Node)

**Limitations:**
- Overhead spawn/kill (mitigé avec pooling si besoin)
- Scapy perf reste limitée (10-20pps max par device)

**Alternative si scaling massif (1000+ devices):**
- Déployer N containers Node.js
- Chacun manage 20-30 devices
- Load balancer frontal (Nginx)

---

## 🚀 Prochaines Étapes

1. **Validation architecture** avec Antigravity
2. **Q: Faut-il Pool management pour Python processes?** (Piscina ou simple spawn?)
3. **Q: Redis pour cache stats** ou in-memory suffit?
4. **Setup repo** avec structure Node.js + Python
5. **Prototypage Phase 1**

---

**Document préparé pour:** Antigravity (AI Development)  
**Date:** 29 Janvier 2026  
**Status:** Ready for Technical Design Review  
**Archit version:** Node.js + Python (Recommended)
