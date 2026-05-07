import type { ThinkingLog, Threat, HardwareMetrics } from '../types';

type EventType = 'thinking_log' | 'threat_update' | 'hardware_update' | 'agent_pulse';
type Listener = (data: unknown) => void;

const thinkingMessages: Array<{ message: string; type: ThinkingLog['type'] }> = [
  { message: 'Scanning inbound traffic on port 443...', type: 'analysis' },
  { message: 'TLS handshake verified for 192.168.1.100', type: 'info' },
  { message: 'Anomalous packet size detected from external source', type: 'detection' },
  { message: 'Running deep packet inspection on flagged traffic', type: 'analysis' },
  { message: 'Updating threat signature database from central repo', type: 'info' },
  { message: 'Behavioral analysis: normal user session pattern confirmed', type: 'analysis' },
  { message: 'Rate limiter triggered for /api/login endpoint', type: 'action' },
  { message: 'ML model prediction: benign traffic (confidence: 97.8%)', type: 'info' },
  { message: 'New connection from 10.0.0.15 — validating certificate', type: 'analysis' },
  { message: 'Suspicious User-Agent string detected in HTTP headers', type: 'detection' },
  { message: 'Firewall rule #47 updated: blocking CIDR 45.67.89.0/24', type: 'action' },
  { message: 'Correlating events across last 60 seconds for pattern match', type: 'analysis' },
  { message: 'DNS query spike detected — potential tunneling attempt', type: 'detection' },
  { message: 'Geo-IP check: request origin matches known proxy network', type: 'detection' },
  { message: 'Session fingerprint mismatch — possible token hijack', type: 'detection' },
  { message: 'Deploying honeypot response to probe request', type: 'action' },
];

function generateTimestamp(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
}

let logCounter = 100;

function generateThinkingLog(): ThinkingLog {
  const entry = thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)];
  logCounter++;
  return {
    id: `LOG-${logCounter}`,
    timestamp: generateTimestamp(),
    message: entry.message,
    type: entry.type,
  };
}

function jitterHardware(base: HardwareMetrics): HardwareMetrics {
  const jitter = (val: number, range: number) =>
    Math.max(0, Math.min(100, val + (Math.random() - 0.5) * range));

  return {
    ...base,
    cpuUsage: Math.round(jitter(base.cpuUsage, 8)),
    memoryUsage: Math.round(jitter(base.memoryUsage, 4)),
    temperature: Math.round(jitter(base.temperature, 3)),
    networkIn: parseFloat(jitter(base.networkIn, 2).toFixed(1)),
    networkOut: parseFloat(jitter(base.networkOut, 1).toFixed(1)),
    inferenceTime: Math.round(jitter(base.inferenceTime, 6)),
  };
}

const threatTypes = ['SQL Injection', 'Port Scan', 'XSS Attempt', 'Brute Force', 'Path Traversal'];
const attackerIPs = ['45.67.89.123', '101.34.22.88', '203.45.67.89', '78.92.13.44', '156.23.45.67'];
const severities = ['critical', 'high', 'medium', 'low'] as const;
let threatCounter = 100;

function generateThreat(): Threat {
  threatCounter++;
  return {
    id: `THR-${threatCounter}`,
    type: threatTypes[Math.floor(Math.random() * threatTypes.length)],
    sourceIP: attackerIPs[Math.floor(Math.random() * attackerIPs.length)],
    targetIP: '192.168.1.50',
    severity: severities[Math.floor(Math.random() * severities.length)],
    timestamp: generateTimestamp(),
    status: Math.random() > 0.3 ? 'blocked' : 'monitoring',
    details: 'Auto-generated threat event from mock WebSocket feed.',
  };
}

export class MockWebSocket {
  private listeners: Map<EventType, Set<Listener>> = new Map();
  private intervals: number[] = [];
  private running = false;
  private baseHardware: HardwareMetrics;

  constructor(baseHardware: HardwareMetrics) {
    this.baseHardware = baseHardware;
  }

  on(event: EventType, listener: Listener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: EventType, listener: Listener): void {
    this.listeners.get(event)?.delete(listener);
  }

  private emit(event: EventType, data: unknown): void {
    this.listeners.get(event)?.forEach(fn => fn(data));
  }

  connect(): void {
    if (this.running) return;
    this.running = true;

    // Emit thinking logs every 2-4 seconds
    const logInterval = window.setInterval(() => {
      this.emit('thinking_log', generateThinkingLog());
    }, 2000 + Math.random() * 2000);

    // Emit hardware updates every 3 seconds
    const hwInterval = window.setInterval(() => {
      this.baseHardware = jitterHardware(this.baseHardware);
      this.emit('hardware_update', { ...this.baseHardware });
    }, 3000);

    // Emit new threats occasionally (every 8-15 seconds)
    const threatInterval = window.setInterval(() => {
      this.emit('threat_update', generateThreat());
    }, 8000 + Math.random() * 7000);

    // Agent heartbeat every 5 seconds
    const pulseInterval = window.setInterval(() => {
      this.emit('agent_pulse', { timestamp: generateTimestamp() });
    }, 5000);

    this.intervals.push(logInterval, hwInterval, threatInterval, pulseInterval);
  }

  disconnect(): void {
    this.running = false;
    this.intervals.forEach(id => window.clearInterval(id));
    this.intervals = [];
  }
}
