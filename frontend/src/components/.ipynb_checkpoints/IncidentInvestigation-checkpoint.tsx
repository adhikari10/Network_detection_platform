import { useState } from 'react';
import type { Threat, ThinkingLog } from '../types';
import GuardianChat from './GuardianChat';

const mono = (s: number | string, color = '#c8d6e5') =>
  ({ fontFamily: 'monospace', fontSize: typeof s === 'number' ? s * 1.3 : s, color } as React.CSSProperties);

const SEV_COLOR: Record<string, string> = {
  critical: '#ff4d4d', high: '#ff4d4d', medium: '#ffd166', low: '#06d6a0',
};
const STATUS_COLOR: Record<string, string> = {
  blocked: '#ff4d4d', monitoring: '#7f77dd', resolved: '#06d6a0',
};
const STATUS_BG: Record<string, string> = {
  blocked: '#2d0000', monitoring: '#1a1a2d', resolved: '#002d1a',
};

// ── Forensic Map ──────────────────────────────────────────────────────────────
function ForensicMap({ threat }: { threat: Threat }) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const isBlocked = threat.status === 'blocked';

  // Fixed node positions
  const ATTACKER = { x: 80,  y: 155 };
  const ROUTER   = { x: 220, y: 155 };
  const PI       = { x: 380, y: 155 };
  const STAGE1   = { x: 480, y: 90  };
  const IPTABLES = { x: 620, y: 90  };
  const STAGE2   = { x: 480, y: 220 };
  const DELL     = { x: 620, y: 220 };

  // Attack path — curved from attacker to PI
  const atkPath = `M${ATTACKER.x},${ATTACKER.y} Q${(ATTACKER.x+PI.x)/2},${ATTACKER.y - 60} ${PI.x},${PI.y}`;

  const stage2Active = !isBlocked;
  const nodes = [
    { key: 'attacker', ...ATTACKER, icon: '💀', label: 'ATTACKER',    sub: threat.sourceIP,    sub2: threat.type,           color: '#ff3300', border: '#ff4d4d', bg: '#1a0000', glow: true,  detail: `Source of attack\n${threat.type} from ${threat.sourceIP}` },
    { key: 'router',   ...ROUTER,   icon: '📡', label: 'ROUTER',      sub: '192.168.0.1',       sub2: 'forwarded',           color: '#4a7fa5', border: '#4a7fa5', bg: '#041520', glow: false, detail: 'Traffic forwarded\nNo deep packet inspection' },
    { key: 'pi',       ...PI,       icon: '🛡',  label: 'GUARDIAN PI', sub: 'Scapy',       sub2: 'DETECTED',            color: '#06d6a0', border: '#06d6a0', bg: '#06111f', glow: true,  detail: 'Inline bridge detected\nScapy behavioral analysis fired' },
    { key: 'stage1',   ...STAGE1,   icon: '⚡', label: 'STAGE 1',     sub: 'rules engine',      sub2: isBlocked ? '→ BLOCKED' : '→ ESCALATE', color: '#ff8c42', border: '#ff8c42', bg: '#1a0800', glow: false, detail: `Rule engine evaluated\n${isBlocked ? 'Threshold exceeded → BLOCK' : 'Ambiguous → escalate to LLM'}` },
    { key: 'iptables', ...IPTABLES, icon: '🚫', label: 'IPTABLES',    sub: 'FORWARD DROP',      sub2: isBlocked ? '● ACTIVE' : '○ inactive', color: isBlocked ? '#ff4d4d' : '#2a4a6a', border: isBlocked ? '#ff4d4d' : '#1e3050', bg: '#2d0000', glow: isBlocked, detail: isBlocked ? 'iptables rule applied\nFORWARD DROP — traffic stopped' : 'Not triggered\nStage 1 escalated to LLM' },
    { key: 'stage2',   ...STAGE2,   icon: '🤖', label: 'STAGE 2 LLM', sub: 'Mistral · Ollama',  sub2: stage2Active ? '● REASONING' : '○ bypassed', color: stage2Active ? '#b44fff' : '#2a4a6a', border: stage2Active ? '#b44fff' : '#1e3050', bg: stage2Active ? '#1a0a2d' : '#08152a', glow: stage2Active, detail: stage2Active ? 'LLM analyzed threat\nReasoned decision → MONITOR' : 'Stage 1 blocked directly\nLLM not required' },
    { key: 'dell',     ...DELL,     icon: '🖥', label: 'DELL AI',     sub: 'POST /report',      sub2: 'logged + alerted',    color: '#7f77dd', border: '#534ab7', bg: '#08152a', glow: false, detail: 'Incident logged\nDashboard alerted via WebSocket' },
  ];

  return (
    <div style={{ background: '#020a14', border: '1px solid #1e3050', borderRadius: 8, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '10px 18px', borderBottom: '1px solid #1e3050',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: '#030d1a',
      }}>
        <span style={{ fontFamily: 'monospace', fontSize: 14, color: '#4a7fa5', letterSpacing: 3, fontWeight: 700 }}>FORENSIC ATTACK GRAPH</span>
        <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#2a4a6a' }}>Hover nodes for details · autonomous decision</span>
      </div>

      <div style={{ display: 'flex' }}>
        <svg width="100%" viewBox="0 0 760 310" style={{ display: 'block', flex: 1 }}>
          <defs>
            <radialGradient id="fgBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#041020" />
              <stop offset="100%" stopColor="#010810" />
            </radialGradient>
            <filter id="fgRedGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="fgGreenGlow">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="fgBlueGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <marker id="fgArrowR" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M2 1L8 5L2 9" fill="none" stroke="#ff4d4d" strokeWidth="1.5" strokeLinecap="round" />
            </marker>
            <marker id="fgArrowP" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M2 1L8 5L2 9" fill="none" stroke="#534ab7" strokeWidth="1.5" strokeLinecap="round" />
            </marker>
            <marker id="fgArrowG" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M2 1L8 5L2 9" fill="none" stroke="#06d6a0" strokeWidth="1.5" strokeLinecap="round" />
            </marker>
            <style>{`
              @keyframes fgAtkFlow { to { stroke-dashoffset: -20; } }
              @keyframes fgSafeFlow { to { stroke-dashoffset: -16; } }
              @keyframes fgPiPulse { 0%,100%{opacity:0.15} 50%{opacity:0.04} }
              @keyframes fgAtkPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
              @keyframes fgBlink { 0%,100%{opacity:1} 50%{opacity:0.2} }
              .fg-atk { stroke-dasharray:6 4; animation: fgAtkFlow 0.7s linear infinite; }
              .fg-safe { stroke-dasharray:4 6; animation: fgSafeFlow 1.5s linear infinite; }
              .fg-pi-ring { animation: fgPiPulse 2s ease-in-out infinite; }
              .fg-atk-pulse { animation: fgAtkPulse 1.2s ease-in-out infinite; }
              .fg-blink { animation: fgBlink 1.4s ease-in-out infinite; }
            `}</style>
          </defs>

          <rect width="760" height="310" fill="url(#fgBg)" />

          {/* Grid dots */}
          {Array.from({ length: 22 }).map((_, row) =>
            Array.from({ length: 38 }).map((_, col) => (
              <circle key={`${row}-${col}`} cx={col * 20 + 10} cy={row * 14 + 7} r="0.7" fill="#0a2040" opacity="0.4" />
            ))
          )}

          {/* ── EDGES ── */}

          {/* Attacker → Router (red attack arc) */}
          <path d={atkPath} fill="none" stroke="#ff3300" strokeWidth="2" className="fg-atk" markerEnd="url(#fgArrowR)" opacity="0.8" />
          <path d={atkPath} fill="none" stroke="#ff3300" strokeWidth="6" opacity="0.08" />
          {/* Particle on attack arc */}
          <circle r="4" fill="#ff4d4d" filter="url(#fgRedGlow)">
            <animateMotion dur="1.2s" repeatCount="indefinite" path={atkPath} />
          </circle>

          {/* Router → PI */}
          <line x1={ROUTER.x + 16} y1={ROUTER.y} x2={PI.x - 26} y2={PI.y}
            stroke="#ff3300" strokeWidth="2" className="fg-atk" markerEnd="url(#fgArrowR)" opacity="0.7" />

          {/* PI → Stage1 */}
          <line x1={PI.x + 16} y1={PI.y - 10} x2={STAGE1.x - 16} y2={STAGE1.y}
            stroke="#ff8c42" strokeWidth="1.5" className="fg-safe" markerEnd="url(#fgArrowG)" opacity="0.7" />

          {/* Stage1 → Iptables */}
          <line x1={STAGE1.x + 16} y1={STAGE1.y} x2={IPTABLES.x - 16} y2={IPTABLES.y}
            stroke="#ff4d4d" strokeWidth="1.5" className="fg-atk" markerEnd="url(#fgArrowR)" opacity="0.8" />

          {/* Stage1 → Stage2 (when monitoring) */}
          {!isBlocked && (
            <line x1={STAGE1.x} y1={STAGE1.y + 14} x2={STAGE2.x} y2={STAGE2.y - 14}
              stroke="#b44fff" strokeWidth="1.5" className="fg-atk" markerEnd="url(#fgArrowP)" opacity="0.8" />
          )}
          {/* Stage1 → Stage2 (always visible) */}
          {isBlocked && (
            <line x1={STAGE1.x} y1={STAGE1.y + 14} x2={STAGE2.x} y2={STAGE2.y - 14}
              stroke="#534ab7" strokeWidth="2" className="fg-safe"
              markerEnd="url(#fgArrowP)" opacity="0.9" />
          )}

          {/* Stage2 → Dell (always visible) */}
          <line x1={STAGE2.x + 16} y1={STAGE2.y} x2={DELL.x - 16} y2={DELL.y}
            stroke="#534ab7" strokeWidth="2" className="fg-safe"
            markerEnd="url(#fgArrowP)" opacity="0.9" />

          {/* PI → Dell (purple report arc) */}
          <path d={`M${PI.x},${PI.y + 20} Q${(PI.x+DELL.x)/2},${PI.y + 60} ${DELL.x},${DELL.y + 16}`}
            fill="none" stroke="#534ab7" strokeWidth="1.5" className="fg-safe" markerEnd="url(#fgArrowP)" opacity="0.4" />

          {/* ── NODES ── */}
          {nodes.map(n => {
            const isHovered = hoveredNode === n.key;
            const isPi = n.key === 'pi';
            const isAtk = n.key === 'attacker';
            const r = isPi ? 22 : isAtk ? 16 : 14;
            const filter = isPi ? 'url(#fgGreenGlow)' : isAtk ? 'url(#fgRedGlow)' : 'url(#fgBlueGlow)';
            return (
              <g
                key={n.key}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredNode(n.key)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Glow rings */}
                {isPi && <>
                  <circle cx={n.x} cy={n.y} r="45" fill="#06d6a0" className="fg-pi-ring" />
                  <circle cx={n.x} cy={n.y} r="32" fill="#06d6a0" opacity="0.06" className="fg-pi-ring" />
                </>}
                {isAtk && <>
                  <circle cx={n.x} cy={n.y} r={isHovered ? 28 : 22} fill="#ff3300" opacity="0.07" className="fg-atk-pulse" />
                  <circle cx={n.x} cy={n.y} r={isHovered ? 20 : 15} fill="#ff3300" opacity="0.12" className="fg-atk-pulse" />
                </>}

                {/* Node circle */}
                <circle
                  cx={n.x} cy={n.y} r={r}
                  fill={n.bg} stroke={n.border}
                  strokeWidth={isPi ? 2.5 : isAtk ? 2 : 1.5}
                  filter={filter}
                  className={n.key === 'iptables' && isBlocked ? 'fg-blink' : undefined}
                />
                <text x={n.x} y={n.y + (isPi ? 7 : 5)} fontSize={isPi ? 18 : 14} textAnchor="middle">{n.icon}</text>
                <text x={n.x} y={n.y + r + 16} fill={n.color} fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="700">{n.label}</text>
                <text x={n.x} y={n.y + r + 28} fill={isAtk ? '#ff8888' : '#8899aa'} fontSize="10" textAnchor="middle" fontFamily="monospace">{n.sub}</text>
                <text x={n.x} y={n.y + r + 40} fill={n.color} fontSize="10" textAnchor="middle" fontFamily="monospace"
                  className={n.key === 'iptables' && isBlocked ? 'fg-blink' : undefined}>{n.sub2}</text>

                {/* Hover tooltip */}
                {isHovered && (
                  <g>
                    <rect x={n.x - 70} y={n.y - r - 60} width="140" height="50" rx="4" fill="#0d1b2e" stroke={n.border} strokeWidth="1" opacity="0.95" />
                    <text x={n.x} y={n.y - r - 44} fill={n.color} fontSize="9" textAnchor="middle" fontFamily="monospace" fontWeight="700">{n.label}</text>
                    {n.detail.split('\n').map((line, i) => (
                      <text key={i} x={n.x} y={n.y - r - 30 + i * 12} fill="#8899aa" fontSize="8" textAnchor="middle" fontFamily="monospace">{line}</text>
                    ))}
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Right panel */}
        <div style={{
          width: 160, flexShrink: 0, borderLeft: '1px solid #1e3050',
          padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 12,
          background: '#030d1a',
        }}>
          <div style={{ fontFamily: 'monospace', fontSize: 16, color: '#4a7fa5', letterSpacing: 2, marginBottom: 4, fontWeight: 700 }}>ATTACK SUMMARY</div>
          {[
            ['Origin',    threat.sourceIP,              '#ff8888'],
            ['Type',      threat.type,                  '#ffd166'],
            ['Target',    threat.targetIP ?? '192.168.1.1', '#c8d6e5'],
            ['Severity',  threat.severity.toUpperCase(), threat.severity === 'high' || threat.severity === 'critical' ? '#ff4d4d' : '#ffd166'],
            ['Decision',  threat.status.toUpperCase(),   threat.status === 'blocked' ? '#06d6a0' : '#7f77dd'],
            ['Stage',     'Stage 1 — Rules',            '#ff8c42'],
            ['Response',  '< 1 second',                 '#06d6a0'],
          ].map(([label, val, color]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#4a7fa5', letterSpacing: 1 }}>{label}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 15, color: color as string, fontWeight: 700 }}>{val}</span>
            </div>
          ))}

          <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid #1e3050' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 16, color: '#4a7fa5', letterSpacing: 2, marginBottom: 8 }}>PATH STATUS</div>
            {[
              ['A→B', 'Attack ingress',                           '#ff4d4d'],
              ['B→C', 'Pi detection',                             '#06d6a0'],
              ['C→D', 'Stage 1 eval',                             '#ff8c42'],
              ['D→E', isBlocked ? 'BLOCKED' : 'bypassed',        isBlocked ? '#ff4d4d' : '#2a4a6a'],
              ['D→F', stage2Active ? 'LLM active' : 'bypassed',  stage2Active ? '#b44fff' : '#2a4a6a'],
              ['F→G', 'Dell logged',                              '#534ab7'],
            ].map(([step, desc, color]) => (
              <div key={step as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#4a7fa5' }}>{step}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 13, color: color as string, fontWeight: 700 }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Column 1: Signals ─────────────────────────────────────────────────────────
function Signals({ threat }: { threat: Threat }) {
  const sc = SEV_COLOR[threat.severity] ?? '#8899aa';
  return (
    <div style={{ background: '#0d1b2e', border: '1px solid #1e3050', borderRadius: 8, padding: '18px 20px' }}>
      <div style={{ ...mono(10, '#4a7fa5'), letterSpacing: 2, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #1e3050', fontWeight: 700 }}>SIGNALS OBSERVED</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { color: '#ff4d4d', text: `Source IP: ${threat.sourceIP}` },
          { color: '#ff4d4d', text: `Attack type: ${threat.type}` },
          { color: '#ff8c42', text: `Target IP: ${threat.targetIP}` },
          { color: '#ff8c42', text: `Severity: ${threat.severity.toUpperCase()}` },
          { color: '#ffd166', text: `Detected: ${threat.timestamp?.slice(0, 19) ?? '—'}` },
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ ...mono(13, '#c8d6e5') }}>{s.text}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #1e3050' }}>
        <div style={{ ...mono(10, '#4a7fa5'), letterSpacing: 1, marginBottom: 8, fontWeight: 700 }}>DEVICE HISTORY</div>
        <span style={{ ...mono(13, '#06d6a0') }}>● First time seen — no prior incidents</span>
      </div>

      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #1e3050' }}>
        <div style={{ ...mono(10, '#4a7fa5'), letterSpacing: 1, marginBottom: 8, fontWeight: 700 }}>CONFIDENCE</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 6, background: '#1a2540', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${Math.round((threat.confidence ?? 0.95) * 100)}%`, height: '100%', background: sc, borderRadius: 3 }} />
          </div>
          <span style={{ ...mono(16, sc), fontWeight: 700 }}>{Math.round((threat.confidence ?? 0.95) * 100)}%</span>
        </div>
      </div>

      {/* Threat Score Gauge */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #1e3050' }}>
        <div style={{ ...mono(10, '#4a7fa5'), letterSpacing: 1, marginBottom: 12, fontWeight: 700 }}>THREAT SCORE</div>
        {(() => {
          const sevScore = threat.severity === 'critical' ? 100 : threat.severity === 'high' ? 80 : threat.severity === 'medium' ? 50 : 25;
          const confScore = Math.round((threat.confidence ?? 0.95) * 100);
          const score = Math.round((sevScore * 0.6) + (confScore * 0.4));
          const gaugeColor = score >= 80 ? '#ff4d4d' : score >= 60 ? '#ffd166' : '#06d6a0';
          const angle = (score / 100) * 180 - 90;
          const r = 54;
          const cx = 80, cy = 80;
          const toRad = (deg: number) => (deg * Math.PI) / 180;
          const arcX = cx + r * Math.cos(toRad(angle - 90));
          const arcY = cy + r * Math.sin(toRad(angle - 90));

          // Arc segments
          const segments = [
            { color: '#06d6a0', start: -90, end: -30 },
            { color: '#ffd166', start: -30, end: 30  },
            { color: '#ff4d4d', start: 30,  end: 90  },
          ];

          const arcPath = (startDeg: number, endDeg: number) => {
            const s = { x: cx + r * Math.cos(toRad(startDeg)), y: cy + r * Math.sin(toRad(startDeg)) };
            const e = { x: cx + r * Math.cos(toRad(endDeg)),   y: cy + r * Math.sin(toRad(endDeg)) };
            const large = endDeg - startDeg > 180 ? 1 : 0;
            return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
          };

          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <svg width="160" height="90" viewBox="0 0 160 90">
                {/* Background arc */}
                <path d={arcPath(-90, 90)} fill="none" stroke="#1a2540" strokeWidth="10" strokeLinecap="round" />
                {/* Colored segments */}
                {segments.map(seg => (
                  <path key={seg.color} d={arcPath(seg.start, seg.end)} fill="none" stroke={seg.color} strokeWidth="10" opacity="0.3" strokeLinecap="butt" />
                ))}
                {/* Active arc */}
                <path d={arcPath(-90, angle - 90)} fill="none" stroke={gaugeColor} strokeWidth="10" strokeLinecap="round"
                  style={{ filter: `drop-shadow(0 0 6px ${gaugeColor})` }} />
                {/* Needle */}
                <line
                  x1={cx} y1={cy}
                  x2={cx + (r - 12) * Math.cos(toRad(angle - 90))}
                  y2={cy + (r - 12) * Math.sin(toRad(angle - 90))}
                  stroke={gaugeColor} strokeWidth="2.5" strokeLinecap="round"
                  style={{ filter: `drop-shadow(0 0 4px ${gaugeColor})` }}
                />
                <circle cx={cx} cy={cy} r="4" fill={gaugeColor} style={{ filter: `drop-shadow(0 0 4px ${gaugeColor})` }} />
                {/* Score text */}
                <text x={cx} y={cy + 20} textAnchor="middle" fill={gaugeColor} fontSize="18" fontFamily="monospace" fontWeight="700">{score}</text>
                <text x={cx} y={cy + 32} textAnchor="middle" fill="#4a7fa5" fontSize="9" fontFamily="monospace">/100</text>
                {/* Labels */}
                <text x="14" y="88" fill="#06d6a0" fontSize="9" fontFamily="monospace">LOW</text>
                <text x="60" y="88" fill="#ffd166" fontSize="9" fontFamily="monospace">MED</text>
                <text x="112" y="88" fill="#ff4d4d" fontSize="9" fontFamily="monospace">HIGH</text>
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ ...mono(11, '#4a7fa5') }}>Severity weight <span style={{ color: '#c8d6e5' }}>60%</span></div>
                <div style={{ ...mono(11, '#4a7fa5') }}>Confidence weight <span style={{ color: '#c8d6e5' }}>40%</span></div>
                <div style={{ ...mono(14, gaugeColor), fontWeight: 700, marginTop: 4 }}>
                  {score >= 80 ? '⚠ CRITICAL RISK' : score >= 60 ? '⚡ ELEVATED RISK' : '● LOW RISK'}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── Column 2: Reasoning ───────────────────────────────────────────────────────
function Reasoning({ threat }: { threat: Threat }) {
  const sc = SEV_COLOR[threat.severity] ?? '#8899aa';
  const stc = STATUS_COLOR[threat.status] ?? '#8899aa';
  const stb = STATUS_BG[threat.status] ?? '#1a2540';

  const path = threat.status === 'blocked'
    ? ['Stage 1 rules engine', '→ Port scan threshold hit', '→ Confidence ≥ 70% threshold', '→ AUTO BLOCK applied']
    : ['Stage 2 LLM reasoning', '→ Ambiguous signals', '→ Below block threshold', '→ MONITORING applied'];

  return (
    <div style={{ background: '#0d1b2e', border: '1px solid #1e3050', borderRadius: 8, padding: '18px 20px' }}>
      <div style={{ ...mono(10, '#4a7fa5'), letterSpacing: 2, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #1e3050', fontWeight: 700 }}>GUARDIAN REASONING</div>

      <div style={{ background: '#060f1c', borderRadius: 6, padding: '14px 16px', borderLeft: '3px solid #534ab7', marginBottom: 16 }}>
        <div style={{ ...mono(13, '#c8d6e5'), lineHeight: 2 }}>
          {threat.details || `${threat.type} detected from ${threat.sourceIP}. Autonomous Stage 1 decision applied. No human approval required.`}
        </div>
      </div>

      <div style={{ ...mono(10, '#4a7fa5'), letterSpacing: 1, marginBottom: 10, fontWeight: 700 }}>DECISION</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <span style={{ background: stb, color: stc, ...mono(12), fontWeight: 700, padding: '4px 12px', borderRadius: 4, letterSpacing: 1 }}>
          {threat.status.toUpperCase()}
        </span>
        <span style={{ ...mono(13, sc), fontWeight: 700 }}>{threat.severity.toUpperCase()} severity</span>
      </div>

      <div style={{ ...mono(10, '#4a7fa5'), letterSpacing: 1, marginBottom: 10, fontWeight: 700 }}>DECISION PATH</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {path.map((step, i) => (
          <div key={i} style={{
            ...mono(13, i === path.length - 1 ? stc : '#8899aa'),
            fontWeight: i === path.length - 1 ? 700 : 400,
            lineHeight: 1.8,
          }}>
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Column 3: Timeline ────────────────────────────────────────────────────────
function Timeline({ threat, logs }: { threat: Threat; logs: ThinkingLog[] }) {
  const relevant = logs.filter(l =>
    l.message.includes(threat.sourceIP) || l.message.includes(threat.type)
  ).slice(-6);

  const events = [
    { color: '#ffd166', label: 'First packet on br0', sub: `${threat.type} from ${threat.sourceIP}`, time: threat.timestamp?.slice(11, 19) ?? '' },
    { color: '#ff8c42', label: 'Stage 1 threshold exceeded', sub: 'Scapy behavioral detection fired', time: threat.timestamp?.slice(11, 19) ?? '' },
    { color: '#ff4d4d', label: 'Autonomous BLOCK issued', sub: 'iptables FORWARD DROP', time: threat.timestamp?.slice(11, 19) ?? '', bold: true },
    { color: '#06d6a0', label: 'POST /report → Dell logged', sub: 'Dashboard alerted via WebSocket', time: threat.timestamp?.slice(11, 19) ?? '' },
    ...(threat.status === 'blocked' ? [{ color: '#534ab7', label: `Traffic from ${threat.sourceIP} dropped`, sub: 'Block active in iptables', time: 'ongoing', bold: false }] : []),
  ];

  return (
    <div style={{ background: '#0d1b2e', border: '1px solid #1e3050', borderRadius: 8, padding: '18px 20px' }}>
      <div style={{ ...mono(10, '#4a7fa5'), letterSpacing: 2, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #1e3050', fontWeight: 700 }}>ATTACK TIMELINE</div>

      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 16 }}>
        {events.map((e, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: i < events.length - 1 ? 14 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: e.color, marginTop: 3 }} />
              {i < events.length - 1 && <div style={{ width: 1, flex: 1, background: '#1e3050', marginTop: 5 }} />}
            </div>
            <div>
              <div style={{ ...mono(11, '#4a7fa5'), marginBottom: 3 }}>{e.time}</div>
              <div style={{ ...mono(13, (e as {bold?: boolean}).bold ? e.color : '#e8f0fe'), fontWeight: (e as {bold?: boolean}).bold ? 700 : 500, marginBottom: 2 }}>{e.label}</div>
              <div style={{ ...mono(12, '#8899aa') }}>{e.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {relevant.length > 0 && (
        <>
          <div style={{ ...mono(10, '#4a7fa5'), letterSpacing: 1, marginBottom: 10, paddingTop: 12, borderTop: '1px solid #1e3050', fontWeight: 700 }}>LLM LOG MATCHES</div>
          {relevant.map(log => {
            const lc = log.type === 'action' ? '#ff4d4d' : log.type === 'analysis' ? '#7f77dd' : '#4da6ff';
            return (
              <div key={log.id} style={{ borderLeft: `2px solid ${lc}`, paddingLeft: 10, marginBottom: 8 }}>
                <div style={{ ...mono(10, lc), marginBottom: 2 }}>[{log.type.toUpperCase()}] {log.timestamp?.slice(0, 8)}</div>
                <div style={{ ...mono(12, '#c8d6e5'), lineHeight: 1.6 }}>{log.message.slice(0, 70)}</div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
interface IncidentInvestigationProps {
  threat: Threat;
  logs: ThinkingLog[];
  onBack: () => void;
}


const THREAT_PERSONAS_INV: Record<string, { name: string; image: string; motivation: string; target: string; origin: string; color: string; }> = {
  port_scan:     { name: 'PHANTOM RECON', image: '/phantom-recon.jpg',  motivation: 'Reconnaissance',    target: 'All network hosts',  origin: 'Unknown Origin', color: '#4a9eff' },
  dns_tunnel:    { name: 'SERPENT EXFIL', image: '/serpent-exfil.jpeg', motivation: 'Data Exfiltration', target: 'Internal servers',   origin: 'Eastern Bloc',   color: '#39ff14' },
  ddos:          { name: 'TITAN FLOOD',   image: '/titan-flood.png',    motivation: 'Disruption',         target: 'Gateway & Router',   origin: 'Unknown Origin', color: '#ff4d00' },
  arp_spoof:     { name: 'MIRROR GHOST',  image: '/mirror-ghost.jpg',   motivation: 'Man-in-the-Middle',  target: 'Network traffic',    origin: 'Dark Web',       color: '#b44fff' },
  sql_injection: { name: 'SERPENT EXFIL', image: '/serpent-exfil.jpeg', motivation: 'Data Exfiltration', target: 'Database servers',   origin: 'Eastern Bloc',   color: '#39ff14' },
  brute_force:   { name: 'PHANTOM RECON', image: '/phantom-recon.jpg',  motivation: 'Credential Access', target: 'Auth systems',       origin: 'Unknown Origin', color: '#4a9eff' },
  xss:           { name: 'MIRROR GHOST',  image: '/mirror-ghost.jpg',   motivation: 'Session Hijack',    target: 'Web clients',        origin: 'Dark Web',       color: '#b44fff' },
  xss_attempt:   { name: 'MIRROR GHOST',  image: '/mirror-ghost.jpg',   motivation: 'Session Hijack',    target: 'Web clients',        origin: 'Dark Web',       color: '#b44fff' },
  path_traversal:{ name: 'PHANTOM RECON', image: '/phantom-recon.jpg',  motivation: 'Reconnaissance',    target: 'File systems',       origin: 'Unknown Origin', color: '#4a9eff' },
};
const DEFAULT_PERSONA_INV = { name: 'UNKNOWN ACTOR', image: '', motivation: 'Unknown', target: 'Unknown', origin: 'Unknown', color: '#8899aa' };

export default function IncidentInvestigation({ threat, logs, onBack }: IncidentInvestigationProps) {
  const [activeTab, setActiveTab] = useState<'forensics' | 'signals' | 'timeline' | 'chat'>('forensics');
  const sc = SEV_COLOR[threat.severity] ?? '#8899aa';
  const stc = STATUS_COLOR[threat.status] ?? '#8899aa';
  const stb = STATUS_BG[threat.status] ?? '#1a2540';
  const typeKey = threat.type?.toLowerCase().replace(/\s+/g, '_') ?? '';
  const persona = THREAT_PERSONAS_INV[typeKey] ?? DEFAULT_PERSONA_INV;

    

  return (
    <>
      {/* Sub-header */}
      <div style={{
        background: '#06111f', borderBottom: '1px solid #1e3050',
        padding: '0 20px', height: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span onClick={onBack} style={{ ...mono(13, '#4a7fa5'), cursor: 'pointer', letterSpacing: 1 }}>← Dashboard</span>
          <div style={{ width: 1, height: 16, background: '#1e3050' }} />
          <span style={{ ...mono(11, '#4a7fa5'), letterSpacing: 3, fontWeight: 700 }}>INCIDENT WORKBENCH</span>
          <div style={{ width: 1, height: 16, background: '#1e3050' }} />
          <span style={{ ...mono(12, '#8899aa') }}>{threat.type} · {threat.sourceIP}</span>
        </div>
        <span style={{ background: stb, color: stc, ...mono(11), fontWeight: 700, padding: '4px 12px', borderRadius: 4, letterSpacing: 1 }}>
          {threat.status.toUpperCase()}
        </span>
      </div>

      {/* Persona Hero Banner */}
      <div style={{
        background: `linear-gradient(135deg, ${persona.color}15 0%, #06111f 60%)`,
        borderBottom: `1px solid ${persona.color}44`,
        padding: '20px 24px',
        display: 'flex', alignItems: 'center', gap: 24,
      }}>
        {/* Avatar */}
        <div style={{
          width: 90, height: 90, borderRadius: '50%',
          border: `3px solid ${persona.color}`,
          overflow: 'hidden', flexShrink: 0,
          boxShadow: `0 0 30px ${persona.color}55`,
        }}>
          {persona.image
            ? <img src={persona.image} alt={persona.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', background: '#08152a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>👤</div>
          }
        </div>

        {/* Persona Info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <span style={{ ...mono(22, persona.color), fontWeight: 700, letterSpacing: 4 }}>{persona.name}</span>
            <span style={{ ...mono(10, '#4a7fa5'), letterSpacing: 2 }}>· {persona.origin}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ background: `${persona.color}22`, border: `1px solid ${persona.color}44`, color: persona.color, ...mono(11), padding: '3px 10px', borderRadius: 3, letterSpacing: 1 }}>
              {persona.motivation}
            </span>
            <span style={{ ...mono(11, '#4a7fa5') }}>→ {persona.target}</span>
            <span style={{ ...mono(11, '#2a4a6a') }}>·</span>
            <span style={{ ...mono(11, '#8899aa') }}>{threat.sourceIP}</span>
          </div>
          <div style={{ ...mono(12, '#8899aa') }}>
            {(threat.details ?? '').slice(0, 120)}{(threat.details?.length ?? 0) > 120 ? '…' : ''}
          </div>
        </div>

        {/* Stat Pills */}
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          {[
            ['CONFIDENCE', `${Math.round((threat.confidence ?? 0.95) * 100)}%`, sc],
            ['SEVERITY',   threat.severity.toUpperCase(),                        sc],
            ['RESPONSE',   '<1s',                                                '#ffd166'],
            ['STAGE',      '1',                                                  '#06d6a0'],
          ].map(([label, val, color]) => (
            <div key={label} style={{
              textAlign: 'center', background: '#08152a',
              border: '1px solid #1e3050', borderRadius: 8, padding: '10px 16px',
            }}>
              <div style={{ ...mono(9, '#4a7fa5'), letterSpacing: 1, marginBottom: 4 }}>{label}</div>
              <div style={{ ...mono(18, color as string), fontWeight: 700 }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{
        background: '#06111f', borderBottom: '1px solid #1e3050',
        padding: '0 24px', display: 'flex', gap: 0,
      }}>
        {([
          ['forensics', '🗺 FORENSICS'],
          ['signals',   '📡 SIGNALS'],
          ['timeline',  '⏱ TIMELINE'],
          ['chat',      '🤖 ASK GUARDIAN'],
        ] as [typeof activeTab, string][]).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '14px 20px',
              background: 'none', border: 'none',
              borderBottom: activeTab === tab ? `2px solid ${persona.color}` : '2px solid transparent',
              color: activeTab === tab ? persona.color : '#4a7fa5',
              ...mono(11), fontWeight: 700, letterSpacing: 2,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >{label}</button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: '20px 24px' }}>
        {activeTab === 'forensics' && <ForensicMap threat={threat} />}
        {activeTab === 'signals' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Signals threat={threat} />
            <Reasoning threat={threat} />
          </div>
        )}
        {activeTab === 'timeline' && <Timeline threat={threat} logs={logs} />}
        {activeTab === 'chat' && (
          <div style={{ maxWidth: 700 }}>
            <GuardianChat open={true} onClose={() => setActiveTab('forensics')} threat={threat} inline={true} />
          </div>
        )}
      </div>
    </>
  );
}