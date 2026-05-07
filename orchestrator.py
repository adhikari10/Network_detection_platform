#!/usr/bin/env python3
"""
Guardian Stage 1 Orchestrator
Reads Suricata eve.json in real time, applies rules,
forwards ambiguous threats to Dell LLM, applies iptables blocking.
"""

import json
import time
import subprocess
import requests
import threading
from datetime import datetime
from collections import defaultdict
from scapy.all import sniff, IP, TCP, ARP
# ─── CONFIG ───────────────────────────────────────────────────────────────────
DELL_IP         = "192.168.10.2"
DELL_PORT       = 8000
EVE_LOG         = "/var/log/suricata/eve.json"
DRY_RUN         = False   # Set False when ready to actually block
WHITELIST = {
    "192.168.10.2",   # Dell
    "192.168.10.1",   # Pi 5 eth0.10 (trusted gateway)
    "192.168.20.1",   # Pi 5 eth0.20 (untrusted gateway)
    "10.95.1.231",    # Pi 5 eth1 (WAN)
    "10.95.1.242",    # Pi 5 eth1 secondary
    "10.95.1.254",    # University gateway (normal ARP)
}
# Stage 1 thresholds
PORT_SCAN_THRESHOLD   = 5    # unique ports in time window
PACKET_THRESHOLD      = 200  # packets per minute
TIME_WINDOW           = 60   # seconds

# ─── STATE ────────────────────────────────────────────────────────────────────
blocked_ips   = set()        # already blocked, skip processing
alert_counts  = defaultdict(list)   # src_ip -> [timestamps]
port_tracker  = defaultdict(set)    # src_ip -> {ports}

# ─── HELPERS ──────────────────────────────────────────────────────────────────

def block_ip(src_ip: str, reason: str, threat_type: str, confidence: float):
    """Apply iptables block and report to Dell."""
    if src_ip in blocked_ips:
        return  # already blocked, skip

    blocked_ips.add(src_ip)

    if DRY_RUN:
        print(f"[DRY-RUN] Would block {src_ip} - {reason}")
    else:
        subprocess.run([
            "sudo", "iptables", "-I", "FORWARD",
            "-s", src_ip, "-j", "DROP"
        ])
        subprocess.run([
            "sudo", "iptables", "-I", "INPUT",
            "-s", src_ip, "-j", "DROP"
        ])
        print(f"[BLOCKED] {src_ip} - {reason}")

    # Step 1 - immediately report basic block to dashboard (instant)
    report_to_dell(
        src_ip=src_ip,
        threat_type=threat_type,
        action="block",
        severity="high",
        confidence=confidence,
        reasoning=f"Stage 1 blocked. AI reasoning loading..."
    )

    # Step 2 - fire async LLM reasoning in background (3-4s, non-blocking)
    threading.Thread(
        target=request_llm_reasoning,
        args=(src_ip, threat_type, reason, confidence),
        daemon=True
    ).start()


def request_llm_reasoning(src_ip: str, threat_type: str, reason: str, confidence: float):
    """Background thread - calls Dell /analyze then updates existing incident with full reasoning."""
    try:
        print(f"[LLM] Requesting reasoning for {src_ip} ({threat_type})...")
        response = requests.post(
            f"http://{DELL_IP}:{DELL_PORT}/analyze?silent=true",
            json={
                "source_ip": src_ip,
                "threat_type": threat_type,
                "packet_count": len(alert_counts.get(src_ip, [])),
                "ports_scanned": list(port_tracker.get(src_ip, set())),
                "duration_seconds": float(TIME_WINDOW),
                "time_of_day": datetime.now().strftime("%H:%M"),
                "is_known_device": False,
                "additional_context": f"Stage 1 already blocked this IP. Original trigger: {reason}"
            },
            timeout=60
        )
        result = response.json()
        print(f"[LLM] Reasoning complete for {src_ip} - {result.get('action','?')} ({int(result.get('confidence',0)*100)}%)")

        # Update existing incident on dashboard with full reasoning
        requests.post(
            f"http://{DELL_IP}:{DELL_PORT}/update-reasoning",
            json={
                "event": {
                    "source_ip": src_ip,
                    "threat_type": threat_type
                },
                "result": {
                    "action": result.get("action", "block"),
                    "severity": result.get("severity", "high"),
                    "confidence": result.get("confidence", confidence),
                    "reasoning": result.get("reasoning", reason),
                    "cve_matches": result.get("cve_matches", [])
                }
            },
            timeout=10
        )
        print(f"[LLM] Dashboard updated for {src_ip}")

    except Exception as e:
        print(f"[LLM] Reasoning failed for {src_ip}: {e}")

def report_to_dell(src_ip, threat_type, action, severity, confidence, reasoning):
    """Send decision to Dell /report endpoint for logging and dashboard."""
    try:
        requests.post(
            f"http://{DELL_IP}:{DELL_PORT}/report",
            json={
                "event": {
                    "source_ip": src_ip,
                    "threat_type": threat_type
                },
                "result": {
                    "action": action,
                    "severity": severity,
                    "confidence": confidence,
                    "reasoning": reasoning
                }
            },
            timeout=5
        )
    except Exception as e:
        print(f"[WARN] Could not reach Dell: {e}")


def forward_to_llm(src_ip, threat_type, packet_count, ports, duration):
    """Send ambiguous threat to Dell LLM for deep reasoning."""
    try:
        response = requests.post(
            f"http://{DELL_IP}:{DELL_PORT}/analyze?silent=true",
            json={
                "source_ip": src_ip,
                "threat_type": threat_type,
                "packet_count": packet_count,
                "ports_scanned": list(ports),
                "duration_seconds": duration,
                "time_of_day": datetime.now().strftime("%H:%M"),
                "is_known_device": False
            },
            timeout=60
        )
        return response.json()
    except Exception as e:
        print(f"[WARN] LLM request failed: {e}")
        return None

# ─── STAGE 1 CLASSIFIER ───────────────────────────────────────────────────────

def check_known_bad(src_ip: str) -> bool:
    """Check Dell threat memory — has this IP been blocked before?"""
    try:
        response = requests.get(
            f"http://{DELL_IP}:{DELL_PORT}/memory",
            timeout=5
        )
        memory = response.json()
        return src_ip in str(memory)
    except:
        return False


def process_alert(alert: dict):
    """Main Stage 1 logic — decide what to do with each Suricata alert."""
    src_ip    = alert.get("src_ip")
    dest_port = alert.get("dest_port", 0)
    proto     = alert.get("proto", "")
    sig       = alert.get("alert", {}).get("signature", "")
    severity  = alert.get("alert", {}).get("severity", 3)
    now       = time.time()

    # Skip if already blocked
    if src_ip in blocked_ips:
        return

    # Skip Pi's own IP
    if src_ip == "192.168.10.1":
        return

    #Skip whitelisted IPs
    if src_ip in WHITELIST:
        return

    # ── Rule 1: Known bad IP from Dell memory ─────────────────────────────────
    if check_known_bad(src_ip):
        block_ip(src_ip, "Previously confirmed threat in Dell memory",
                 "known_bad", 0.99)
        return

    # ── Rule 2: Port scan detection ───────────────────────────────────────────
    port_tracker[src_ip].add(dest_port)
    alert_counts[src_ip].append(now)

    # Clean old timestamps outside time window
    alert_counts[src_ip] = [t for t in alert_counts[src_ip]
                             if now - t < TIME_WINDOW]

    unique_ports = len(port_tracker[src_ip])
    alert_rate   = len(alert_counts[src_ip])

    if unique_ports >= PORT_SCAN_THRESHOLD:
        block_ip(
            src_ip,
            f"Port scan detected — {unique_ports} unique ports probed in {TIME_WINDOW}s",
            "port_scan",
            0.95
        )
        port_tracker[src_ip].clear()
        return

    # ── Rule 3: High alert rate ────────────────────────────────────────────────
    if alert_rate >= PACKET_THRESHOLD:
        block_ip(
            src_ip,
            f"High alert rate — {alert_rate} alerts in {TIME_WINDOW}s",
            "ddos",
            0.90
        )
        alert_counts[src_ip].clear()
        return

    # ── Rule 4: High severity Suricata signature ───────────────────────────────
    if severity <= 1:
        block_ip(
            src_ip,
            f"Critical Suricata signature: {sig}",
            "signature_match",
            0.95
        )
        return

    # ── Rule 5: Ambiguous — forward to Dell LLM ───────────────────────────────
    if severity == 2 and alert_rate >= 3:
        print(f"[LLM] Forwarding ambiguous threat from {src_ip} to Dell...")
        result = forward_to_llm(
            src_ip=src_ip,
            threat_type="suspicious_activity",
            packet_count=alert_rate,
            ports=port_tracker[src_ip],
            duration=TIME_WINDOW
        )
        if result:
            print(f"[LLM] Decision: {result['action']} — {result['reasoning'][:100]}")
            if result["action"] in ("block", "quarantine"):
                block_ip(src_ip, result["reasoning"], "llm_decision", result["confidence"])
# ─── MAIN LOOP ────────────────────────────────────────────────────────────────

def tail_eve_log(filepath: str):
    """Follow eve.json in real time like tail -F."""
    with open(filepath, 'r') as f:
        f.seek(0, 2)  # Jump to end of file
        while True:
            line = f.readline()
            if not line:
                time.sleep(0.1)
                continue
            yield line.strip()


def main():
    print(f"[GUARDIAN] Stage 1 Orchestrator starting...")
    print(f"[GUARDIAN] Dell backend: http://{DELL_IP}:{DELL_PORT}")
    print(f"[GUARDIAN] DRY_RUN: {DRY_RUN}")
    print(f"[GUARDIAN] Watching: {EVE_LOG}")
    print(f"[GUARDIAN] Ready.\n")
    
    import threading
    scapy_thread = threading.Thread(target=start_scapy_sniffer, daemon=True)
    scapy_thread.start()

    for line in tail_eve_log(EVE_LOG):
        try:
            event = json.loads(line)

            # Only process alert events, skip flow/stats
            if event.get("event_type") != "alert":
                continue

            src_ip = event.get("src_ip", "")
            sig    = event.get("alert", {}).get("signature", "unknown")

            print(f"[ALERT] {src_ip} → {sig[:60]}")
            process_alert(event)

        except json.JSONDecodeError:
            continue
        except Exception as e:
            print(f"[ERROR] {e}")
            continue

# ─── SCAPY BEHAVIORAL SNIFFER ─────────────────────────────────────────────────

syn_tracker = defaultdict(list)    # src_ip -> [timestamps of SYN packets]
arp_request_tracker = {}          # src_ip -> timestamp of last ARP request seen

def handle_packet(pkt):
    """Called for every packet Scapy sees on eth0, eth0.10, eth0.20, eth1."""
    now = time.time()

    # ── SYN scan detection ────────────────────────────────────────────────────
    if pkt.haslayer(IP) and pkt.haslayer(TCP):
        src_ip = pkt[IP].src
        dst_ip = pkt[IP].dst
        flags  = pkt[TCP].flags
        dport  = pkt[TCP].dport

        if flags == 0x02:  # SYN only (not SYN-ACK)
            if src_ip in WHITELIST:
                return

            # Determine if traffic is from external internet source
            is_external = (
                not src_ip.startswith("192.168.10.") and
                not src_ip.startswith("192.168.20.") and
                src_ip not in {"10.95.1.231", "10.95.1.242"}
            )

            # Internal traffic — only flag if targeting local VLANs
            if not is_external:
                if not (dst_ip.startswith("192.168.10.") or dst_ip.startswith("192.168.20.")):
                    return  # Internal device browsing internet normally — ignore

            # External traffic — only flag if targeting our internal devices or Pi WAN
            if is_external:
                if not (dst_ip.startswith("192.168.10.") or dst_ip.startswith("192.168.20.") or dst_ip.startswith("10.95.1.")):
                    return  # External traffic not aimed at us — ignore

            # Track unique ports per source IP
            port_tracker[src_ip].add(dport)
            syn_tracker[src_ip].append(now)

            # Clean old entries outside time window
            syn_tracker[src_ip] = [t for t in syn_tracker[src_ip] if now - t < TIME_WINDOW]

            unique_ports = len(port_tracker[src_ip])

            if unique_ports >= PORT_SCAN_THRESHOLD:
                if src_ip not in blocked_ips:
                    origin = "external" if is_external else "internal"
                    threat_type = "external_scan" if is_external else "port_scan"
                    print(f"[SCAPY] {origin.upper()} port scan from {src_ip} — {unique_ports} ports hit")
                    block_ip(
                        src_ip,
                        f"Scapy: {origin} SYN scan — {unique_ports} unique ports in {TIME_WINDOW}s",
                        threat_type,
                        0.95
                    )
                    port_tracker[src_ip].clear()
                    syn_tracker[src_ip].clear()

    # ── ARP spoof detection ───────────────────────────────────────────────────
    if pkt.haslayer(ARP):
        src_ip  = pkt[ARP].psrc
        src_mac = pkt[ARP].hwsrc

        if pkt[ARP].op == 1:  # ARP request — track it
            arp_request_tracker[src_ip] = time.time()

        elif pkt[ARP].op == 2:  # ARP reply
            if src_ip in WHITELIST:
                return

            # Only flag if there was no prior request for this IP
            last_request = arp_request_tracker.get(src_ip, 0)
            time_since_request = time.time() - last_request

            if time_since_request > 5:  # No request seen in last 5 seconds
                print(f"[SCAPY] Unsolicited ARP reply from {src_ip} ({src_mac}) — possible spoof")
                # Don't block immediately — just flag, let LLM or human decide
            # else: reply matches a recent request — totally normal, ignore


def start_scapy_sniffer():
    """Start Scapy sniffing on eth0 in a background thread."""
    print("[SCAPY] Starting packet sniffer on eth0, eth0.10, eth0.20, eth1...")
    sniff(iface=["eth0", "eth0.10", "eth0.20", "eth1"], prn=handle_packet, store=False)

if __name__ == "__main__":
    main()
