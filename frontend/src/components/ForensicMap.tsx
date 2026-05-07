import type { Threat } from '../types';
import type { ForensicNode, ForensicEdge } from '../types';

// ── helpers ───────────────────────────────────────────────────────────────────
const mono = (s: number | string, color = '#c8d6e5') =>
  ({ fontFamily: 'monospace', fontSize: s as number, color } as React.CSSProperties);

const ROLE_COLOR: Record<ForensicNode['role'], string> = {
  attacker:       '#ff4d4d',
  infrastructure: '#4a7fa5',
  sensor:         '#ffd166',
  brain:          '#06d6a0',
  target:         '#b388ff',
};

const ROLE_ICON: Record<ForensicNode['role'], string> = {
  attacker:       '💀',
  infrastructure: '🔀',
  sensor:         '📡',
  brain:          '🧠',
  target:         '🖥️',
};

const STATUS_GLOW: Record<ForensicNode['status'], string> = {
  clean:        'none',
  suspicious:   '0 0 12px #ffd166',
  compromised:  '0 0 16px #ff4d4d',
  defending:    '0 0 14px #06d6a0',
};

const EDGE_COLOR: Record<ForensicEdge['type'], string> = {
  attack: '#ff4d4d',
  block:  '#06d6a0',
  report: '#4da6ff',
  normal: '#1e3050',
};

// Fixed layout positions (x,y in SVG coords 0-800 x 0-200)
const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  attacker:       { x: 60,  y: 100 },
  router:         { x: 200, y: 100 },
  pi_sensor:      { x: 360, y: 100 },
  dell_brain:     { x: 530, y: 100 },
  target:         { x: 700, y: 100 },
};

// Build static topology from a threat
function buildTopology(threat: Threat | null): { nodes: ForensicNode[]; edges: ForensicEdge[] } {
  const isBlocked = threat?.status === 'blocked';

  const nodes: ForensicNode[] = [
    {
      id: 'attacker',
      label: 'Attacker',
      ip: threat?.sourceIP ?? '—',
      role: 'attacker',
      status: threat ? 'compromised' : 'clean',
    },
    {
      id: 'router',
      label: 'Router',
      ip: '192.168.0.1',
      role: 'infrastructure',
      status: 'clean',
    },
    {
      id: 'pi_sensor',
      label: 'Pi Sensor',
      ip: '192.168.0.195',
      role: 'sensor',
      status: threat ? (isBlocked ? 'defending' : 'suspicious') : 'clean',
    },
    {
      id: 'dell_brain',
      label: 'Dell AI',
      ip: '100.90.12.111',
      role: 'brain',
      status: threat ? 'defending' : 'clean',
    },
    {
      id: 'target',
      label: 'Target',
      ip: threat?.targetIP ?? '192.168.0.166',
      role: 'target',
      status: threat && !isBlocked ? 'suspicious' : 'clean',
    },
  ];

  const edges: ForensicEdge[] = [
    {
      id: 'e1',
      source: 'attacker',
      target: 'router',
      label: threat?.type ?? 'traffic',
      type: threat ? 'attack' : 'normal',
      animated: !!threat && !isBlocked,
    },
    {
      id: 'e2',
      source: 'router',
      target: 'pi_sensor',
      label: 'forwarded',
      type: threat ? 'attack' : 'normal',
      animated: !!threat && !isBlocked,
    },
    {
      id: 'e3',
      source: 'pi_sensor',
      target: 'dell_brain',
      label: 'reported',
      type: 'report',
      animated: !!threat,
    },
    ...(isBlocked ? [{
      id: 'e4',
      source: 'pi_sensor',
      target: 'attacker',
      label: 'BLOCKED',
      type: 'block' as const,
      animated: true,
    }] : [{
      id: 'e4',
      source: 'pi_sensor',
      target: 'target',
      label: 'passed',
      type: 'normal' as const,
      animated: false,
    }]),
  ];

  return { nodes, edges };
}

// ── SVG arrow marker defs ─────────────────────────────────────────────────────
function Defs() {
  return (
    <defs>
      {(['attack', 'block', 'report', 'normal'] as const).map(t => (
        <marker
          key={t}
          id={`arrow-${t}`}
          markerWidth="8" markerHeight="8"
          refX="6" refY="3"
          orient="auto"
        >
          <path d="M0,0 L0,6 L8,3 z" fill={EDGE_COLOR[t]} />
        </marker>
      ))}
    </defs>
  );
}

// ── Edge component ────────────────────────────────────────────────────────────
function Edge({ edge }: { edge: ForensicEdge }) {
  const src = NODE_POSITIONS[edge.source];
  const tgt = NODE_POSITIONS[edge.target];
  if (!src || !tgt) return null;

  const color = EDGE_COLOR[edge.type];
  const isReverse = tgt.x < src.x; // block arrow going back left

  // Offset y slightly for block (reverse) edge so it doesn't overlap
  const srcY = isReverse ? src.y - 18 : src.y;
  const tgtY = isReverse ? tgt.y - 18 : tgt.y;

  const midX = (src.x + tgt.x) / 2;
  const midY = (srcY + tgtY) / 2 - (isReverse ? 0 : 0);

  const dashArray = edge.type === 'report' ? '6 3' : edge.animated ? '8 4' : 'none';
  const strokeW = edge.type === 'block' ? 2 : 1.5;

  return (
    <g>
      <line
        x1={src.x} y1={srcY}
        x2={tgt.x} y2={tgtY}
        stroke={color}
        strokeWidth={strokeW}
        strokeDasharray={dashArray}
        markerEnd={`url(#arrow-${edge.type})`}
        opacity={0.85}
        style={edge.animated ? {
          strokeDashoffset: 0,
          animation: 'dash 1.2s linear infinite',
        } : undefined}
      />
      {edge.label && (
        <text
          x={midX}
          y={midY - 8}
          textAnchor="middle"
          style={{ ...mono(11, color), fontWeight: 700, letterSpacing: 1.5 }}
        >
          {edge.label.toUpperCase()}
        </text>
      )}
    </g>
  );
}

// ── Node component ────────────────────────────────────────────────────────────
function Node({ node }: { node: ForensicNode }) {
  const pos = NODE_POSITIONS[node.id];
  if (!pos) return null;
  const color = ROLE_COLOR[node.role];
  const glow = STATUS_GLOW[node.status];

  return (
    <g>
      {/* Outer ring */}
      <circle
        cx={pos.x} cy={pos.y} r={26}
        fill="none"
        stroke={color}
        strokeWidth={node.status !== 'clean' ? 2 : 1}
        opacity={node.status !== 'clean' ? 1 : 0.4}
        style={node.status === 'defending' || node.status === 'compromised' ? {
          animation: 'ringPulse 1.5s ease-in-out infinite',
        } : undefined}
      />
      {/* Fill */}
      <circle
        cx={pos.x} cy={pos.y} r={22}
        fill="#06111f"
        stroke={color}
        strokeWidth={1.5}
        style={{ filter: glow !== 'none' ? `drop-shadow(${glow})` : undefined }}
      />
      {/* Icon */}
      <text x={pos.x} y={pos.y + 5} textAnchor="middle" style={{ fontSize: 14 }}>
        {ROLE_ICON[node.role]}
      </text>
      {/* Label */}
      <text
        x={pos.x} y={pos.y + 46}
        textAnchor="middle"
        style={{ ...mono(13, '#ffffff'), fontWeight: 700, letterSpacing: 2 }}
      >
        {node.label.toUpperCase()}
      </text>
      {/* IP */}
      <text
        x={pos.x} y={pos.y + 62}
        textAnchor="middle"
        style={{ ...mono(11, '#8ab4d4'), fontWeight: 500 }}
      >
        {node.ip}
      </text>
    </g>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
interface ForensicMapProps {
  threat: Threat | null;
}

export default function ForensicMap({ threat }: ForensicMapProps) {
  const { nodes, edges } = buildTopology(threat);

  return (
    <div style={{
      background: '#06111f',
      border: '1px solid #1e3050',
      borderRadius: 8,
      padding: '16px 12px 8px',
      position: 'relative',
    }}>
      {/* Title row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12,
      }}>
        <span style={{ ...mono(11, '#4a7fa5'), letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>
          Attack Path
        </span>
        {threat && (
          <span style={{
            ...mono(10, threat.status === 'blocked' ? '#06d6a0' : '#ff4d4d'),
            letterSpacing: 2, fontWeight: 700,
            background: threat.status === 'blocked' ? '#002d1a' : '#2d0000',
            padding: '2px 8px', borderRadius: 3,
          }}>
            {threat.status.toUpperCase()}
          </span>
        )}
      </div>

      <style>{`
        @keyframes dash {
          to { stroke-dashoffset: -24; }
        }
        @keyframes ringPulse {
          0%, 100% { r: 26; opacity: 1; }
          50%       { r: 30; opacity: 0.5; }
        }
      `}</style>

      <svg
        viewBox="0 0 780 190"
        width="100%"
        style={{ overflow: 'visible' }}
      >
        <Defs />
        {edges.map(e => <Edge key={e.id} edge={e} />)}
        {nodes.map(n => <Node key={n.id} node={n} />)}
      </svg>

      {!threat && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          ...mono(12, '#2a4a6a'), letterSpacing: 2,
        }}>
          SELECT AN INCIDENT TO VISUALISE ATTACK PATH
        </div>
      )}
    </div>
  );
}
