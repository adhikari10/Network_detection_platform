from pydantic import BaseModel
from typing import Optional


class ThreatEvent(BaseModel):
    """
    Sent by the Pi (or test script) to describe a suspicious event.
    All fields except source_ip and threat_type are optional — the LLM
    reasons better with more context, but works with minimal input too.
    """
    source_ip: str
    threat_type: str                        # e.g. "port_scan", "ddos", "dns_tunnel"
    device_name: Optional[str] = None       # e.g. "unknown-device-3"
    packet_count: Optional[int] = None      # how many packets triggered this
    ports_scanned: Optional[list[int]] = None
    duration_seconds: Optional[float] = None
    time_of_day: Optional[str] = None       # e.g. "03:14"
    is_known_device: Optional[bool] = None  # from behavioral baseline
    dns_queries: Optional[list[str]] = None
    bytes_transferred: Optional[int] = None
    additional_context: Optional[str] = None


class CVEMatch(BaseModel):
    """A single CVE match for a targeted port."""
    port: int
    service: str
    cve_id: str
    description: str
    cvss_score: float
    severity: str
    url: str

class AnalysisResult(BaseModel):
    """
    Returned by the Dell LLM after reasoning about a ThreatEvent.
    The Pi uses 'action' to decide what to do.
    The dashboard surfaces 'reasoning' to explain the decision.
    """
    action: str          # "block", "alert", "allow", "throttle", "quarantine"
    severity: str        # "critical", "high", "medium", "low"
    confidence: float    # 0.0 to 1.0
    reasoning: str       # Full human-readable explanation from the LLM
    recommended_duration: Optional[int] = None   # seconds to apply the action
    cve_matches: Optional[list[CVEMatch]] = None  # CVE intelligence — separate from LLM reasoning


class IncidentLog(BaseModel):
    timestamp: str
    event: ThreatEvent
    result: AnalysisResult

class ReportPayload(BaseModel):
    event: ThreatEvent
    result: AnalysisResult
