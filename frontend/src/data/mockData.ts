import type {
  Threat,
  ThinkingLog,
  NetworkNode,
  NetworkConnection,
  Incident,
  HardwareMetrics,
  XAIExplanation,
  AgentState,
} from '../types';

// ── Agent State ──
export const mockAgentState: AgentState = {
  status: 'active',
  mode: 'monitoring',
  totalRequests: '2.3K',
  threatsBlocked: 47,
  uptime: '2d 14h 22m',
  lastScan: '14:35:22',
  activeConnections: 142,
  mlModelVersion: 'v2.1.0-beta',
};

// ── Threats ──
export const mockThreats: Threat[] = [
  {
    id: 'THR-001',
    type: 'SQL Injection',
    sourceIP: '45.67.89.123',
    targetIP: '192.168.1.50',
    severity: 'critical',
    timestamp: '14:35:22',
    status: 'blocked',
    details: 'Detected SQL injection attempt in POST /api/users. Payload contained UNION SELECT with encoded characters. Request blocked at WAF layer.',
  },
  {
    id: 'THR-002',
    type: 'Port Scan',
    sourceIP: '101.34.22.88',
    targetIP: '192.168.1.50',
    severity: 'high',
    timestamp: '14:32:15',
    status: 'monitoring',
    details: 'Sequential port scan detected from external IP. Scanned ports 22, 80, 443, 3306, 5432, 8080. Rate: 120 ports/min.',
  },
  {
    id: 'THR-003',
    type: 'Brute Force',
    sourceIP: '45.67.89.123',
    targetIP: '192.168.1.50',
    severity: 'high',
    timestamp: '14:28:44',
    status: 'blocked',
    details: 'SSH brute force attempt detected. 847 failed login attempts in 5 minutes. IP auto-blocked by firewall rule.',
  },
  {
    id: 'THR-004',
    type: 'XSS Attempt',
    sourceIP: '203.45.67.89',
    targetIP: '192.168.1.50',
    severity: 'medium',
    timestamp: '14:22:10',
    status: 'blocked',
    details: 'Reflected XSS attempt in search parameter. Script tag with event handler detected and sanitized.',
  },
  {
    id: 'THR-005',
    type: 'DDoS Pattern',
    sourceIP: '101.34.22.88',
    targetIP: '192.168.1.50',
    severity: 'critical',
    timestamp: '14:15:33',
    status: 'resolved',
    details: 'Distributed denial of service pattern detected. 15K requests/sec from botnet cluster. Mitigation activated, traffic normalized.',
  },
  {
    id: 'THR-006',
    type: 'Directory Traversal',
    sourceIP: '78.92.13.44',
    targetIP: '192.168.1.50',
    severity: 'medium',
    timestamp: '14:10:05',
    status: 'blocked',
    details: 'Path traversal attempt via URL encoding (..%2F..%2Fetc%2Fpasswd). Request intercepted and logged.',
  },
];

// ── Thinking Logs ──
export const mockThinkingLogs: ThinkingLog[] = [
  {
    id: 'LOG-001',
    timestamp: '14:35:22',
    message: 'Analyzing incoming POST request to /api/users from 45.67.89.123',
    type: 'analysis',
  },
  {
    id: 'LOG-002',
    timestamp: '14:35:22',
    message: 'SQL injection pattern detected: UNION SELECT with base64 encoding',
    type: 'detection',
  },
  {
    id: 'LOG-003',
    timestamp: '14:35:23',
    message: 'Blocking request and updating firewall rules for 45.67.89.123',
    type: 'action',
  },
  {
    id: 'LOG-004',
    timestamp: '14:35:23',
    message: 'Threat signature added to ML model training queue',
    type: 'info',
  },
  {
    id: 'LOG-005',
    timestamp: '14:34:10',
    message: 'Scanning network traffic patterns for anomalies',
    type: 'analysis',
  },
  {
    id: 'LOG-006',
    timestamp: '14:33:55',
    message: 'Normal traffic baseline updated: 1,247 req/min avg',
    type: 'info',
  },
  {
    id: 'LOG-007',
    timestamp: '14:32:15',
    message: 'Sequential port scan detected from 101.34.22.88',
    type: 'detection',
  },
  {
    id: 'LOG-008',
    timestamp: '14:32:16',
    message: 'Initiating deep packet inspection on suspicious traffic',
    type: 'analysis',
  },
  {
    id: 'LOG-009',
    timestamp: '14:32:17',
    message: 'Added 101.34.22.88 to watchlist — monitoring escalated',
    type: 'action',
  },
  {
    id: 'LOG-010',
    timestamp: '14:31:00',
    message: 'ML model inference complete: 99.2% confidence on threat classification',
    type: 'info',
  },
  {
    id: 'LOG-011',
    timestamp: '14:28:44',
    message: 'Brute force attack detected: 847 attempts in 300 seconds',
    type: 'detection',
  },
  {
    id: 'LOG-012',
    timestamp: '14:28:45',
    message: 'Auto-blocking 45.67.89.123 — threshold exceeded (>100 failures/5min)',
    type: 'action',
  },
];

// ── Network Topology ──
export const mockNetworkNodes: NetworkNode[] = [
  { id: 'agent', label: 'GUARDIAN', type: 'agent', ip: '192.168.1.1', status: 'active', x: 300, y: 180 },
  { id: 'firewall', label: 'Firewall', type: 'firewall', ip: '192.168.1.2', status: 'active', x: 150, y: 80 },
  { id: 'server', label: 'Web Server', type: 'server', ip: '192.168.1.50', status: 'active', x: 450, y: 80 },
  { id: 'db', label: 'Database', type: 'server', ip: '192.168.1.51', status: 'active', x: 500, y: 220 },
  { id: 'client1', label: 'Client', type: 'client', ip: '192.168.1.100', status: 'active', x: 100, y: 280 },
  { id: 'attacker1', label: 'Attacker', type: 'attacker', ip: '45.67.89.123', status: 'blocked', x: 50, y: 160 },
  { id: 'attacker2', label: 'Scanner', type: 'attacker', ip: '101.34.22.88', status: 'suspicious', x: 550, y: 300 },
];

export const mockNetworkConnections: NetworkConnection[] = [
  { id: 'conn-1', source: 'firewall', target: 'agent', type: 'normal', traffic: 85 },
  { id: 'conn-2', source: 'agent', target: 'server', type: 'normal', traffic: 72 },
  { id: 'conn-3', source: 'server', target: 'db', type: 'normal', traffic: 45 },
  { id: 'conn-4', source: 'client1', target: 'agent', type: 'normal', traffic: 30 },
  { id: 'conn-5', source: 'attacker1', target: 'firewall', type: 'blocked', traffic: 95 },
  { id: 'conn-6', source: 'attacker2', target: 'server', type: 'suspicious', traffic: 60 },
];

// ── Incidents ──
export const mockIncidents: Incident[] = [
  {
    id: 'INC-001',
    title: 'SQL Injection Attack — Critical',
    timestamp: '14:35:22',
    severity: 'critical',
    status: 'investigating',
    description: 'Automated SQL injection attack targeting user authentication endpoint. Multiple encoded payloads detected attempting to extract database credentials.',
    actions: [
      'Request blocked at WAF layer',
      'Source IP added to blocklist',
      'Database connections audited',
      'Incident escalated to SOC team',
    ],
    sourceIP: '45.67.89.123',
    targetIP: '192.168.1.50',
  },
  {
    id: 'INC-002',
    title: 'Coordinated Port Scan',
    timestamp: '14:32:15',
    severity: 'high',
    status: 'open',
    description: 'Systematic port enumeration across all public-facing services. Pattern suggests reconnaissance phase of a larger attack.',
    actions: [
      'Port scan logged and correlated',
      'Source IP added to watchlist',
      'Network monitoring sensitivity increased',
    ],
    sourceIP: '101.34.22.88',
    targetIP: '192.168.1.50',
  },
  {
    id: 'INC-003',
    title: 'SSH Brute Force Mitigated',
    timestamp: '14:28:44',
    severity: 'high',
    status: 'resolved',
    description: 'High-volume SSH credential stuffing attack successfully mitigated. Attack originated from previously flagged IP.',
    actions: [
      'IP permanently blocked',
      'SSH rate limiting tightened',
      'Fail2ban rules updated',
      'Password policy audit initiated',
    ],
    sourceIP: '45.67.89.123',
    targetIP: '192.168.1.50',
  },
];

// ── Hardware Metrics ──
export const mockHardwareMetrics: HardwareMetrics = {
  cpuUsage: 42,
  memoryUsage: 67,
  temperature: 52,
  diskUsage: 34,
  uptime: '2d 14h 22m',
  networkIn: 12.4,
  networkOut: 3.8,
  modelLoaded: true,
  inferenceTime: 23,
};

// ── XAI Explanations ──
export const mockXAIExplanations: XAIExplanation[] = [
  {
    id: 'XAI-001',
    timestamp: '14:35:22',
    decision: 'BLOCK request from 45.67.89.123',
    confidence: 98.7,
    factors: [
      { name: 'SQL Pattern Match', weight: 0.42, value: 'UNION SELECT detected' },
      { name: 'IP Reputation', weight: 0.28, value: 'Known malicious (3 priors)' },
      { name: 'Request Anomaly', weight: 0.18, value: 'Encoded payload in body' },
      { name: 'Behavioral Score', weight: 0.12, value: '847 requests in 5min' },
    ],
    conclusion: 'High-confidence SQL injection attempt. Request payload contains classic UNION-based extraction pattern with base64 encoding to evade WAF rules. Source IP has 3 prior incidents.',
  },
  {
    id: 'XAI-002',
    timestamp: '14:32:15',
    decision: 'MONITOR traffic from 101.34.22.88',
    confidence: 76.3,
    factors: [
      { name: 'Scan Pattern', weight: 0.35, value: 'Sequential port access' },
      { name: 'IP Reputation', weight: 0.25, value: 'No prior incidents' },
      { name: 'Traffic Volume', weight: 0.22, value: '120 ports/min' },
      { name: 'Time Pattern', weight: 0.18, value: 'Off-hours activity' },
    ],
    conclusion: 'Likely reconnaissance scan. Confidence below block threshold — escalating to monitoring with automatic block if scan continues beyond 500 ports.',
  },
  {
    id: 'XAI-003',
    timestamp: '14:15:33',
    decision: 'ACTIVATE DDoS mitigation',
    confidence: 99.1,
    factors: [
      { name: 'Request Volume', weight: 0.40, value: '15K req/sec (normal: 1.2K)' },
      { name: 'Source Diversity', weight: 0.30, value: '2,400 unique IPs' },
      { name: 'Payload Similarity', weight: 0.20, value: '98% identical requests' },
      { name: 'Geographic Spread', weight: 0.10, value: '12 countries in 30 sec' },
    ],
    conclusion: 'Classic volumetric DDoS attack from botnet. Request patterns are nearly identical across all source IPs, confirming coordinated attack. Rate limiting and geo-blocking activated.',
  },
];
