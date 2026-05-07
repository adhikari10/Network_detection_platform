import { Shield, Activity, Wifi, Clock, Crosshair, Cpu } from 'lucide-react';
import type { AgentState } from '../types';

interface AgentStatusProps {
  agent: AgentState;
}

const statusColors: Record<AgentState['status'], string> = {
  active: 'bg-guardian-accent',
  idle: 'bg-yellow-400',
  alert: 'bg-red-500',
};

const modeLabels: Record<AgentState['mode'], string> = {
  monitoring: 'MONITORING',
  defensive: 'DEFENSIVE',
  learning: 'LEARNING',
};

export default function AgentStatus({ agent }: AgentStatusProps) {
  return (
    <div className="card glow-border">
      <div className="card-header">
        <Shield className="w-4 h-4 text-guardian-accent" />
        Agent Status
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <div className={`w-3 h-3 rounded-full ${statusColors[agent.status]}`} />
          <div className={`absolute inset-0 w-3 h-3 rounded-full ${statusColors[agent.status]} animate-ping opacity-75`} />
        </div>
        <span className="text-lg font-semibold text-guardian-accent text-glow">
          {agent.status.toUpperCase()}
        </span>
        <span className="ml-auto text-xs px-2 py-1 rounded bg-guardian-accent/10 text-guardian-accent border border-guardian-accent/20">
          {modeLabels[agent.mode]}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Activity className="w-3.5 h-3.5 text-secondary" />
          <span className="text-secondary">Requests</span>
          <span className="ml-auto font-medium text-primary">{agent.totalRequests}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Crosshair className="w-3.5 h-3.5 text-red-400" />
          <span className="text-secondary">Blocked</span>
          <span className="ml-auto font-medium text-red-400">{agent.threatsBlocked}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-3.5 h-3.5 text-secondary" />
          <span className="text-secondary">Uptime</span>
          <span className="ml-auto font-medium text-primary">{agent.uptime}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Wifi className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-secondary">Conns</span>
          <span className="ml-auto font-medium text-blue-400">{agent.activeConnections}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-guardian-border flex items-center justify-between text-xs text-muted">
        <div className="flex items-center gap-1">
          <Cpu className="w-3 h-3" />
          <span>ML {agent.mlModelVersion}</span>
        </div>
        <span>Last scan: {agent.lastScan}</span>
      </div>
    </div>
  );
}
