import React, { useEffect, type ReactNode } from 'react'
import { CheckCircle2, X, type LucideIcon } from 'lucide-react'
import { fmtINR } from '@finance/lib/format'

/* ============================================================
   SHARED UI PRIMITIVES — used across every page
   ============================================================ */

export function Money({ value, className = '' }: { value: number | null | undefined; className?: string }) {
  return <span className={`font-mono tabular-nums ${className}`}>{fmtINR(value)}</span>
}

type PillTone = 'green' | 'amber' | 'red' | 'slate' | 'blue' | 'violet'
const PILL_MAP: Record<PillTone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
}
export function Pill({ tone = 'slate', children }: { tone?: PillTone; children?: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${PILL_MAP[tone]}`}>
      {children}
    </span>
  )
}

export function Card({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-white ring-1 ring-slate-200/80 shadow-sm ${className}`}>{children}</div>
}

export function SectionTitle({ children, sub }: { children?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>{children}</h1>
      {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
    </div>
  )
}

export const Row = ({ k, v, mono }: { k: ReactNode; v: ReactNode; mono?: boolean }) => (
  <div className="flex items-center justify-between">
    <span className="text-slate-500">{k}</span>
    <span className={`text-slate-800 ${mono ? 'font-mono' : ''}`}>{v}</span>
  </div>
)

export function Toast({ msg, onClose }: { msg: ReactNode; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t) }, [])
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-[slideIn_.3s_ease]">
      <div className="flex items-center gap-3 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl ring-1 ring-white/10">
        <CheckCircle2 size={18} className="text-emerald-400" />
        {msg}
      </div>
    </div>
  )
}

type Tone = 'red' | 'amber' | 'green' | 'blue' | 'slate'

/* Small KPI / stat tile */
export function StatCard({
  label, value, sub, tone = 'slate', icon: Icon, raw,
}: {
  label?: ReactNode
  value: any
  sub?: ReactNode
  tone?: Tone
  icon?: LucideIcon
  raw?: boolean
}) {
  const ring = { red: 'ring-red-200', amber: 'ring-amber-200', green: 'ring-emerald-200', blue: 'ring-blue-200', slate: 'ring-slate-200' }[tone]
  const bg = { red: 'bg-red-50 text-red-600', amber: 'bg-amber-50 text-amber-600', green: 'bg-emerald-50 text-emerald-600', blue: 'bg-blue-50 text-blue-600', slate: 'bg-slate-100 text-slate-500' }[tone]
  return (
    <Card className={`p-5 ring-1 ${ring} animate-[fadeUp_.5s_ease] [animation-fill-mode:both]`}>
      <div className="flex items-start justify-between">
        {Icon && <div className={`grid h-10 w-10 place-items-center rounded-lg ${bg}`}><Icon size={20} /></div>}
      </div>
      <div className="mt-4 text-2xl font-bold text-slate-900">
        {raw ? <span className="font-mono">{value}</span> : <Money value={value} />}
      </div>
      <div className="mt-1 text-xs font-medium text-slate-500">{label}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </Card>
  )
}

/* Generic centered modal */
export function Modal({ children, onClose, maxW = 'max-w-lg' }: { children?: ReactNode; onClose: () => void; maxW?: string }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm animate-[fadeIn_.2s]" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full ${maxW}`}>
        <Card className="overflow-hidden animate-[pop_.3s_ease]">{children}</Card>
      </div>
    </div>
  )
}
type MhTone = 'emerald' | 'blue' | 'amber' | 'red' | 'slate'
const MH_TONE: Record<MhTone, string> = {
  emerald: 'bg-emerald-50 text-emerald-700',
  blue: 'bg-blue-50 text-blue-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  slate: 'bg-slate-50 text-slate-700',
}
export const ModalHeader = ({ title, tone = 'emerald', icon: Icon, onClose }: { title: ReactNode; tone?: MhTone; icon?: LucideIcon; onClose: () => void }) => {
  const [bg, text] = MH_TONE[tone].split(' ')
  return (
    <div className={`flex items-center justify-between border-b border-slate-200 px-6 py-4 ${bg}`}>
      <div className={`flex items-center gap-2 ${text}`}>
        {Icon && <Icon size={18} />}<span className="font-semibold">{title}</span>
      </div>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
    </div>
  )
}

/* Table helpers — cut header boilerplate */
export const Table = ({ children }: { children?: ReactNode }) => (
  <Card className="overflow-hidden"><table className="w-full text-sm">{children}</table></Card>
)
export const THead = ({ cols }: { cols: any[] }) => (
  <thead>
    <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
      {cols.map((c, i) => <th key={i} className={`px-5 py-3 font-semibold ${c?.right ? 'text-right' : ''}`}>{c?.label ?? c}</th>)}
    </tr>
  </thead>
)
export const TR = ({ children, className = '' }: { children?: ReactNode; className?: string }) => (
  <tr className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/50 ${className}`}>{children}</tr>
)
export const TD = ({ children, className = '' }: { children?: ReactNode; className?: string }) => <td className={`px-5 py-3.5 ${className}`}>{children}</td>

/* Empty state row */
export const EmptyRow = ({ cols, children }: { cols: number; children?: ReactNode }) => (
  <tr><td colSpan={cols} className="px-5 py-12 text-center text-slate-400">{children}</td></tr>
)

/* ============================================================
   LEDGER STATEMENT — shared statement-style ledger table
   Columns: Date · Particular · Reference · Type · Description · Debit · Credit · Balance
   Receivable (AR) balances read "Dr", payable (AP) balances read "Cr".
   ============================================================ */

export interface LedgerRow {
  date: string
  type: string
  ref: string
  amt: number
  bal: number
  id?: string
  particular?: string
  desc?: string
}

export type LedgerKind = 'AR' | 'AP'

/** Running-balance formatter: "₹1,00,000 Dr" / "₹96,000 Cr" / "₹0". */
export function formatLedgerBalance(bal: number, kind: LedgerKind): string {
  if (bal === 0) return '₹0'
  const suffix = kind === 'AR' ? (bal >= 0 ? 'Dr' : 'Cr') : (bal >= 0 ? 'Cr' : 'Dr')
  return `₹${Math.abs(bal).toLocaleString('en-IN')} ${suffix}`
}

export function LedgerStatementTable({
  rows, kind, emptyLabel = 'No ledger entries yet.',
}: {
  rows: LedgerRow[]
  kind: LedgerKind
  emptyLabel?: ReactNode
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
            {['Date', 'Particular', 'Reference', 'Type', 'Description'].map((h) => (
              <th key={h} className="px-5 py-3 font-semibold">{h}</th>
            ))}
            {['Debit', 'Credit', 'Balance'].map((h) => (
              <th key={h} className="px-5 py-3 text-right font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            // Signed amount → debit/credit columns. AR: +ve is a debit; AP: +ve is a credit.
            const debit = kind === 'AR' ? Math.max(0, r.amt) : Math.max(0, -r.amt)
            const credit = kind === 'AR' ? Math.max(0, -r.amt) : Math.max(0, r.amt)
            return (
              <tr key={r.id ?? i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{r.date}</td>
                <td className="px-5 py-3.5 font-semibold text-slate-800">{r.particular ?? r.type}</td>
                <td className="px-5 py-3.5 font-mono text-xs text-slate-400">{r.id ?? r.ref}</td>
                <td className="px-5 py-3.5 font-medium text-slate-600">{r.ref}</td>
                <td className="px-5 py-3.5 text-slate-500">{r.desc ?? r.type}</td>
                <td className="px-5 py-3.5 text-right font-medium text-rose-600">{debit > 0 ? `₹${debit.toLocaleString('en-IN')}` : '—'}</td>
                <td className="px-5 py-3.5 text-right font-medium text-emerald-600">{credit > 0 ? `₹${credit.toLocaleString('en-IN')}` : '—'}</td>
                <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-900">{formatLedgerBalance(r.bal, kind)}</td>
              </tr>
            )
          })}
          {rows.length === 0 && (
            <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">{emptyLabel}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/* Horizontal stepper for approval workflows */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center">
      {steps.map((s, i) => {
        const done = i < current
        const active = i === current
        return (
          <React.Fragment key={s}>
            <div className="flex items-center gap-2">
              <div className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold ${done ? 'bg-emerald-500 text-white' : active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                {done ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className={`text-xs ${active ? 'font-semibold text-slate-800' : done ? 'text-slate-500' : 'text-slate-400'}`}>{s}</span>
            </div>
            {i < steps.length - 1 && <div className={`mx-3 h-px flex-1 ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
          </React.Fragment>
        )
      })}
    </div>
  )
}

/* Primary / secondary buttons */
export const Btn = ({ children, onClick, disabled, variant = 'primary', className = '' }: {
  children?: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'ghost' | 'danger'
  className?: string
}) => {
  const styles = {
    primary: 'bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50',
    ghost: 'border border-slate-200 text-slate-600 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }[variant]
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${styles} ${className}`}>
      {children}
    </button>
  )
}
