import { useState, useEffect, useRef } from 'react';
import { BookOpen, Loader2, X, AlertTriangle, FileText } from 'lucide-react';
import { fetchNarration } from '../services/api';
import type { Threat, Incident } from '../types';

interface AINarrationProps {
  selectedThreat: Threat | null;
  selectedIncident: Incident | null;
  onClose: () => void;
}

export default function AINarration({ selectedThreat, selectedIncident, onClose }: AINarrationProps) {
  const [narration, setNarration] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());

  const eventId = selectedThreat?.id ?? selectedIncident?.id ?? null;
  const eventTitle = selectedThreat
    ? `${selectedThreat.type} from ${selectedThreat.sourceIP}`
    : selectedIncident
      ? selectedIncident.title
      : null;

  useEffect(() => {
    if (!eventId) {
      setNarration(null);
      return;
    }

    const cached = cacheRef.current.get(eventId);
    if (cached) {
      setNarration(cached);
      return;
    }

    setLoading(true);
    setError(null);
    setNarration(null);

    fetchNarration(
      selectedThreat ? selectedThreat.id : undefined,
      selectedIncident ? selectedIncident.id : undefined,
    )
      .then(result => {
        setNarration(result.narration);
        cacheRef.current.set(eventId, result.narration);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to generate narration');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [eventId, selectedThreat, selectedIncident]);

  if (!eventId) return null;

  return (
    <div className="card">
      <div className="card-header">
        <BookOpen className="w-4 h-4 text-purple-400" />
        AI Narration
        <button
          onClick={onClose}
          className="ml-auto p-1 hover:bg-guardian-card-hover rounded transition-colors"
        >
          <X className="w-3.5 h-3.5 text-muted" />
        </button>
      </div>

      {/* Event header */}
      <div className="flex items-center gap-2 mb-3 p-2 rounded bg-guardian-card-hover">
        {selectedThreat ? (
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
        ) : (
          <FileText className="w-4 h-4 text-orange-400 shrink-0" />
        )}
        <span className="text-sm text-primary truncate">
          {eventTitle}
        </span>
        <span className="ml-auto text-[10px] font-mono text-muted">{eventId}</span>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center py-8 gap-2 text-sm text-secondary">
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating narration with Claude...
        </div>
      )}

      {error && (
        <div className="text-sm text-red-400 py-4 text-center">
          {error}
          <div className="text-xs text-muted mt-1">
            Make sure the backend is running and ANTHROPIC_API_KEY is set in backend/.env
          </div>
        </div>
      )}

      {narration && (
        <div className="text-sm text-secondary leading-relaxed whitespace-pre-line">
          {narration}
        </div>
      )}
    </div>
  );
}
