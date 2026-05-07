import { Network, Shield, Server, Monitor, Flame, Globe } from 'lucide-react';
import type { NetworkNode, NetworkConnection } from '../types';

interface NetworkMapProps {
  nodes: NetworkNode[];
  connections: NetworkConnection[];
}

const nodeIcons: Record<NetworkNode['type'], typeof Shield> = {
  agent: Shield,
  firewall: Flame,
  server: Server,
  client: Monitor,
  attacker: Globe,
};

const nodeColors: Record<NetworkNode['status'], { bg: string; border: string; text: string }> = {
  active: { bg: 'bg-guardian-accent/10', border: 'border-guardian-accent/40', text: 'text-guardian-accent' },
  suspicious: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', text: 'text-yellow-400' },
  blocked: { bg: 'bg-red-500/10', border: 'border-red-500/40', text: 'text-red-400' },
};

const connectionColors: Record<NetworkConnection['type'], string> = {
  normal: '#00ff9d',
  suspicious: '#eab308',
  blocked: '#ef4444',
};

export default function NetworkMap({ nodes, connections }: NetworkMapProps) {
  return (
    <div className="card h-full">
      <div className="card-header">
        <Network className="w-4 h-4 text-cyan-400" />
        Network Map
        <span className="ml-auto text-[10px] text-muted">
          {nodes.length} nodes / {connections.length} links
        </span>
      </div>

      <div className="relative w-full" style={{ height: '340px' }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 360">
          {/* Grid background */}
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.15" />
            </pattern>
          </defs>
          <rect width="600" height="360" fill="url(#grid)" />

          {/* Connections */}
          {connections.map(conn => {
            const sourceNode = nodes.find(n => n.id === conn.source);
            const targetNode = nodes.find(n => n.id === conn.target);
            if (!sourceNode || !targetNode) return null;
            const color = connectionColors[conn.type];
            const isDashed = conn.type === 'blocked';
            return (
              <g key={conn.id}>
                <line
                  x1={sourceNode.x}
                  y1={sourceNode.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke={color}
                  strokeWidth={conn.type === 'blocked' ? 1 : 1.5}
                  strokeDasharray={isDashed ? '6,4' : undefined}
                  opacity={0.5}
                />
                {conn.type === 'normal' && (
                  <circle r="2" fill={color} opacity="0.8">
                    <animateMotion
                      dur={`${3 + Math.random() * 2}s`}
                      repeatCount="indefinite"
                      path={`M${sourceNode.x},${sourceNode.y} L${targetNode.x},${targetNode.y}`}
                    />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>

        {/* Node overlays */}
        {nodes.map(node => {
          const colors = nodeColors[node.status];
          const Icon = nodeIcons[node.type];
          const left = `${(node.x / 600) * 100}%`;
          const top = `${(node.y / 360) * 100}%`;
          return (
            <div
              key={node.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 group"
              style={{ left, top }}
            >
              <div
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border ${colors.bg} ${colors.border} transition-all hover:scale-110 cursor-pointer`}
              >
                <Icon className={`w-4 h-4 ${colors.text}`} />
                <span className={`text-[9px] font-bold ${colors.text}`}>{node.label}</span>
              </div>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="bg-guardian-card border border-guardian-border rounded px-2 py-1 text-[10px] whitespace-nowrap shadow-lg">
                  <div className="text-secondary">{node.ip}</div>
                  <div className={colors.text}>{node.status.toUpperCase()}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
