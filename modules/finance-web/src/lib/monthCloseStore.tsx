import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react'
import type { FinanceMode } from '@finance/modules/finance/nav'

/* ============================================================
   Month-end close lock — PER-MODE MODULE SINGLETONS (BRD 9.4).

   Once a month is closed it is locked; no new entries post to that period
   without an explicit override (reopen). Kept as a mode-aware singleton so
   the lock survives the embedded host's nav remounts.
   ============================================================ */

interface State {
  locked: boolean
  closedAt: string | null
  overrides: number
}

interface Store {
  getSnapshot: () => State
  subscribe: (l: () => void) => () => void
  closeMonth: () => void
  reopen: () => void
}

const pad = (n: number) => String(n).padStart(2, '0')
const stamp = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const stores: Partial<Record<FinanceMode, Store>> = {}

function storeFor(mode: FinanceMode): Store {
  const existing = stores[mode]
  if (existing) return existing

  let state: State = { locked: false, closedAt: null, overrides: 0 }
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((l) => l())
  const store: Store = {
    getSnapshot: () => state,
    subscribe: (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    closeMonth: () => { state = { ...state, locked: true, closedAt: stamp() }; emit() },
    reopen: () => { state = { ...state, locked: false, overrides: state.overrides + 1 }; emit() },
  }
  stores[mode] = store
  return store
}

const MonthCloseModeContext = createContext<FinanceMode>('aggregator')

export function MonthCloseProvider({ mode, children }: { mode?: FinanceMode; children: ReactNode }) {
  return <MonthCloseModeContext.Provider value={mode ?? 'aggregator'}>{children}</MonthCloseModeContext.Provider>
}

export function useMonthClose() {
  const mode = useContext(MonthCloseModeContext)
  const store = storeFor(mode)
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  return { ...state, closeMonth: store.closeMonth, reopen: store.reopen }
}
