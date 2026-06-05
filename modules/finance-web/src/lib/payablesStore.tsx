import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react'
import {
  VENDOR_BILLS, SUBVENDOR_ROWS, RETENTION, VENDOR_LEDGER, INVOICE_SERIES, AP_TOLERANCE_PCT,
} from '@finance/data/mock'
import type { FinanceMode } from '@finance/modules/finance/nav'
import { logAudit } from '@finance/lib/auditStore'

/* ============================================================
   Shared payables (AP) store — PER-MODE MODULE SINGLETONS.

   Owns the BRD 5 Accounts-Payable flow:
     5.1 Vendor invoice processing — computed 3-way match, configurable
         tolerance, auto vs manual approval, payment scheduling, batch runs.
     5.2 Sub-vendor / vehicle-number accounting — vendor-wise when an invoice
         exists, vehicle-number-wise fallback when it does not.
     5.3 Retention & withholding — release on performance, or forfeit → debit note.

   Same shape as receivablesStore / disputesStore: a lazily-seeded singleton
   per finance mode, exposed via useSyncExternalStore, so approvals / scheduled
   payments / ledger rows survive the page remounts the embedded host triggers.
   The active mode is supplied by <PayablesProvider mode=…>.
   ============================================================ */

export type BillStage = 'pending' | 'scheduled' | 'paid' | 'disputed'
export type MatchStatus = 'matched' | 'variance' | 'no-pod'
export type PaymentStatus = 'scheduled' | 'paid'

export interface VendorBill {
  id: string
  vendorId?: string
  vendor: string
  trip: string
  lane: string
  contractRate: number
  billed: number
  pod: boolean
  terms: string
  due: string
  variance?: number
  category?: string
  commodity?: string
  stage: BillStage
}

export interface SubvendorRow {
  mode: 'invoice' | 'vehicle'
  ref: string
  party: string
  trip: string
  lane: string
  agreed: number
  payable: number
  status: string
  stage: 'open' | 'paid'
}

export interface RetentionRow {
  vendor: string
  earned: number
  retained: number
  released: number
  forfeited: number
  condition: string
  otd: number
  debitNote?: string
}

export interface Payment {
  id: string
  billId: string
  vendor: string
  amount: number
  dueDate: string
  status: PaymentStatus
  batchId?: string
}

export interface LedgerEntry {
  date: string
  type: string
  ref: string
  amt: number
  bal: number
  client?: string   // AR rows carry their client; AP/vendor rows omit it
  id?: string        // ledger row id → "Reference" column (led-001)
  particular?: string // bold label → "Particular" column
  desc?: string      // narrative → "Description" column
}

/* ---------- pure helpers ---------- */
const today = () => new Date().toISOString().slice(0, 10)

/** BRD 5.1 3-way match: contract rate vs POD vs billed amount, within tolerance. */
export function computeMatch(
  bill: Pick<VendorBill, 'contractRate' | 'billed' | 'pod'>,
  tolerancePct: number,
): { variancePct: number; status: MatchStatus; autoEligible: boolean } {
  const variancePct = bill.contractRate ? ((bill.billed - bill.contractRate) / bill.contractRate) * 100 : 0
  if (!bill.pod) return { variancePct, status: 'no-pod', autoEligible: false }
  const within = Math.abs(variancePct) <= tolerancePct
  return { variancePct, status: within ? 'matched' : 'variance', autoEligible: within }
}

/* ---------- per-mode seeds ---------- */
const seedBills = (): VendorBill[] => VENDOR_BILLS.map((b) => ({ ...b, stage: 'pending' as BillStage }))
const seedSubvendor = (): SubvendorRow[] =>
  SUBVENDOR_ROWS.map((r) => ({ ...r, mode: r.mode as 'invoice' | 'vehicle', stage: 'open' as const }))
const seedRetention = (): RetentionRow[] => RETENTION.map((r) => ({ ...r }))
const seedLedger = (): LedgerEntry[] => VENDOR_LEDGER.map((e) => ({ ...e }))
const seedDnNext = (): number => INVOICE_SERIES.find((s) => s.series.startsWith('DN-'))?.next ?? 1

interface State {
  bills: VendorBill[]
  subvendorRows: SubvendorRow[]
  retention: RetentionRow[]
  payments: Payment[]
  apLedger: LedgerEntry[]
  tolerancePct: number
  dnNext: number
  paySeq: number
  batchSeq: number
}

interface Store {
  getSnapshot: () => State
  subscribe: (l: () => void) => () => void
  setTolerance: (pct: number) => void
  approveBill: (billId: string) => void
  autoApproveMatched: () => number
  disputeBill: (billId: string) => void
  processBatch: (paymentIds: string[]) => string | null
  recordSubvendorPayment: (ref: string) => void
  releaseRetention: (vendor: string) => void
  forfeitRetention: (vendor: string) => void
}

const stores: Partial<Record<FinanceMode, Store>> = {}

function storeFor(mode: FinanceMode): Store {
  const existing = stores[mode]
  if (existing) return existing

  let state: State = {
    bills: seedBills(),
    subvendorRows: seedSubvendor(),
    retention: seedRetention(),
    payments: [],
    apLedger: seedLedger(),
    tolerancePct: AP_TOLERANCE_PCT,
    dnNext: seedDnNext(),
    paySeq: 9001,
    batchSeq: 501,
  }
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((l) => l())
  const set = (next: Partial<State>) => {
    state = { ...state, ...next }
    emit()
  }

  const lastBal = () => (state.apLedger.length ? state.apLedger[state.apLedger.length - 1].bal : 0)
  const post = (type: string, ref: string, amt: number): LedgerEntry =>
    ({ date: today(), type, ref, amt, bal: lastBal() + amt })

  // Approve a single bill → schedule a payment + post to the AP ledger. POD-gated.
  const approveOne = (bill: VendorBill): { bills: VendorBill[]; payments: Payment[]; apLedger: LedgerEntry[]; paySeq: number } | null => {
    if (!bill.pod || bill.stage !== 'pending') return null
    const payId = `PAY-${state.paySeq}`
    const payment: Payment = { id: payId, billId: bill.id, vendor: bill.vendor, amount: bill.billed, dueDate: bill.due, status: 'scheduled' }
    return {
      bills: state.bills.map((b) => (b.id === bill.id ? { ...b, stage: 'scheduled' } : b)),
      payments: [...state.payments, payment],
      apLedger: [...state.apLedger, post('Bill approved', bill.id, bill.billed)],
      paySeq: state.paySeq + 1,
    }
  }

  const store: Store = {
    getSnapshot: () => state,
    subscribe: (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },

    setTolerance: (pct) => set({ tolerancePct: Math.max(0, pct) }),

    approveBill: (billId) => {
      const bill = state.bills.find((b) => b.id === billId)
      if (!bill) return
      const next = approveOne(bill)
      if (next) {
        set(next)
        logAudit(mode, { user: 'Priya Nair', action: 'Bill approved', entity: bill.id, type: 'Payable', amount: bill.billed, from: 'Pending', to: 'Scheduled' })
      }
    },

    autoApproveMatched: () => {
      let count = 0
      state.bills
        .filter((b) => b.stage === 'pending' && computeMatch(b, state.tolerancePct).autoEligible)
        .forEach((b) => {
          const next = approveOne({ ...b })
          if (next) {
            state = { ...state, ...next }
            logAudit(mode, { user: 'System (auto)', action: 'Bill auto-approved', entity: b.id, type: 'Payable', amount: b.billed, from: 'Pending', to: 'Scheduled' })
            count += 1
          }
        })
      if (count) emit()
      return count
    },

    disputeBill: (billId) => {
      const bill = state.bills.find((b) => b.id === billId)
      set({ bills: state.bills.map((b) => (b.id === billId ? { ...b, stage: 'disputed' } : b)) })
      logAudit(mode, { user: 'Priya Nair', action: 'Vendor bill disputed', entity: billId, type: 'Payable', amount: bill?.billed, from: 'Pending', to: 'Disputed' })
    },

    processBatch: (paymentIds) => {
      const ids = new Set(paymentIds)
      const targets = state.payments.filter((p) => ids.has(p.id) && p.status === 'scheduled')
      if (targets.length === 0) return null
      const batchId = `BATCH-${state.batchSeq}`
      const paidBillIds = new Set(targets.map((t) => t.billId))
      let ledger = state.apLedger
      targets.forEach((t) => {
        ledger = [...ledger, { date: today(), type: 'Payment', ref: t.billId, amt: -t.amount, bal: (ledger.length ? ledger[ledger.length - 1].bal : 0) - t.amount }]
      })
      const total = targets.reduce((s, t) => s + t.amount, 0)
      set({
        payments: state.payments.map((p) => (ids.has(p.id) && p.status === 'scheduled' ? { ...p, status: 'paid', batchId } : p)),
        bills: state.bills.map((b) => (paidBillIds.has(b.id) ? { ...b, stage: 'paid' } : b)),
        apLedger: ledger,
        batchSeq: state.batchSeq + 1,
      })
      logAudit(mode, { user: 'Priya Nair', action: 'Payment processed', entity: batchId, type: 'Payment', amount: total, from: 'Scheduled', to: 'Paid' })
      return batchId
    },

    recordSubvendorPayment: (ref) => {
      const row = state.subvendorRows.find((r) => r.ref === ref)
      if (!row || row.stage === 'paid') return
      const type = row.mode === 'vehicle' ? 'Payment (vehicle-wise)' : 'Payment (vendor-wise)'
      set({
        subvendorRows: state.subvendorRows.map((r) => (r.ref === ref ? { ...r, stage: 'paid' } : r)),
        apLedger: [...state.apLedger, post(type, row.ref, -row.payable)],
      })
      logAudit(mode, { user: 'Priya Nair', action: type, entity: row.ref, type: 'Payment', amount: row.payable, from: 'Open', to: 'Paid' })
    },

    releaseRetention: (vendor) => {
      const row = state.retention.find((r) => r.vendor === vendor)
      if (!row || row.retained <= 0) return
      const amount = row.retained
      set({
        retention: state.retention.map((r) => (r.vendor === vendor ? { ...r, released: r.released + amount, retained: 0 } : r)),
        apLedger: [...state.apLedger, post('Retention released', vendor, -amount)],
      })
      logAudit(mode, { user: 'Priya Nair', action: 'Retention released', entity: vendor, type: 'Retention', amount, from: 'Retained', to: 'Released' })
    },

    forfeitRetention: (vendor) => {
      const row = state.retention.find((r) => r.vendor === vendor)
      if (!row || row.retained <= 0) return
      const amount = row.retained
      const dnId = `DN-2026-${String(state.dnNext).padStart(4, '0')}`
      set({
        retention: state.retention.map((r) => (r.vendor === vendor ? { ...r, forfeited: r.forfeited + amount, retained: 0, debitNote: dnId } : r)),
        apLedger: [...state.apLedger, post('Debit note (retention forfeited)', dnId, -amount)],
        dnNext: state.dnNext + 1,
      })
      logAudit(mode, { user: 'Finance Head', action: 'Debit note issued (forfeiture)', entity: dnId, type: 'Debit Note', amount, from: 'Retained', to: 'Forfeited' })
    },
  }

  stores[mode] = store
  return store
}

const PayablesModeContext = createContext<FinanceMode>('aggregator')

export function PayablesProvider({ mode, children }: { mode?: FinanceMode; children: ReactNode }) {
  return <PayablesModeContext.Provider value={mode ?? 'aggregator'}>{children}</PayablesModeContext.Provider>
}

export function usePayables() {
  const mode = useContext(PayablesModeContext)
  const store = storeFor(mode)
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  return {
    ...state,
    setTolerance: store.setTolerance,
    approveBill: store.approveBill,
    autoApproveMatched: store.autoApproveMatched,
    disputeBill: store.disputeBill,
    processBatch: store.processBatch,
    recordSubvendorPayment: store.recordSubvendorPayment,
    releaseRetention: store.releaseRetention,
    forfeitRetention: store.forfeitRetention,
  }
}
