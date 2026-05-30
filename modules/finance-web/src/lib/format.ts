/* ============================================================
   Formatting helpers + shared colour tokens
   ============================================================ */

export const fmtINR = (n: number | null | undefined): string => {
  if (n == null) return '—'
  const s = Math.abs(n).toLocaleString('en-IN')
  return (n < 0 ? '-₹' : '₹') + s
}

// Compact lakh formatting: 510000 -> "₹5.10L"
export const fmtL = (n: number): string => '₹' + (n / 100000).toFixed(2) + 'L'

// Percentage helper
export const pct = (num: number, den: number): number => (den ? (num / den) * 100 : 0)

export const C = {
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#0ea5e9',
  violet: '#8b5cf6',
  slate: '#64748b',
  ink: '#0f172a',
  paper: '#f8fafc',
} as const
