import { useState } from 'react';
import { Settings, Play, Square, RotateCcw, ShieldAlert, Ban, Radio } from 'lucide-react';
import type { AgentMode } from '../types';

interface ControlPanelProps {
  currentMode: AgentMode;
  onModeChange: (mode: AgentMode) => void;
  onAction: (action: string) => void;
}

const modes: { value: AgentMode; label: string; desc: string }[] = [
  { value: 'monitoring', label: 'Monitor', desc: 'Observe & log threats' },
  { value: 'defensive', label: 'Defend', desc: 'Auto-block threats' },
  { value: 'learning', label: 'Learn', desc: 'Train ML models' },
];

export default function ControlPanel({ currentMode, onModeChange, onAction }: ControlPanelProps) {
  const [blockIP, setBlockIP] = useState('');
  const [isConnected, setIsConnected] = useState(true);

  return (
    <div className="card">
      <div className="card-header">
        <Settings className="w-4 h-4 text-secondary" />
        Control Panel
      </div>

      {/* Connection toggle */}
      <div className="flex items-center justify-between mb-4 p-2 rounded bg-guardian-card-hover">
        <div className="flex items-center gap-2">
          <Radio className={`w-4 h-4 ${isConnected ? 'text-guardian-accent' : 'text-red-400'}`} />
          <span className="text-xs text-secondary">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <button
          onClick={() => {
            setIsConnected(!isConnected);
            onAction(isConnected ? 'disconnect' : 'connect');
          }}
          className={isConnected ? 'btn-danger' : 'btn-primary'}
        >
          {isConnected ? (
            <span className="flex items-center gap-1"><Square className="w-3 h-3" /> Stop</span>
          ) : (
            <span className="flex items-center gap-1"><Play className="w-3 h-3" /> Start</span>
          )}
        </button>
      </div>

      {/* Mode selector */}
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider text-muted mb-2">Agent Mode</div>
        <div className="grid grid-cols-3 gap-1.5">
          {modes.map(mode => (
            <button
              key={mode.value}
              onClick={() => onModeChange(mode.value)}
              className={`p-2 rounded text-center transition-all border ${
                currentMode === mode.value
                  ? 'bg-guardian-accent/15 border-guardian-accent/40 text-guardian-accent'
                  : 'bg-guardian-card-hover border-guardian-border text-secondary hover:border-guardian-border-light'
              }`}
            >
              <div className="text-xs font-medium">{mode.label}</div>
              <div className="text-[9px] opacity-60 mt-0.5">{mode.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider text-muted mb-2">Quick Actions</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onAction('scan')} className="btn-primary flex items-center justify-center gap-1">
            <ShieldAlert className="w-3 h-3" /> Full Scan
          </button>
          <button onClick={() => onAction('reset')} className="btn-warning flex items-center justify-center gap-1">
            <RotateCcw className="w-3 h-3" /> Reset Rules
          </button>
        </div>
      </div>

      {/* Block IP */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted mb-2">Block IP Address</div>
        <div className="flex gap-2">
          <input
            type="text"
            value={blockIP}
            onChange={e => setBlockIP(e.target.value)}
            placeholder="e.g. 45.67.89.123"
            className="flex-1 bg-guardian-card-hover border border-guardian-border rounded px-2 py-1.5 text-xs text-primary placeholder-muted focus:outline-none focus:border-guardian-accent/40"
          />
          <button
            onClick={() => {
              if (blockIP.trim()) {
                onAction(`block:${blockIP}`);
                setBlockIP('');
              }
            }}
            className="btn-danger flex items-center gap-1"
          >
            <Ban className="w-3 h-3" /> Block
          </button>
        </div>
      </div>
    </div>
  );
}
