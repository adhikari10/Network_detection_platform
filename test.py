#!/usr/bin/env python3
"""
Demo test script — simulates what the Pi would send.
Run this against your Dell server to test Guardian's reasoning live.

Usage:
  python test_threat.py                    # runs all demo scenarios
  python test_threat.py --scenario 1       # run a specific scenario
  python test_threat.py --live             # interactive: type your own threat
"""

import httpx
import json
import sys
import argparse

BASE_URL = "http://localhost:8000"   # Change to Dell's IP when running from Pi

# ── Demo scenarios for Thursday ──────────────────────────────────────────────

SCENARIOS = [
    {
        "name": "🔴 Port scan from unknown device (3am)",
        "payload": {
            "source_ip": "192.168.1.47",
            "threat_type": "port_scan",
            "device_name": "unknown-device-47",
            "packet_count": 2847,
            "ports_scanned": list(range(1, 1024)),
            "duration_seconds": 4.2,
            "time_of_day": "03:14",
            "is_known_device": False,
            "additional_context": "Device appeared on network 2 hours ago. No prior traffic baseline."
        }
    },
    {
        "name": "🟡 Unusual DNS queries (possible tunnel)",
        "payload": {
            "source_ip": "192.168.1.12",
            "threat_type": "dns_tunnel",
            "device_name": "laptop-tanya",
            "packet_count": 450,
            "time_of_day": "14:22",
            "is_known_device": True,
            "dns_queries": [
                "c2.evilcorp.io", "data.exfil-host.ru", "beacon.malware.net",
                "a1b2c3d4.tunnel.io", "encoded-payload.dnscat.io"
            ],
            "additional_context": "Known device but DNS pattern is completely abnormal — all queries to external C2-like domains."
        }
    },
    {
        "name": "🔴 DDoS traffic flood",
        "payload": {
            "source_ip": "192.168.1.99",
            "threat_type": "ddos",
            "device_name": "smart-tv-living-room",
            "packet_count": 95000,
            "duration_seconds": 12.0,
            "time_of_day": "22:45",
            "is_known_device": True,
            "bytes_transferred": 48000000,
            "additional_context": "Smart TV generating 95k packets in 12 seconds. Likely botnet-infected. Target is external IP."
        }
    },
    {
        "name": "🟢 Normal device — should be allowed",
        "payload": {
            "source_ip": "192.168.1.5",
            "threat_type": "unusual_traffic",
            "device_name": "macbook-pro-boss",
            "packet_count": 120,
            "time_of_day": "10:30",
            "is_known_device": True,
            "dns_queries": ["google.com", "github.com", "stackoverflow.com"],
            "additional_context": "Slightly elevated traffic but all normal destinations. Working hours."
        }
    },
    {
        "name": "🔴 ARP spoofing attempt",
        "payload": {
            "source_ip": "192.168.1.88",
            "threat_type": "arp_spoofing",
            "device_name": "unknown-device-88",
            "packet_count": 340,
            "time_of_day": "01:30",
            "is_known_device": False,
            "additional_context": "Device broadcasting ARP replies claiming to be the gateway. Classic MITM setup attempt."
        }
    }
]


def print_result(scenario_name: str, result: dict):
    action = result.get("action", "?").upper()
    severity = result.get("severity", "?").upper()
    confidence = int(result.get("confidence", 0) * 100)
    reasoning = result.get("reasoning", "No reasoning.")

    colors = {"BLOCK": "\033[91m", "QUARANTINE": "\033[91m",
              "ALERT": "\033[93m", "THROTTLE": "\033[93m",
              "ALLOW": "\033[92m"}
    reset = "\033[0m"
    color = colors.get(action, "")

    print(f"\n{'─'*60}")
    print(f"Scenario: {scenario_name}")
    print(f"{'─'*60}")
    print(f"  Action:     {color}{action}{reset}")
    print(f"  Severity:   {severity}")
    print(f"  Confidence: {confidence}%")
    print(f"\n  Reasoning:")
    print(f"  {reasoning}")
    print(f"{'─'*60}")


def run_scenario(idx: int):
    s = SCENARIOS[idx]
    print(f"\nSending: {s['name']}...")
    try:
        r = httpx.post(f"{BASE_URL}/analyze", json=s["payload"], timeout=90)
        r.raise_for_status()
        print_result(s["name"], r.json())
    except httpx.ConnectError:
        print(f"\n❌ Cannot connect to {BASE_URL}. Is Guardian running?")
    except Exception as e:
        print(f"\n❌ Error: {e}")


def run_all():
    print("\n🛡  Guardian Demo — Running all scenarios\n")
    for i in range(len(SCENARIOS)):
        run_scenario(i)
        input("\n  [Press Enter for next scenario...]")


def run_interactive():
    print("\n🛡  Guardian — Interactive mode")
    print("Enter threat details manually.\n")
    ip = input("Source IP (e.g. 192.168.1.47): ") or "192.168.1.47"
    threat = input("Threat type (e.g. port_scan, ddos, dns_tunnel): ") or "port_scan"
    context = input("Additional context: ") or ""
    payload = {"source_ip": ip, "threat_type": threat, "additional_context": context}
    try:
        r = httpx.post(f"{BASE_URL}/analyze", json=payload, timeout=90)
        r.raise_for_status()
        print_result("Custom scenario", r.json())
    except Exception as e:
        print(f"\n❌ Error: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", type=int, help="Run a specific scenario (0-4)")
    parser.add_argument("--live", action="store_true", help="Interactive mode")
    args = parser.parse_args()

    if args.live:
        run_interactive()
    elif args.scenario is not None:
        run_scenario(args.scenario)
    else:
        run_all()
