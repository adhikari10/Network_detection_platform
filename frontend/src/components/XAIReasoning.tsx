import { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import type { XAIExplanation } from '../types';

interface XAIReasoningProps {
  explanations: XAIExplanation[];
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const color =
    confidence >= 90 ? 'bg-red-500' :
    confidence >= 70 ? 'bg-yellow-500' :
    'bg-blue-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-guardian-border rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <span className="text-xs font-mono text-secondary shrink-0">{confidence}%</span>
    </div>
  );
}

function ExplanationCard({ explanation }: { explanation: XAIExplanation }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-guardian-border rounded-lg p-3 hover:border-guardian-border-light transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="text-xs text-muted font-mono">{explanation.timestamp}</div>
          <div className="text-sm font-medium text-primary mt-0.5">{explanation.decision}</div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-muted hover:text-primary transition-colors p-1"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <ConfidenceBar confidence={explanation.confidence} />

      {expanded && (
        <div className="mt-3 space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Contributing Factors</div>
          {explanation.factors.map(factor => (
            <div key={factor.name} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="text-secondary">{factor.name}</span>
                  <span className="text-muted font-mono">{(factor.weight * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1 bg-guardian-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-guardian-accent/60 rounded-full"
                    style={{ width: `${factor.weight * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-[10px] text-muted shrink-0 max-w-[120px] truncate">{factor.value}</span>
            </div>
          ))}

          <div className="mt-2 pt-2 border-t border-guardian-border">
            <div className="text-[10px] uppercase tracking-wider text-muted mb-1">AI Conclusion</div>
            <p className="text-xs text-secondary leading-relaxed">{explanation.conclusion}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function XAIReasoning({ explanations }: XAIReasoningProps) {
  return (
    <div className="card flex flex-col h-full">
      <div className="card-header">
        <Lightbulb className="w-4 h-4 text-yellow-400" />
        XAI Reasoning
        <span className="ml-auto text-[10px] text-muted">Explainable AI</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 min-h-0 max-h-[350px] pr-1">
        {explanations.map(exp => (
          <ExplanationCard key={exp.id} explanation={exp} />
        ))}
      </div>
    </div>
  );
}
