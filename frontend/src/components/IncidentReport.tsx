import { FileText, CheckCircle2, Clock, AlertCircle, BookOpen } from 'lucide-react';
import type { Incident } from '../types';

interface IncidentReportProps {
  incidents: Incident[];
  onNarrate?: (incident: Incident) => void;
}

const statusConfig: Record<Incident['status'], { icon: typeof Clock; color: string; label: string }> = {
  open: { icon: AlertCircle, color: 'text-red-400', label: 'OPEN' },
  investigating: { icon: Clock, color: 'text-yellow-400', label: 'INVESTIGATING' },
  resolved: { icon: CheckCircle2, color: 'text-guardian-accent', label: 'RESOLVED' },
};

const severityBadge: Record<Incident['severity'], string> = {
  critical: 'badge-critical',
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
};

export default function IncidentReport({ incidents, onNarrate }: IncidentReportProps) {
  return (
    <div className="card flex flex-col h-full">
      <div className="card-header">
        <FileText className="w-4 h-4 text-orange-400" />
        Incident Reports
        <span className="ml-auto text-[10px] text-muted">{incidents.length} incidents</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 min-h-0 max-h-[350px] pr-1">
        {incidents.map(incident => {
          const status = statusConfig[incident.status];
          const StatusIcon = status.icon;
          return (
            <div
              key={incident.id}
              className="border border-guardian-border rounded-lg p-3 hover:border-guardian-border-light transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted">{incident.id}</span>
                  <span className={severityBadge[incident.severity]}>
                    {incident.severity.toUpperCase()}
                  </span>
                </div>
                <span className={`flex items-center gap-1 text-[10px] ${status.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {status.label}
                </span>
              </div>

              <h3 className="text-sm font-medium text-primary mb-1">{incident.title}</h3>
              <p className="text-xs text-muted leading-relaxed mb-2">{incident.description}</p>

              {/* IP info */}
              <div className="flex gap-4 text-xs text-muted mb-2">
                <span>Source: <span className="text-secondary font-mono">{incident.sourceIP}</span></span>
                <span>Target: <span className="text-secondary font-mono">{incident.targetIP}</span></span>
              </div>

              {/* Actions */}
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-wider text-muted">Actions Taken</div>
                {incident.actions.map((action, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-secondary">
                    <CheckCircle2 className="w-3 h-3 text-guardian-accent shrink-0" />
                    <span>{action}</span>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-muted font-mono">{incident.timestamp}</span>
                {onNarrate && (
                  <button
                    onClick={() => onNarrate(incident)}
                    className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
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
