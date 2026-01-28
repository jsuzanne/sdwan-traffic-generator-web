#!/usr/bin/env python3
import time
import argparse
import subprocess
import json
import os
import threading

class SRTMetrics:
    def __init__(self, target, interval_s):
        self.target = target
        self.interval = interval_s
        self.results = []
        self.lock = threading.Lock()
        self.stop_event = threading.Event()

    def run_probe(self):
        # curl -w format for RTT and SRT extraction
        # time_connect: time until TCP connection complete (RTT)
        # time_starttransfer: time until first byte received (TTFB)
        # srt = time_starttransfer - time_connect
        curl_format = '{"rtt": %{time_connect}, "ttfb": %{time_starttransfer}, "total": %{time_total}, "code": %{http_code}}'
        
        url = f"http://{self.target}/api/slow-app/delay/500" # Sample test with 500ms delay
        cmd = ["curl", "-s", "-o", "/dev/null", "-w", curl_format, url]
        
        try:
            output = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode('utf-8')
            data = json.loads(output)
            
            rtt_ms = round(data['rtt'] * 1000, 2)
            ttfb_ms = round(data['ttfb'] * 1000, 2)
            srt_ms = round((data['ttfb'] - data['rtt']) * 1000, 2)
            total_ms = round(data['total'] * 1000, 2)
            
            result = {
                "timestamp": time.time(),
                "rtt_ms": rtt_ms,
                "srt_ms": srt_ms,
                "total_ms": total_ms,
                "http_code": data['code']
            }
            
            with self.lock:
                self.results.append(result)
                if len(self.results) > 100:
                    self.results.pop(0)
            
            return result
        except Exception as e:
            return {"error": str(e)}

    def start(self, stats_file):
        while not self.stop_event.is_set():
            res = self.run_probe()
            
            with self.lock:
                try:
                    with open(stats_file, 'w') as f:
                        json.dump({"target": self.target, "latest": res, "history": self.results}, f)
                except: pass
            
            time.sleep(self.interval)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", required=True, help="Target IP/Host")
    parser.add_argument("--interval", type=float, default=2.0)
    parser.add_argument("--stats-file", default="/tmp/srt_stats.json")
    args = parser.parse_args()

    metrics = SRTMetrics(args.target, args.interval)
    print(f"🚀 SRT Orchestrator Started -> Target: {args.target} | Interval: {args.interval}s")
    
    try:
        metrics.start(args.stats_file)
    except KeyboardInterrupt:
        print("\n⏹️ SRT Orchestrator Stopped.")
