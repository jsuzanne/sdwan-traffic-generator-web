import json
import os
import time
import subprocess
import random
import signal
import sys
from datetime import datetime

# Configuration paths (aligned with Docker volumes)
CONFIG_DIR = os.getenv('CONFIG_DIR', '/app/config')
LOG_DIR = os.getenv('LOG_DIR', '/var/log/sdwan-traffic-gen')
VERSION_FILE = '/app/VERSION'  # Optional

def get_version():
    try:
        if os.path.exists(VERSION_FILE):
            with open(VERSION_FILE, 'r') as f:
                return f.read().strip()
    except: pass
    return "1.1.0-patch.47"

CONTROL_FILE = os.path.join(CONFIG_DIR, 'voice-control.json')
SERVERS_FILE = os.path.join(CONFIG_DIR, 'voice-servers.txt')
STATS_FILE = os.path.join(LOG_DIR, 'voice-stats.jsonl')
COUNTER_FILE = os.path.join(CONFIG_DIR, 'voice-counter.json')
active_calls = []
current_session_id = str(int(time.time()))

def get_next_call_id():
    counter = 0
    try:
        if os.path.exists(COUNTER_FILE):
            with open(COUNTER_FILE, 'r') as f:
                data = json.load(f)
                counter = data.get('counter', 0)
    except: pass
    
    counter += 1
    
    try:
        with open(COUNTER_FILE, 'w') as f:
            json.dump({'counter': counter}, f)
    except: pass
    
    return f"CALL-{counter:04d}"

def print_banner():
    version = get_version()
    print("="*60)
    print(f"🚀 SD-WAN VOICE ORCHESTRATOR v{version}")
    print(f"📂 Config: {CONFIG_DIR}")
    print(f"📝 Logs: {STATS_FILE}")
    print("="*60)
    sys.stdout.flush()

def load_control():
    # Primary interface discovery
    default_iface = 'eth0'
    try:
        iface_file = os.path.join(CONFIG_DIR, 'interfaces.txt')
        if os.path.exists(iface_file):
            with open(iface_file, 'r') as f:
                content = f.read().strip()
                if content and not content.startswith('#'):
                    default_iface = content.split('\n')[0].strip()
    except: pass

    try:
        if os.path.exists(CONTROL_FILE):
            with open(CONTROL_FILE, 'r') as f:
                data = json.load(f)
                # If explicitly set to eth0 but we found something else in interfaces.txt, prioritize interfaces.txt
                if data.get('interface') == 'eth0' and default_iface != 'eth0':
                    data['interface'] = default_iface
                return data
    except Exception as e:
        print(f"Error loading control file: {e}")
    return {"enabled": False, "max_simultaneous_calls": 3, "sleep_between_calls": 5, "interface": default_iface}

def load_servers():
    servers = []
    try:
        if os.path.exists(SERVERS_FILE):
            with open(SERVERS_FILE, 'r') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    parts = line.split('|')
                    if len(parts) >= 4:
                        target = parts[0]
                        codec = parts[1]
                        weight = int(parts[2])
                        duration = int(parts[3])
                        servers.append({
                            "target": target,
                            "codec": codec,
                            "weight": weight,
                            "duration": duration
                        })
    except Exception as e:
        print(f"Error loading servers file: {e}")
    return servers

def calculate_mos(latency_ms, jitter_ms, loss_pct):
    """
    Simplified E-model (ITU-T G.107) for R-factor and MOS.
    R = 94.2 - Id - Ie
    Id: Delay impairment
    Ie: Equipment impairment (loss/jitter)
    """
    # 1. Effective latency calculation (including jitter buffer approximation)
    effective_latency = latency_ms + (jitter_ms * 2) + 10
    
    # 2. Delay Impairment (Id)
    if effective_latency <= 160:
        id_impairment = effective_latency / 40
    else:
        id_impairment = (effective_latency - 120) / 10
        
    # 3. Equipment Impairment (Ie) - Loss
    # For G.711 (PLC), loss impact is high
    ie_impairment = loss_pct * 2.5
    
    # 4. Final R-factor
    r_factor = 94.2 - id_impairment - ie_impairment
    
    # Clamp R-factor
    r_factor = max(0, min(94.2, r_factor))
    
    # 5. MOS Calculation
    if r_factor < 0: return 1.0
    mos = 1 + (0.035 * r_factor) + (0.000007 * r_factor * (r_factor - 60) * (100 - r_factor))
    
    return round(max(1.0, min(4.4, mos)), 2)

def log_call(event, call_info):
    try:
        # Calculate MOS if it's an end event with QoS data
        if event == "end" and "loss_pct" in call_info:
            mos = calculate_mos(
                call_info.get("avg_rtt_ms", 0),
                call_info.get("jitter_ms", 0),
                call_info.get("loss_pct", 0)
            )
            call_info["mos_score"] = mos

        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "event": event,
            "session_id": current_session_id,
            **call_info
        }
        with open(STATS_FILE, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
            f.flush()
    except Exception as e:
        print(f"Error logging call: {e}")

def pick_server(servers):
    if not servers:
        return None
    total_weight = sum(s['weight'] for s in servers)
    r = random.uniform(0, total_weight)
    upto = 0
    for s in servers:
        if upto + s['weight'] >= r:
            return s
        upto += s['weight']
    return servers[0]

def check_reachability(ip):
    try:
        # Quick ping check (1 packet, 1 second timeout)
        subprocess.check_output(["ping", "-c", "1", "-W", "1", ip], stderr=subprocess.STDOUT)
        return True
    except subprocess.CalledProcessError:
        return False

def start_call(server, interface):
    call_id = get_next_call_id()
    host, port = server['target'].split(':')
    
    # Pre-flight check: is the target reachable?
    if not check_reachability(host):
        timestamp = time.strftime('%H:%M:%S')
        print(f"[{timestamp}] [{call_id}] ⚠️  Target {host} is unreachable. Skipping call.")
        sys.stdout.flush()
        log_call("skipped", {
            "call_id": call_id,
            "target": server['target'],
            "codec": server['codec'],
            "duration": server['duration'],
            "error": "Destination unreachable"
        })
        return None

    # Calculate packet count based on duration and 0.03s sleep in rtp.py
    num_packets = int(server['duration'] / 0.03)
    
    cmd = [
        "python3", "rtp.py",
        "-D", host,
        "-dport", port,
        "--min-count", str(num_packets),
        "--max-count", str(num_packets + 1),
        "--source-interface", interface,
        "--call-id", call_id
    ]
    
    timestamp = time.strftime('%H:%M:%S')
    print(f"[{timestamp}] [{call_id}] 🚀 Executing: {' '.join(cmd)}")
    sys.stdout.flush()
    
    try:
        env = os.environ.copy()
        env["PYTHONUNBUFFERED"] = "1"
        # Capture stdout for QoS data
        proc = subprocess.Popen(cmd, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        call_info = {
            "call_id": call_id,
            "pid": proc.pid,
            "target": server['target'],
            "codec": server['codec'],
            "duration": server['duration']
        }
        timestamp = time.strftime('%H:%M:%S')
        log_call("start", call_info)
        print(f"[{timestamp}] [{call_id}] 📞 CALL STARTED: {server['target']} | {server['codec']} | {server['duration']}s", flush=True)
        return {"proc": proc, "info": call_info}
    except Exception as e:
        print(f"Failed to start rtp.py: {e}")
        return None

def signal_handler(sig, frame):
    print("Shutting down voice orchestrator...")
    for call in active_calls:
        try:
            call['proc'].terminate()
        except:
            pass
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

def main():
    print_banner()
    global active_calls
    
    # CLEAN SLATE : Reset everything on startup
    print("🧹 Cleaning slate for new session...")
    try:
        # 1. Reset Counter
        with open(COUNTER_FILE, 'w') as f:
            json.dump({'counter': 0}, f)
        # 2. Disable simulation by default
        if os.path.exists(CONTROL_FILE):
            with open(CONTROL_FILE, 'r') as f:
                ctrl = json.load(f)
            ctrl['enabled'] = False
            with open(CONTROL_FILE, 'w') as f:
                json.dump(ctrl, f)
        # 3. Clear logs to stay perfectly synchronized with the UI
        with open(STATS_FILE, 'w') as f:
            f.write("")
    except Exception as e:
        print(f"Warning during cleanup: {e}")
    sys.stdout.flush()

    # Log session start
    log_call("session_start", {"version": get_version()})
    
    last_wait_log_time = 0
    
    while True:
        control = load_control()
        servers = load_servers()
        
        # Clean up finished calls
        finished = []
        for call in active_calls:
            if call['proc'].poll() is not None:
                # Capture QoS metrics from stdout
                stdout, _ = call['proc'].communicate()
                qos_data = {}
                if stdout:
                    for line in stdout.decode().split('\n'):
                        if line.startswith("RESULT:"):
                            try:
                                qos_data = json.loads(line.replace("RESULT:", "").strip())
                            except: pass
                
                # Merge QoS data into info for logging
                final_info = {**call['info'], **qos_data}
                log_call("end", final_info)
                finished.append(call)
        
        for call in finished:
            timestamp = time.strftime('%H:%M:%S')
            print(f"[{timestamp}] [{call['info']['call_id']}] ✅ CALL ENDED: {call['info']['target']}")
            sys.stdout.flush()
            active_calls.remove(call)
            
        if control.get("enabled"):
            if len(active_calls) < control.get("max_simultaneous_calls", 3):
                server = pick_server(servers)
                if server:
                    new_call = start_call(server, control.get("interface", "eth0"))
                    if new_call:
                        active_calls.append(new_call)
            else:
                current_time = time.time()
                if current_time - last_wait_log_time > 60: # Cooldown of 60 seconds
                    print(f"ℹ️  Wait: Max simultaneous calls reached ({len(active_calls)}/{control.get('max_simultaneous_calls', 3)})")
                    sys.stdout.flush()
                    last_wait_log_time = current_time
        else:
            if len(active_calls) > 0:
                 print(f"⏳ Simulation disabled. Waiting for {len(active_calls)} calls to finish...")
        
        # Determine check interval
        sleep_time = control.get("sleep_between_calls", 5) if control.get("enabled") else 5
        time.sleep(sleep_time)

if __name__ == "__main__":
    main()
