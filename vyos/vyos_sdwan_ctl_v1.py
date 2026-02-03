#!/usr/bin/env python3

import argparse
import json
import sys
import textwrap
import requests
import urllib3
import re
import logging

# Configure logging to /tmp/vyos_sdwan_ctl.log
logging.basicConfig(
    filename='/tmp/vyos_sdwan_ctl.log',
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)

# Disable SSL warnings for self-signed certificates
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def api_call(host, api_key, operations, verify=False):
    """Call VyOS HTTPS API"""
    url = f"https://{host}/configure"
    data = json.dumps(operations)
    files = {
        "data": (None, data),
        "key": (None, api_key),
    }
    resp = requests.post(url, files=files, verify=verify)
    resp.raise_for_status()
    r = resp.json()
    if not r.get("success", False):
        raise RuntimeError(f"VyOS API error: {r.get('error')}")
    return r

def api_retrieve(host, api_key, verify=False):
    """Retrieve full configuration using /retrieve endpoint"""
    url = f"https://{host}/retrieve"
    files = {
        "data": (None, json.dumps({"op": "showConfig", "path": []})),
        "key": (None, api_key),
    }
    resp = requests.post(url, files=files, verify=verify)
    resp.raise_for_status()
    r = resp.json()
    if not r.get("success", False):
        raise RuntimeError(f"VyOS API error: {r.get('error')}")
    return r.get("data", {})

def get_router_info(host, api_key, verify=False):
    """Get router version, interfaces, and descriptions"""
    try:
        info = {
            "success": True,
            "version": None,
            "interfaces": [],
            "hostname": None
        }
        
        # Get full config as dict
        config = api_retrieve(host, api_key, verify)
        
        # 1. Detect version based on qos vs traffic-policy
        if "qos" in config and config["qos"]:
            info["version"] = "1.5"
        elif "traffic-policy" in config:
            info["version"] = "1.4"
        else:
            info["version"] = "1.4"  # Default
        
        # 2. Get hostname
        if "system" in config and "host-name" in config["system"]:
            info["hostname"] = config["system"]["host-name"]
        
        # 3. Get ethernet interfaces
        if "interfaces" in config and "ethernet" in config["interfaces"]:
            ethernet_ifaces = config["interfaces"]["ethernet"]
            
            for iface_name, iface_data in ethernet_ifaces.items():
                iface_info = {
                    "name": iface_name,
                    "description": iface_data.get("description"),
                    "address": []
                }
                
                # Get addresses (can be string or list)
                addr = iface_data.get("address")
                if addr:
                    if isinstance(addr, str):
                        iface_info["address"] = [addr]
                    elif isinstance(addr, list):
                        iface_info["address"] = addr
                    else:
                        iface_info["address"] = []
                
                info["interfaces"].append(iface_info)
        
        # Sort interfaces by name
        info["interfaces"].sort(key=lambda x: x["name"])
        
        return info
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "version": None,
            "interfaces": [],
            "hostname": None
        }

def op_set_interface_state(iface, shutdown, version):
    """Shut/no-shut interface (same for 1.4 and 1.5)"""
    if shutdown:
        return [{"op": "set", "path": ["interfaces", "ethernet", iface, "disable"]}]
    else:
        return [{"op": "delete", "path": ["interfaces", "ethernet", iface, "disable"]}]

def op_set_latency(iface, ms, version):
    """Set latency (delay) on interface"""
    pol = f"LAB_LAT_{iface}"
    ops = []
    
    if version == "1.4":
        if ms is None:
            ops.append({"op": "delete", "path": ["interfaces", "ethernet", iface, "traffic-policy", "out"]})
            ops.append({"op": "delete", "path": ["traffic-policy", "network-emulator", pol]})
        else:
            ops.append({"op": "set", "path": ["traffic-policy", "network-emulator", pol, "network-delay", str(ms)]})
            ops.append({"op": "set", "path": ["interfaces", "ethernet", iface, "traffic-policy", "out", pol]})
    else:
        if ms is None:
            ops.append({"op": "delete", "path": ["qos", "interface", iface, "egress"]})
            ops.append({"op": "delete", "path": ["qos", "policy", "network-emulator", pol]})
        else:
            ops.append({"op": "set", "path": ["qos", "policy", "network-emulator", pol, "delay", str(ms)]})
            ops.append({"op": "set", "path": ["qos", "interface", iface, "egress", pol]})
    
    return ops

def op_set_loss(iface, percent, version):
    """Set packet loss on interface"""
    pol = f"LAB_LOSS_{iface}"
    ops = []
    
    if version == "1.4":
        if percent is None:
            ops.append({"op": "delete", "path": ["interfaces", "ethernet", iface, "traffic-policy", "out"]})
            ops.append({"op": "delete", "path": ["traffic-policy", "network-emulator", pol]})
        else:
            ops.append({"op": "set", "path": ["traffic-policy", "network-emulator", pol, "packet-loss", str(int(percent))]})
            ops.append({"op": "set", "path": ["interfaces", "ethernet", iface, "traffic-policy", "out", pol]})
    else:
        if percent is None:
            ops.append({"op": "delete", "path": ["qos", "interface", iface, "egress"]})
            ops.append({"op": "delete", "path": ["qos", "policy", "network-emulator", pol]})
        else:
            ops.append({"op": "set", "path": ["qos", "policy", "network-emulator", pol, "loss", str(int(percent))]})
            ops.append({"op": "set", "path": ["qos", "interface", iface, "egress", pol]})
    
    return ops

def op_set_corruption(iface, percent, version):
    """Set packet corruption on interface"""
    pol = f"LAB_CORRUPT_{iface}"
    ops = []
    
    if version == "1.4":
        if percent is None:
            ops.append({"op": "delete", "path": ["interfaces", "ethernet", iface, "traffic-policy", "out"]})
            ops.append({"op": "delete", "path": ["traffic-policy", "network-emulator", pol]})
        else:
            ops.append({"op": "set", "path": ["traffic-policy", "network-emulator", pol, "packet-corruption", str(int(percent))]})
            ops.append({"op": "set", "path": ["interfaces", "ethernet", iface, "traffic-policy", "out", pol]})
    else:
        if percent is None:
            ops.append({"op": "delete", "path": ["qos", "interface", iface, "egress"]})
            ops.append({"op": "delete", "path": ["qos", "policy", "network-emulator", pol]})
        else:
            ops.append({"op": "set", "path": ["qos", "policy", "network-emulator", pol, "corruption", str(int(percent))]})
            ops.append({"op": "set", "path": ["qos", "interface", iface, "egress", pol]})
    
    return ops

def op_set_reorder(iface, percent, gap, version):
    """Set packet reordering on interface"""
    pol = f"LAB_REORDER_{iface}"
    ops = []
    
    if version == "1.4":
        if percent is None:
            ops.append({"op": "delete", "path": ["interfaces", "ethernet", iface, "traffic-policy", "out"]})
            ops.append({"op": "delete", "path": ["traffic-policy", "network-emulator", pol]})
        else:
            ops.append({"op": "set", "path": ["traffic-policy", "network-emulator", pol, "packet-reordering", str(int(percent))]})
            if gap is not None:
                ops.append({"op": "set", "path": ["traffic-policy", "network-emulator", pol, "packet-reordering-correlation", str(gap)]})
            ops.append({"op": "set", "path": ["interfaces", "ethernet", iface, "traffic-policy", "out", pol]})
    else:
        if percent is None:
            ops.append({"op": "delete", "path": ["qos", "interface", iface, "egress"]})
            ops.append({"op": "delete", "path": ["qos", "policy", "network-emulator", pol]})
        else:
            ops.append({"op": "set", "path": ["qos", "policy", "network-emulator", pol, "reordering", str(int(percent))]})
            if gap is not None:
                ops.append({"op": "set", "path": ["qos", "policy", "network-emulator", pol, "reordering-gap", str(gap)]})
            ops.append({"op": "set", "path": ["qos", "interface", iface, "egress", pol]})
    
    return ops

def op_set_rate(iface, rate, version):
    """Set bandwidth rate limit"""
    pol = f"LAB_RATE_{iface}"
    ops = []
    
    if version == "1.4":
        if rate is None:
            ops.append({"op": "delete", "path": ["interfaces", "ethernet", iface, "traffic-policy", "out"]})
            ops.append({"op": "delete", "path": ["traffic-policy", "network-emulator", pol]})
        else:
            ops.append({"op": "set", "path": ["traffic-policy", "network-emulator", pol, "bandwidth", rate]})
            ops.append({"op": "set", "path": ["interfaces", "ethernet", iface, "traffic-policy", "out", pol]})
    else:
        if rate is None:
            ops.append({"op": "delete", "path": ["qos", "interface", iface, "egress"]})
            ops.append({"op": "delete", "path": ["qos", "policy", "network-emulator", pol]})
        else:
            ops.append({"op": "set", "path": ["qos", "policy", "network-emulator", pol, "rate", rate]})
            ops.append({"op": "set", "path": ["qos", "interface", iface, "egress", pol]})
    
    return ops

def op_set_combined_qos(iface, version, delay=None, loss=None, corruption=None, reorder=None, reorder_gap=None, rate=None):
    """Set multiple QoS parameters in a single policy"""
    pol = f"LAB_COMBINED_{iface}"
    ops = []
    
    if all(v is None for v in [delay, loss, corruption, reorder, rate]):
        if version == "1.4":
            ops.append({"op": "delete", "path": ["interfaces", "ethernet", iface, "traffic-policy", "out"]})
            ops.append({"op": "delete", "path": ["traffic-policy", "network-emulator", pol]})
        else:
            ops.append({"op": "delete", "path": ["qos", "interface", iface, "egress"]})
            ops.append({"op": "delete", "path": ["qos", "policy", "network-emulator", pol]})
    else:
        if version == "1.4":
            base_path = ["traffic-policy", "network-emulator", pol]
            
            if delay is not None:
                ops.append({"op": "set", "path": base_path + ["network-delay", str(delay)]})
            if loss is not None:
                ops.append({"op": "set", "path": base_path + ["packet-loss", str(int(loss))]})
            if corruption is not None:
                ops.append({"op": "set", "path": base_path + ["packet-corruption", str(int(corruption))]})
            if reorder is not None:
                ops.append({"op": "set", "path": base_path + ["packet-reordering", str(int(reorder))]})
            if reorder_gap is not None:
                ops.append({"op": "set", "path": base_path + ["packet-reordering-correlation", str(reorder_gap)]})
            if rate is not None:
                ops.append({"op": "set", "path": base_path + ["bandwidth", rate]})
                
            ops.append({"op": "set", "path": ["interfaces", "ethernet", iface, "traffic-policy", "out", pol]})
        else:
            base_path = ["qos", "policy", "network-emulator", pol]
            if delay is not None:
                ops.append({"op": "set", "path": base_path + ["delay", str(delay)]})
            if loss is not None:
                ops.append({"op": "set", "path": base_path + ["loss", str(int(loss))]})
            if corruption is not None:
                ops.append({"op": "set", "path": base_path + ["corruption", str(int(corruption))]})
            if reorder is not None:
                ops.append({"op": "set", "path": base_path + ["reordering", str(int(reorder))]})
            if reorder_gap is not None:
                ops.append({"op": "set", "path": base_path + ["reordering-gap", str(reorder_gap)]})
            if rate is not None:
                ops.append({"op": "set", "path": base_path + ["rate", rate]})
            ops.append({"op": "set", "path": ["qos", "interface", iface, "egress", pol]})
    
    return ops

def main():
    parser = argparse.ArgumentParser(
        description="Control VyOS interface state and network emulation via HTTPS API (supports 1.4 and 1.5)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""
        Examples:
          # Get router info (version, interfaces, descriptions)
          vyos_sdwan_ctl.py --host 192.168.122.64 --key SUPERSECRET get-info

          # Shut / no-shut
          vyos_sdwan_ctl.py --host 192.168.122.64 --key SUPERSECRET --version 1.4 shut --iface eth0
          vyos_sdwan_ctl.py --host 192.168.122.64 --key SUPERSECRET --version 1.5 no-shut --iface eth1

          # Latency
          vyos_sdwan_ctl.py --host 192.168.122.64 --key SUPERSECRET --version 1.4 set-latency --iface eth0 --ms 100
          vyos_sdwan_ctl.py --host 192.168.122.64 --key SUPERSECRET --version 1.4 clear-latency --iface eth0

          # Packet loss
          vyos_sdwan_ctl.py --host 192.168.122.64 --key SUPERSECRET --version 1.4 set-loss --iface eth0 --percent 5
          vyos_sdwan_ctl.py --host 192.168.122.64 --key SUPERSECRET --version 1.4 clear-loss --iface eth0

          # Combined QoS
          vyos_sdwan_ctl.py --host 192.168.122.64 --key SUPERSECRET --version 1.4 set-qos --iface eth0 --ms 50 --loss 3 --rate 100mbit
          vyos_sdwan_ctl.py --host 192.168.122.64 --key SUPERSECRET --version 1.4 clear-qos --iface eth0
        """),
    )

    parser.add_argument("--host", help="VyOS IP or hostname")
    parser.add_argument("--ip", help="Alias for --host")
    parser.add_argument("--key", required=True, help="VyOS HTTPS API key")
    parser.add_argument("--version", choices=["1.4", "1.5"], help="VyOS version (not needed for get-info)")
    parser.add_argument("--secure", action="store_true", help="Enable TLS verification")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show API operations")

    sub = parser.add_subparsers(dest="cmd", required=True)

    # get-info (NEW)
    sub.add_parser("get-info", help="Get router version, interfaces, and descriptions")

    # shut / no-shut
    for cmd in ("shut", "no-shut"):
        p = sub.add_parser(cmd, help=f"{cmd} an interface")
        p.add_argument("--iface", required=True, help="Interface name")

    # latency
    p_lat = sub.add_parser("set-latency", help="Add latency")
    p_lat.add_argument("--iface", required=True)
    p_lat.add_argument("--ms", type=int, required=True)

    p_clat = sub.add_parser("clear-latency", help="Remove latency")
    p_clat.add_argument("--iface", required=True)

    # loss
    p_loss = sub.add_parser("set-loss", help="Add packet loss")
    p_loss.add_argument("--iface", required=True)
    p_loss.add_argument("--percent", type=float, required=True)

    p_closs = sub.add_parser("clear-loss", help="Remove loss")
    p_closs.add_argument("--iface", required=True)

    # corruption
    p_corrupt = sub.add_parser("set-corruption", help="Add corruption")
    p_corrupt.add_argument("--iface", required=True)
    p_corrupt.add_argument("--percent", type=float, required=True)

    p_ccorrupt = sub.add_parser("clear-corruption", help="Remove corruption")
    p_ccorrupt.add_argument("--iface", required=True)

    # reorder
    p_reorder = sub.add_parser("set-reorder", help="Add reordering")
    p_reorder.add_argument("--iface", required=True)
    p_reorder.add_argument("--percent", type=float, required=True)
    p_reorder.add_argument("--gap", type=int, help="Correlation gap")

    p_creorder = sub.add_parser("clear-reorder", help="Remove reordering")
    p_creorder.add_argument("--iface", required=True)

    # rate
    p_rate = sub.add_parser("set-rate", help="Add rate limit")
    p_rate.add_argument("--iface", required=True)
    p_rate.add_argument("--rate", required=True)

    p_crate = sub.add_parser("clear-rate", help="Remove rate limit")
    p_crate.add_argument("--iface", required=True)

    # combined QoS
    p_qos = sub.add_parser("set-qos", help="Set multiple QoS params")
    p_qos.add_argument("--iface", required=True)
    p_qos.add_argument("--ms", type=int)
    p_qos.add_argument("--loss", type=float)
    p_qos.add_argument("--corruption", type=float)
    p_qos.add_argument("--reorder", type=float)
    p_qos.add_argument("--reorder-gap", type=int)
    p_qos.add_argument("--rate")

    p_cqos = sub.add_parser("clear-qos", help="Remove all QoS")
    p_cqos.add_argument("--iface", required=True)

    args = parser.parse_args()

    # Log CLI execution
    logging.info("CLI Call: %s", " ".join(sys.argv))
    logging.info("Parsed Args: cmd=%s host=%s ip=%s key=%s", 
                 args.cmd, args.host, args.ip, 
                 args.key[:4] + "***" if args.key else "None")

    # Handle IP alias fallback
    if not args.host and args.ip:
        args.host = args.ip
    
    if not args.host:
        parser.error("The following arguments are required: --host (or --ip)")

    # Handle get-info command
    if args.cmd == "get-info":
        info = get_router_info(args.host, args.key, args.secure)
        print(json.dumps(info, indent=2))
        sys.exit(0 if info["success"] else 1)

    # For other commands, version is required
    if not args.version:
        print("ERROR: --version is required for this command", file=sys.stderr)
        sys.exit(1)

    ops = []
    version = args.version

    if args.cmd == "shut":
        ops = op_set_interface_state(args.iface, True, version)
    elif args.cmd == "no-shut":
        ops = op_set_interface_state(args.iface, False, version)
    elif args.cmd == "set-latency":
        ops = op_set_latency(args.iface, args.ms, version)
    elif args.cmd == "clear-latency":
        ops = op_set_latency(args.iface, None, version)
    elif args.cmd == "set-loss":
        ops = op_set_loss(args.iface, args.percent, version)
    elif args.cmd == "clear-loss":
        ops = op_set_loss(args.iface, None, version)
    elif args.cmd == "set-corruption":
        ops = op_set_corruption(args.iface, args.percent, version)
    elif args.cmd == "clear-corruption":
        ops = op_set_corruption(args.iface, None, version)
    elif args.cmd == "set-reorder":
        ops = op_set_reorder(args.iface, args.percent, getattr(args, 'gap', None), version)
    elif args.cmd == "clear-reorder":
        ops = op_set_reorder(args.iface, None, None, version)
    elif args.cmd == "set-rate":
        ops = op_set_rate(args.iface, args.rate, version)
    elif args.cmd == "clear-rate":
        ops = op_set_rate(args.iface, None, version)
    elif args.cmd == "set-qos":
        ops = op_set_combined_qos(
            args.iface, version, args.ms, args.loss, args.corruption,
            getattr(args, 'reorder', None), getattr(args, 'reorder_gap', None),
            getattr(args, 'rate', None)
        )
    elif args.cmd == "clear-qos":
        ops = op_set_combined_qos(args.iface, version, None, None, None, None, None, None)

    if args.verbose:
        print(f"API Operations:\n{json.dumps(ops, indent=2)}", file=sys.stderr)

    try:
        res = api_call(args.host, args.key, ops, verify=args.secure)
        print(json.dumps(res, indent=2))
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
