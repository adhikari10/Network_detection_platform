from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import httpx
import uvicorn
import json
import asyncio
import psutil
import time
from datetime import datetime
from models import ThreatEvent, AnalysisResult, IncidentLog, ReportPayload
from analyzer import analyze_threat, get_memory_stats

app = FastAPI(title="Guardian Brain", version="0.1.0")

app.mount("/assets", StaticFiles(directory="/home/shared/guardian-brain/frontend/dist/assets"), name="assets")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory stores
incident_log: list[IncidentLog] = []
connected_clients: list[WebSocket] = []
start_time = time.time()


# =============================================================================
# WebSocket broadcast — pushes real-time events to Tanya's frontend
# =============================================================================

async def broadcast(event_type: str, payload: dict):
    """Send a message to all connected WebSocket clients."""
    if not connected_clients:
        return
    msg = json.dumps({"type": event_type, "payload": payload})
    dead = []
    for ws in connected_clients:
        try:
            await ws.send_text(msg)
        except Exception:
            dead.append(ws)
    for ws in dead:
        connected_clients.remove(ws)


def get_hardware_metrics() -> dict:
    """Reads real hardware metrics from the Dell — matches HardwareMetrics type."""
    cpu = psutil.cpu_percent(interval=0.1)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    net = psutil.net_io_counters()
    temps = psutil.sensors_temperatures() if hasattr(psutil, 'sensors_temperatures') else {}
    temp = 0.0
    if temps:
        for entries in temps.values():
            if entries:
                temp = entries[0].current
                break

    uptime_secs = int(time.time() - start_time)
    h, m = divmod(uptime_secs // 60, 60)
    uptime_str = f"{h}h {m}m"

    stats = get_memory_stats()

    return {
        "cpuUsage": round(cpu, 1),
        "memoryUsage": round(mem.percent, 1),
        "temperature": round(temp, 1),
        "diskUsage": round(disk.percent, 1),
        "uptime": uptime_str,
        "networkIn": round(net.bytes_recv / 1024 / 1024, 2),
        "networkOut": round(net.bytes_sent / 1024 / 1024, 2),
        "modelLoaded": True,
        "inferenceTime": 3.4,
        "trackedDevices": stats["tracked_devices"],
        "blockedDevices": stats["blocked_devices"],
    }


def incident_to_threat(inc: IncidentLog, idx: int) -> dict:
    """Convert a Guardian incident to Tanya's Threat type."""
    action = inc.result.action
    status_map = {"block": "blocked", "quarantine": "blocked",
                  "alert": "monitoring", "allow": "resolved", "throttle": "monitoring"}
    return {
        "id": f"THR-{idx:04d}",
        "type": inc.event.threat_type,
        "sourceIP": inc.event.source_ip,
        "targetIP": "192.168.1.1",
        "severity": inc.result.severity,
        "timestamp": inc.timestamp,
        "status": status_map.get(action, "monitoring"),
        "details": inc.result.reasoning,
        "confidence": inc.result.confidence,
        "cve_matches": [c.dict() for c in inc.result.cve_matches] if inc.result.cve_matches else [],
    }


def incident_to_full(inc: IncidentLog, idx: int) -> dict:
    """Convert a Guardian incident to Tanya's Incident type."""
    action = inc.result.action
    status_map = {"block": "resolved", "quarantine": "investigating",
                  "alert": "open", "allow": "resolved", "throttle": "investigating"}
    return {
        "id": f"INC-{idx:04d}",
        "title": f"{inc.event.threat_type.replace('_', ' ').title()} from {inc.event.source_ip}",
        "timestamp": inc.timestamp,
        "severity": inc.result.severity,
        "status": status_map.get(action, "open"),
        "description": inc.result.reasoning,
        "actions": [f"Guardian autonomously executed: {action.upper()}",
                    f"Confidence: {int(inc.result.confidence * 100)}%"],
        "sourceIP": inc.event.source_ip,
        "targetIP": "192.168.1.1",
    }


# =============================================================================
# WebSocket endpoint — Tanya's frontend connects here
# =============================================================================

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    connected_clients.append(ws)
    print(f"[WS] Client connected. Total: {len(connected_clients)}")

    # Send initial state immediately on connect
    await ws.send_text(json.dumps({
        "type": "hardware_update",
        "payload": get_hardware_metrics()
    }))

    # Send recent incidents as thinking logs
    for i, inc in enumerate(incident_log[-10:]):
        await ws.send_text(json.dumps({
            "type": "thinking_log",
            "payload": {
                "id": f"LOG-{i:04d}",
                "timestamp": inc.timestamp[11:19],
                "message": f"[{inc.result.action.upper()}] {inc.event.source_ip} — {inc.event.threat_type}: {inc.result.reasoning[:120]}...",
                "type": "action" if inc.result.action in ("block", "quarantine") else "analysis",
            }
        }))

    try:
        # Keep connection alive + send periodic hardware updates
        while True:
            await asyncio.sleep(5)
            await ws.send_text(json.dumps({
                "type": "hardware_update",
                "payload": get_hardware_metrics()
            }))
            await ws.send_text(json.dumps({
                "type": "agent_pulse",
                "payload": {"timestamp": datetime.now().isoformat()}
            }))
    except WebSocketDisconnect:
        connected_clients.remove(ws)
        print(f"[WS] Client disconnected. Total: {len(connected_clients)}")


# =============================================================================
# REST endpoints
# =============================================================================

@app.get("/")
def root():
    return {"status": "Guardian Brain online", "version": "0.1.0"}


@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


@app.post("/analyze", response_model=AnalysisResult)
async def analyze(event: ThreatEvent, silent: bool = False):
    try:
        result = await analyze_threat(event)

        if not silent:
            inc = IncidentLog(
                timestamp=datetime.now().isoformat(),
                event=event,
                result=result
            )
            incident_log.append(inc)
            idx = len(incident_log) - 1

            # Broadcast to all connected frontend clients
            await broadcast("threat_update", incident_to_threat(inc, idx))
            await broadcast("thinking_log", {
                "id": f"LOG-{idx:04d}",
                "timestamp": inc.timestamp[11:19],
                "message": f"[{result.action.upper()}] {event.source_ip} ({event.threat_type}) — {result.reasoning[:150]}",
                "type": "action" if result.action in ("block", "quarantine") else "analysis",
            })

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/report")
async def report(payload: ReportPayload):
    """Called by Pi Stage 1 to log a decision made without LLM."""
    inc = IncidentLog(
        timestamp=datetime.now().isoformat(),
        event=payload.event,
        result=payload.result
    )
    incident_log.append(inc)
    idx = len(incident_log) - 1
    await broadcast("threat_update", incident_to_threat(inc, idx))
    await broadcast("thinking_log", {
        "id": f"LOG-{idx:04d}",
        "timestamp": inc.timestamp[11:19],
        "message": f"[{payload.result.action.upper()}] {payload.event.source_ip} ({payload.event.threat_type}) — {payload.result.reasoning[:150]}",
        "type": "action" if payload.result.action in ("block", "quarantine") else "analysis",
    })
    return {"status": "logged"}


@app.post("/update-reasoning")
async def update_reasoning(payload: ReportPayload):
    """Called by Pi after async LLM reasoning completes — updates existing incident."""
    src_ip = payload.event.source_ip

    # Find most recent incident for this IP and update its reasoning
    for i in range(len(incident_log) - 1, -1, -1):
        if incident_log[i].event.source_ip == src_ip:
            # Update reasoning and CVE matches in place
            incident_log[i].result.reasoning = payload.result.reasoning
            incident_log[i].result.confidence = payload.result.confidence
            if hasattr(payload.result, "cve_matches") and payload.result.cve_matches:
                incident_log[i].result.cve_matches = payload.result.cve_matches

            # Broadcast updated incident to dashboard
            await broadcast("threat_update", incident_to_threat(incident_log[i], i))
            await broadcast("thinking_log", {
                "id": f"LOG-{i:04d}-reasoning",
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "message": f"[AI REASONING] {src_ip} — {payload.result.reasoning[:150]}",
                "type": "analysis",
            })
            print(f"[REASONING] Updated incident for {src_ip}")
            return {"status": "updated"}

    return {"status": "not_found"}


@app.get("/incidents")
def get_incidents(limit: int = 20):
    return incident_log[-limit:]


@app.get("/incidents/frontend")
def get_incidents_frontend(limit: int = 20):
    """Returns incidents in Tanya's Incident format for the frontend."""
    return [incident_to_full(inc, i) for i, inc in enumerate(incident_log[-limit:])]


@app.get("/threats/frontend")
def get_threats_frontend(limit: int = 20):
    """Returns threats in Tanya's Threat format for the frontend."""
    return [incident_to_threat(inc, i) for i, inc in enumerate(incident_log[-limit:])]


@app.get("/hardware")
def get_hardware():
    """Returns live hardware metrics in Tanya's HardwareMetrics format."""
    return get_hardware_metrics()


@app.get("/memory")
def get_memory():
    return get_memory_stats()


@app.delete("/incidents")
def clear_incidents():
    incident_log.clear()
    return {"status": "cleared"}

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    return FileResponse("/home/shared/guardian-brain/frontend/dist/index.html")

@app.post("/chat")
async def chat(payload: dict):
    incident = payload.get("incident", {})
    messages = payload.get("messages", [])
    user_message = payload.get("message", "")

    system_context = f"""You are Guardian, an autonomous AI network security agent.
You are being asked about a specific incident you handled. Answer concisely and clearly.

INCIDENT CONTEXT:
- Incident ID: {incident.get('id', 'unknown')}
- Source IP: {incident.get('sourceIP', 'unknown')}
- Attack type: {incident.get('type', 'unknown')}
- Severity: {incident.get('severity', 'unknown')}
- Action taken: {incident.get('status', 'unknown')}
- Reasoning: {incident.get('details', 'unknown')}

Answer questions about this incident based on the above context.
Be direct, technical but understandable. Keep answers under 4 sentences."""

    prompt = f"{system_context}\n\n"
    for msg in messages[-6:]:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        prompt += f"{'User' if role == 'user' else 'Guardian'}: {content}\n"
    prompt += f"User: {user_message}\nGuardian:"

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "mistral:latest",
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.3, "num_predict": 300}
            }
        )
        result = response.json()
        return {"response": result.get("response", "").strip()}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
