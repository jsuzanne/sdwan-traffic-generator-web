import json
import os
import time
import subprocess
import random
import signal
import sys
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
    try:
        if os.path.exists(CONTROL_FILE):
            with open(CONTROL_FILE, 'r') as f:
                return json.load(f)
    except Exception as e:
        print(f"Error loading control file: {e}")
    return {"enabled": False, "max_simultaneous_calls": 3, "sleep_between_calls": 5, "interface": "eth0"}

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

def log_call(event, call_info):
    try:
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "event": event,
            **call_info
        }
        with open(STATS_FILE, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
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
        print(f"[{call_id}] ⚠️  Target {host} is unreachable. Skipping call.")
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
        "-sport", "5060",
        "--min-count", str(num_packets),
        "--max-count", str(num_packets + 1),
        "--source-interface", interface
    ]
    
    print(f"[{call_id}] 🚀 Executing: {' '.join(cmd)}")
    sys.stdout.flush()
    
    try:
        env = os.environ.copy()
        env["PYTHONUNBUFFERED"] = "1"
        proc = subprocess.Popen(cmd, env=env)
        call_info = {
            "call_id": call_id,
            "pid": proc.pid,
            "target": server['target'],
            "codec": server['codec'],
            "duration": server['duration']
        }
        log_call("start", call_info)
        print(f"[{call_id}] 📞 CALL STARTED: {server['target']} | {server['codec']} | {server['duration']}s")
        sys.stdout.flush()
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
    
    while True:
        control = load_control()
        servers = load_servers()
        
        # Clean up finished calls
        finished = []
        for call in active_calls:
            if call['proc'].poll() is not None:
                log_call("end", call['info'])
                finished.append(call)
        
        for call in finished:
            print(f"[{call['info']['call_id']}] ✅ CALL ENDED: {call['info']['target']}")
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
                pass # Already at max
        else:
            if len(active_calls) > 0:
                 print(f"⏳ Simulation disabled. Waiting for {len(active_calls)} calls to finish...")
        
        # Determine check interval
        sleep_time = control.get("sleep_between_calls", 5) if control.get("enabled") else 5
        time.sleep(sleep_time)

if __name__ == "__main__":
    main()
