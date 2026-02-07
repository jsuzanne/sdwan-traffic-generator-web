#!/usr/bin/env python3
"""
Prisma SD-WAN Flow Browser Query Script using Official Prisma SASE SDK
Collects flow data filtered by UDP source port, source IP, and destination IP
Resolves path IDs to full path names (source to destination)
"""

import json
import argparse
from datetime import datetime, timedelta
import time
import sys
import socket
import ipaddress
from prisma_sase import API, jd

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description='Query Prisma SD-WAN flow browser with filters',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Auto-detect site and query flows
  %(prog)s --auto-detect --udp-src-port 30030 --minutes 5 --json
  
  # Just test auto-detection
  %(prog)s --auto-detect
  
  # List all sites
  %(prog)s --list-sites
  
  # Query flows with UDP source port filter (fast)
  %(prog)s --site-name BR8 --udp-src-port 30030 --minutes 5 --json
  
  # Query flows for convergence test (CALL ID 030)
  %(prog)s --site-name BR8 --udp-src-port 30030 --minutes 5 --json
        """
    )
    
    parser.add_argument(
        '--credentials',
        default='credentials.json',
        help='Path to credentials JSON file (default: credentials.json)'
    )
    
    parser.add_argument(
        '--list-sites',
        action='store_true',
        help='List all sites and exit'
    )
    
    parser.add_argument(
        '--auto-detect',
        action='store_true',
        help='Auto-detect site by matching local IP with ION LAN subnets'
    )
    
    parser.add_argument(
        '--site-id',
        help='Site ID to query flows for'
    )
    
    parser.add_argument(
        '--site-name',
        help='Site name to query flows for (alternative to --site-id)'
    )
    
    parser.add_argument(
        '--udp-src-port',
        type=int,
        help='UDP source port to filter'
    )
    
    parser.add_argument(
        '--src-ip',
        help='Source IP address to filter'
    )
    
    parser.add_argument(
        '--dst-ip',
        help='Destination IP address to filter'
    )
    
    parser.add_argument(
        '--protocol',
        type=int,
        help='Protocol number (17=UDP, 6=TCP, 1=ICMP, etc.)'
    )
    
    parser.add_argument(
        '--hours',
        type=int,
        default=1,
        help='Number of hours to query back (default: 1)'
    )
    
    parser.add_argument(
        '--minutes',
        type=int,
        help='Number of minutes to query back (overrides --hours if set)'
    )
    
    parser.add_argument(
        '--output',
        help='Output JSON filename (default: auto-generated)'
    )
    
    parser.add_argument(
        '--debug',
        action='store_true',
        help='Enable debug output'
    )
    
    parser.add_argument(
        '--page-size',
        type=int,
        default=1,
        help='Number of flows per page (default: 1 for speed)'
    )
    
    parser.add_argument(
        '--region',
        default='de',
        help='PANW region (default: de). Use "de" for Europe, "us" for Americas'
    )
    
    parser.add_argument(
        '--fast',
        action='store_true',
        help='Fast mode: skip path name resolution to speed up query'
    )
    
    parser.add_argument(
        '--json',
        action='store_true',
        help='Output results as JSON to stdout (for integration with Node.js/React)'
    )
    
    return parser.parse_args()


def log_output(message, json_mode=False, is_error=False):
    """Output message only if not in JSON mode"""
    if not json_mode:
        if is_error:
            print(message, file=sys.stderr)
        else:
            print(message)


def get_local_ip():
    """Get the local IP address of this machine"""
    try:
        # Connect to external IP to determine which interface is used
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception as e:
        return None


def get_all_lan_interfaces(sdk, sites, debug=False):
    """
    Get all LAN interfaces for all sites with their subnets
    Returns dict mapping site_id to {site_name, networks}
    """
    site_lan_map = {}

    # Get ALL elements at once (no site_id parameter)
    try:
        if debug:
            print(f"   Fetching all elements...", file=sys.stderr)

        elements_resp = sdk.get.elements()
        if not elements_resp.cgx_status:
            if debug:
                print(f"   Could not get elements: {elements_resp.status_code}", file=sys.stderr)
            return {}

        all_elements = elements_resp.cgx_content.get('items', [])

        if debug:
            print(f"   Found {len(all_elements)} total elements", file=sys.stderr)

    except Exception as e:
        if debug:
            print(f"   Error getting elements: {e}", file=sys.stderr)
        return {}

    # Build site_id to site_name map
    site_id_to_name = {site.get('id'): site.get('name') for site in sites}

    # Process each element
    for element in all_elements:
        element_id = element.get('id')
        element_name = element.get('name', 'Unknown')
        element_site_id = element.get('site_id')

        if not element_site_id or element_site_id not in site_id_to_name:
            continue

        site_name = site_id_to_name[element_site_id]

        if debug:
            print(f"   Checking element: {element_name} at site {site_name}", file=sys.stderr)

        try:
            # Get interfaces for this element
            intf_resp = sdk.get.interfaces(site_id=element_site_id, element_id=element_id)

            if not intf_resp.cgx_status:
                if debug:
                    print(f"     Could not get interfaces: {intf_resp.status_code}", file=sys.stderr)
                continue

            interfaces = intf_resp.cgx_content.get('items', [])

            if debug:
                print(f"     Found {len(interfaces)} interfaces", file=sys.stderr)

            for interface in interfaces:
                # Check for vlan or lan type interfaces
                if interface.get('type') in ['vlan', 'lan', 'loopback']:
                    interface_name = interface.get('name', 'Unknown')

                    # Get IP config
                    ipv4_config = interface.get('ipv4_config', {})
                    if ipv4_config and ipv4_config.get('type') == 'static':
                        static_config = ipv4_config.get('static_config', {})

                        # IP address can be in CIDR format (192.168.219.254/24) or separate fields
                        ip_address_raw = static_config.get('address')

                        if ip_address_raw:
                            try:
                                # Parse CIDR notation
                                if '/' in ip_address_raw:
                                    network = ipaddress.IPv4Network(ip_address_raw, strict=False)
                                    ip_address = str(network.network_address)
                                else:
                                    # Fallback: try with netmask field
                                    netmask = static_config.get('netmask')
                                    if netmask:
                                        network = ipaddress.IPv4Network(f"{ip_address_raw}/{netmask}", strict=False)
                                        ip_address = ip_address_raw
                                    else:
                                        continue

                                if element_site_id not in site_lan_map:
                                    site_lan_map[element_site_id] = {
                                        'site_name': site_name,
                                        'networks': []
                                    }

                                site_lan_map[element_site_id]['networks'].append({
                                    'network': network,
                                    'interface': interface_name,
                                    'ip': ip_address
                                })

                                if debug:
                                    print(f"       ✓ Found LAN: {network} on {interface_name}", file=sys.stderr)
                            except Exception as e:
                                if debug:
                                    print(f"       Error parsing network {ip_address_raw}: {e}", file=sys.stderr)
        except Exception as e:
            if debug:
                print(f"     Error getting interfaces: {e}", file=sys.stderr)
            continue

    return site_lan_map


def find_site_by_ip(local_ip, site_lan_map, debug=False):
    """
    Find which site the local IP belongs to
    Returns (site_name, site_id, matched_network)
    """
    try:
        local_ip_obj = ipaddress.IPv4Address(local_ip)
        
        if debug:
            print(f"\n   Matching local IP {local_ip} against site LANs...", file=sys.stderr)
        
        for site_id, site_info in site_lan_map.items():
            for net_info in site_info['networks']:
                network = net_info['network']
                if local_ip_obj in network:
                    if debug:
                        print(f"   ✓ Match found: {site_info['site_name']} - {network}", file=sys.stderr)
                    return site_info['site_name'], site_id, str(network)
        
        if debug:
            print(f"   ✗ No match found for {local_ip}", file=sys.stderr)
        
        return None, None, None
    except Exception as e:
        if debug:
            print(f"   Error matching IP: {e}", file=sys.stderr)
        return None, None, None


def get_all_sites_map(sdk, debug=False):
    """
    Get all sites and create a lookup map
    Returns dict mapping site_id to site_name
    """
    try:
        response = sdk.get.sites()
        if not response.cgx_status:
            return {}
        
        sites = response.cgx_content.get('items', [])
        site_map = {}
        for site in sites:
            site_map[site.get('id')] = site.get('name', 'Unknown')
        
        return site_map
    except Exception as e:
        if debug:
            print(f"   Error fetching sites: {e}", file=sys.stderr)
        return {}


def get_wan_interfaces_all_sites(sdk, site_ids, debug=False):
    """
    Get WAN interfaces for multiple sites
    Returns dict mapping waninterface_id to (site_name, interface_name, circuit_name)
    """
    wan_if_lookup = {}
    
    for site_id, site_name in site_ids.items():
        try:
            response = sdk.get.waninterfaces(site_id=site_id)
            
            if not response.cgx_status:
                continue
            
            wan_interfaces = response.cgx_content.get('items', [])
            
            for wan_if in wan_interfaces:
                wan_if_id = wan_if.get('id')
                wan_if_name = wan_if.get('name', 'Unknown')
                
                # Get circuit name (label) for DirectInternet paths
                circuit_name = wan_if.get('label') or wan_if.get('name', 'Unknown')
                
                # Remove site name prefix from interface if it exists to avoid duplication
                clean_if_name = wan_if_name.replace(f"{site_name}-", "")
                
                wan_if_lookup[wan_if_id] = {
                    'site_name': site_name,
                    'interface_name': wan_if_name,
                    'circuit_name': circuit_name,
                    'full_name': f"{site_name}-{clean_if_name}"
                }
        except:
            continue
    
    if debug:
        print(f"   Retrieved {len(wan_if_lookup)} WAN interfaces across all sites", file=sys.stderr)
    
    return wan_if_lookup


def get_topology(sdk, site_id, debug=False):
    """
    Get VPN path topology for a specific site
    Returns dict mapping path_id to path details
    """
    try:
        if debug:
            print(f"   Fetching VPN topology for site {site_id}...", file=sys.stderr)
        
        # Use the v3.6 topology API with POST
        url = "https://api.sase.paloaltonetworks.com/sdwan/v3.6/api/topology"
        
        payload = {
            "type": "basenet",
            "nodes": [site_id]
        }
        
        resp = sdk._session.post(url, json=payload, timeout=30)
        
        if resp.status_code != 200:
            if debug:
                print(f"   Warning: Could not fetch topology: {resp.status_code}", file=sys.stderr)
                print(f"   Response: {resp.text}", file=sys.stderr)
            return {}
        
        topology_data = resp.json()
        
        if debug:
            print(f"   Topology data keys: {list(topology_data.keys())}", file=sys.stderr)
        
        # Extract links (VPN paths)
        links = topology_data.get('links', [])
        
        if debug:
            print(f"   Found {len(links)} links in topology", file=sys.stderr)
            if links:
                print(f"   First link keys: {list(links[0].keys())}", file=sys.stderr)
        
        path_lookup = {}
        for link in links:
            path_id = link.get('path_id')
            source_wan_if_id = link.get('source_wan_if_id')
            target_wan_if_id = link.get('target_wan_if_id')
            source_site_id = link.get('source_node_id')
            target_site_id = link.get('target_node_id')
            
            if path_id:
                path_lookup[path_id] = {
                    'source_wan_if_id': source_wan_if_id,
                    'target_wan_if_id': target_wan_if_id,
                    'source_site_id': source_site_id,
                    'target_site_id': target_site_id,
                    'status': link.get('status'),
                    'type': link.get('type'),
                    'sub_type': link.get('sub_type')
                }
        
        return path_lookup
        
    except Exception as e:
        if debug:
            print(f"   Error fetching topology: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc()
        return {}


def format_path_name(flow, topology, wan_if_lookup, debug=False):
    """
    Format the path name based on flow type (VPN, DirectInternet, or ServiceLink)
    Returns formatted path string
    """
    path_type = flow.get('path_type', 'Unknown')
    path_id = flow.get('path_id')
    waninterface_id = flow.get('waninterface_id')
    
    if debug:
        print(f"   Formatting path: type={path_type}, path_id={path_id}, waninterface_id={waninterface_id}", file=sys.stderr)
    
    # For DirectInternet, show the egress circuit
    if path_type == 'DirectInternet':
        if waninterface_id and waninterface_id in wan_if_lookup:
            wan_info = wan_if_lookup[waninterface_id]
            circuit_name = wan_info.get('circuit_name', 'Unknown')
            # Just return the circuit name
            return circuit_name
        else:
            return f"WAN Interface ID: {waninterface_id}"
    
    # For ServiceLink, show egress circuit to "Standard VPN"
    elif path_type == 'ServiceLink':
        if waninterface_id and waninterface_id in wan_if_lookup:
            wan_info = wan_if_lookup[waninterface_id]
            circuit_name = wan_info.get('circuit_name', 'Unknown')
            return f"{circuit_name} to Standard VPN"
        else:
            return f"WAN Interface ID: {waninterface_id} to Standard VPN"
    
    # For VPN paths, show source to destination
    elif path_type == 'VPN':
        if path_id and topology:
            path_info = topology.get(path_id, {})
            
            source_wan_if_id = path_info.get('source_wan_if_id')
            target_wan_if_id = path_info.get('target_wan_if_id')
            
            source_info = wan_if_lookup.get(source_wan_if_id, {})
            target_info = wan_if_lookup.get(target_wan_if_id, {})
            
            source_name = source_info.get('full_name', 'Unknown')
            target_name = target_info.get('full_name', 'Unknown')
            
            return f"{source_name} to {target_name}"
        else:
            return f"Path ID: {path_id}"
    
    # Unknown path type
    else:
        return f"{path_type} (Path ID: {path_id})"


def main():
    """Main execution function"""
    args = parse_arguments()
    
    json_mode = args.json
    
    log_output("=" * 60, json_mode)
    log_output("Prisma SD-WAN Flow Browser Query (Official SDK)", json_mode)
    log_output("=" * 60, json_mode)
    
    # Load credentials
    try:
        with open(args.credentials, 'r') as f:
            creds = json.load(f)
    except FileNotFoundError:
        error_msg = {
            "error": f"Credentials file '{args.credentials}' not found",
            "expected_format": {
                "client_id": "your-client-id@tsgid.iam.panserviceaccount.com",
                "client_secret": "your-client-secret",
                "tsg_id": "your-tsg-id"
            }
        }
        if json_mode:
            print(json.dumps(error_msg, indent=2))
        else:
            log_output(f"Error: Credentials file '{args.credentials}' not found", json_mode, is_error=True)
        sys.exit(1)
    
    # Validate credentials
    if 'client_id' not in creds or 'client_secret' not in creds or 'tsg_id' not in creds:
        error_msg = {"error": "Invalid credentials format", "required_fields": ["client_id", "client_secret", "tsg_id"]}
        if json_mode:
            print(json.dumps(error_msg, indent=2))
        else:
            log_output("Error: Invalid credentials format", json_mode, is_error=True)
        sys.exit(1)
    
    # Instantiate the Prisma SASE SDK
    sdk = API(update_check=False)
    
    # Authenticate
    log_output("\n🔐 Authenticating...", json_mode)
    try:
        sdk.interactive.login_secret(
            client_id=creds['client_id'],
            client_secret=creds['client_secret'],
            tsg_id=creds['tsg_id']
        )
        log_output("✓ Authenticated successfully", json_mode)
    except Exception as e:
        error_msg = {"error": f"Authentication failed: {e}"}
        if json_mode:
            print(json.dumps(error_msg, indent=2))
        else:
            log_output(f"❌ Authentication failed: {e}", json_mode, is_error=True)
        sys.exit(1)
    
    # Get sites
    log_output("\n📍 Retrieving sites...", json_mode)
    try:
        response = sdk.get.sites()
        
        if not response.cgx_status:
            error_msg = {"error": f"Error getting sites: {response.status_code}"}
            if json_mode:
                print(json.dumps(error_msg, indent=2))
            else:
                log_output(f"❌ Error getting sites: {response.status_code}", json_mode, is_error=True)
            sys.exit(1)
        
        sites = response.cgx_content.get('items', [])
        
        if not sites:
            error_msg = {"error": "No sites found"}
            if json_mode:
                print(json.dumps(error_msg, indent=2))
            else:
                log_output("No sites found", json_mode, is_error=True)
            sys.exit(1)
        
        log_output(f"✓ Found {len(sites)} sites", json_mode)
        
        # Only show detailed site list if listing or in debug mode
        if args.list_sites or args.debug:
            for idx, site in enumerate(sites, 1):
                site_name = site.get('name', 'Unknown')
                site_id = site.get('id', 'Unknown')
                site_location = site.get('address', {}).get('city', 'N/A') if site.get('address') else 'N/A'
                log_output(f"  {idx}. {site_name} (ID: {site_id}) - {site_location}", json_mode)
    
    except Exception as e:
        error_msg = {"error": f"Error retrieving sites: {e}"}
        if json_mode:
            print(json.dumps(error_msg, indent=2))
        else:
            log_output(f"❌ Error retrieving sites: {e}", json_mode, is_error=True)
        sys.exit(1)
    
    # If just listing sites, exit here
    if args.list_sites:
        if json_mode:
            sites_list = [{"name": s.get('name'), "id": s.get('id'), "city": s.get('address', {}).get('city', 'N/A') if s.get('address') else 'N/A'} for s in sites]
            print(json.dumps({"sites": sites_list}, indent=2))
        log_output("\n" + "=" * 60, json_mode)
        sys.exit(0)
    
    # Auto-detect site if requested
    target_site_id = None
    target_site_name = None
    
    if args.auto_detect:
        log_output("\n🔍 Auto-detecting site...", json_mode)
        
        # Get local IP
        local_ip = get_local_ip()
        if not local_ip:
            error_msg = {"error": "Could not determine local IP address"}
            if json_mode:
                print(json.dumps(error_msg, indent=2))
            else:
                log_output("❌ Could not determine local IP address", json_mode, is_error=True)
            sys.exit(1)
        
        log_output(f"   Local IP: {local_ip}", json_mode)
        
        # Get all LAN interfaces from all sites
        log_output("   Scanning LAN interfaces across all sites...", json_mode)
        site_lan_map = get_all_lan_interfaces(sdk, sites, debug=args.debug)
        
        if not site_lan_map:
            error_msg = {"error": "Could not retrieve LAN interfaces from any site"}
            if json_mode:
                print(json.dumps(error_msg, indent=2))
            else:
                log_output("❌ Could not retrieve LAN interfaces", json_mode, is_error=True)
            sys.exit(1)
        
        # Find matching site
        target_site_name, target_site_id, matched_network = find_site_by_ip(local_ip, site_lan_map, debug=args.debug)
        
        if not target_site_id:
            error_msg = {
                "error": f"Could not find site matching local IP {local_ip}",
                "local_ip": local_ip,
                "suggestion": "Ensure this machine is on a LAN subnet managed by an ION device"
            }
            if json_mode:
                print(json.dumps(error_msg, indent=2))
            else:
                log_output(f"❌ Could not find site matching local IP {local_ip}", json_mode, is_error=True)
            sys.exit(1)
        
        log_output(f"✓ Detected site: {target_site_name} (matched network: {matched_network})", json_mode)
        
        # If only testing auto-detect, output result and exit
        if not args.udp_src_port and not args.src_ip and not args.dst_ip:
            result = {
                "success": True,
                "local_ip": local_ip,
                "detected_site_name": target_site_name,
                "detected_site_id": target_site_id,
                "matched_network": matched_network
            }
            if json_mode:
                print(json.dumps(result, indent=2))
            log_output("\n" + "=" * 60, json_mode)
            sys.exit(0)
    
    # Determine site ID to query (if not auto-detected)
    if not target_site_id:
        if args.site_id:
            target_site_id = args.site_id
            for site in sites:
                if site.get('id') == args.site_id:
                    target_site_name = site.get('name', 'Unknown')
                    break
            if not target_site_name:
                error_msg = {"error": f"Site ID '{args.site_id}' not found"}
                if json_mode:
                    print(json.dumps(error_msg, indent=2))
                else:
                    log_output(f"\n❌ Site ID '{args.site_id}' not found", json_mode, is_error=True)
                sys.exit(1)
        elif args.site_name:
            for site in sites:
                if site.get('name') == args.site_name:
                    target_site_id = site.get('id')
                    target_site_name = site.get('name')
                    break
            if not target_site_id:
                error_msg = {"error": f"Site '{args.site_name}' not found"}
                if json_mode:
                    print(json.dumps(error_msg, indent=2))
                else:
                    log_output(f"\n❌ Site '{args.site_name}' not found", json_mode, is_error=True)
                sys.exit(1)
        else:
            target_site = sites[0]
            target_site_id = target_site.get('id')
            target_site_name = target_site.get('name', 'Unknown')
            log_output(f"\n⚠️  No site specified, using first site: {target_site_name}", json_mode)
    
    # Build site map
    site_map = {site.get('id'): site.get('name') for site in sites}
    
    # Get topology to map path IDs (skip in fast mode)
    topology = {}
    wan_if_lookup = {}
    
    if not args.fast:
        log_output(f"\n🌐 Retrieving VPN topology...", json_mode)
        topology = get_topology(sdk, target_site_id, debug=args.debug)
        
        # Get WAN interfaces for all sites
        log_output(f"   Retrieving WAN interfaces...", json_mode)
        wan_if_lookup = get_wan_interfaces_all_sites(sdk, site_map, debug=args.debug)
        
        if topology:
            log_output(f"✓ Retrieved {len(topology)} VPN paths", json_mode)
        else:
            log_output("⚠️  Could not retrieve VPN topology (will show IDs only)", json_mode)
    else:
        if args.debug:
            log_output(f"\n⚡ Fast mode enabled - skipping topology lookup", json_mode)
    
    # Calculate time range
    end_time = datetime.utcnow()
    if args.minutes:
        start_time = end_time - timedelta(minutes=args.minutes)
        time_desc = f"Last {args.minutes} minute(s)"
    else:
        start_time = end_time - timedelta(hours=args.hours)
        time_desc = f"Last {args.hours} hour(s)"
    
    # Display query parameters
    log_output(f"\n🔍 Querying flows for site: {target_site_name} ({target_site_id})", json_mode)
    log_output("   Filters:", json_mode)
    if args.protocol:
        protocol_names = {1: 'ICMP', 6: 'TCP', 17: 'UDP'}
        proto_name = protocol_names.get(args.protocol, f'Protocol {args.protocol}')
        log_output(f"   - Protocol: {proto_name}", json_mode)
    elif args.udp_src_port:
        log_output("   - Protocol: UDP", json_mode)
    if args.udp_src_port:
        log_output(f"   - Source Port: {args.udp_src_port}", json_mode)
    if args.src_ip:
        log_output(f"   - Source IP: {args.src_ip}", json_mode)
    if args.dst_ip:
        log_output(f"   - Destination IP: {args.dst_ip}", json_mode)
    log_output(f"   - Time Range: {time_desc}", json_mode)
    log_output(f"   - Page Size: {args.page_size}", json_mode)
    log_output(f"   - Region: {args.region}", json_mode)
    if args.fast:
        log_output(f"   - Mode: Fast (no path resolution)", json_mode)
    
    # Build flow query payload
    query_payload = {
        "start_time": start_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "end_time": end_time.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "filter": {
            "site": [target_site_id],
            "flow": {}
        },
        "debug_level": "all",
        "page_size": args.page_size,
        "dest_page": 1,
        "view": {
            "summary": False
        }
    }
    
    # Add filters
    if args.protocol:
        query_payload["filter"]["flow"]["protocol"] = args.protocol
    elif args.udp_src_port:
        query_payload["filter"]["flow"]["protocol"] = 17
    
    if args.udp_src_port:
        query_payload["filter"]["flow"]["source_port"] = [args.udp_src_port]
    
    if args.src_ip:
        query_payload["filter"]["flow"]["source_ip"] = [args.src_ip]
    
    if args.dst_ip:
        query_payload["filter"]["flow"]["destination_ip"] = [args.dst_ip]
    
    if args.debug:
        log_output(f"\n   Query payload: {json.dumps(query_payload, indent=4)}", json_mode)
    
    # Query flows
    try:
        sdk._session.headers['x-panw-region'] = args.region
        
        if args.debug:
            log_output(f"   Set x-panw-region header to: {args.region}", json_mode)
        
        url = "https://api.sase.paloaltonetworks.com/sdwan/monitor/v3.11/api/monitor/flows"
        
        if args.debug:
            log_output(f"   Making request to: {url}", json_mode)
        
        resp = sdk._session.post(url, json=query_payload, timeout=30)
        
        if resp.status_code != 200:
            error_msg = {"error": f"Error querying flows: {resp.status_code}", "response": resp.text}
            if json_mode:
                print(json.dumps(error_msg, indent=2))
            else:
                log_output(f"\n❌ Error querying flows: {resp.status_code}", json_mode, is_error=True)
                log_output(f"Response: {resp.text}", json_mode, is_error=True)
            sys.exit(1)
        
        flows_data = resp.json()
        
        if flows_data and 'flows' in flows_data:
            flows = flows_data['flows']
            
            # Prepare result object for JSON mode
            result = {
                "success": True,
                "site_name": target_site_name,
                "site_id": target_site_id,
                "query_time": datetime.utcnow().isoformat() + "Z",
                "flows": []
            }
            
            # Determine output filename (only in non-JSON mode)
            if not json_mode and args.output:
                output_file = args.output
                
                # Save results to file
                with open(output_file, 'w') as f:
                    json.dump(flows_data, f, indent=2)
                
                log_output(f"\n✓ Flow query completed", json_mode)
                log_output(f"  Results saved to: {output_file}", json_mode)
            
            # Display summary
            if 'items' in flows:
                flow_count = len(flows['items'])
                
                if not json_mode:
                    log_output(f"\n✓ Flow query completed", json_mode)
                    log_output(f"  Total flows found: {flow_count}", json_mode)
                
                if flow_count > 0:
                    for flow in flows['items']:
                        # Format path name based on path type
                        if not args.fast:
                            egress_path = format_path_name(flow, topology, wan_if_lookup, debug=args.debug)
                        else:
                            path_id = flow.get('path_id')
                            path_type = flow.get('path_type')
                            egress_path = f"{path_type} (Path ID: {path_id})"
                        
                        flow_info = {
                            "source_ip": flow.get('source_ip'),
                            "source_port": flow.get('source_port'),
                            "destination_ip": flow.get('destination_ip'),
                            "destination_port": flow.get('destination_port'),
                            "protocol": flow.get('protocol'),
                            "bytes_c2s": flow.get('bytes_c2s'),
                            "bytes_s2c": flow.get('bytes_s2c'),
                            "packets_c2s": flow.get('packets_c2s'),
                            "packets_s2c": flow.get('packets_s2c'),
                            "path_type": flow.get('path_type'),
                            "egress_path": egress_path,
                            "app_id": flow.get('app_id'),
                            "flow_id": flow.get('flow_id'),
                            "flow_start_time_ms": flow.get('flow_start_time_ms'),
                            "flow_end_time_ms": flow.get('flow_end_time_ms')
                        }
                        
                        result["flows"].append(flow_info)
                    
                    # In JSON mode, output JSON to stdout
                    if json_mode:
                        print(json.dumps(result, indent=2))
                    else:
                        # Show first flow details
                        first_flow_info = result["flows"][0]
                        log_output(f"\n  Sample flow:", json_mode)
                        log_output(f"    Source: {first_flow_info['source_ip']}:{first_flow_info['source_port']}", json_mode)
                        log_output(f"    Destination: {first_flow_info['destination_ip']}:{first_flow_info['destination_port']}", json_mode)
                        log_output(f"    Protocol: {first_flow_info['protocol']}", json_mode)
                        log_output(f"    Bytes C2S: {first_flow_info['bytes_c2s']}", json_mode)
                        log_output(f"    Bytes S2C: {first_flow_info['bytes_s2c']}", json_mode)
                        log_output(f"    Path Type: {first_flow_info['path_type']}", json_mode)
                        log_output(f"    Egress Path: {first_flow_info['egress_path']}", json_mode)
                        log_output(f"    App ID: {first_flow_info['app_id']}", json_mode)
                        
                        if args.debug:
                            log_output(f"\n  Full flow details:", json_mode)
                            first_flow = flows['items'][0]
                            jd(first_flow)
                else:
                    result["flows"] = []
                    if json_mode:
                        print(json.dumps(result, indent=2))
                    else:
                        log_output(f"  No flows found matching the criteria", json_mode)
            else:
                result["flows"] = []
                if json_mode:
                    print(json.dumps(result, indent=2))
                else:
                    log_output(f"  No flows found matching the criteria", json_mode)
        else:
            error_msg = {"error": "No flows found or unexpected response format"}
            if json_mode:
                print(json.dumps(error_msg, indent=2))
            else:
                log_output("\n  No flows found or unexpected response format", json_mode)
                if args.debug:
                    log_output(f"\n  Full response:", json_mode)
                    jd(flows_data)
    
    except Exception as e:
        error_msg = {"error": f"Error querying flows: {str(e)}"}
        if json_mode:
            print(json.dumps(error_msg, indent=2))
        else:
            log_output(f"\n❌ Error querying flows: {e}", json_mode, is_error=True)
            if args.debug:
                import traceback
                traceback.print_exc()
        sys.exit(1)
    
    if not json_mode:
        log_output("\n" + "=" * 60, json_mode)


if __name__ == "__main__":
    main()

