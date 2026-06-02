import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react'
import { DISPUTES, ENTERPRISE_DISPUTES } from '@finance/data/mock'
import type { FinanceMode } from '@finance/modules/finance/nav'

/* ============================================================
   Shared disputes store — PER-MODE MODULE SINGLETONS.

   Disputes raised in a page (Debtors / Vendor Match / Sub-Vendor)
   flow into one list that the central Disputes page lists & resolves.

   Each finance mode gets its OWN singleton store, seeded differently:
     • aggregator / fleet (sellers) → customer + sub-vendor disputes
     • enterprise (buyer)           → vendor-invoice disputes only
   The buyer has no customers, so it must never surface receivable /
   customer disputes — hence the per-mode seed.

   Kept as module singletons (not React state) so the list survives
   the page remounts the embedded host triggers on navigation; a
   dispute raised in Vendor Match is still there on the Disputes page.
   The active mode is supplied by <DisputesProvider mode=…>.
   ============================================================ */

export interface Dispute {
  id: string
  kind?: 'customer' | 'subvendor'
  stage?: string
  resolution?: string
  vendorResponseType?: 'accept' | 'reject'  // BRD step 14 — vendor accepts or rejects
  vendorResponse?: string                    // mock vendor reply (finance-side only)
  vendorDocs?: string[]                       // supporting documents attached by vendor
  notifiedAt?: string                        // BRD step 13 — vendor notified
  respondedAt?: string
  escalatedAt?: string                       // BRD step 15
  thread?: { from: 'admin' | 'vendor'; text: string; at: string }[]  // reply conversation
  [key: string]: any
}

/** Closure outcome — BRD step 16:
 *  - 'approve'  → confirm the original invoice as billed (pay in full)
 *  - 'resubmit' → vendor must resubmit a corrected invoice (credit/debit note) */
export type DisputeResolution = 'approve' | 'resubmit'

interface DisputesContextValue {
  disputes: Dispute[]
  addDispute: (d: Dispute) => void
  resolveDispute: (id: string, how: DisputeResolution) => void
  escalateDispute: (id: string) => void
  replyToDispute: (id: string, text: string) => void
}

// Canned vendor follow-ups so the reply thread reads as a two-way conversation (mock).
const VENDOR_FOLLOWUPS = [
  'Thanks — we can share the original rate annexure and PO copy for your review.',
  'Understood. We will hold the invoice pending your decision; happy to revise if the contract rate is confirmed.',
  'Noted. Awaiting your confirmation to proceed.',
]
const stamp = () => new Date().toISOString().slice(0, 16).replace('T', ' ')

const seedFor = (mode: FinanceMode): Dispute[] =>
  mode === 'enterprise'
    ? (ENTERPRISE_DISPUTES.map((d) => ({ ...d, kind: d.kind ?? 'subvendor' })) as Dispute[])
    : (DISPUTES.map((d) => ({ ...d, kind: d.kind ?? 'customer' })) as Dispute[])

interface Store {
  getSnapshot: () => Dispute[]
  subscribe: (l: () => void) => () => void
  addDispute: (d: Dispute) => void
  resolveDispute: (id: string, how: DisputeResolution) => void
  escalateDispute: (id: string) => void
  replyToDispute: (id: string, text: string) => void
}

// One stable store object per mode, created lazily on first use so the seed
// matches the mode and navigation remounts never re-seed (which would wipe
// disputes the user just raised).
const stores: Partial<Record<FinanceMode, Store>> = {}

function storeFor(mode: FinanceMode): Store {
  const existing = stores[mode]
  if (existing) return existing

  let state: Dispute[] = seedFor(mode)
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((l) => l())

  const store: Store = {
    getSnapshot: () => state,
    subscribe: (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    addDispute: (d) => {
      if (state.some((x) => x.id === d.id)) return
      state = [{ stage: 'raised', ...d }, ...state]
      emit()
    },
    resolveDispute: (id, how) => {
      state = state.map((d) =>
        d.id === id
          ? {
              ...d,
              stage: 'resolved',
              resolution:
                how === 'approve'
                  ? 'Invoice approved as billed — dispute closed; payment scheduled.'
                  : d.kind === 'subvendor'
                    ? 'Vendor to resubmit corrected invoice — dispute closed; debit note DN-2026-021 issued, payables ledger updated.'
                    : 'Corrected invoice to be reissued — dispute closed; credit note CN-2026-021 issued, client ledger updated.',
            }
          : d,
      )
      emit()
    },
    escalateDispute: (id) => {
      state = state.map((d) => (d.id === id ? { ...d, stage: 'escalated', owner: 'Finance Head' } : d))
      emit()
    },
    replyToDispute: (id, text) => {
      state = state.map((d) => {
        if (d.id !== id) return d
        const prior = d.thread ?? []
        const followup = VENDOR_FOLLOWUPS[Math.floor(prior.length / 2) % VENDOR_FOLLOWUPS.length]
        return {
          ...d,
          thread: [
            ...prior,
            { from: 'admin', text, at: stamp() },
            { from: 'vendor', text: followup, at: stamp() },
          ],
        }
      })
      emit()
    },
  }
  stores[mode] = store
  return store
}

// The active finance mode, injected by the shell that wraps the pages
// (FinanceShell standalone / FinanceEmbeddedPage embedded).
const DisputesModeContext = createContext<FinanceMode>('aggregator')

export function DisputesProvider({ mode, children }: { mode?: FinanceMode; children: ReactNode }) {
  return <DisputesModeContext.Provider value={mode ?? 'aggregator'}>{children}</DisputesModeContext.Provider>
}

export function useDisputes(): DisputesContextValue {
  const mode = useContext(DisputesModeContext)
  const store = storeFor(mode)
  const disputes = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  return {
    disputes,
    addDispute: store.addDispute,
    resolveDispute: store.resolveDispute,
    escalateDispute: store.escalateDispute,
    replyToDispute: store.replyToDispute,
  }
}
