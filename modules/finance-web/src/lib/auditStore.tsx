import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react'
import { AUDIT_LOG } from '@finance/data/mock'
import type { FinanceMode } from '@finance/modules/finance/nav'

/* ============================================================
   Freight audit trail — PER-MODE MODULE SINGLETONS (BRD 9.5).

   Every financial action (invoice approval, debit/credit note issuance,
   payment processing, ledger adjustment, dispute resolution) appends an
   IMMUTABLE entry. Other finance stores call `logAudit(mode, entry)` from
   their action closures (which already close over the active mode), so the
   log is fed by real actions, not a static mock.

   Same shape as disputesStore / receivablesStore: lazily-seeded singleton
   per mode, exposed via useSyncExternalStore, surviving nav remounts.
   ============================================================ */

export interface AuditEntry {
  ts: string
  user: string
  action: string
  entity: string
  type: string
  amount?: number
  from?: string
  to?: string
}

const pad = (n: number) => String(n).padStart(2, '0')
const stamp = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const seedFor = (): AuditEntry[] =>
  AUDIT_LOG.map((r) => ({ ts: r.ts, user: r.user, action: r.action, entity: r.entity, type: r.action, from: r.from, to: r.to }))

interface Store {
  getSnapshot: () => AuditEntry[]
  subscribe: (l: () => void) => () => void
  log: (e: AuditEntry) => void
}

const stores: Partial<Record<FinanceMode, Store>> = {}

function storeFor(mode: FinanceMode): Store {
  const existing = stores[mode]
  if (existing) return existing

  let state: AuditEntry[] = seedFor()
  const listeners = new Set<() => void>()
  const store: Store = {
    getSnapshot: () => state,
    subscribe: (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    log: (e) => {
      state = [e, ...state]
      listeners.forEach((l) => l())
    },
  }
  stores[mode] = store
  return store
}

/** Append an immutable audit entry for a mode. Callable from any store action. */
export function logAudit(mode: FinanceMode, entry: Omit<AuditEntry, 'ts'> & { ts?: string }) {
  storeFor(mode).log({ ts: entry.ts ?? stamp(), ...entry })
}

const AuditModeContext = createContext<FinanceMode>('aggregator')

export function AuditProvider({ mode, children }: { mode?: FinanceMode; children: ReactNode }) {
  return <AuditModeContext.Provider value={mode ?? 'aggregator'}>{children}</AuditModeContext.Provider>
}

export function useAudit() {
  const mode = useContext(AuditModeContext)
  const store = storeFor(mode)
  const entries = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  return { entries }
}

/** A logger bound to the page's active finance mode — for pages (not stores) that
 *  need to append an audit entry from an event handler. */
export function useAuditLogger() {
  const mode = useContext(AuditModeContext)
  return (entry: Omit<AuditEntry, 'ts'> & { ts?: string }) => logAudit(mode, entry)
}
