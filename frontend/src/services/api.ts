const API_BASE = 'http://localhost:8000/api';

export interface NarrationResult {
  id: string;
  narration: string;
  cached: boolean;
}

export async function fetchNarration(
  threatId?: string,
  incidentId?: string,
): Promise<NarrationResult> {
  const response = await fetch(`${API_BASE}/narrate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      threat_id: threatId ?? null,
      incident_id: incidentId ?? null,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || 'Narration failed');
  }
  return response.json() as Promise<NarrationResult>;
}

export async function blockIPApi(ip: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/block-ip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip }),
  });
  return response.json();
}
