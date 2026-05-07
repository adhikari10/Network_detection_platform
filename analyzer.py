import httpx
import json
import re
import time
from datetime import datetime
from collections import defaultdict
from models import ThreatEvent, AnalysisResult, CVEMatch
from cve_lookup import lookup_cves_for_ports

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "mistral:latest"

CONFIDENCE_THRESHOLD = 0.70
DEFAULT_BLOCK_DURATION = 300   # 5 minutes
CLEAN_PERIOD_REQUIRED  = 120   # 2 minutes clean before auto-unblock


# =============================================================================
# 1. THREAT MEMORY — remembers every device's full incident history
# =============================================================================

class DeviceMemory:
    def __init__(self):
        self._incidents: dict[str, list[dict]] = defaultdict(list)
        self._blocked: dict[str, dict] = {}
        self._pending_signals: dict[str, list] = defaultdict(list)

    def record_incident(self, ip: str, event: ThreatEvent, result: AnalysisResult):
        self._incidents[ip].append({
            "timestamp": datetime.now().isoformat(),
            "threat_type": event.threat_type,
            "action": result.action,
            "severity": result.severity,
            "confidence": result.confidence,
        })
        self._incidents[ip] = self._incidents[ip][-20:]

        if result.action in ("block", "quarantine"):
            duration = result.recommended_duration or DEFAULT_BLOCK_DURATION
            self._blocked[ip] = {
                "blocked_at": datetime.now(),
                "duration": duration,
                "reason": result.reasoning,
                "last_activity": datetime.now(),
            }

    def get_history(self, ip: str) -> list[dict]:
        return self._incidents.get(ip, [])

    def get_incident_count(self, ip: str) -> int:
        return len(self._incidents.get(ip, []))

    def get_prior_actions(self, ip: str) -> list[str]:
        return [i["action"] for i in self._incidents.get(ip, [])]

    def is_blocked(self, ip: str) -> bool:
        if ip not in self._blocked:
            return False
        block = self._blocked[ip]
        elapsed = (datetime.now() - block["blocked_at"]).total_seconds()
        return elapsed < block["duration"]

    def record_activity(self, ip: str):
        if ip in self._blocked:
            self._blocked[ip]["last_activity"] = datetime.now()

    # ── 4. AUTO-UNBLOCK ───────────────────────────────────────────────────────
    def should_unblock(self, ip: str) -> bool:
        if ip not in self._blocked:
            return False
        block = self._blocked[ip]
        elapsed_total = (datetime.now() - block["blocked_at"]).total_seconds()
        elapsed_clean  = (datetime.now() - block["last_activity"]).total_seconds()
        return elapsed_total >= block["duration"] or elapsed_clean >= CLEAN_PERIOD_REQUIRED

    def unblock(self, ip: str):
        self._blocked.pop(ip, None)

    def get_blocked_devices(self) -> dict:
        return {ip: info for ip, info in self._blocked.items() if self.is_blocked(ip)}

    # ── 3. MULTI-SIGNAL CORRELATION ───────────────────────────────────────────
    def add_signal(self, ip: str, event: ThreatEvent):
        self._pending_signals[ip].append(event)
        self._pending_signals[ip] = self._pending_signals[ip][-10:]

    def get_signals(self, ip: str) -> list:
        return self._pending_signals.get(ip, [])

    def clear_signals(self, ip: str):
        self._pending_signals.pop(ip, None)


memory = DeviceMemory()


# =============================================================================
# SYSTEM PROMPT
# =============================================================================

SYSTEM_PROMPT = """You are Guardian, an autonomous AI network security agent protecting a segmented network with trusted (VLAN 10) and untrusted (VLAN 20) zones.
Your job is to analyze network threat events and make autonomous decisions. You must explain your reasoning in detail so that anyone — including non-technical staff — can understand exactly why you made your decision.

You must respond with ONLY a JSON object — no preamble, no markdown, no extra text.

Response format:
{
  "action": "<block|alert|allow|throttle|quarantine>",
  "severity": "<critical|high|medium|low>",
  "confidence": <0.0 to 1.0>,
  "reasoning": "<detailed plain-English explanation — see requirements below>",
  "recommended_duration": <seconds as integer, or null>
}

Reasoning requirements — your reasoning MUST cover all of these points:
1. WHAT happened: describe the specific behavior observed (ports probed, packet rate, protocol)
2. WHY it is suspicious: explain what makes this behavior abnormal compared to legitimate traffic
3. DEVICE HISTORY: mention whether this device has been seen before and any prior incidents
4. CONFIDENCE explanation: explain why your confidence is high or low
5. DECISION explanation: explain exactly why you chose this specific action over alternatives
6. NEXT STEPS: tell the analyst what to watch for next

Example of good reasoning:
"Device 192.168.20.115 probed 7 unique ports (22, 80, 443, 3306, 8080, 5432, 21) on the trusted server 192.168.10.2 within 60 seconds. This pattern is consistent with automated reconnaissance — a legitimate device does not probe database ports (3306, 5432) and FTP (21) alongside web ports unless it is actively scanning for vulnerabilities. This device has no prior incident history, which slightly reduces confidence, but the breadth of ports targeted is a strong indicator of malicious intent. Confidence is 90% because the port diversity clearly matches known scan signatures. Blocking immediately rather than just alerting because the scan targeted critical service ports on a trusted VLAN device — allowing this to continue risks exposing database credentials or remote access vulnerabilities. Monitor for any further connection attempts from this subnet."

Action definitions:
- block: Immediately cut off all network access — use for clear threats
- quarantine: Isolate to restricted zone — use for suspicious but uncertain devices
- throttle: Severely limit bandwidth — use for potential DoS sources
- alert: Log and notify, no action — use only when genuinely uncertain
- allow: No threat detected, normal traffic

Key rules:
- A device with multiple prior incidents must be treated more severely
- A device previously blocked that reoffends → block immediately at 99% confidence
- Never give vague reasoning — be specific about ports, counts, timing
- Write as if explaining to a junior analyst who has never seen this before
- Be decisive. You are autonomous — the human is only an observer."""


# =============================================================================
# PROMPT BUILDER — injects history + correlated signals
# =============================================================================

def build_prompt(event: ThreatEvent, history: list[dict], correlated: list) -> str:
    parts = [
        f"Threat type: {event.threat_type}",
        f"Source IP: {event.source_ip}",
    ]

    if event.device_name:
        parts.append(f"Device name: {event.device_name}")
    if event.packet_count:
        parts.append(f"Packet count: {event.packet_count}")
    if event.ports_scanned:
        parts.append(f"Ports scanned: {event.ports_scanned[:20]}"
                     + (" (truncated)" if len(event.ports_scanned) > 20 else ""))
    if event.duration_seconds:
        parts.append(f"Duration: {event.duration_seconds:.1f} seconds")
    if event.time_of_day:
        parts.append(f"Time of day: {event.time_of_day}")
    if event.is_known_device is not None:
        parts.append(f"Known device: {'yes' if event.is_known_device else 'NO — first seen device'}")
    if event.dns_queries:
        parts.append(f"DNS queries: {', '.join(event.dns_queries[:10])}")
    if event.bytes_transferred:
        parts.append(f"Bytes transferred: {event.bytes_transferred:,}")
    if event.additional_context:
        parts.append(f"Additional context: {event.additional_context}")

    # Inject device history
    if history:
        parts.append(f"\nDEVICE HISTORY ({len(history)} prior incidents):")
        for inc in history[-5:]:
            parts.append(f"  - [{inc['timestamp'][:16]}] {inc['threat_type']} → {inc['action'].upper()} (severity: {inc['severity']})")
        prior_blocks = [i for i in history if i["action"] in ("block", "quarantine")]
        if prior_blocks:
            parts.append(f"  !! This device has been blocked/quarantined {len(prior_blocks)} time(s) before.")
    else:
        parts.append("\nDEVICE HISTORY: No prior incidents — first time seen.")

    # Inject correlated signals
    if correlated:
        parts.append(f"\nCORRELATED SIGNALS ({len(correlated)} other events from this device in last 60s):")
        for sig in correlated:
            parts.append(f"  - {sig.threat_type} (packets: {sig.packet_count or '?'})")
        parts.append("  Multiple signals from same device — consider this a coordinated pattern.")

    return "Analyze this network threat event and make an autonomous decision:\n\n" + "\n".join(parts)


# =============================================================================
# MAIN ANALYSIS FUNCTION
# =============================================================================

async def analyze_threat(event: ThreatEvent) -> AnalysisResult:
    ip = event.source_ip
    history = memory.get_history(ip)
    incident_count = memory.get_incident_count(ip)

    # Fast path: already blocked device trying again
    if memory.is_blocked(ip):
        memory.record_activity(ip)
        result = AnalysisResult(
            action="block",
            severity="critical",
            confidence=0.99,
            reasoning=(f"Device {ip} is already blocked and continues attempting network activity. "
                       f"This device has {incident_count} prior incidents on record. Maintaining block."),
            recommended_duration=DEFAULT_BLOCK_DURATION,
        )
        memory.record_incident(ip, event, result)
        return result

    # Auto-unblock check
    if memory.should_unblock(ip):
        memory.unblock(ip)

    # Collect signal for correlation
    memory.add_signal(ip, event)
    correlated = [s for s in memory.get_signals(ip) if s is not event]

    # Build prompt with full context
    prompt = build_prompt(event, history, correlated)

    payload = {
        "model": MODEL,
        "prompt": f"{SYSTEM_PROMPT}\n\n{prompt}",
        "stream": False,
        "options": {
            "temperature": 0.2,
            "num_predict": 500,
        }
    }

    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(OLLAMA_URL, json=payload)
        response.raise_for_status()
        raw = response.json()["response"].strip()

    raw = re.sub(r"```json\s*|\s*```", "", raw).strip()
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise ValueError(f"LLM did not return valid JSON. Raw: {raw[:300]}")

    data = json.loads(match.group())
    confidence = float(data.get("confidence", 0.5))
    action = data.get("action", "alert")
    reasoning = data.get("reasoning", "No reasoning provided.")

    # 2. CONFIDENCE CALIBRATION — downgrade if not confident enough
    if confidence < CONFIDENCE_THRESHOLD and incident_count == 0 and action in ("block", "quarantine"):
        action = "alert"
        reasoning = (f"Confidence too low ({int(confidence*100)}%) to act on a device with no prior history. "
                     f"Collecting more signals before escalating. Original assessment: {reasoning}")

    # Escalate repeat offenders
    if incident_count >= 3 and action == "alert":
        action = "quarantine"
        reasoning = (f"Escalating to quarantine: device has {incident_count} prior incidents. "
                     f"Repeat offender pattern. {reasoning}")

    # CVE intelligence lookup — runs independently of LLM reasoning
    cve_matches = []
    if event.ports_scanned:
        raw_cves = lookup_cves_for_ports(event.ports_scanned)
        cve_matches = [CVEMatch(**c) for c in raw_cves]
        if cve_matches:
            print(f"[CVE] {len(cve_matches)} CVE matches found for ports {event.ports_scanned}")

    result = AnalysisResult(
        action=action,
        severity=data.get("severity", "medium"),
        confidence=confidence,
        reasoning=reasoning,
        recommended_duration=data.get("recommended_duration") or DEFAULT_BLOCK_DURATION,
        cve_matches=cve_matches if cve_matches else None,
    )

    memory.record_incident(ip, event, result)
    memory.clear_signals(ip)
    return result


def get_memory_stats() -> dict:
    blocked = memory.get_blocked_devices()
    all_ips = list(memory._incidents.keys())
    return {
        "tracked_devices": len(all_ips),
        "blocked_devices": len(blocked),
        "blocked_ips": list(blocked.keys()),
        "device_profiles": {
            ip: {
                "incident_count": memory.get_incident_count(ip),
                "prior_actions": memory.get_prior_actions(ip),
                "is_blocked": memory.is_blocked(ip),
            }
            for ip in all_ips
        }
    }
