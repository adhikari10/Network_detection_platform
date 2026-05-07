// ── Guardian Security Agent: Type Definitions ──
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type ThreatStatus = 'blocked' | 'monitoring' | 'resolved';
export type AgentMode = 'monitoring' | 'defensive' | 'learning';
export type AgentStatusType = 'active' | 'idle' | 'alert';
export type NodeType = 'server' | 'client' | 'attacker' | 'firewall' | 'agent';
export type NodeStatus = 'active' | 'suspicious' | 'blocked';
export type ConnectionType = 'normal' | 'suspicious' | 'blocked';
export type IncidentStatus = 'open' | 'investigating' | 'resolved';
export type LogType = 'analysis' | 'detection' | 'action' | 'info';

export interface Threat {
  id: string;
  type: string;
  sourceIP: string;
  targetIP: string;
  severity: Severity;
  timestamp: string;
  status: ThreatStatus;
  details: string;
  confidence?: number;
  cve_matches?: CVEMatch[];
}

export interface ThinkingLog {
  id: string;
  timestamp: string;
  message: string;
  type: LogType;
}

export interface NetworkNode {
  id: string;
  label: string;
  type: NodeType;
  ip: string;
  status: NodeStatus;
  x: number;
  y: number;
}

export interface NetworkConnection {
  id: string;
  source: string;
  target: string;
  type: ConnectionType;
  traffic: number;
}

export interface Incident {
  id: string;
  title: string;
  timestamp: string;
  severity: Severity;
  status: IncidentStatus;
  description: string;
  actions: string[];
  sourceIP: string;
  targetIP: string;
}

export interface HardwareMetrics {
  cpuUsage: number;
  memoryUsage: number;
  temperature: number;
  diskUsage: number;
  uptime: string;
  networkIn: number;
  networkOut: number;
  modelLoaded: boolean;
  inferenceTime: number;
}

export interface XAIExplanation {
  id: string;
  timestamp: string;
  decision: string;
  confidence: number;
  factors: XAIFactor[];
  conclusion: string;
}

export interface XAIFactor {
  name: string;
  weight: number;
  value: string;
}

export interface AgentState {
  status: AgentStatusType;
  mode: AgentMode;
  totalRequests: string;
  threatsBlocked: number;
  uptime: string;
  lastScan: string;
  activeConnections: number;
  mlModelVersion: string;
}

export interface WSMessage {
  type: 'threat' | 'log' | 'hardware' | 'incident' | 'xai' | 'agent_status';
  payload: unknown;
  timestamp: string;
}

// ── NEW: Forensic investigation map types ──────────────────────────────────────

/** A node in the attack-path forensic SVG map */
export interface ForensicNode {
  id: string;
  label: string;         // e.g. "Attacker", "Router", "Pi Sensor", "Dell AI", "Target"
  ip: string;
  role: 'attacker' | 'infrastructure' | 'sensor' | 'brain' | 'target';
  status: 'clean' | 'suspicious' | 'compromised' | 'defending';
}

/** A directed edge between two ForensicNodes */
export interface ForensicEdge {
  id: string;
  source: string;        // ForensicNode.id
  target: string;        // ForensicNode.id
  label?: string;        // e.g. "SYN scan", "BLOCKED", "reported"
  type: 'attack' | 'block' | 'report' | 'normal';
  animated: boolean;
}

/** A single message in the Guardian chat drawer */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  loading?: boolean;     // true while waiting for response
}

// ── CVE Intelligence ───────────────────────────────────────────────────────────
export interface CVEMatch {
  port: number;
  service: string;
  cve_id: string;
  description: string;
  cvss_score: number;
  severity: Severity;
  url: string;
}
