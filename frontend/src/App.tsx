import { useState, useEffect } from 'react';
import { GuardianWebSocket } from './services/guardianWebSocket';
import type { ThinkingLog, Threat, HardwareMetrics, CVEMatch } from './types';
import IncidentInvestigation from './components/IncidentInvestigation';

const THREAT_PERSONAS: Record<string, {
  name: string;
  image: string;
  motivation: string;
  target: string;
  origin: string;
  color: string;
}> = {
  port_scan:    { name: 'PHANTOM RECON', image: '/phantom-recon.jpg',  motivation: 'Reconnaissance',    target: 'All network hosts',  origin: 'Unknown Origin', color: '#4a9eff' },
  dns_tunnel:   { name: 'SERPENT EXFIL', image: '/serpent-exfil.jpeg', motivation: 'Data Exfiltration', target: 'Internal servers',   origin: 'Eastern Bloc',   color: '#39ff14' },
  ddos:         { name: 'TITAN FLOOD',   image: '/titan-flood.png',    motivation: 'Disruption',         target: 'Gateway & Router',   origin: 'Unknown Origin', color: '#ff4d00' },
  arp_spoof:    { name: 'MIRROR GHOST',  image: '/mirror-ghost.jpg',   motivation: 'Man-in-the-Middle',  target: 'Network traffic',    origin: 'Dark Web',       color: '#b44fff' },
  sql_injection:{ name: 'SERPENT EXFIL', image: '/serpent-exfil.jpeg', motivation: 'Data Exfiltration', target: 'Database servers',   origin: 'Eastern Bloc',   color: '#39ff14' },
  brute_force:  { name: 'PHANTOM RECON', image: '/phantom-recon.jpg',  motivation: 'Credential Access', target: 'Auth systems',       origin: 'Unknown Origin', color: '#4a9eff' },
  xss:          { name: 'MIRROR GHOST',  image: '/mirror-ghost.jpg',   motivation: 'Session Hijack',    target: 'Web clients',        origin: 'Dark Web',       color: '#b44fff' },
  xss_attempt:  { name: 'MIRROR GHOST',  image: '/mirror-ghost.jpg',   motivation: 'Session Hijack',    target: 'Web clients',        origin: 'Dark Web',       color: '#b44fff' },
  path_traversal:{ name: 'PHANTOM RECON',image: '/phantom-recon.jpg',  motivation: 'Reconnaissance',    target: 'File systems',       origin: 'Unknown Origin', color: '#4a9eff' },
};

const DEFAULT_PERSONA = { name: 'UNKNOWN ACTOR', image: '', motivation: 'Unknown', target: 'Unknown', origin: 'Unknown', color: '#8899aa' };

type ConnStatus = 'connecting' | 'live' | 'offline';
type Page = 'home' | 'investigation';

const EMPTY_HW: HardwareMetrics = {
  cpuUsage: 0, memoryUsage: 0, temperature: 0, diskUsage: 0,
  uptime: '—', networkIn: 0, networkOut: 0, modelLoaded: false, inferenceTime: 0,
};

const mono = (s: number | string, color = '#c8d6e5') =>
  ({ fontFamily: 'monospace', fontSize: typeof s === 'number' ? s * 1.3 : s, color } as React.CSSProperties);

const STATUS_COLOR: Record<string, string> = {
  blocked: '#ff4d4d', monitoring: '#7f77dd', resolved: '#06d6a0',
};
const STATUS_BG: Record<string, string> = {
  blocked: '#2d0000', monitoring: '#1a1a2d', resolved: '#002d1a',
};



// ---THREAT INTELLIGENCE------------------------------------------------------------------
function TriagePanel({ threat, onClose, onInvestigate }: {
  threat: Threat;
  onClose: () => void;
  onInvestigate: () => void;
}) {
  const typeKey = threat.type?.toLowerCase().replace(/\s+/g, '_') ?? '';
  const persona = THREAT_PERSONAS[typeKey] ?? DEFAULT_PERSONA;
  const sc = STATUS_COLOR[threat.status] ?? '#8899aa';
  const sb = STATUS_BG[threat.status] ?? '#1a2540';
  const confidence = Math.round((threat.confidence ?? 0.95) * 100);
  const sevColor = threat.severity === 'critical' || threat.severity === 'high' ? '#ff4d4d' : threat.severity === 'medium' ? '#ffd166' : '#06d6a0';

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        zIndex: 200, backdropFilter: 'blur(4px)',
      }} />

      {/* Panel — right side sliding panel */}
      <div style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: 680,
        background: '#06111f',
        borderLeft: `2px solid ${persona.color}`,
        borderRadius: '16px 0 0 16px',
        zIndex: 201,
        boxShadow: `-8px 0 60px ${persona.color}44`,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Top bar */}
        <div style={{
          padding: '14px 20px',
          borderBottom: `1px solid ${persona.color}44`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#030d1a',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14 }}>🔍</span>
            <span style={{ ...mono(12, '#4a7fa5'), letterSpacing: 3, fontWeight: 700 }}>THREAT INTELLIGENCE</span>
          </div>
          <span onClick={onClose} style={{ ...mono(20, '#4a7fa5'), cursor: 'pointer', lineHeight: 1 }}>✕</span>
        </div>

        {/* Full height body — avatar top, info below */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

          {/* Avatar hero section */}
          <div style={{
            background: `linear-gradient(180deg, ${persona.color}22 0%, #030d1a 100%)`,
            padding: '32px 40px 24px',
            display: 'flex', alignItems: 'center', gap: 28,
            borderBottom: `1px solid ${persona.color}33`,
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Background radial glow */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: `radial-gradient(circle at 20% 50%, ${persona.color}18 0%, transparent 60%)`,
              pointerEvents: 'none',
            }} />

            {/* Avatar — full bleed no circle */}
            <div style={{
              width: 160, height: 160, flexShrink: 0,
              overflow: 'hidden', position: 'relative', zIndex: 1,
              borderRadius: 12,
              boxShadow: `0 0 30px ${persona.color}66`,
              border: `1px solid ${persona.color}44`,
            }}>
              {persona.image
                ? <img src={persona.image} alt={persona.name} style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    objectPosition: 'center top',
                  }} />
                : <div style={{ width: '100%', height: '100%', background: '#08152a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 50 }}>👤</div>
              }
              {/* Gradient fade on right edge */}
              <div style={{
                position: 'absolute', top: 0, right: 0, bottom: 0, width: 40,
                background: `linear-gradient(90deg, transparent, ${persona.color}22)`,
                pointerEvents: 'none',
              }} />
            </div>

            {/* Persona info next to avatar */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                ...mono(26, persona.color), fontWeight: 700, letterSpacing: 4,
                textShadow: `0 0 20px ${persona.color}88`,
                marginBottom: 6,
              }}>{persona.name}</div>
              <div style={{ ...mono(13, '#8899aa'), marginBottom: 14 }}>
                {persona.motivation} · {persona.origin}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{
                  background: sb, color: sc,
                  ...mono(12), fontWeight: 700,
                  padding: '5px 16px', borderRadius: 4, letterSpacing: 2,
                  boxShadow: `0 0 10px ${sc}44`,
                }}>{threat.status.toUpperCase()}</span>
                <span style={{ ...mono(13, '#4a7fa5') }}>·</span>
                <span style={{ ...mono(13, '#e8f0fe'), fontWeight: 700 }}>{threat.type}</span>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['SOURCE IP',  threat.sourceIP,                    '#ff8888'],
              ['TARGET',     threat.targetIP ?? '192.168.1.1',  '#c8d6e5'],
              ['SEVERITY',   threat.severity.toUpperCase(),      sevColor],
              ['STAGE',      'Stage 1 — Rules',                  '#ff8c42'],
            ].map(([label, val, color]) => (
              <div key={label} style={{
                background: '#0d1b2e', borderRadius: 8,
                padding: '14px 18px',
                border: '1px solid #1e3050',
              }}>
                <div style={{ ...mono(10, '#4a7fa5'), letterSpacing: 2, marginBottom: 6 }}>{label}</div>
                <div style={{ ...mono(15, color as string), fontWeight: 700 }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Confidence */}
          <div style={{ padding: '0 32px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ ...mono(11, '#4a7fa5'), letterSpacing: 2 }}>CONFIDENCE</span>
              <span style={{ ...mono(16, sc), fontWeight: 700 }}>{confidence}%</span>
            </div>
            <div style={{ height: 8, background: '#1a2540', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${confidence}%`, height: '100%',
                background: `linear-gradient(90deg, ${sc}88, ${sc})`,
                borderRadius: 4, transition: 'width 1s ease',
                boxShadow: `0 0 8px ${sc}`,
              }} />
            </div>
          </div>

          {/* AI Decision */}
          <div style={{ padding: '0 32px 24px' }}>
            <div style={{
              background: threat.status === 'blocked' ? '#0a1f0a' : '#0a0a1f',
              border: `1px solid ${threat.status === 'blocked' ? '#06d6a044' : '#534ab744'}`,
              borderRadius: 8, padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{threat.status === 'blocked' ? '🚫' : '🔍'}</span>
              <div>
                <div style={{ ...mono(14, threat.status === 'blocked' ? '#06d6a0' : '#7f77dd'), fontWeight: 700, marginBottom: 4 }}>
                  {threat.status === 'blocked' ? 'AUTONOMOUSLY BLOCKED' : 'MONITORING ACTIVE'}
                </div>
                <div style={{ ...mono(12, '#8899aa') }}>
                  {threat.status === 'blocked'
                    ? 'iptables FORWARD DROP · <1s autonomous response'
                    : 'Stage 1 flagged · monitoring for escalation triggers'}
                </div>
              </div>
            </div>
          </div>

          {/* Full investigation button — pinned to bottom */}
          <div style={{ padding: '0 32px 32px', marginTop: 'auto' }}>
            <button onClick={onInvestigate} style={{
              width: '100%', padding: '18px',
              borderRadius: 10,
              border: `2px solid ${persona.color}`,
              background: `${persona.color}18`,
              color: persona.color,
              ...mono(15), fontWeight: 700,
              cursor: 'pointer', letterSpacing: 3,
              boxShadow: `0 0 20px ${persona.color}33`,
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.background = `${persona.color}33`;
                e.currentTarget.style.boxShadow = `0 0 30px ${persona.color}66`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = `${persona.color}18`;
                e.currentTarget.style.boxShadow = `0 0 20px ${persona.color}33`;
              }}
            >→ FULL INVESTIGATION</button>
          </div>
        </div>
      </div>
    </>
  );
}
// ── Threat Map ──────────────────────────────────────────────────────────
function ThreatMap({ threats, onThreatClick }: { threats: Threat[], onThreatClick: (t: Threat) => void }) {
  const blockedThreats = threats.filter(t => t.status === 'blocked');
  const monitoringThreats = threats.filter(t => t.status === 'monitoring');
  const threatLevel = blockedThreats.length > 5 ? 'CRITICAL' : blockedThreats.length > 2 ? 'HIGH' : blockedThreats.length > 0 ? 'MEDIUM' : 'LOW';
  const threatColor = threatLevel === 'CRITICAL' ? '#ff2200' : threatLevel === 'HIGH' ? '#ff4d4d' : threatLevel === 'MEDIUM' ? '#ffd166' : '#06d6a0';

  const INTERNET = { x: 320, y: 30 };
  const ROUTER   = { x: 320, y: 95 };
  const PI       = { x: 320, y: 185 };
  const SWITCH   = { x: 500, y: 185 };
  const DELL     = { x: 580, y: 185 };
  const PC1      = { x: 500, y: 260 };
  const PC2      = { x: 580, y: 260 };

  return (
    <div style={{ background: '#020a14', border: '1px solid #1e3050', borderRadius: 8, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '10px 18px', borderBottom: '1px solid #1e3050',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: '#030d1a',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ ...mono(11, '#4a7fa5'), letterSpacing: 3, fontWeight: 700 }}>GUARDIAN NETWORK ARCHITECTURE</span>
          <span style={{ ...mono(10, '#06d6a0'), letterSpacing: 2 }}>● ALL NODES ONLINE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ ...mono(9, '#4a7fa5'), letterSpacing: 2 }}>THREAT LEVEL</div>
            <div style={{ ...mono(14, threatColor), fontWeight: 700, letterSpacing: 3 }}>{threatLevel}</div>
          </div>
          <div style={{
            width: 34, height: 34, border: `2px solid ${threatColor}`,
            borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 12px ${threatColor}88`,
          }}>
            <span style={{ color: threatColor, fontSize: 16 }}>⚠</span>
          </div>
        </div>
      </div>

      {/* Map + Sidebar */}
      <div style={{ display: 'flex' }}>
        <svg width="100%" viewBox="0 0 660 310" style={{ display: 'block', flex: 1 }}>
          <defs>
            <radialGradient id="bgGrad2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#041020" />
              <stop offset="100%" stopColor="#010810" />
            </radialGradient>
            <filter id="greenGlow2">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="blueGlow2">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <style>{`
              @keyframes piPulse  { 0%,100%{opacity:0.15} 50%{opacity:0.05} }
              @keyframes dashSafe { to{stroke-dashoffset:-16} }
              @keyframes dashBlu  { to{stroke-dashoffset:-20} }
              .pi-ring  { animation: piPulse 2s ease-in-out infinite; }
              .flow-grn { stroke-dasharray:4 6; animation: dashSafe 1.5s linear infinite; }
              .flow-blu { stroke-dasharray:4 6; animation: dashBlu  2s linear infinite; }
            `}</style>
          </defs>

          <rect width="660" height="310" fill="url(#bgGrad2)" />

          {/* Grid dots */}
          {Array.from({ length: 22 }).map((_, row) =>
            Array.from({ length: 34 }).map((_, col) => (
              <circle key={`${row}-${col}`} cx={col * 20 + 10} cy={row * 14 + 7} r="0.7" fill="#0a2040" opacity="0.5" />
            ))
          )}

          {/* Connections — red when threats active, green when clear */}
          <line x1={INTERNET.x} y1={INTERNET.y + 8} x2={ROUTER.x} y2={ROUTER.y - 10} stroke={blockedThreats.length > 0 ? '#ff4d4d' : '#4a7fa5'} strokeWidth="1.5" className="flow-blu" opacity="0.6" />
          <line x1={ROUTER.x} y1={ROUTER.y + 10} x2={PI.x} y2={PI.y - 22} stroke={blockedThreats.length > 0 ? '#ff4d4d' : '#4a7fa5'} strokeWidth="1.5" className="flow-blu" opacity="0.6" />
          <line x1={PI.x + 22} y1={PI.y} x2={SWITCH.x - 12} y2={SWITCH.y} stroke="#06d6a0" strokeWidth="1.5" className="flow-grn" opacity="0.5" />
          <line x1={SWITCH.x + 12} y1={SWITCH.y} x2={DELL.x - 10} y2={DELL.y} stroke="#06d6a0" strokeWidth="1" className="flow-grn" opacity="0.4" />
          <line x1={SWITCH.x} y1={SWITCH.y + 12} x2={PC1.x} y2={PC1.y - 8} stroke="#06d6a0" strokeWidth="1" className="flow-grn" opacity="0.4" />
          <line x1={SWITCH.x + 20} y1={SWITCH.y + 10} x2={PC2.x} y2={PC2.y - 8} stroke="#06d6a0" strokeWidth="1" className="flow-grn" opacity="0.4" />

          {/* Internet */}
          <g>
            <circle cx={INTERNET.x} cy={INTERNET.y} r="14" fill="#041520" stroke="#4a7fa5" strokeWidth="1.5" filter="url(#blueGlow2)" />
            <text x={INTERNET.x} y={INTERNET.y + 5} fontSize="12" textAnchor="middle">🌐</text>
            <text x={INTERNET.x} y={INTERNET.y + 25} fill="#4a7fa5" fontSize="8" textAnchor="middle" fontFamily="monospace">INTERNET</text>
          </g>

          {/* Router */}
          <g>
            <circle cx={ROUTER.x} cy={ROUTER.y} r="14" fill="#041520" stroke="#4a7fa5" strokeWidth="1.5" filter="url(#blueGlow2)" />
            <text x={ROUTER.x} y={ROUTER.y + 5} fontSize="12" textAnchor="middle">📡</text>
            <text x={ROUTER.x} y={ROUTER.y + 25} fill="#4a7fa5" fontSize="8" textAnchor="middle" fontFamily="monospace">ROUTER</text>
            <text x={ROUTER.x} y={ROUTER.y + 34} fill="#2a4a6a" fontSize="7" textAnchor="middle" fontFamily="monospace">192.168.0.1</text>
          </g>

          {/* Guardian PI */}
          <g>
            <circle cx={PI.x} cy={PI.y} r="50" fill="#06d6a0" className="pi-ring" />
            <circle cx={PI.x} cy={PI.y} r="35" fill="#06d6a0" opacity="0.06" className="pi-ring" />
            <circle cx={PI.x} cy={PI.y} r="22" fill="#06111f" stroke="#06d6a0" strokeWidth="2.5" filter="url(#greenGlow2)" />
            <text x={PI.x} y={PI.y + 6} fontSize="18" textAnchor="middle">🛡</text>
            <text x={PI.x} y={PI.y + 35} fill="#06d6a0" fontSize="9" textAnchor="middle" fontFamily="monospace" fontWeight="700">GUARDIAN PI</text>
            <text x={PI.x} y={PI.y + 46} fill="#4a7fa5" fontSize="7" textAnchor="middle" fontFamily="monospace">Scapy</text>
            <text x={PI.x} y={PI.y + 56} fill="#06d6a0" fontSize="7" textAnchor="middle" fontFamily="monospace">● ACTIVE DEFENSE</text>
          </g>

          {/* Switch */}
          <g>
            <circle cx={SWITCH.x} cy={SWITCH.y} r="14" fill="#041520" stroke="#06d6a0" strokeWidth="1.5" filter="url(#blueGlow2)" opacity="0.8" />
            <text x={SWITCH.x} y={SWITCH.y + 5} fontSize="12" textAnchor="middle">🔀</text>
            <text x={SWITCH.x} y={SWITCH.y + 25} fill="#4a7fa5" fontSize="8" textAnchor="middle" fontFamily="monospace">SWITCH</text>
          </g>

          {/* Dell */}
          <g>
            <circle cx={DELL.x} cy={DELL.y} r="14" fill="#041520" stroke="#7f77dd" strokeWidth="1.5" filter="url(#blueGlow2)" />
            <text x={DELL.x} y={DELL.y + 5} fontSize="12" textAnchor="middle">🖥</text>
            <text x={DELL.x} y={DELL.y + 25} fill="#7f77dd" fontSize="8" textAnchor="middle" fontFamily="monospace">DELL GB10</text>
            <text x={DELL.x} y={DELL.y + 34} fill="#534ab7" fontSize="7" textAnchor="middle" fontFamily="monospace">LLM · API</text>
          </g>

          {/* PCs */}
          {[{ ...PC1, label: 'PC-01' }, { ...PC2, label: 'PC-02' }].map(node => (
            <g key={node.label}>
              <circle cx={node.x} cy={node.y} r="10" fill="#041520" stroke="#06d6a0" strokeWidth="1" opacity="0.6" />
              <text x={node.x} y={node.y + 4} fontSize="9" textAnchor="middle">💻</text>
              <text x={node.x} y={node.y + 20} fill="#4a7fa5" fontSize="7" textAnchor="middle" fontFamily="monospace">{node.label}</text>
            </g>
          ))}
        </svg>

        {/* Sidebar */}
        <div style={{
          width: 155, flexShrink: 0, borderLeft: '1px solid #1e3050',
          padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 14,
          background: '#030d1a',
        }}>
          <div>
            <div style={{ ...mono(9, '#4a7fa5'), letterSpacing: 2, marginBottom: 8 }}>NETWORK STATUS</div>
            <div style={{ padding: '8px 10px', borderRadius: 4, background: '#06d6a011', border: '1px solid #06d6a044' }}>
              <div style={{ ...mono(11, '#06d6a0'), fontWeight: 700, letterSpacing: 2 }}>ALL NODES ONLINE</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['INTERNET',  '● online', '#06d6a0'],
              ['ROUTER',    '● online', '#06d6a0'],
              ['GUARDIAN',  '● active', '#06d6a0'],
              ['SWITCH',    '● online', '#06d6a0'],
              ['DELL GB10', '● ready',  '#7f77dd'],
            ].map(([label, val, color]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ ...mono(9, '#4a7fa5'), letterSpacing: 1 }}>{label}</span>
                <span style={{ ...mono(10, color), fontWeight: 700 }}>{val}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #1e3050', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['THREATS',    threats.length,           '#ff4d4d'],
              ['BLOCKED',    blockedThreats.length,    '#ff4d4d'],
              ['MONITORING', monitoringThreats.length, '#ffd166'],
            ].map(([label, val, color]) => (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ ...mono(9, '#4a7fa5'), letterSpacing: 1 }}>{label}</span>
                <span style={{ ...mono(12, color as string), fontWeight: 700 }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Incident Card ─────────────────────────────────────────────────────────────

function IncidentCard({ threat, onClick }: { threat: Threat; onClick: () => void }) {
  const sc = STATUS_COLOR[threat.status] ?? '#8899aa';
  const sb = STATUS_BG[threat.status] ?? '#1a2540';
  const borderColor = threat.status === 'blocked' ? '#ff4d4d' : threat.status === 'monitoring' ? '#7f77dd' : '#06d6a0';
  const typeKey = threat.type?.toLowerCase().replace(/\s+/g, '_') ?? '';
  const persona = THREAT_PERSONAS[typeKey] ?? DEFAULT_PERSONA;

  return (
    <div
      onClick={onClick}
      style={{
        background: threat.severity === 'critical' ? 'linear-gradient(90deg, #2d000088 0%, #0d1b2e 40%)' :
                  threat.severity === 'high' ? 'linear-gradient(90deg, #2d000066 0%, #0d1b2e 40%)' :
                  threat.severity === 'medium' ? 'linear-gradient(90deg, #2d1a0066 0%, #0d1b2e 40%)' :
                  '#0d1b2e',
        border: '1px solid #1e3050',
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: 8, padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 16,
        cursor: 'pointer', transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = persona.color;
        e.currentTarget.style.transform = 'scale(1.01)';
        e.currentTarget.style.boxShadow = `0 4px 20px ${persona.color}33`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#1e3050';
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Persona Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          border: `2px solid ${persona.color}`,
          overflow: 'hidden',
          boxShadow: `0 0 12px ${persona.color}44`,
          background: '#08152a',
        }}>
          {persona.image
            ? <img src={persona.image} alt={persona.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>👤</div>
          }
        </div>
        {/* Status dot */}
        <div style={{
          position: 'absolute', bottom: 2, right: 2,
          width: 12, height: 12, borderRadius: '50%',
          background: sc, border: '2px solid #0d1b2e',
        }} />
      </div>

      {/* Persona Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ ...mono(13, persona.color), fontWeight: 700, letterSpacing: 2 }}>{persona.name}</span>
          <span style={{ ...mono(10, '#2a4a6a'), letterSpacing: 1 }}>·</span>
          <span style={{ ...mono(10, '#4a7fa5'), letterSpacing: 1 }}>{persona.origin}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ background: '#08152a', border: `1px solid ${persona.color}44`, color: persona.color, ...mono(10), padding: '2px 8px', borderRadius: 3, letterSpacing: 1 }}>
            {persona.motivation}
          </span>
          <span style={{ ...mono(10, '#4a7fa5') }}>→ {persona.target}</span>
        </div>
        <div style={{ ...mono(11, '#8899aa') }}>
          {threat.sourceIP} · {threat.type} · {threat.timestamp?.slice(11, 19) ?? ''}
        </div>
      </div>

      {/* Status Badge */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
        <span style={{ background: sb, color: sc, ...mono(11), fontWeight: 700, padding: '4px 12px', borderRadius: 3, letterSpacing: 1 }}>
          {threat.status.toUpperCase()}
        </span>
        <span style={{ ...mono(10, '#4a7fa5'), letterSpacing: 1 }}>→ INVESTIGATE</span>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ conn, lastScan, hw, logs }: {
  conn: ConnStatus; lastScan: string; hw: HardwareMetrics; logs: ThinkingLog[];
}) {
  const cc = conn === 'live' ? '#06d6a0' : conn === 'connecting' ? '#ffd166' : '#ff4d4d';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 260, flexShrink: 0 }}>

      {/* Agent Status */}
      <div style={{ background: '#0d1b2e', border: '1px solid #1e3050', borderRadius: 8, padding: '16px 18px' }}>
        <div style={{ ...mono(10, '#4a7fa5'), letterSpacing: 3, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #1e3050', fontWeight: 700 }}>AGENT STATUS</div>
        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid #06d6a0', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🛡️</div>
          <div style={{ ...mono(15, '#06d6a0'), fontWeight: 700, letterSpacing: 4 }}>ACTIVE</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {([
            ['Connection', <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: cc, display: 'inline-block' }} />
              <span style={{ ...mono(13, cc), fontWeight: 700 }}>{conn.toUpperCase()}</span>
            </span>],
            ['Mode',           <span style={{ ...mono(13, '#06d6a0') }}>Autonomous</span>],
            ['Stage 1',        <span style={{ ...mono(13, '#06d6a0') }}>● Active</span>],
            ['Stage 2 LLM',    <span style={{ ...mono(13, '#7f77dd') }}>● Ready</span>],
            ['Last scan',      <span style={{ ...mono(13) }}>{lastScan}</span>],
          ] as [string, React.ReactNode][]).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ ...mono(12, '#a8c4d8') }}>{k}</span>
              {v}
            </div>
          ))}
        </div>
      </div>

      {/* Hardware */}
      <div style={{ background: '#0d1b2e', border: '1px solid #1e3050', borderRadius: 8, padding: '16px 18px' }}>
        <div style={{ ...mono(10, '#4a7fa5'), letterSpacing: 3, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #1e3050', fontWeight: 700 }}>DELL GB10</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'CPU',  val: hw.cpuUsage,    unit: '%',  color: hw.cpuUsage > 80 ? '#ff4d4d' : '#06d6a0' },
            { label: 'RAM',  val: hw.memoryUsage, unit: '%',  color: '#4da6ff' },
            { label: 'TEMP', val: hw.temperature, unit: '°C', color: hw.temperature > 80 ? '#ff4d4d' : '#ffd166' },
          ].map(m => (
            <div key={m.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ ...mono(12, '#8899aa') }}>{m.label}</span>
                <span style={{ ...mono(16, m.color), fontWeight: 700 }}>{m.val}{m.unit}</span>
              </div>
              <div style={{ height: 5, background: '#1a2540', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(m.val, 100)}%`, height: '100%', background: m.color, borderRadius: 3, transition: 'width 1s ease' }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #1e3050', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: hw.modelLoaded ? '#06d6a0' : '#ff4d4d', display: 'inline-block' }} />
          <span style={{ ...mono(11, '#8899aa') }}>{hw.modelLoaded ? `LLM loaded · ${hw.inferenceTime}s avg` : 'LLM offline'}</span>
        </div>
      </div>

      {/* Recent log */}
      <div style={{ background: '#0d1b2e', border: '1px solid #1e3050', borderRadius: 8, padding: '16px 18px', flex: 1 }}>
        <div style={{ ...mono(10, '#4a7fa5'), letterSpacing: 3, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #1e3050', fontWeight: 700 }}>RECENT EVENTS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {logs.slice(-5).length === 0
            ? <span style={{ ...mono(12, '#2a4a6a') }}>Awaiting events…</span>
            : logs.slice(-5).map((log, idx) => {
              const lc = log.type === 'action' ? '#ff4d4d' : log.type === 'analysis' ? '#7f77dd' : '#4da6ff';
              const isLatest = idx === logs.slice(-5).length - 1;
              return (
                <div key={log.id} style={{ borderLeft: `2px solid ${lc}`, paddingLeft: 8 }}>
                  <div style={{ ...mono(10, lc), marginBottom: 2 }}>[{log.type.toUpperCase()}] {log.timestamp?.slice(0, 8)}</div>
                  <div style={{
                    ...mono(11, '#c8d6e5'), lineHeight: 1.5,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    animation: isLatest ? 'typing 1.5s steps(40) forwards' : 'none',
                    maxWidth: isLatest ? '0' : '100%',
                  }}
                    className={isLatest ? 'typing-text' : ''}
                  >{log.message.slice(0, 50)}</div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [conn, setConn] = useState<ConnStatus>('connecting');
  const [lastScan, setLastScan] = useState('—');
  const [threats, setThreats] = useState<Threat[]>([]);
  const [logs, setLogs] = useState<ThinkingLog[]>([]);
  const [hw, setHw] = useState<HardwareMetrics>(EMPTY_HW);
  const [clock, setClock] = useState('');
  const [page, setPage] = useState<Page>('home');
  const [selectedThreat, setSelectedThreat] = useState<Threat | null>(null);
  const [triageThreat, setTriageThreat] = useState<Threat | null>(null);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-GB', { hour12: false }));
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const ws = new GuardianWebSocket(EMPTY_HW);
    ws.on('thinking_log',    d => { setConn('live'); setLogs(p => [...p.slice(-80), d as ThinkingLog]); });
    ws.on('threat_update', d => {
      setConn('live');
      setLastScan(new Date().toLocaleTimeString('en-GB', { hour12: false }));
      setThreats(p => {
        const incoming = d as Threat;
        const idx = p.findIndex(t => t.id === incoming.id);
        if (idx !== -1) {
          // Update existing incident — replace reasoning + CVE matches
          const updated = [...p];
          updated[idx] = { ...updated[idx], ...incoming };
          return updated;
        }
        // New incident — prepend
        return [incoming, ...p].slice(0, 30);
      });
    });
    ws.on('hardware_update', d => { setConn('live'); setHw(d as HardwareMetrics); });
    ws.on('agent_pulse',     () => { setConn('live'); setLastScan(new Date().toLocaleTimeString('en-GB', { hour12: false })); });
    const t = setTimeout(() => setConn(p => p === 'connecting' ? 'offline' : p), 5000);
    ws.connect();
    return () => { clearTimeout(t); ws.disconnect(); };
  }, []);

  const cc = conn === 'live' ? '#06d6a0' : conn === 'connecting' ? '#ffd166' : '#ff4d4d';
  const blocked = threats.filter(t => t.status === 'blocked').length;
  const monitoring = threats.filter(t => t.status === 'monitoring').length;

  const GlobalStyle = () => (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: #060f1c; color: #c8d6e5; font-family: 'IBM Plex Mono', monospace; }
      ::-webkit-scrollbar { width: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #1e3050; border-radius: 2px; }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
      @keyframes counterPop { 0%{transform:scale(1)} 50%{transform:scale(1.3)} 100%{transform:scale(1)} }
      @keyframes typing { from{max-width:0} to{max-width:200px} }
      .typing-text { border-right: 2px solid #06d6a0; animation: typing 1.5s steps(40) forwards, blink 0.8s step-end 1.5s forwards; }
      @keyframes blink { 0%,100%{border-color:#06d6a0} 50%{border-color:transparent} }
      @keyframes logoPulse { 0%,100%{box-shadow:0 0 0px #ff4d4d} 50%{box-shadow:0 0 20px #ff4d4d, 0 0 40px #ff4d4d88} }
      
    `}</style>
  );

  const Header = () => (
    <header style={{
      background: '#06111f', borderBottom: '1px solid #1e3050',
      height: 52, padding: '0 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* Logo — clean, just shield + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: threats.length > 0 ? '#ff4d4d' : '#06d6a0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
          animation: threats.length > 0 ? 'logoPulse 1.5s ease-in-out infinite' : undefined,
          transition: 'background 0.5s ease',
        }}>🛡</div>
        <span style={{ ...mono(16, '#06d6a0'), fontWeight: 700, letterSpacing: 6 }}>GUARDIAN</span>
      </div>

      {/* Right: status + clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%', background: cc,
            display: 'inline-block',
            animation: conn === 'live' ? 'pulse 2s infinite' : undefined,
            boxShadow: `0 0 8px ${cc}`,
          }} />
          <span style={{ ...mono(13, cc), fontWeight: 700, letterSpacing: 2 }}>{conn.toUpperCase()}</span>
        </div>
        <span style={{ ...mono(13, '#4a7fa5') }}>{clock}</span>
      </div>
    </header>
  );

  if (page === 'investigation' && selectedThreat) {
    return (
      <>
        <GlobalStyle />
        <Header />
        <IncidentInvestigation
          threat={selectedThreat}
          logs={logs}
          onBack={() => { setPage('home'); setSelectedThreat(null); }}
        />
      </>
    );
  }

  return (
    <>
      <GlobalStyle />
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />

        {/* Stats bar */}
        <div style={{ background: '#08152a', borderBottom: '1px solid #1e3050', height: 42, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 36 }}>
          {([
            ['THREATS',    threats.length,  threats.length > 0 ? '#ff4d4d' : '#06d6a0'],
            ['BLOCKED',    blocked,         blocked > 0 ? '#ff4d4d' : '#4a7fa5'],
            ['MONITORING', monitoring,      monitoring > 0 ? '#7f77dd' : '#4a7fa5'],
            ['UPTIME',     hw.uptime,       '#4a7fa5'],
          ] as [string, string | number, string][]).map(([lbl, val, col]) => (
            <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ ...mono(10, '#4a7fa5'), letterSpacing: 2 }}>{lbl}</span>
              <span style={{
                ...mono(17, col), fontWeight: 700,
                transition: 'all 0.4s ease',
                textShadow: typeof val === 'number' && val > 0 ? `0 0 10px ${col}` : 'none',
                animation: typeof val === 'number' && val > 0 ? 'counterPop 0.3s ease' : 'none',
              }}>{val}</span>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: threats.length > 0 ? '#ff4d4d' : '#06d6a0', display: 'inline-block' }} />
            <span style={{ ...mono(11, threats.length > 0 ? '#ff4d4d' : '#06d6a0') }}>
              {threats.length > 0 ? `${threats.length} THREAT${threats.length > 1 ? 'S' : ''} DETECTED` : 'NETWORK CLEAR'}
            </span>
          </div>
        </div>

        {conn === 'offline' && (
          <div style={{ background: '#2d0000', borderBottom: '1px solid #5a0000', padding: '10px 24px', ...mono(12, '#ff9999') }}>
            ⚠ Backend unreachable — start FastAPI on the Dell: uvicorn main:app --host 0.0.0.0 --port 8000
          </div>
        )}

        {/* Main */}
        <main style={{ flex: 1, padding: '16px 24px', display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ThreatMap threats={threats} onThreatClick={(t) => setTriageThreat(t)} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
              <span style={{ ...mono(11, '#4a7fa5'), letterSpacing: 3, fontWeight: 700 }}>RECENT INCIDENTS</span>
              <span style={{ ...mono(11, '#2a4a6a') }}>{threats.length} total · click any row to investigate</span>
            </div>


            {threats.length === 0
              ? <div style={{ background: '#0d1b2e', border: '1px solid #1e3050', borderRadius: 8, padding: '28px 20px', textAlign: 'center', ...mono(14, '#2a4a6a') }}>
                  No incidents detected — network clear
                </div>
              : threats.map(t => (
                <IncidentCard key={t.id} threat={t} onClick={() => setTriageThreat(t)} />
              ))
            }
            {triageThreat && (
              <TriagePanel
                threat={triageThreat}
                onClose={() => setTriageThreat(null)}
                onInvestigate={() => { setSelectedThreat(triageThreat); setPage('investigation'); setTriageThreat(null); }}
              />
            )}
          </div>
          <Sidebar conn={conn} lastScan={lastScan} hw={hw} logs={logs} />
        </main>

        <footer style={{ borderTop: '1px solid #1e3050', padding: '10px 24px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ ...mono(10, '#1e3050'), letterSpacing: 2 }}>GUARDIAN v2.0 · METROPOLIA UNIVERSITY</span>
          <span style={{ ...mono(10, '#1e3050'), letterSpacing: 2 }}>EXPLAINABLE AGENTIC AI</span>
        </footer>
      </div>
    </>
  );
}
