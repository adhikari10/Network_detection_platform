import type { HardwareMetrics } from '../types';
import { MockWebSocket } from './mockWebSocket';

type EventType = 'thinking_log' | 'threat_update' | 'hardware_update' | 'agent_pulse';
type Listener = (data: unknown) => void;

const WS_URL = import.meta.env.VITE_WS_URL ?? `ws://${window.location.hostname}:8000/ws`;
const RECONNECT_DELAY = 3000;

export class GuardianWebSocket {
  private listeners: Map<EventType, Set<Listener>> = new Map();
  private ws: WebSocket | null = null;
  private mockWs: MockWebSocket | null = null;
  private running = false;
  private baseHardware: HardwareMetrics;
  private usingMock = false;

  constructor(baseHardware: HardwareMetrics) {
    this.baseHardware = baseHardware;
  }

  on(event: EventType, listener: Listener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: EventType, listener: Listener): void {
    this.listeners.get(event)?.delete(listener);
  }

  private emit(event: EventType, data: unknown): void {
    this.listeners.get(event)?.forEach(fn => fn(data));
  }

  connect(): void {
    if (this.running) return;
    this.running = true;
    this.tryRealWebSocket();
  }

  private tryRealWebSocket(): void {
    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log('[Guardian] Connected to backend WebSocket');
        this.usingMock = false;
      };

      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data) as {
          type: EventType;
          payload: unknown;
        };
        this.emit(msg.type, msg.payload);
      };

      this.ws.onerror = () => {
        console.warn('[Guardian] WebSocket error');
        this.fallbackToMock();
      };

      this.ws.onclose = () => {
        if (this.running && !this.usingMock) {
          console.log('[Guardian] WebSocket closed, reconnecting in 3s...');
          setTimeout(() => this.tryRealWebSocket(), RECONNECT_DELAY);
        }
      };
    } catch {
      this.fallbackToMock();
    }
  }

  private fallbackToMock(): void {
    if (this.usingMock) return;
    this.usingMock = true;
    this.ws?.close();
    this.ws = null;

    console.log('[Guardian] Using mock WebSocket (no backend detected)');
    this.mockWs = new MockWebSocket(this.baseHardware);

    for (const [event, listeners] of this.listeners) {
      for (const listener of listeners) {
        this.mockWs.on(event, listener);
      }
    }

    this.mockWs.connect();
  }

  disconnect(): void {
    this.running = false;
    this.ws?.close();
    this.ws = null;
    this.mockWs?.disconnect();
    this.mockWs = null;
  }
}
