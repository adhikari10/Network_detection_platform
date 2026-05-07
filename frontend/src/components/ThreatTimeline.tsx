import { AlertTriangle, ShieldCheck, Eye, ShieldOff, BookOpen } from 'lucide-react';
import type { Threat } from '../types';

interface ThreatTimelineProps {
  threats: Threat[];
  onNarrate?: (threat: Threat) => void;
}

const severityColors: Record<Threat['severity'], string> = {
  critical: 'border-red-500 bg-red-500',
  high: 'border-orange-500 bg-orange-500',
  medium: 'border-yellow-500 bg-yellow-500',
  low: 'border-blue-500 bg-blue-500',
};

const severityBadge: Record<Threat['severity'], string> = {
  critical: 'badge-critical',
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
};

const statusIcons: Record<Threat['status'], typeof ShieldCheck> = {
  blocked: ShieldOff,
  monitoring: Eye,
  resolved: ShieldCheck,
};

const statusStyles: Record<Threat['status'], string> = {
  blocked: 'text-red-400',
  monitoring: 'text-yellow-400',
  resolved: 'text-guardian-accent',
};

export default function ThreatTimeline({ threats, onNarrate }: ThreatTimelineProps) {
  return (
    <div className="card flex flex-col h-full">
      <div className="card-header">
        <AlertTriangle className="w-4 h-4 text-red-400" />
        Threat Timeline
        <span className="ml-auto text-[10px] text-muted">{threats.length} events</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-0 min-h-0 max-h-[350px] pr-1">
        {threats.map((threat, idx) => {
          const dotColor = severityColors[threat.severity];
          const StatusIcon = statusIcons[threat.status];
          const isLast = idx === threats.length - 1;
          return (
            <div key={threat.id} className="flex gap-3 group">
              {/* Timeline spine */}
              <div className="flex flex-col items-center shrink-0">
                <div className={`w-2.5 h-2.5 rounded-full border-2 ${dotColor} mt-1`} />
                {!isLast && <div className="w-px flex-1 bg-guardian-border" />}
              </div>

              {/* Content */}
              <div className="pb-4 flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-muted font-mono">{threat.timestamp}</span>
                  <span className={severityBadge[threat.severity]}>
                    {threat.severity.toUpperCase()}
                  </span>
                  <span className={`flex items-center gap-1 text-[10px] ml-auto ${statusStyles[threat.status]}`}>
                    <StatusIcon className="w-3 h-3" />
                    {threat.status}
                  </span>
                </div>
                <div className="text-sm font-medium text-primary mb-1">{threat.type}</div>
                <div className="text-xs text-muted flex gap-3">
                  <span>src: <span className="text-secondary">{threat.sourceIP}</span></span>
                  <span>dst: <span className="text-secondary">{threat.targetIP}</span></span>
                </div>
                <div className="text-[11px] text-muted mt-1 leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">
                  {threat.details}
                </div>
                {onNarrate && (
                  <button
                    onClick={() => onNarrate(threat)}
                    className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 mt-1.5 transition-colors"
                  >
                    <BookOpen className="w-3 h-3" /> AI Narrate
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
