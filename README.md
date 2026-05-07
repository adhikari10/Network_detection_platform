# GUARDIAN — Autonomous AI Network Security Agent

> *Perceives. Reasons. Decides. Acts. No human approval required.*

**Metropolia University of Applied Sciences — Innovation Project, May 2026**

**Team:**
- Bibek — Architecture, Backend, Hardware, Orchestrator
- Tanya  — React/TypeScript Frontend Components
- Veronika - Documentation and Report Writing 

---

## What is Guardian?

Guardian is a fully autonomous AI-powered network security agent built for edge deployment in cost-sensitive environments. It requires no cloud infrastructure, no enterprise licensing, and no human approval to respond to threats.

The system perceives network traffic through a dual detection pipeline (Suricata + Scapy), reasons about ambiguous threats using a locally-hosted large language model (Llama 3.1 70B), makes an independent decision (BLOCK / MONITOR / ALLOW), and enforces that decision via iptables — all in under a second for known attack patterns, and in ~3.4 seconds for LLM-reasoned cases.

**The dashboard is an observer interface, not a control panel.** Human override exists only for emergencies.

---

## Key Differentiators vs Commercial Tools

| Feature | Guardian | Darktrace | CrowdStrike | SentinelOne |
|---|---|---|---|---|
| Cloud-free | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Full autonomy | ✅ Yes | Bounded | Bounded | Bounded |
| Local LLM reasoning | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Edge hardware | ✅ RPi + Dell | ❌ No | ❌ No | ❌ No |
| Decision explanation | ✅ Always | Partial | Partial | Partial |

---

## System Architecture

```
Internet → Router → Pi 5 (eth1 WAN)
                       ↓
                  Pi 5 (eth0 LAN)
                       ↓
            Cisco Catalyst 3560 Switch
               ↙                 ↘
        VLAN 10 (Trusted)    VLAN 20 (Untrusted)
        Dell GB10 AI Brain   Attacker nodes / test machines
```

Pi 5 sits **inline** between the router and the switch. Every packet from every device on the network passes through Pi 5, giving Guardian real-time inspection and blocking capability.

### VLAN Segmentation

| VLAN | Name | Switch Ports | Purpose |
|---|---|---|---|
| VLAN 10 | trusted | Fa0/2–10 | Dell AI brain, trusted servers |
| VLAN 20 | insider_threat | Fa0/11–20 | Untrusted devices, attacker nodes |
| Fa0/1 | trunk | Pi 5 | Tagged traffic for both VLANs |

**Demo scenario:** A device on VLAN 20 (insider threat) scans a device on VLAN 10 (trusted). All such traffic crosses Pi 5 — Guardian detects, reasons, and blocks autonomously.

---

## Two-Stage Detection Pipeline

This is Guardian's core architectural differentiator. Normal traffic never touches the LLM.

### Stage 1 — Rules Engine (Pi 5, sub-second)

| Condition | Action |
|---|---|
| Known bad IP (from threat memory) | Instant BLOCK |
| Port scan: 5+ unique ports within 60s | BLOCK |
| High alert rate: 200+ Suricata alerts / 60s | BLOCK |
| Critical Suricata signature (Severity 1) | BLOCK |
| Ambiguous / Severity 2 Suricata alert | ESCALATE → Stage 2 |

### Stage 2 — LLM Reasoning (Dell GB10, ~3.4s)

- Receives full threat context from Pi 5
- Reasons about behavioral patterns, timing, and device history
- Returns: action (BLOCK / MONITOR / ALLOW), confidence score, plain-English reasoning
- Confidence < 70% with no prior history → action downgraded
- Result logged to incident store and broadcast to dashboard via WebSocket
- Async: Stage 1 blocks immediately, LLM reasoning updates the incident in background

### Threat Memory

Blocked IPs are stored in persistent memory. A repeat offender receives an instant BLOCK at 99% confidence — no LLM call needed. This eliminates redundant reasoning and accelerates repeat-attack response.

---

## Hardware Stack

| Device | Role | Specs |
|---|---|---|
| Raspberry Pi 5 | Router / Detection engine | eth0 → switch, eth1 → WAN. Runs Suricata, Scapy, orchestrator, dnsmasq |
| Raspberry Pi 3 | Attacker node (VLAN 20) | Plugged into Fa0/11. Runs nmap for attack simulation |
| Dell GB10 | AI brain / Dashboard host | 128GB unified RAM, 3.6TB NVMe. Runs Ollama + Llama 3.1 70B, FastAPI, React frontend |
| Cisco Catalyst 3560 | Managed switch | PoE-24. VLAN 10/20 configured. Fa0/1 = trunk to Pi 5 |

### IP Reference

| Device | IP | Notes |
|---|---|---|
| Pi 5 eth0.10 | 192.168.10.1 | Trusted VLAN gateway |
| Pi 5 eth0.20 | 192.168.20.1 | Untrusted VLAN gateway + DHCP |
| Pi 5 eth1 | 10.95.1.231 | WAN (university network) |
| Dell (VLAN 10) | 192.168.10.2 | Primary backend IP |
| Dell Tailscale | 100.90.12.111 | Remote access |

---

## Software Stack

### Pi 5 (Detection Node)
- **Suricata 7.0.x** — signature-based IDS, 49,904 rules, monitors `eth0`
- **Scapy** — behavioral packet sniffer, detects SYN scans on local VLANs
- **orchestrator.py** — dual detection pipeline, Stage 1 rules, iptables enforcement
- **dnsmasq** — DHCP server for VLAN 20 (`192.168.20.100–200`)
- **iptables** — enforcement via `FORWARD DROP` rules
- **NetworkManager (nmcli)** — VLAN subinterfaces, survives reboot

### Dell GB10 (AI Brain)
- **Ollama** — local LLM runtime
- **Llama 3.1 70B** (`llama3.1:70b-instruct-q8_0`) — primary reasoning model, 3.4s avg inference
- **Mistral** (`mistral:latest`) — secondary model
- **FastAPI + Uvicorn** — backend API on port 8000
- **WebSocket** — real-time event streaming to dashboard
- **React + TypeScript + Vite + Tailwind** — frontend dashboard on port 4173
- **CVE intelligence module** — `cve_lookup.py` with CVSS scoring and NVD links

---

## Repository Structure

```
/
├── main.py                  # FastAPI backend — all API endpoints + WebSocket
├── cve_lookup.py            # CVE intelligence database and matching
├── orchestrator.py          # Pi 5 detection pipeline (copy from Pi 5)
├── requirements.txt         # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.tsx                          # Main dashboard — architecture map, incident cards
│   │   ├── components/
│   │   │   ├── IncidentInvestigation.tsx    # Forensic detail view
│   │   │   └── GuardianChat.tsx             # AI chat drawer
│   │   ├── services/
│   │   │   └── guardianWebSocket.ts         # WebSocket client service
│   │   └── types/
│   │       └── index.ts                     # Shared TypeScript types
│   ├── .env.local                           # WS + API URLs (not committed)
│   └── package.json
└── README.md
```

---

## Backend API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Health check |
| `/report` | POST | Pi 5 sends Stage 1 decisions here |
| `/analyze` | POST | Stage 2 LLM full threat reasoning |
| `/incidents` | GET | All stored incidents |
| `/threats/frontend` | GET | Incidents in frontend Threat format |
| `/hardware` | GET | Dell hardware metrics (CPU, RAM, temp) |
| `/memory` | GET | Threat memory store |
| `/chat` | POST | Guardian AI chat |
| `/ws` | WS | Real-time WebSocket stream |

### WebSocket Event Types
- `threat_update` — new or updated incident
- `hardware_update` — CPU/RAM/temp metrics
- `thinking_log` — LLM reasoning trace

### Report Payload (Pi 5 → Dell)
```json
{
  "event": {
    "source_ip": "192.168.20.100",
    "threat_type": "port_scan"
  },
  "result": {
    "action": "BLOCK",
    "severity": "high",
    "confidence": 0.95,
    "reasoning": "..."
  }
}
```

---

## Running Guardian

### Prerequisites
- Dell: Python 3.10+, Node 18+, Ollama with `llama3.1:70b-instruct-q8_0` pulled
- Pi 5: Suricata 7.x, Scapy, Python 3.10+
- `.env.local` configured (see below)

### Frontend Configuration

Create `frontend/.env.local`:
```
VITE_WS_URL=ws://100.90.12.111:8000/ws
VITE_API_URL=http://100.90.12.111:8000
```

> ⚠️ `VITE_WS_URL` must use `ws://` not `http://` and must include the `/ws` path. Missing either causes silent fallback to mock data.

### Every Session Startup

**Terminal 1 — Dell backend:**
```bash
cd /home/shared/guardian-brain
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Terminal 2 — Dell frontend:**
```bash
cd /home/shared/guardian-brain/frontend
npm run build && npm run preview -- --host 0.0.0.0 --port 4173
```

**Terminal 3 — Pi 5 orchestrator:**
```bash
ssh bibek@10.95.1.231
cd /home/bibek/guardian
sudo python3 orchestrator.py
```

**Open dashboard:**
```
http://100.90.12.111:4173
```

### Verify Pipeline
```bash
curl -X POST http://192.168.10.2:8000/report \
  -H 'Content-Type: application/json' \
  -d '{"event":{"source_ip":"192.168.20.100","threat_type":"port_scan"},"result":{"action":"BLOCK","severity":"high","confidence":0.95,"reasoning":"test"}}'
```
Expected: `{"status":"logged"}` — incident card appears on dashboard within 1–2 seconds.

---

## Attack Demo (Pi 3 as Insider Threat)

```bash
# 1. Plug Pi 3 into Fa0/11 on the Cisco switch
# 2. Verify Pi 3 gets a 192.168.20.x IP
ip addr show eth0

# 3. Run the attack from Pi 3
sudo nmap -Pn -sS 192.168.10.2

# 4. Watch Pi 5 orchestrator terminal for:
[SCAPY] Port scan detected from 192.168.20.x

# 5. Dashboard shows BLOCKED incident card with Pi 3's real IP
# 6. Verify the block
sudo iptables -L FORWARD -n -v | grep 192.168.20.x
```

### Reset / Clear Blocks
```bash
# On Pi 5
sudo iptables -F FORWARD
sudo iptables -P FORWARD ACCEPT
sudo python3 /home/bibek/guardian/orchestrator.py
```

---

## Orchestrator Logic

### Detection Sources
- **Suricata eve.json tailer** — reads alerts from `/var/log/suricata/eve.json` in real time
- **Scapy sniffer** — background thread on `['eth0', 'eth0.10', 'eth0.20']`

### Port Scan Detection
Scapy only processes SYN packets (`TCP flags == 0x02`, not SYN-ACK) targeting local VLAN addresses:
```python
if not (dst_ip.startswith('192.168.10.') or dst_ip.startswith('192.168.20.')):
    return  # Ignore internet traffic passing through
```
This prevents false positives from CDN/cloud servers.

### Whitelist (never blocked)
- `192.168.10.1` — Pi 5 itself
- `192.168.10.2` — Dell
- `192.168.20.1` — Pi 5 VLAN 20 gateway

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Dashboard shows mock data | Check `.env.local` — `VITE_WS_URL` must be `ws://100.90.12.111:8000/ws`. Rebuild frontend. |
| WebSocket 403 error | `.env.local` missing `/ws` path or using `http://` instead of `ws://` |
| nmap not detected | Check Scapy interface. Check `dst_ip` filter in orchestrator. Verify traffic routes through Pi 5. |
| VLAN 20 device gets no IP | `sudo systemctl restart dnsmasq && journalctl -u dnsmasq \| tail -20` |
| Cannot SSH to Pi 5 | `ssh bibek@10.95.1.231` (WAN) or from Dell: `ssh bibek@192.168.10.1` |
| curl /threats returns HTML | Endpoint is `/incidents` not `/threats` |
| Dell backend not responding | `sudo ufw status` — ports 8000 and 4173 must be ALLOW |

---

## Known Issues

| Issue | Status |
|---|---|
| ARP spoof false positives (Dell MAC flagged) | Open — add Dell + Pi 5 MACs to ARP whitelist |
| Suricata 'wrong thread' noise alerts | Open — suppress in `suricata.yaml` |
| Dell FastAPI not daemonized | Open — create systemd service |
| Orchestrator not daemonized | Open — create systemd service |

---

## Future Enhancements

- SPAN port architecture — keeps Pi 5 out of critical network path
- SecureAPI Shield integration — multi-agent coordination system
- SHAP on Stage 1 classifier — XAI enhancement
- `llama3.1:8b` as faster Stage 2 alternative
- Metasploit on Pi 3 for CVE-based attack simulation

---

*Metropolia University of Applied Sciences — Innovation Project — May 2026*
