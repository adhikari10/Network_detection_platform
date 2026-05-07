import { useEffect, useRef } from 'react';
import { Brain, Search, AlertTriangle, Zap, Info } from 'lucide-react';
import type { ThinkingLog } from '../types';

interface ThinkingFeedProps {
  logs: ThinkingLog[];
}

const typeConfig: Record<ThinkingLog['type'], { icon: typeof Brain; color: string; label: string }> = {
  analysis: { icon: Search, color: 'text-blue-400', label: 'ANALYSIS' },
  detection: { icon: AlertTriangle, color: 'text-yellow-400', label: 'DETECT' },
  action: { icon: Zap, color: 'text-guardian-accent', label: 'ACTION' },
  info: { icon: Info, color: 'text-secondary', label: 'INFO' },
};

export default function ThinkingFeed({ logs }: ThinkingFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="card flex flex-col h-full">
      <div className="card-header">
        <Brain className="w-4 h-4 text-purple-400" />
        Thinking Feed
        <span className="ml-auto flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-guardian-accent animate-pulse" />
          <span className="text-guardian-accent text-[10px]">LIVE</span>
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-1 min-h-0 max-h-[350px] pr-1"
      >
        {logs.map(log => {
          const config = typeConfig[log.type];
          const Icon = config.icon;
          return (
            <div
              key={log.id}
              className="flex items-start gap-2 py-1.5 px-2 rounded text-xs hover:bg-guardian-card-hover transition-colors"
            >
              <span className="text-muted font-mono shrink-0 mt-0.5">{log.timestamp}</span>
              <Icon className={`w-3 h-3 shrink-0 mt-0.5 ${config.color}`} />
              <span className={`shrink-0 font-medium ${config.color}`} style={{ minWidth: '60px' }}>
                [{config.label}]
              </span>
              <span className="text-secondary">{log.message}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-2 pt-2 border-t border-guardian-border flex items-center text-[10px] text-muted">
        <span className="font-mono">$ guardian-agent --verbose --watch</span>
        <span className="ml-auto">{logs.length} entries</span>
      </div>
    </div>
  );
}
