import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react'
import {
  TRIPS, INVOICES, INVOICE_SERIES, CLIENT_LEDGER,
  ACCESSORIAL_LIBRARY, AR_TOLERANCE_PCT, contractRateFor,
} from '@finance/data/mock'
import type { FinanceMode } from '@finance/modules/finance/nav'
import { logAudit } from '@finance/lib/auditStore'

/* ============================================================
   Shared receivables store — PER-MODE MODULE SINGLETONS.

   Owns the whole BRD 4.1 POD → Invoice pipeline plus the BRD 4.2
   invoice numbering / series engine for the seller modes:
     • aggregator (3PL) and fleet (own-fleet owner) — both bill clients.
   Enterprise is payables-only and is never seeded here.

   The pipeline a trip walks (mirrors BRD 4.1 steps 5–11):
     pending → uploaded → validated → (draft invoice generated)
     draft → submitted → approved | disputed | correction → AR ledger

   Kept as module singletons (not React state), seeded lazily per mode,
   so generated invoices / allocated numbers survive the page remounts
   the embedded host triggers on navigation — exactly as disputesStore.
   The active mode is supplied by <ReceivablesProvider mode=…>.
   ============================================================ */

export type PodStage = 'pending' | 'uploaded' | 'validated' | 'rejected' | 'invoiced'
export type InvoiceStage = 'draft' | 'submitted' | 'approved' | 'disputed' | 'correction'
export type ClientDecision = 'approve' | 'dispute' | 'correction'

export interface Accessorial {
  code: string
  label: string
  rate: number
}

export interface ARTrip {
  id: string
  client: string
  lane: string
  truck: string
  delivered: string
  daysPending: number
  revenue: number
  vendor: string
  driver?: string
  vehicle?: string
  podStage: PodStage
  podRejectReason?: string
}

export interface ARInvoice {
  id: string
  tripId?: string
  client: string
  lane: string
  truck?: string
  date?: string
  due?: string
  terms: string
  base: number                  // contracted base freight (auto-pulled from contract rate)
  accessorials: Accessorial[]   // added at the accessorial step
  contracted: number            // contracted total the client expects
  invoiced: number              // base + accessorials actually billed
  amount: number                // mirror of `invoiced` — Collections reads `.amount`
  variancePct: number           // (invoiced − contracted) / contracted × 100
  flagged: boolean              // variance beyond ±AR_TOLERANCE_PCT
  stage: InvoiceStage
  status?: 'overdue' | 'due-soon' | 'current'   // Collections display once approved
  daysOverdue?: number
  daysUntil?: number
}

export interface LedgerEntry {
  date: string
  type: string
  ref: string
  amt: number
  bal: number
}

export interface SeriesRow {
  series: string   // prefix, e.g. "INV-2026-"
  label: string
  next: number
  fy: string       // e.g. "2026-27"
}

/* ---------- date helpers ---------- */
const today = () => new Date().toISOString().slice(0, 10)
const termsDays = (terms: string): number => {
  const m = /(\d+)/.exec(terms || '')
  return m ? parseInt(m[1], 10) : 30
}
const addDays = (iso: string, days: number): string => {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
const daysBetween = (from: string, to: string): number =>
  Math.round((new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86400000)

/* ---------- invoice maths ---------- */
const recompute = (inv: ARInvoice): ARInvoice => {
  const accTotal = inv.accessorials.reduce((s, a) => s + a.rate, 0)
  const invoiced = inv.base + accTotal
  const variancePct = inv.contracted ? ((invoiced - inv.contracted) / inv.contracted) * 100 : 0
  return { ...inv, invoiced, amount: invoiced, variancePct, flagged: Math.abs(variancePct) > AR_TOLERANCE_PCT }
}

/* ---------- series number rolling (BRD 4.2 FY reset, 1 April) ---------- */
const rollSeries = (s: SeriesRow): SeriesRow => {
  // "INV-2026-" → "INV-2027-", fy "2026-27" → "2027-28"
  const series = s.series.replace(/(\d{4})/, (y) => String(parseInt(y, 10) + 1))
  const fy = s.fy.replace(/^(\d{4})-(\d{2})$/, (_m, a, b) =>
    `${parseInt(a, 10) + 1}-${String((parseInt(b, 10) + 1) % 100).padStart(2, '0')}`,
  )
  return { ...s, series, fy, next: 1 }
}

/* ---------- per-mode seeds ---------- */
const seedTrips = (): ARTrip[] =>
  TRIPS.map((t) => ({ ...t, podStage: 'pending' as PodStage }))

const seedInvoices = (): ARInvoice[] =>
  INVOICES.map((i) => ({
    id: i.id,
    tripId: (i as any).trip,
    client: i.client,
    lane: i.lane,
    date: i.date,
    due: i.due,
    terms: i.terms,
    base: i.amount,
    accessorials: [],
    contracted: i.amount,
    invoiced: i.amount,
    amount: i.amount,
    variancePct: 0,
    flagged: false,
    stage: 'approved' as InvoiceStage,
    status: i.status as ARInvoice['status'],
    daysOverdue: (i as any).daysOverdue,
    daysUntil: (i as any).daysUntil,
  }))

const seedSeries = (): SeriesRow[] => INVOICE_SERIES.map((s) => ({ ...s }))
const seedLedger = (): LedgerEntry[] => CLIENT_LEDGER.map((e) => ({ ...e }))

interface State {
  trips: ARTrip[]
  invoices: ARInvoice[]
  series: SeriesRow[]
  arLedger: LedgerEntry[]
}

interface Store {
  getSnapshot: () => State
  subscribe: (l: () => void) => () => void
  // BRD 4.1 pipeline
  uploadPod: (tripId: string) => void
  validatePod: (tripId: string, ok: boolean, reason?: string) => void
  generateDraftInvoice: (tripId: string) => string | null
  addAccessorial: (invoiceId: string, code: string) => void
  removeAccessorial: (invoiceId: string, index: number) => void
  submitInvoice: (invoiceId: string) => void
  clientDecision: (invoiceId: string, decision: ClientDecision) => void
  // BRD 4.2 series engine
  allocate: (prefix: string) => string
  addSeries: (row: SeriesRow) => void
  updateSeries: (prefix: string, patch: Partial<SeriesRow>) => void
  resetFinancialYear: () => void
}

const stores: Partial<Record<FinanceMode, Store>> = {}

function storeFor(mode: FinanceMode): Store {
  const existing = stores[mode]
  if (existing) return existing

  let state: State = {
    trips: seedTrips(),
    invoices: seedInvoices(),
    series: seedSeries(),
    arLedger: seedLedger(),
  }
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((l) => l())
  const set = (next: Partial<State>) => {
    state = { ...state, ...next }
    emit()
  }

  // Allocate the next number in a series (no gaps, no duplicates).
  const allocate = (prefix: string): string => {
    const idx = state.series.findIndex((s) => s.series.startsWith(prefix))
    if (idx === -1) return `${prefix}0001`
    const row = state.series[idx]
    const id = `${row.series}${String(row.next).padStart(4, '0')}`
    const series = state.series.map((s, i) => (i === idx ? { ...s, next: s.next + 1 } : s))
    set({ series })
    return id
  }

  const store: Store = {
    getSnapshot: () => state,
    subscribe: (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },

    uploadPod: (tripId) =>
      set({ trips: state.trips.map((t) => (t.id === tripId ? { ...t, podStage: 'uploaded' } : t)) }),

    validatePod: (tripId, ok, reason) =>
      set({
        trips: state.trips.map((t) =>
          t.id === tripId
            ? { ...t, podStage: ok ? 'validated' : 'rejected', podRejectReason: ok ? undefined : (reason || 'POD details do not match the trip') }
            : t,
        ),
      }),

    generateDraftInvoice: (tripId) => {
      const trip = state.trips.find((t) => t.id === tripId)
      if (!trip || trip.podStage !== 'validated') return null
      const rate = contractRateFor(trip.lane, trip.truck, trip.client)
      const id = allocate('INV-')
      const inv = recompute({
        id,
        tripId: trip.id,
        client: trip.client,
        lane: trip.lane,
        truck: trip.truck,
        date: today(),
        terms: rate.terms,
        base: rate.base,
        accessorials: [],
        contracted: rate.base,
        invoiced: rate.base,
        amount: rate.base,
        variancePct: 0,
        flagged: false,
        stage: 'draft',
      })
      set({
        invoices: [inv, ...state.invoices],
        trips: state.trips.map((t) => (t.id === tripId ? { ...t, podStage: 'invoiced' } : t)),
      })
      logAudit(mode, { user: 'Priya Nair', action: 'Invoice generated', entity: id, type: 'Invoice', amount: inv.base, from: 'POD validated', to: 'Draft' })
      return id
    },

    addAccessorial: (invoiceId, code) => {
      const charge = ACCESSORIAL_LIBRARY.find((a) => a.code === code)
      if (!charge) return
      set({
        invoices: state.invoices.map((inv) =>
          inv.id === invoiceId ? recompute({ ...inv, accessorials: [...inv.accessorials, { ...charge }] }) : inv,
        ),
      })
    },

    removeAccessorial: (invoiceId, index) =>
      set({
        invoices: state.invoices.map((inv) =>
          inv.id === invoiceId ? recompute({ ...inv, accessorials: inv.accessorials.filter((_, i) => i !== index) }) : inv,
        ),
      }),

    submitInvoice: (invoiceId) => {
      set({ invoices: state.invoices.map((inv) => (inv.id === invoiceId ? recompute({ ...inv, stage: 'submitted' }) : inv)) })
      const inv = state.invoices.find((i) => i.id === invoiceId)
      logAudit(mode, { user: 'Priya Nair', action: 'Invoice submitted', entity: invoiceId, type: 'Invoice', amount: inv?.invoiced, from: 'Draft', to: 'Submitted' })
    },

    clientDecision: (invoiceId, decision) => {
      const inv = state.invoices.find((i) => i.id === invoiceId)
      if (!inv) return
      if (decision === 'dispute') {
        set({ invoices: state.invoices.map((i) => (i.id === invoiceId ? { ...i, stage: 'disputed' } : i)) })
        logAudit(mode, { user: 'Priya Nair', action: 'Invoice disputed', entity: invoiceId, type: 'Invoice', amount: inv.invoiced, from: 'Submitted', to: 'Disputed' })
        return
      }
      if (decision === 'correction') {
        set({ invoices: state.invoices.map((i) => (i.id === invoiceId ? { ...i, stage: 'correction' } : i)) })
        logAudit(mode, { user: 'Priya Nair', action: 'Correction requested', entity: invoiceId, type: 'Invoice', amount: inv.invoiced, from: 'Submitted', to: 'Correction' })
        return
      }
      // approve → compute due date from terms, post to AR ledger (BRD step 11)
      const date = inv.date || today()
      const due = addDays(date, termsDays(inv.terms))
      const delta = daysBetween(today(), due)
      const status: ARInvoice['status'] = delta < 0 ? 'overdue' : delta <= 7 ? 'due-soon' : 'current'
      const approved: ARInvoice = {
        ...inv,
        stage: 'approved',
        due,
        status,
        daysOverdue: delta < 0 ? -delta : undefined,
        daysUntil: delta >= 0 ? delta : undefined,
      }
      const prevBal = state.arLedger.length ? state.arLedger[state.arLedger.length - 1].bal : 0
      const ledgerEntry: LedgerEntry = { date, type: 'Invoice', ref: inv.id, amt: inv.invoiced, bal: prevBal + inv.invoiced }
      set({
        invoices: state.invoices.map((i) => (i.id === invoiceId ? approved : i)),
        arLedger: [...state.arLedger, ledgerEntry],
      })
      logAudit(mode, { user: 'Priya Nair', action: 'Invoice approved', entity: inv.id, type: 'Invoice', amount: inv.invoiced, from: 'Submitted', to: 'Approved' })
    },

    allocate,

    addSeries: (row) => {
      if (state.series.some((s) => s.series === row.series)) return
      set({ series: [...state.series, row] })
    },

    updateSeries: (prefix, patch) =>
      set({ series: state.series.map((s) => (s.series === prefix ? { ...s, ...patch } : s)) }),

    resetFinancialYear: () => set({ series: state.series.map(rollSeries) }),
  }

  stores[mode] = store
  return store
}

const ReceivablesModeContext = createContext<FinanceMode>('aggregator')

export function ReceivablesProvider({ mode, children }: { mode?: FinanceMode; children: ReactNode }) {
  return <ReceivablesModeContext.Provider value={mode ?? 'aggregator'}>{children}</ReceivablesModeContext.Provider>
}

export function useReceivables() {
  const mode = useContext(ReceivablesModeContext)
  const store = storeFor(mode)
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  return {
    ...state,
    uploadPod: store.uploadPod,
    validatePod: store.validatePod,
    generateDraftInvoice: store.generateDraftInvoice,
    addAccessorial: store.addAccessorial,
    removeAccessorial: store.removeAccessorial,
    submitInvoice: store.submitInvoice,
    clientDecision: store.clientDecision,
    allocate: store.allocate,
    addSeries: store.addSeries,
    updateSeries: store.updateSeries,
    resetFinancialYear: store.resetFinancialYear,
  }
}
