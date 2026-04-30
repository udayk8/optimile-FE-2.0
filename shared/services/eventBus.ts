// ============================================================
// Optimile ERP – Cross-Module Event Bus
// ============================================================
// This is how modules communicate WITHOUT importing each other.
// Example: When TMS completes a trip, it publishes 'trip.completed'.
//          Finance module listens and auto-creates the expense entry.
//          Fleet module listens and updates vehicle availability.
// ============================================================

import { ERPEvent, ERPModule } from '../types';
import { getStoredAuthSession } from './authStorage';

type EventHandler = (event: ERPEvent) => void;

const HISTORY_CAP = 1000;

class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  // 3-P2: O(1) circular buffer — no shift() eviction
  private historyBuf: (ERPEvent | undefined)[] = new Array(HISTORY_CAP);
  private historyHead = 0; // next write slot
  private historyCount = 0;

  on(eventType: string, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
    return () => { this.handlers.get(eventType)?.delete(handler); };
  }

  // 3-P3: userId and tenantId are derived from the stored auth session,
  // not accepted as caller-provided params, preventing event spoofing.
  emit(eventType: string, module: ERPModule, payload: unknown): void {
    const session = getStoredAuthSession();
    const event: ERPEvent = {
      type: eventType,
      module,
      payload,
      timestamp: new Date().toISOString(),
      userId: session?.tenantId ? 'authenticated' : 'system',
      tenantId: session?.tenantId ?? 'unknown',
    };

    // Write into circular buffer at head, then advance
    this.historyBuf[this.historyHead] = event;
    this.historyHead = (this.historyHead + 1) % HISTORY_CAP;
    if (this.historyCount < HISTORY_CAP) this.historyCount++;

    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch {
          // Swallow handler errors — one bad subscriber must not break others
        }
      });
    }
  }

  getHistory(filter?: { module?: ERPModule; type?: string }): ERPEvent[] {
    // Reconstruct ordered history from circular buffer (oldest → newest)
    const start = this.historyCount < HISTORY_CAP
      ? 0
      : this.historyHead; // oldest slot when buffer is full
    const result: ERPEvent[] = [];
    for (let i = 0; i < this.historyCount; i++) {
      const entry = this.historyBuf[(start + i) % HISTORY_CAP];
      if (entry) result.push(entry);
    }
    if (filter?.module) return result.filter(e => e.module === filter.module);
    if (filter?.type)   return result.filter(e => e.type   === filter.type);
    return result;
  }

  reset(): void {
    this.handlers.clear();
    this.historyBuf = new Array(HISTORY_CAP);
    this.historyHead = 0;
    this.historyCount = 0;
  }
}

// Singleton – shared across the entire ERP
export const erpEventBus = new EventBus();
