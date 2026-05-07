import { useState, useRef, useEffect } from 'react';
import type { ChatMessage, Threat } from '../types';

const CHAT_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/chat`
  : `http://${window.location.hostname}:8000/chat`;

const mono = (s: number | string, color = '#c8d6e5') =>
  ({ fontFamily: 'monospace', fontSize: s as number, color } as React.CSSProperties);

function mkId() { return Math.random().toString(36).slice(2, 10); }
function ts() { return new Date().toLocaleTimeString('en-GB', { hour12: false }); }

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        ...mono(11, isUser ? '#4a7fa5' : '#7f77dd'),
        letterSpacing: 1, marginBottom: 6, fontWeight: 700,
        textAlign: isUser ? 'right' : 'left',
      }}>
        {isUser ? 'YOU' : 'GUARDIAN'}
      </div>
      <div style={{
        background: isUser ? '#1a2540' : '#0a1929',
        border: `1px solid ${isUser ? '#2a4a6a' : '#1a2d4a'}`,
        borderRadius: isUser ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
        padding: '12px 16px',
        ...mono(14, '#e8f0fe'),
        lineHeight: 1.8,
        wordBreak: 'break-word',
      }}>
        {msg.loading ? (
          <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                width: 7, height: 7, borderRadius: '50%',
                background: '#7f77dd', display: 'inline-block',
                animation: `dotB 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </span>
        ) : msg.content}
      </div>
      <div style={{ ...mono(11, '#2a4a6a'), marginTop: 4, textAlign: isUser ? 'right' : 'left' }}>
        {msg.timestamp}
      </div>
    </div>
  );
}

interface GuardianChatProps {
  open: boolean;
  onClose: () => void;
  threat: Threat | null;
  inline?: boolean;
}

export default function GuardianChat({ open, onClose, threat, inline = false }: GuardianChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 300); }, [open]);

  useEffect(() => {
    if (open && threat && messages.length === 0) {
      setMessages([{
        id: mkId(), role: 'assistant', timestamp: ts(),
        content:
          `I have full context on this incident.\n\n` +
          `${threat.type} from ${threat.sourceIP} → ${threat.targetIP}\n` +
          `Severity: ${threat.severity.toUpperCase()} · Status: ${threat.status.toUpperCase()}\n\n` +
          `Ask me anything — why it was blocked, what the signals mean, whether it could be a false positive, or what to do next.`,
      }]);
    }
  }, [open, threat]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setMessages(prev => [...prev,
      { id: mkId(), role: 'user', timestamp: ts(), content: text },
      { id: mkId(), role: 'assistant', timestamp: ts(), content: '', loading: true },
    ]);
    setInput('');
    setLoading(true);

    try {
      const systemPrompt = threat
        ? `You are Guardian, an autonomous AI network security agent. ` +
          `Current incident: ${threat.type} from ${threat.sourceIP} targeting ${threat.targetIP}. ` +
          `Severity: ${threat.severity}. Status: ${threat.status}. ` +
          `Details: ${threat.details}. ` +
          `Answer the analyst's question directly and concisely. Do not repeat the question. Do not use Q&A format.`
        : `You are Guardian, an autonomous AI network security agent. Answer the analyst's question directly and concisely.`;

      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `${systemPrompt}\n\nAnalyst: ${text}\n\nGuardian:` }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { response?: string; reply?: string; message?: string };
      let reply = data.response ?? data.reply ?? data.message ?? 'No response.';
      reply = reply.replace(/^Guardian:\s*/i, '').replace(/^Analyst:.*\n?/gim, '').trim();

      setMessages(prev => [...prev.slice(0, -1), { id: mkId(), role: 'assistant', timestamp: ts(), content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev.slice(0, -1), {
        id: mkId(), role: 'assistant', timestamp: ts(),
        content: `⚠ Backend error: ${err instanceof Error ? err.message : String(err)}`,
      }]);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = [
    'Why did you block instead of monitor?',
    'Could this be a false positive?',
    'What should I do next?',
  ];

  return (
    <>
      <style>{`
        @keyframes dotB { 0%,80%,100%{transform:scale(0.6);opacity:.4} 40%{transform:scale(1);opacity:1} }
      `}</style>

      {open && (
        <div onClick={onClose} style={{
          position: 'fixed', inset: 0,
          background: 'rgba(6,15,28,0.6)',
          zIndex: 199, backdropFilter: 'blur(3px)',
        }} />
      )}

      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 420,
        background: '#06111f',
        borderLeft: '1px solid #1e3050',
        zIndex: 200,
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(.2,.8,.2,1)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
      }}>

        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #1e3050',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: '#1a1a2d', border: '1px solid #534ab7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>🤖</div>
            <div>
              <div style={{ ...mono(14, '#7f77dd'), fontWeight: 700, letterSpacing: 2 }}>Ask Guardian</div>
              {threat && <div style={{ ...mono(11, '#4a7fa5'), marginTop: 2 }}>Context: {threat.type} · {threat.sourceIP}</div>}
            </div>
          </div>
          <span onClick={onClose} style={{ ...mono(13, '#4a7fa5'), cursor: 'pointer', letterSpacing: 1 }}>✕ close</span>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: 60, opacity: 0.4 }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>🤖</div>
              <div style={{ ...mono(13, '#4a7fa5'), letterSpacing: 2 }}>ASK ABOUT THIS INCIDENT</div>
            </div>
          )}
          {messages.map(m => <Bubble key={m.id} msg={m} />)}
          <div ref={bottomRef} />
        </div>

        {/* Suggested questions */}
        {messages.length <= 1 && (
          <div style={{ padding: '0 20px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ ...mono(10, '#2a4a6a'), letterSpacing: 2, marginBottom: 4 }}>SUGGESTED QUESTIONS</div>
            {suggestions.map(q => (
              <button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }} style={{
                background: '#0d1b2e', border: '1px solid #1e3050',
                borderRadius: 8, padding: '10px 14px', cursor: 'pointer',
                ...mono(13, '#4a7fa5'), textAlign: 'left',
                transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#534ab7'; e.currentTarget.style.color = '#7f77dd'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e3050'; e.currentTarget.style.color = '#4a7fa5'; }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #1e3050', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask about this incident..."
              disabled={loading}
              style={{
                flex: 1, background: '#0d1b2e',
                border: '1px solid #1e3050', borderRadius: 8,
                padding: '10px 14px', ...mono(14),
                outline: 'none', opacity: loading ? 0.6 : 1,
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.target.style.borderColor = '#534ab7')}
              onBlur={e => (e.target.style.borderColor = '#1e3050')}
            />
            <button onClick={send} disabled={!input.trim() || loading} style={{
              background: loading || !input.trim() ? '#1a1a2d' : '#534ab7',
              border: 'none', borderRadius: 8,
              width: 44, height: 44, cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              ...mono(18, '#fff'), display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}>→</button>
          </div>
          <div style={{ ...mono(11, '#2a4a6a'), marginTop: 8 }}>Powered by Mistral · local LLM · context-aware</div>
        </div>
      </div>
    </>
  );
}
