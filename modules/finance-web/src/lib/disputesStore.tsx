import { useSyncExternalStore, type ReactNode } from 'react'
import { DISPUTES } from '@finance/data/mock'

/* ============================================================
   Shared disputes store — MODULE-LEVEL SINGLETON.
   Both customer disputes (raised in Debtors) and sub-vendor
   disputes (raised in Vendor Match / Sub-Vendor) flow into one
   list that the central Disputes page lists & resolves.

   Kept as a module singleton (not React context state) so the
   list survives component remounts. In embedded mode the host
   re-mounts each finance page on navigation, which would reset
   context-held state; a singleton persists across those mounts
   so a dispute raised in Vendor Match is still there on the
   Disputes page, and a closure reflects back on Vendor Match.
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

const SEED: Dispute[] = DISPUTES.map((d) => ({ kind: 'customer', ...d })) as Dispute[]

let state: Dispute[] = SEED
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const getSnapshot = () => state

const addDispute = (d: Dispute) => {
  if (state.some((x) => x.id === d.id)) return
  state = [{ stage: 'raised', ...d }, ...state]
  emit()
}

const resolveDispute = (id: string, how: DisputeResolution) => {
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
}

const escalateDispute = (id: string) => {
  state = state.map((d) => (d.id === id ? { ...d, stage: 'escalated', owner: 'Finance Head' } : d))
  emit()
}

const replyToDispute = (id: string, text: string) => {
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
}

// Passthrough — kept so existing <DisputesProvider> wrappers in FinanceShell /
// FinanceEmbeddedPage need no change. State lives in the module singleton above.
export function DisputesProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function useDisputes(): DisputesContextValue {
  const disputes = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return { disputes, addDispute, resolveDispute, escalateDispute, replyToDispute }
}
