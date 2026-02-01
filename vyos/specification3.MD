# VyOS Network Chaos Engineering Scheduler - Product Requirements Document v3

## 🆕 What's New in v3

- ✅ **Auto-Discovery**: Add routers by entering only IP + API Key
- ✅ **Smart Interface Detection**: Automatically fetch interface names, descriptions, and IPs
- ✅ **Version Detection**: Auto-detect VyOS version (1.4 or 1.5) for correct command syntax
- ✅ **Hostname Display**: Show router hostnames everywhere (cards, dropdowns, timeline)
- ✅ **Refresh Capability**: Update router info without re-adding
- ✅ **Enhanced UI**: Interface dropdowns show descriptions, timeline shows hostnames

---

## Context

I have a **VyOS network emulation lab** controlled via Python script (`vyos_sdwan_ctl.py`) that can inject network impairments (latency, packet loss, corruption, reordering, bandwidth limiting) on router interfaces via VyOS HTTPS API.

I want to build a **web-based scheduler** that allows users to create **repeating sequences of network chaos scenarios** for continuous SDWAN testing **across multiple VyOS routers** with **automatic router discovery**.

---

## Current Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + TypeScript + Tailwind CSS
- **Storage**: JSONL files (append-only logs) + JSON config files (NO database)
- **Existing patterns**: 
  - Already have similar scheduler for Voice tests and Convergence tests
  - Use `fs.appendFileSync()` for history logs (JSONL format)
  - Use `fs.writeFileSync()` for configuration (JSON format)

---

## VyOS Control Script

**Script**: `vyos_sdwan_ctl.py`

**Available Commands**:

### 🆕 Router Discovery (Auto-detection)
```bash
# Discover router information (no --version needed)
./vyos_sdwan_ctl.py --host 192.168.122.64 --key SUPERSECRET get-info

# Returns JSON:
{
  "success": true,
  "version": "1.4",
  "hostname": "VyosBranch206",
  "interfaces": [
    {
      "name": "eth0",
      "description": "AWS Branch express route",
      "address": ["10.10.206.6/24"]
    },
    {
      "name": "eth3",
      "description": "Connection to BR2",
      "address": ["192.168.216.2/24"]
    },
    {
      "name": "eth4",
      "description": "MGMT",
      "address": ["dhcp"]
    },
    {
      "name": "eth5",
      "description": "Lan206",
      "address": ["192.168.206.1/24"]
    }
  ]
}
Interface Control
bash
./vyos_sdwan_ctl.py --host 192.168.122.13 --key SUPERSECRET --version 1.4 shut --iface eth2
./vyos_sdwan_ctl.py --host 192.168.122.13 --key SUPERSECRET --version 1.4 no-shut --iface eth2
Network Impairments (Individual)
bash
./vyos_sdwan_ctl.py --host 192.168.122.13 --key SUPERSECRET --version 1.4 set-latency --iface eth2 --ms 100
./vyos_sdwan_ctl.py --host 192.168.122.13 --key SUPERSECRET --version 1.4 set-loss --iface eth2 --percent 5
./vyos_sdwan_ctl.py --host 192.168.122.13 --key SUPERSECRET --version 1.4 set-corruption --iface eth2 --percent 2
./vyos_sdwan_ctl.py --host 192.168.122.13 --key SUPERSECRET --version 1.4 set-reorder --iface eth2 --percent 10 --gap 5
./vyos_sdwan_ctl.py --host 192.168.122.13 --key SUPERSECRET --version 1.4 set-rate --iface eth2 --rate 10mbit
Combined (All in one policy)
bash
./vyos_sdwan_ctl.py --host 192.168.122.13 --key SUPERSECRET --version 1.4 set-qos --iface eth2 --ms 50 --loss 3 --corruption 1 --reorder 5 --rate 100mbit
Clear Impairments
bash
./vyos_sdwan_ctl.py --host 192.168.122.13 --key SUPERSECRET --version 1.4 clear-qos --iface eth2
Output: JSON response

json
{
  "success": true,
  "data": "",
  "error": null
}
Product Requirements
1. Core Concept: "Chaos Sequences"
A Sequence is a repeating loop of network impairment actions scheduled at specific offsets within a cycle (1 hour or 2 hours). Each action targets a specific VyOS router and interface.

Example Sequence: "Multi-Site WAN Failure" (60-minute cycle)

T+0min: Shut eth2 on VyosBranch206 (Branch Paris)

T+5min: Set 10% loss on eth1 on VyosBranch207 (Branch London)

T+15min: No-shut eth2 on VyosBranch206

T+20min: Clear all QoS on eth1 on VyosBranch207

T+30min: Set 200ms latency on eth2 on VyosHQ (HQ)

T+45min: Clear all on all routers

T+60min: Loop restarts

2. Data Model
File Structure:
text
config/
  ├── vyos-routers.json          # List of managed VyOS routers
  └── vyos-sequences.json        # List of chaos sequences
logs/
  └── vyos-sequence-history.jsonl  # Execution history (append-only)
🆕 Router Interface Schema:
typescript
interface VyosRouterInterface {
  name: string;                  // Interface name (e.g., "eth0")
  description: string | null;    // Description from VyOS (e.g., "WAN Link") 
  address: string[];             // IP addresses (e.g., ["10.0.0.1/24", "dhcp"])
}
🆕 Router Registry Schema (vyos-routers.json):
typescript
interface VyosRouter {
  id: string;                    // Unique router ID (auto-generated from hostname)
  name: string;                  // Hostname (auto-discovered from VyOS)
  host: string;                  // IP address for management
  apiKey: string;                // VyOS HTTPS API key
  version: string;               // VyOS version (auto-detected: "1.4" or "1.5")
  location?: string;             // Optional location tag (user-defined)
  interfaces: VyosRouterInterface[];  // Interface list (auto-discovered)
  enabled: boolean;              // Whether router is active
  lastSeen?: number;             // Timestamp of last successful connection
  status?: "online" | "offline" | "unknown";
}
Key Changes from v2:

interfaces is now array of objects with name, description, address

name is hostname from VyOS, not user input

id is auto-generated from hostname (e.g., "VyosBranch206" → "vyos-branch206")

version is auto-detected (1.4 or 1.5)

Action Schema:
typescript
interface VyosAction {
  id: string;                    // Unique action ID
  offset_minutes: number;        // Time offset in cycle (0-60 or 0-120)
  router_id: string;             // Reference to VyosRouter.id
  interface: string;             // Interface name (e.g., "eth2")
  command: string;               // Command name (e.g., "shut", "set-loss", "set-qos")
  parameters?: {                 // Optional parameters based on command
    percent?: number;            // For loss, corruption, reorder
    ms?: number;                 // For latency
    rate?: string;               // For bandwidth (e.g., "10mbit")
    gap?: number;                // For reorder gap
  };
}
Sequence Schema (vyos-sequences.json):
typescript
interface VyosSequence {
  id: string;                    // Unique sequence ID
  name: string;                  // Human-readable name
  description?: string;          // Optional description
  cycle_duration: number;        // Cycle length in minutes (60 or 120)
  enabled: boolean;              // Whether sequence is running
  actions: VyosAction[];         // Array of scheduled actions (can target different routers)
  last_run?: number;             // Timestamp of last execution
  next_run?: number;             // Timestamp of next scheduled run
}
History Log Schema (vyos-sequence-history.jsonl):
typescript
interface ExecutionLog {
  timestamp: number;
  sequence_id: string;
  sequence_name: string;
  action_id: string;
  router_id: string;
  router_name: string;           // Router hostname for easy filtering
  command: string;
  interface: string;
  parameters?: any;
  success: boolean;
  error?: string;
  duration_ms?: number;
}
3. Backend API Endpoints
Add to existing Express server (server.ts):

🆕 Router Management (Enhanced with Auto-Discovery)
typescript
// Get all routers
GET /api/vyos/routers
Response: VyosRouter[]

// 🆕 Discover and add a router (AUTO-DISCOVERY)
POST /api/vyos/routers/discover
Body: { 
  host: string,           // IP address
  apiKey: string,         // VyOS API key
  location?: string       // Optional location tag
}
Response: { success: boolean, router: VyosRouter }

/* Backend Workflow:
 * 1. Execute: ./vyos_sdwan_ctl.py --host X --key Y get-info
 * 2. Parse JSON response to extract:
 *    - version: "1.4" or "1.5"
 *    - hostname: "VyosBranch206"
 *    - interfaces: [{ name, description, address }]
 * 3. Auto-generate router ID: slugify(hostname) → "vyos-branch206"
 * 4. Create VyosRouter object:
 *    {
 *      id: "vyos-branch206",
 *      name: "VyosBranch206",  // from hostname
 *      host: req.body.host,
 *      apiKey: req.body.apiKey,
 *      version: info.version,   // auto-detected
 *      interfaces: info.interfaces,  // auto-discovered
 *      location: req.body.location || undefined,
 *      enabled: true,
 *      status: "online",
 *      lastSeen: Date.now()
 *    }
 * 5. Save to vyos-routers.json
 * 6. Return router object to frontend
 */

// 🆕 Re-discover router info (refresh interfaces/version)
POST /api/vyos/routers/:id/rediscover
Response: { success: boolean, router: VyosRouter }
/* 
 * Call get-info again, update version + interfaces
 * Keep existing: id, name, host, apiKey, location, enabled
 */

// Update an existing router (manual overrides)
PUT /api/vyos/routers/:id
Body: Partial<VyosRouter>  // Allow editing: location, enabled only
Response: { success: boolean, router: VyosRouter }

// Test router connection (health check)
POST /api/vyos/routers/:id/test
Response: { 
  success: boolean, 
  status: "online" | "offline", 
  latency_ms?: number,
  version?: string,    // Optionally return current version
  hostname?: string    // Optionally return current hostname
}

// Delete a router
DELETE /api/vyos/routers/:id
Response: { success: boolean }
Sequence Management
typescript
// Get all sequences
GET /api/vyos/sequences
Response: VyosSequence[]

// Create or update a sequence
POST /api/vyos/sequences
Body: VyosSequence
Response: { success: boolean }

// Start a sequence (enable scheduler)
POST /api/vyos/sequences/:id/start
Response: { success: boolean }

// Stop a sequence
POST /api/vyos/sequences/:id/stop
Response: { success: boolean }

// Delete a sequence
DELETE /api/vyos/sequences/:id
Response: { success: boolean }

// Execute action immediately (live mode, bypass scheduler)
POST /api/vyos/execute-live
Body: VyosAction
Response: { success: boolean, data: any }

// Get execution history
GET /api/vyos/history
Query: ?limit=100&sequence_id=xxx&router_id=xxx
Response: ExecutionLog[]

// Get current scheduler status
GET /api/vyos/status
Response: {
  running_sequences: string[],
  next_actions: { 
    sequence_id: string, 
    action: VyosAction, 
    router_name: string,    // Hostname, not ID
    time_until_sec: number 
  }[]
}
4. Backend Scheduler Implementation
Requirements:

Use native setInterval (no external dependencies)

Store active timers in Map<string, NodeJS.Timeout>

Each action in a sequence gets its own interval timer

On sequence start:

Calculate offset for each action

Schedule with setInterval(cycle_duration) + setTimeout(offset)

Resolve router credentials from vyos-routers.json before execution

On sequence stop: clear all associated timers

Log every execution to vyos-sequence-history.jsonl with router context

Auto-start enabled sequences on server startup

Health Check: Periodically ping all routers (every 60s) and update status

Execution Flow:

User clicks "Start Sequence"

Backend resolves router_id → fetches router object from vyos-routers.json

Extract: host, apiKey, version, name (hostname)

Backend spawns Python subprocess:

ts
spawn('python3', [
  './vyos_sdwan_ctl.py', 
  '--host', router.host, 
  '--key', router.apiKey, 
  '--version', router.version,  // Pass detected version
  command,
  '--iface', action.interface,
  ...params
])
Capture stdout (JSON response)

Parse and log result to JSONL with router_name (hostname) for filtering

Emit real-time update via existing patterns

🆕 Health Check Implementation:

typescript
// Run every 60 seconds
setInterval(async () => {
  const routers = loadRouters();
  
  for (const router of routers) {
    if (!router.enabled) continue;
    
    try {
      const start = Date.now();
      const result = await executeCommand(
        'get-info',
        router.host,
        router.apiKey
      );
      const latency = Date.now() - start;
      
      if (result.success) {
        router.status = 'online';
        router.lastSeen = Date.now();
        
        // Optionally update version/hostname if changed
        if (result.version !== router.version) {
          console.log(`Version changed: ${router.name} ${router.version} → ${result.version}`);
          router.version = result.version;
        }
        if (result.hostname !== router.name) {
          console.log(`Hostname changed: ${router.name} → ${result.hostname}`);
          // Decision: update or warn user?
        }
      }
    } catch (error) {
      router.status = 'offline';
      console.error(`Health check failed for ${router.name}:`, error);
    }
  }
  
  saveRouters(routers);
}, 60000);
5. Frontend UI Components
New Tab: Add "Chaos" tab to existing dashboard (after "Failover" tab)

Main View Components:
🆕 A. Router Management Section (Top Panel with Auto-Discovery)
Card-based layout showing all registered routers:

text
┌─────────────────────────────────────────────────────────────┐
│  🖧 VyOS Routers                          [+ ADD ROUTER]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐│
│  │ ● VyosBranch206  │  │ ● VyosBranch207  │  │ ○ VyosHQ   ││
│  │ 192.168.122.64   │  │ 192.168.122.65   │  │ 10.0.0.1   ││
│  │ Paris            │  │ London           │  │ HQ         ││
│  │ v1.4 | 4 ifaces  │  │ v1.5 | 2 ifaces  │  │ v1.5 | 4   ││
│  │ [🔄] [🧪] [✏️]   │  │ [🔄] [🧪] [✏️]   │  │ [🔄] [🧪] [✏️]││
│  └──────────────────┘  └──────────────────┘  └────────────┘│
└─────────────────────────────────────────────────────────────┘
Features:

Status indicator: ● Green (online) / ○ Gray (offline) / ⚠ Yellow (unknown)

Shows:

Hostname (from VyOS, not user input)

IP address

Location (optional tag)

VyOS version (auto-detected)

Interface count (auto-discovered)

Actions:

🔄 REFRESH: Re-run get-info to update interfaces/version

🧪 TEST: Health check with latency display

✏️ EDIT: Manual overrides (location, enabled status)

Hover card shows:

Full interface list with descriptions

IP addresses per interface

API Key (masked: SUPE********)

Last seen timestamp

🆕 Add Router Modal (Auto-Discovery Flow)
Step 1: Discovery

text
┌──────────────────────────────────────────────────────────┐
│ Add VyOS Router                                          │
├──────────────────────────────────────────────────────────┤
│ Auto-Discovery (Recommended)                             │
│ ┌────────────────────────────────────────────────────┐  │
│ │ IP Address*:   [192.168.122.64                  ]  │  │
│ │ API Key*:      [SUPERSECRET                     ]  │  │
│ │ Location:      [Paris (optional)                ]  │  │
│ │                                                    │  │
│ │                 [🔍 Discover Router Info]         │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│                               [Cancel]                   │
└──────────────────────────────────────────────────────────┘
Step 2: Review Discovered Info

text
┌──────────────────────────────────────────────────────────┐
│ Add VyOS Router - Review Discovered Information         │
├──────────────────────────────────────────────────────────┤
│ ✅ Router discovered successfully!                       │
│                                                          │
│ Connection Details                                       │
│ ┌────────────────────────────────────────────────────┐  │
│ │ IP Address:    192.168.122.64                      │  │
│ │ Location:      Paris                               │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Discovered Information (Read-Only)                       │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Hostname:      VyosBranch206                       │  │
│ │ VyOS Version:  1.4                                 │  │
│ │ Router ID:     vyos-branch206 (auto-generated)    │  │
│ │                                                    │  │
│ │ Interfaces (4 discovered):                         │  │
│ │                                                    │  │
│ │ -  eth0 - AWS Branch express route                  │  │
│ │   └─ 10.10.206.6/24                               │  │
│ │ -  eth3 - Connection to BR2                         │  │
│ │   └─ 192.168.216.2/24                             │  │
│ │ -  eth4 - MGMT                                      │  │
│ │   └─ dhcp                                          │  │
│ │ -  eth5 - Lan206                                    │  │
│ │   └─ 192.168.206.1/24                             │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ [☑] Enable router immediately                            │
│                                                          │
│                       [Cancel] [💾 Save Router]          │
└──────────────────────────────────────────────────────────┘
Workflow:

User enters: IP, API Key, Location (optional)

User clicks "🔍 Discover Router Info"

Frontend calls: POST /api/vyos/routers/discover

Backend executes: ./vyos_sdwan_ctl.py --host X --key Y get-info

Backend returns:

json
{
  "success": true,
  "router": {
    "id": "vyos-branch206",
    "name": "VyosBranch206",
    "host": "192.168.122.64",
    "version": "1.4",
    "interfaces": [...],
    "location": "Paris",
    "enabled": true,
    "status": "online"
  }
}
Frontend displays discovered info (read-only)

User clicks "💾 Save Router"

Router card appears in router list

Validation:

IP address format check

API key minimum 8 chars

Discovery must succeed before saving

Router ID uniqueness check (no duplicates)

Show error toast if connection fails

Error Handling:

text
┌──────────────────────────────────────────────────────────┐
│ ❌ Discovery Failed                                       │
│                                                          │
│ Could not connect to VyOS router at 192.168.122.64      │
│                                                          │
│ Possible reasons:                                        │
│ -  Router is offline or unreachable                       │
│ -  Invalid API key                                        │
│ -  Firewall blocking HTTPS (port 443)                    │
│ -  VyOS HTTPS API not enabled                            │
│                                                          │
│ Error details:                                           │
│ Connection timeout after 5000ms                          │
│                                                          │
│                 [Try Again] [Cancel]                     │
└──────────────────────────────────────────────────────────┘
🆕 Edit Router Modal (Manual Overrides)
text
┌──────────────────────────────────────────────────────────┐
│ Edit Router: VyosBranch206                              │
├──────────────────────────────────────────────────────────┤
│ Router Information (Read-Only)                           │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Hostname:      VyosBranch206                       │  │
│ │ Router ID:     vyos-branch206                      │  │
│ │ IP Address:    192.168.122.64                      │  │
│ │ VyOS Version:  1.4                                 │  │
│ │ API Key:       SUPE** [Show]                │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Editable Settings                                        │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Location:      [Paris                            ] │  │
│ │                                                    │  │
│ │ [☑] Enable router                                  │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Interfaces (4)              [🔄 Refresh from Router]    │
│ ┌────────────────────────────────────────────────────┐  │
│ │ -  eth0 - AWS Branch express route (10.10.206.6)   │  │
│ │ -  eth3 - Connection to BR2 (192.168.216.2)        │  │
│ │ -  eth4 - MGMT (dhcp)                              │  │
│ │ -  eth5 - Lan206 (192.168.206.1)                   │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Last Seen: 2 minutes ago                                 │
│ Status: ● Online (15ms)                                  │
│                                                          │
│             [Delete Router] [Cancel] [Save Changes]     │
└──────────────────────────────────────────────────────────┘
Features:

Read-only fields: Hostname, Router ID, IP, Version, API Key

Editable fields: Location, Enabled status

"🔄 Refresh from Router" button: Calls POST /api/vyos/routers/:id/rediscover

Re-runs get-info

Updates: version, interfaces[]

Keeps: id, name, host, apiKey, location, enabled

Delete Router button (with confirmation)

B. Sequence List (Card-based layout with hostnames)
For each sequence, show:

Sequence name + description

Cycle duration badge (60min or 120min)

Status indicator (Running/Stopped with animated pulse)

Action summary with router hostnames: "5 actions across 3 routers: VyosBranch206, VyosBranch207, VyosHQ"

Start/Stop button

Edit/Delete buttons

Next action countdown with hostname (e.g., "Set-loss eth0 on VyosBranch206 in 3m 42s")

text
┌─────────────────────────────────────────────────────────┐
│ 🔥 Multi-Site WAN Failure    ⏱ 60min  ● RUNNING       │
│ Simulate cascading failures across branch offices      │
│                                                          │
│ 6 actions │ 🖧 VyosBranch206 VyosBranch207 VyosHQ     │
│                                                          │
│ ► Next: Set 10% loss eth1 on VyosBranch207 in 2m 15s   │
│                                                          │
│                        [⏹ STOP] [✏️ EDIT] [🗑 DELETE]   │
└─────────────────────────────────────────────────────────┘
🆕 C. Timeline Visualizer (Interactive with hostnames)
Enhanced with router color coding and hostnames:

text
┌─────────────────────────────────────────────────────────┐
│  Multi-Site WAN Failure - Cycle: 60 minutes            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  0min    15min     30min     45min     60min (restart)  │
│  │────────┼─────────┼─────────┼─────────┼──────────     │
│                                                          │
│  🔵 Shut eth0         (VyosBranch206 - Paris)           │
│  🟢 Loss 10% eth1     (VyosBranch207 - London)          │
│  🔵 NoShut eth0       (VyosBranch206 - Paris)           │
│  🟢 Clear eth1        (VyosBranch207 - London)          │
│  🟠 Latency 200ms eth2 (VyosHQ - HQ)                    │
│  ⚪ Clear All         (All Routers)                     │
│                                                          │
│  ► Currently: 🟢 Loss 10% eth1 (VyosBranch207)         │
│  ⏱ Next: 🔵 NoShut eth0 (VyosBranch206) in 9m 45s     │
│                                                          │
│  Filters: [All Routers ▼] [Show: Timeline ▼]           │
└─────────────────────────────────────────────────────────┘
Features:

Each router gets a consistent color badge (auto-assigned from hostname hash)

Action markers show router hostname + location + command

Click action to edit

Filter by router: Dropdown shows "All Routers", "VyosBranch206", "VyosBranch207", etc.

Visual grouping by router

Tooltips show full interface details (name + description)

🆕 D. Sequence Builder Modal (Enhanced with hostnames & descriptions)
Updated form with hostname display and interface descriptions:

text
┌─────────────────────────────────────────────────────────┐
│ Create Chaos Sequence                                   │
├─────────────────────────────────────────────────────────┤
│ Sequence Name*:  [Multi-Site WAN Test              ]   │
│ Description:     [Simulate branch office failures   ]   │
│ Cycle Duration:  (●) 60min  ( ) 120min                 │
│                                                          │
│ ┌─ Action 1 ──────────────────────────────────────┐    │
│ │ Time Offset:  [════●═══════════] 15 min         │    │
│ │ Router*:      [VyosBranch206 - Paris (192.168.122.64) ▼]│
│ │ Interface*:   [eth0 - AWS Branch express route  ▼]│    │
│ │ Command*:     [set-loss ▼]                       │    │
│ │ Loss %:       [════●═══] 5%                      │    │
│ │                                  [🗑 Remove]     │    │
│ └──────────────────────────────────────────────────┘    │
│                                                          │
│ ┌─ Action 2 ──────────────────────────────────────┐    │
│ │ Time Offset:  [═══════════●═══] 30 min          │    │
│ │ Router*:      [VyosBranch207 - London (192.168.122.65) ▼]│
│ │ Interface*:   [eth1 - Connection to BR2         ▼]│    │
│ │ Command*:     [clear-qos ▼]                      │    │
│ │                                  [🗑 Remove]     │    │
│ └──────────────────────────────────────────────────┘    │
│                                                          │
│ [+ Add Action]                                           │
│                                                          │
│ Preview Timeline: [▼ Show]                              │
│                                                          │
│                     [Cancel] [💾 Save Sequence]          │
└─────────────────────────────────────────────────────────┘
Router Dropdown:

Format: "Hostname - Location (IP)"

Example: VyosBranch206 - Paris (192.168.122.64)

Shows all enabled routers from vyos-routers.json

Grayed out if router is offline

Shows status indicator: ● (online) / ○ (offline)

Link to "Add Router" if no routers configured

Sorted alphabetically by hostname

Interface Dropdown:

Format: "name - description"

Example: eth0 - AWS Branch express route

Auto-populated from selected router's interfaces[] array

Shows IP addresses in tooltip

If no interfaces, show:

text
No interfaces configured
[🔄 Refresh Router Info]
Command Dropdown:

Groups:

Interface Control: shut, no-shut

Impairments: set-latency, set-loss, set-corruption, set-reorder, set-rate

Combined: set-qos (all-in-one)

Clear: clear-latency, clear-loss, clear-qos

Validation:

At least 1 action required

No two actions at exact same offset (warn, but allow)

Offset must be < cycle_duration

Router must exist in registry and be online

Interface must exist in router's interface list

Command parameters must be valid (e.g., loss 0-100%)

🆕 E. Live Execution Monitor (With hostnames)
Real-time panel showing:

Last 10 executed actions with router hostname badges

Color-coded by success/failure

Click entry to see full JSON response

Shows interface description in tooltip

text
┌─────────────────────────────────────────────────────────┐
│ 📡 Live Execution Monitor                [Clear All]    │
├─────────────────────────────────────────────────────────┤
│ 14:15:42  🔵 VyosBranch206  set-loss eth0 5%  ✓ 45ms   │
│           ↳ AWS Branch express route                    │
│                                                          │
│ 14:10:38  🔵 VyosBranch206  shut eth0         ✓ 32ms   │
│           ↳ AWS Branch express route                    │
│                                                          │
│ 14:05:12  🟢 VyosBranch207  clear-qos eth1    ✗ Timeout│
│           ↳ Connection to BR2                           │
│                                                          │
│ 14:00:05  🟠 VyosHQ         latency 200ms eth2 ✓ 50ms   │
│           ↳ WAN Link                                    │
└─────────────────────────────────────────────────────────┘
Features:

Router hostname displayed (not ID)

Interface description shown below action

Color badge per router (consistent across app)

Click entry to expand full JSON response

Auto-scroll to latest

"Clear All" button to clear display (doesn't affect history)

🆕 F. History Table (Enhanced with hostnames & descriptions)
Paginated table with router filtering:

Columns:

Timestamp	Sequence	Router	Interface	Action	Status	Duration
14:15:42	Multi-Site WAN	🔵 VyosBranch206	eth0 - AWS Branch	set-loss 5%	✓	45ms
14:10:38	Multi-Site WAN	🔵 VyosBranch206	eth0 - AWS Branch	shut	✓	32ms
14:05:12	Multi-Site WAN	🟢 VyosBranch207	eth1 - Connection BR2	clear-qos	✗	3000ms
Filters:

Router: Dropdown with "All Routers" / "VyosBranch206" / "VyosBranch207" / ...

Sequence: Dropdown with "All Sequences" / [sequence names]

Status: "All" / "Success" / "Failed"

Date Range: Date picker

Search: Free text search (interface, command, router)

Export:

CSV button: Downloads filtered data with all columns

Includes: timestamp, sequence_id, router_id, router_name, interface, description, command, parameters, success, error, duration_ms

6. UI/UX Requirements
Design System (match existing app):

Colors:

Background: slate-900, slate-800

Primary: blue-600, blue-500

Success: green-600, green-500

Warning: yellow-600, orange-500

Error: red-600, red-500

Router badges: Rotate through ["blue", "green", "orange", "purple", "pink", "cyan", "indigo", "teal"]

Typography: Tailwind defaults, font-sans

Icons: Lucide React

Router, Server, Activity, Zap, Clock, Play, Square, Plus, Edit, Trash2, RefreshCw, TestTube2, Search, Download

Spacing: Consistent space-y-4, gap-4, p-4

Rounded corners: rounded-xl, rounded-2xl for cards

Shadows: shadow-lg, shadow-xl for elevated elements

Animations:

animate-pulse for running sequences

transition-all duration-300 for hover effects

animate-spin for loading states

Router Color Assignment:

typescript
// Deterministic color from router ID
function getRouterColor(routerId: string): string {
  const colors = ["blue", "green", "orange", "purple", "pink", "cyan", "indigo", "teal"];
  const hash = routerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

// Usage in component
<span className={`bg-${getRouterColor(router.id)}-600 text-white px-2 py-1 rounded text-xs font-medium`}>
  {router.name}
</span>
Responsiveness:

Desktop (≥1024px):

2-column layout (routers left, sequences right)

Timeline side-by-side with actions

Full interface descriptions

Tablet (768-1023px):

Stacked layout (routers top, sequences bottom)

Collapsed timeline

Abbreviated descriptions

Mobile (<768px):

Single column

Router cards scrollable horizontal

Timeline as list view

Compact badges

Accessibility:

ARIA labels: All interactive elements

Keyboard navigation: Tab order, Enter/Space for actions

Screen reader: Status announcements for running/stopped

Color contrast: WCAG AA compliant

Focus indicators: Visible outlines on all focusable elements

7. Edge Cases & Error Handling
Scenarios:

Router unreachable during discovery

Show error toast: "Could not connect to router at 192.168.122.64"

Do not save router

Suggest checking: IP, API key, firewall, VyOS API enabled

Invalid API key

Show error: "Authentication failed - Invalid API key"

Do not save router

Hostname changes on VyOS

Health check detects mismatch

Show warning badge on router card: "⚠ Hostname changed: VyosBranch206 → VyosBranch206-New"

Suggest re-discovery

Version upgrade (1.4 → 1.5)

Health check detects version change

Auto-update router.version in registry

Show notification: "✓ Router upgraded: v1.4 → v1.5"

Interface added/removed on VyOS

Health check or refresh detects change

Update router.interfaces[] array

Show notification: "Interface eth6 added to VyosBranch206"

Sequence references offline router

Show warning badge: "⚠ 1 router offline"

Allow sequence start

Skip actions for offline router, log error

Sequence references deleted router

Block deletion with modal: "This router is used in 3 sequences. Reassign or delete sequences first."

Show list of affected sequences

Interface doesn't exist

Validate before execution

Show error: "Interface eth99 not found on VyosBranch206"

Log to history with error

Clock drift

Use Date.now() for all scheduling (not relative timers)

Recalculate on each cycle restart

Concurrent actions on same router

Queue actions sequentially

Log wait time: "Queued 2.3s"

Validation Rules:

Router Discovery:

Valid IP format (IPv4 or IPv6)

API key minimum 8 characters

Discovery must succeed before save

Router ID unique (no duplicates)

Sequence Builder:

At least 1 action required

Offset must be 0 ≤ offset < cycle_duration

Router must exist and be enabled

Interface must exist in router's interface list

Parameters in valid range (e.g., loss 0-100%, latency 1-9999ms)

8. Future Enhancements (Out of Scope for v1)
Bulk Router Import: Upload CSV with IP, API Key, Location

Templates Library: Pre-built scenarios (Fiber Cut, ISP Congestion, DDoS)

Multi-Router Actions: "Shut eth2 on ALL branch routers simultaneously"

Conditional Actions: "If latency > 200ms on VyosBR1, then clear-qos on VyosBR2"

Router Groups/Tags: Tag routers, apply actions to groups

Metrics Dashboard: Show impact of chaos (traffic drops, convergence time)

Automated Rollback: If action fails, execute rollback action

Encrypted API Keys: AES-256 encryption with master key

Slack/Email Notifications: Alert on sequence start/stop/failure

Audit Log UI: Dedicated page for all router add/edit/delete operations

Duplicate Sequence: Clone with "Copy of..." prefix

Sequence Folders: Organize sequences into folders

Import/Export: JSON file format for routers + sequences

Dry-Run Mode: Simulate sequence without executing

Action Scheduling: Specific date/time instead of repeating cycle

9. Success Criteria
Must Have (v3):

✅ User can add VyOS router by entering only IP + API Key
✅ System auto-discovers: hostname, version, interfaces (with descriptions & IPs)
✅ User sees router hostname in all UI elements (cards, dropdowns, timeline, history)
✅ User can "🔄 Refresh" router to update interfaces/version without re-adding
✅ User can test router connectivity before adding (with latency display)
✅ User can create sequence with actions targeting different routers
✅ Interface dropdown shows "name - description" format
✅ Router dropdown shows "Hostname - Location (IP)" format
✅ User can start/stop sequences via UI
✅ Actions execute on correct routers at correct times in repeating cycle
✅ Execution history shows router hostname (not just ID)
✅ Timeline visualization shows router hostname + location for each action
✅ Live execution monitor shows router hostname + interface description
✅ Live mode works (instant execution without scheduler)
✅ Router status indicators (●/○) update automatically (background health check)
✅ Version detection works for both VyOS 1.4 and 1.5
✅ All existing app functionality remains working

Nice to Have (v3+):

🎯 Real-time countdown with hostname ("Next: VyosBranch206 in 2m 15s")
🎯 Visual feedback when action executes (pulse on router card)
🎯 Router health dashboard (uptime %, success rate %)
🎯 Drag-and-drop action reordering
🎯 Quick action: "Clear all impairments on all routers" button
🎯 Bulk router import (CSV)
🎯 Hostname mismatch detection

10. Implementation Priority
Phase 1 (MVP - Auto-Discovery):

✅ Backend: POST /api/vyos/routers/discover endpoint

✅ Backend: Execute Python get-info and parse JSON

✅ Backend: Auto-generate router ID from hostname (slugify)

✅ Backend: Store router with auto-discovered data

✅ Frontend: Router discovery modal (Step 1 + Step 2)

✅ Frontend: Display hostnames in router cards

✅ Frontend: Router dropdown with "Hostname - Location (IP)"

✅ Frontend: Interface dropdown with "name - description"

Phase 2 (Enhanced UI):

✅ Frontend: Timeline with hostname labels

✅ Frontend: Live monitor with hostnames + descriptions

✅ Frontend: History table with hostname filtering

✅ Backend: Health check background polling (every 60s)

✅ Frontend: "🔄 Refresh" button (re-discover)

✅ Backend: POST /api/vyos/routers/:id/rediscover

Phase 3 (Polish):

Frontend: Drag-and-drop in builder

Frontend: Router health dashboard

Backend: Hostname/version change detection

Frontend: Bulk router import (CSV)

Frontend: Export/Import sequences

Frontend: Quick action buttons

11. Code Integration Notes
Backend (server.ts):

typescript
// New endpoint: Router Discovery
app.post('/api/vyos/routers/discover', authenticateToken, async (req, res) => {
  const { host, apiKey, location } = req.body;
  
  try {
    // Execute Python script
    const result = await executeCommand('get-info', host, apiKey);
    
    if (!result.success) {
      return res.status(400).json({ success: false, error: 'Discovery failed' });
    }
    
    // Auto-generate router ID
    const routerId = slugify(result.hostname); // "VyosBranch206" → "vyos-branch206"
    
    // Check for duplicates
    const routers = loadRouters();
    if (routers.some(r => r.id === routerId)) {
      return res.status(400).json({ success: false, error: 'Router already exists' });
    }
    
    // Create router object
    const newRouter: VyosRouter = {
      id: routerId,
      name: result.hostname,        // "VyosBranch206"
      host: host,
      apiKey: apiKey,
      version: result.version,       // "1.4" or "1.5"
      location: location || undefined,
      interfaces: result.interfaces, // [{ name, description, address }]
      enabled: true,
      status: 'online',
      lastSeen: Date.now()
    };
    
    // Save to file
    routers.push(newRouter);
    saveRouters(routers);
    
    res.json({ success: true, router: newRouter });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// New endpoint: Re-discover router info
app.post('/api/vyos/routers/:id/rediscover', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const routers = loadRouters();
  const router = routers.find(r => r.id === id);
  
  if (!router) {
    return res.status(404).json({ success: false, error: 'Router not found' });
  }
  
  try {
    const result = await executeCommand('get-info', router.host, router.apiKey);
    
    if (result.success) {
      // Update auto-discovered fields
      router.version = result.version;
      router.interfaces = result.interfaces;
      router.lastSeen = Date.now();
      router.status = 'online';
      
      // Optionally warn if hostname changed
      if (result.hostname !== router.name) {
        console.warn(`Hostname mismatch: ${router.name} → ${result.hostname}`);
      }
      
      saveRouters(routers);
      res.json({ success: true, router });
    } else {
      res.status(400).json({ success: false, error: 'Re-discovery failed' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper: Execute Python command
async function executeCommand(command: string, host: string, apiKey: string, version?: string, ...args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonArgs = ['./vyos_sdwan_ctl.py', '--host', host, '--key', apiKey];
    
    // Add --version for all commands except get-info
    if (command !== 'get-info' && version) {
      pythonArgs.push('--version', version);
    }
    
    pythonArgs.push(command, ...args);
    
    const proc = spawn('python3', pythonArgs);
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => { stdout += data; });
    proc.stderr.on('data', (data) => { stderr += data; });
    
    proc.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      } else {
        reject(new Error(stderr || 'Command failed'));
      }
    });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      proc.kill();
      reject(new Error('Command timeout'));
    }, 5000);
  });
}

// Helper: Slugify hostname
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Background health check (every 60s)
setInterval(async () => {
  const routers = loadRouters();
  
  for (const router of routers) {
    if (!router.enabled) continue;
    
    try {
      const start = Date.now();
      const result = await executeCommand('get-info', router.host, router.apiKey);
      const latency = Date.now() - start;
      
      if (result.success) {
        router.status = 'online';
        router.lastSeen = Date.now();
        
        // Auto-update version if changed
        if (result.version !== router.version) {
          console.log(`Version updated: ${router.name} ${router.version} → ${result.version}`);
          router.version = result.version;
        }
        
        // Warn if hostname changed
        if (result.hostname !== router.name) {
          console.warn(`Hostname mismatch: ${router.name} → ${result.hostname}`);
        }
        
        // Auto-update interfaces
        router.interfaces = result.interfaces;
      }
    } catch (error) {
      router.status = 'offline';
      console.error(`Health check failed for ${router.name}:`, error.message);
    }
  }
  
  saveRouters(routers);
}, 60000);
Frontend (RouterDiscoveryModal.tsx):

tsx
import React, { useState } from 'react';
import { Router, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface RouterDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (router: VyosRouter) => void;
}

export function RouterDiscoveryModal({ isOpen, onClose, onSuccess }: RouterDiscoveryModalProps) {
  const [step, setStep] = useState<'input' | 'discovering' | 'review'>('input');
  const [host, setHost] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [location, setLocation] = useState('');
  const [discoveredRouter, setDiscoveredRouter] = useState<VyosRouter | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDiscover = async () => {
    setStep('discovering');
    setError(null);

    try {
      const response = await fetch('/api/vyos/routers/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, apiKey, location }),
      });

      const data = await response.json();

      if (data.success) {
        setDiscoveredRouter(data.router);
        setStep('review');
      } else {
        setError(data.error || 'Discovery failed');
        setStep('input');
      }
    } catch (err) {
      setError('Connection error');
      setStep('input');
    }
  };

  const handleSave = () => {
    if (discoveredRouter) {
      onSuccess(discoveredRouter);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-2xl p-6 max-w-2xl w-full mx-4">
        {step === 'input' && (
          <>
            <h2 className="text-2xl font-bold text-white mb-4">Add VyOS Router</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  IP Address *
                </label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="192.168.122.64"
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  API Key *
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="SUPERSECRET"
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Location (Optional)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Paris"
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg"
                />
              </div>

              {error && (
                <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
                  <p className="text-red-200">{error}</p>
                </div>
              )}

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-slate-300 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDiscover}
                  disabled={!host || !apiKey}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Router className="w-4 h-4" />
                  Discover Router Info
                </button>
              </div>
            </div>
          </>
        )}

        {step === 'discovering' && (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-300">Discovering router...</p>
          </div>
        )}

        {step === 'review' && discoveredRouter && (
          <>
            <div className="flex items-center gap-2 mb-6">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <h2 className="text-2xl font-bold text-white">Router Discovered Successfully!</h2>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-700 rounded-lg p-4">
                <h3 className="text-sm font-medium text-slate-400 mb-2">Connection Details</h3>
                <div className="space-y-2 text-white">
                  <p><span className="text-slate-400">IP Address:</span> {discoveredRouter.host}</p>
                  {discoveredRouter.location && (
                    <p><span className="text-slate-400">Location:</span> {discoveredRouter.location}</p>
                  )}
                </div>
              </div>

              <div className="bg-slate-700 rounded-lg p-4">
                <h3 className="text-sm font-medium text-slate-400 mb-2">Discovered Information (Read-Only)</h3>
                <div className="space-y-2 text-white">
                  <p><span className="text-slate-400">Hostname:</span> {discoveredRouter.name}</p>
                  <p><span className="text-slate-400">VyOS Version:</span> {discoveredRouter.version}</p>
                  <p><span className="text-slate-400">Router ID:</span> {discoveredRouter.id} <span className="text-xs text-slate-500">(auto-generated)</span></p>
                </div>

                <div className="mt-4">
                  <p className="text-sm font-medium text-slate-400 mb-2">
                    Interfaces ({discoveredRouter.interfaces.length} discovered):
                  </p>
                  <div className="space-y-2">
                    {discoveredRouter.interfaces.map((iface) => (
                      <div key={iface.name} className="bg-slate-600 rounded p-3">
                        <p className="text-white font-medium">
                          {iface.name} {iface.description && `- ${iface.description}`}
                        </p>
                        {iface.address.length > 0 && (
                          <p className="text-sm text-slate-400 mt-1">
                            └─ {iface.address.join(', ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-slate-300 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Save Router
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
12. Sample JSON Files (v3)
vyos-routers.json:
json
[
  {
    "id": "vyos-branch206",
    "name": "VyosBranch206",
    "host": "192.168.122.64",
    "apiKey": "SUPERSECRET",
    "version": "1.4",
    "location": "Paris",
    "interfaces": [
      {
        "name": "eth0",
        "description": "AWS Branch express route",
        "address": ["10.10.206.6/24"]
      },
      {
        "name": "eth3",
        "description": "Connection to BR2",
        "address": ["192.168.216.2/24"]
      },
      {
        "name": "eth4",
        "description": "MGMT",
        "address": ["dhcp"]
      },
      {
        "name": "eth5",
        "description": "Lan206",
        "address": ["192.168.206.1/24"]
      }
    ],
    "enabled": true,
    "lastSeen": 1738420862000,
    "status": "online"
  },
  {
    "id": "vyos-branch207",
    "name": "VyosBranch207",
    "host": "192.168.122.65",
    "apiKey": "ANOTHERSECRET",
    "version": "1.5",
    "location": "London",
    "interfaces": [
      {
        "name": "eth0",
        "description": "WAN Link",
        "address": ["10.10.207.6/24"]
      },
      {
        "name": "eth1",
        "description": "LAN",
        "address": ["192.168.207.1/24"]
      }
    ],
    "enabled": true,
    "lastSeen": 1738420862000,
    "status": "online"
  },
  {
    "id": "vyos-hq",
    "name": "VyosHQ",
    "host": "10.0.0.1",
    "apiKey": "HQSECRET",
    "version": "1.5",
    "location": "HQ",
    "interfaces": [
      {
        "name": "eth0",
        "description": "Internet",
        "address": ["203.0.113.1/24"]
      },
      {
        "name": "eth1",
        "description": "MPLS",
        "address": ["192.168.100.1/24"]
      },
      {
        "name": "eth2",
        "description": "Internal",
        "address": ["10.0.1.1/24"]
      },
      {
        "name": "eth3",
        "description": null,
        "address": []
      }
    ],
    "enabled": true,
    "lastSeen": 1738420862000,
    "status": "online"
  }
]
vyos-sequences.json:
json
[
  {
    "id": "seq-multisite-001",
    "name": "Multi-Site WAN Failure",
    "description": "Simulate cascading WAN failures across Paris, London, and HQ offices",
    "cycle_duration": 60,
    "enabled": true,
    "actions": [
      {
        "id": "action-001",
        "offset_minutes": 0,
        "router_id": "vyos-branch206",
        "interface": "eth0",
        "command": "shut",
        "parameters": {}
      },
      {
        "id": "action-002",
        "offset_minutes": 5,
        "router_id": "vyos-branch207",
        "interface": "eth1",
        "command": "set-loss",
        "parameters": {
          "percent": 10
        }
      },
      {
        "id": "action-003",
        "offset_minutes": 15,
        "router_id": "vyos-branch206",
        "interface": "eth0",
        "command": "no-shut",
        "parameters": {}
      },
      {
        "id": "action-004",
        "offset_minutes": 20,
        "router_id": "vyos-branch207",
        "interface": "eth1",
        "command": "clear-qos",
        "parameters": {}
      },
      {
        "id": "action-005",
        "offset_minutes": 30,
        "router_id": "vyos-hq",
        "interface": "eth2",
        "command": "set-latency",
        "parameters": {
          "ms": 200
        }
      },
      {
        "id": "action-006",
        "offset_minutes": 45,
        "router_id": "vyos-hq",
        "interface": "eth2",
        "command": "clear-qos",
        "parameters": {}
      }
    ],
    "last_run": 1738420800000,
    "next_run": 1738424400000
  }
]
vyos-sequence-history.jsonl:
json
{"timestamp":1738420800123,"sequence_id":"seq-multisite-001","sequence_name":"Multi-Site WAN Failure","action_id":"action-001","router_id":"vyos-branch206","router_name":"VyosBranch206","command":"shut","interface":"eth0","parameters":{},"success":true,"duration_ms":45}
{"timestamp":1738421100456,"sequence_id":"seq-multisite-001","sequence_name":"Multi-Site WAN Failure","action_id":"action-002","router_id":"vyos-branch207","router_name":"VyosBranch207","command":"set-loss","interface":"eth1","parameters":{"percent":10},"success":true,"duration_ms":52}
{"timestamp":1738421700789,"sequence_id":"seq-multisite-001","sequence_name":"Multi-Site WAN Failure","action_id":"action-003","router_id":"vyos-branch206","router_name":"VyosBranch206","command":"no-shut","interface":"eth0","parameters":{},"success":true,"duration_ms":38}
{"timestamp":1738422000234,"sequence_id":"seq-multisite-001","sequence_name":"Multi-Site WAN Failure","action_id":"action-004","router_id":"vyos-branch207","router_name":"VyosBranch207","command":"clear-qos","interface":"eth1","parameters":{},"success":false,"error":"Connection timeout","duration_ms":3000}
{"timestamp":1738422600567,"sequence_id":"seq-multisite-001","sequence_name":"Multi-Site WAN Failure","action_id":"action-005","router_id":"vyos-hq","router_name":"VyosHQ","command":"set-latency","interface":"eth2","parameters":{"ms":200},"success":true,"duration_ms":61}
{"timestamp":1738423500890,"sequence_id":"seq-multisite-001","sequence_name":"Multi-Site WAN Failure","action_id":"action-006","router_id":"vyos-hq","router_name":"VyosHQ","command":"clear-qos","interface":"eth2","parameters":{},"success":true,"duration_ms":42}
13. Example User Flow (v3)
User navigates to "Chaos" tab

Sees empty state: "No routers configured" + "+ ADD ROUTER" button

Clicks "+ ADD ROUTER"

Modal opens: "Add VyOS Router - Auto Discovery"

User enters:

IP Address: 192.168.122.64

API Key: SUPERSECRET

Location: Paris (optional)

User clicks "🔍 Discover Router Info"

Frontend shows loading spinner: "Discovering router..."

Backend executes:

bash
./vyos_sdwan_ctl.py --host 192.168.122.64 --key SUPERSECRET get-info
Backend receives:

json
{
  "success": true,
  "version": "1.4",
  "hostname": "VyosBranch206",
  "interfaces": [
    { "name": "eth0", "description": "AWS Branch express route", "address": ["10.10.206.6/24"] },
    { "name": "eth3", "description": "Connection to BR2", "address": ["192.168.216.2/24"] },
    { "name": "eth4", "description": "MGMT", "address": ["dhcp"] },
    { "name": "eth5", "description": "Lan206", "address": ["192.168.206.1/24"] }
  ]
}
Backend auto-generates:

Router ID: vyos-branch206 (slugified from hostname)

Status: online

Last Seen: Current timestamp

Frontend displays "Review Discovered Information" with:

✅ Hostname: VyosBranch206 (read-only)

✅ VyOS Version: 1.4 (read-only)

✅ Router ID: vyos-branch206 (auto-generated, read-only)

✅ Interfaces: 4 discovered (with full details)

User clicks "💾 Save Router"

Router card appears:

text
┌──────────────────┐
│ ● VyosBranch206  │  ← Hostname
│ 192.168.122.64   │
│ Paris            │
│ v1.4 | 4 ifaces  │
│ [🔄] [🧪] [✏️]   │
└──────────────────┘
User repeats for other routers (VyosBranch207, VyosHQ)

User clicks "+ NEW SEQUENCE"

Modal opens: "Create Chaos Sequence"

User enters:

Name: Multi-Site WAN Failure

Description: Simulate cascading WAN failures

Cycle: 60 minutes

User clicks "+ Add Action"

Action 1:

Offset: 0 min

Router: Dropdown shows VyosBranch206 - Paris (192.168.122.64) ← Hostname displayed

Interface: Dropdown shows eth0 - AWS Branch express route ← Description shown

Command: shut

Action 2:

Offset: 30 min

Router: VyosBranch206 - Paris (192.168.122.64)

Interface: eth0 - AWS Branch express route

Command: no-shut

User clicks "💾 Save Sequence"

Sequence card appears:

text
┌─────────────────────────────────────────────┐
│ 🔥 Multi-Site WAN Failure  ⏱ 60min  ○ STOPPED │
│ Simulate cascading WAN failures             │
│                                              │
│ 2 actions │ 🖧 VyosBranch206                │
│                                              │
│                  [▶ START] [✏️] [🗑]         │
└─────────────────────────────────────────────┘
User clicks "▶ START"

Status changes to "● RUNNING" with pulse animation

Timeline shows:

🔵 VyosBranch206 shut eth0 at T+0

🔵 VyosBranch206 no-shut eth0 at T+30

At T+0, action executes:

Backend calls: ./vyos_sdwan_ctl.py --host 192.168.122.64 --key SUPERSECRET --version 1.4 shut --iface eth0

Logs to history: {"router_name":"VyosBranch206",...}

Live Monitor updates:

text
14:00:00  🔵 VyosBranch206  shut eth0  ✓ 45ms
          ↳ AWS Branch express route
History Table updates with hostname:

Timestamp	Sequence	Router	Interface	Action	Status
14:00:00	Multi-Site WAN	🔵 VyosBranch206	eth0 - AWS Branch	shut	✓
At T+30, action executes (no-shut)

At T+60, cycle restarts automatically

User clicks "⏹ STOP" to end sequence

Key Benefits of v3:

User never types hostname or interface names manually
