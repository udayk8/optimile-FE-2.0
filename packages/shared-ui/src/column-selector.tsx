import * as React from 'react'
import { Columns3 } from 'lucide-react'
import { cn } from './utils/cn'

// ── Hook ────────────────────────────────────────────────────────────────────
export function useColumnVisibility(storageKey: string, toggleable: string[]) {
  const [hidden, setHidden] = React.useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`col-vis:${storageKey}`)
      if (saved) {
        const parsed: string[] = JSON.parse(saved)
        return new Set(parsed.filter((k) => toggleable.includes(k)))
      }
    } catch {}
    return new Set<string>()
  })

  const onChange = React.useCallback((next: Set<string>) => {
    setHidden(next)
    try { localStorage.setItem(`col-vis:${storageKey}`, JSON.stringify([...next])) } catch {}
  }, [storageKey])

  const visible = React.useCallback((key: string) => !hidden.has(key), [hidden])

  return { hidden, onChange, visible }
}

// ── Component ────────────────────────────────────────────────────────────────
export interface ColumnOption {
  key: string
  label: string
}

interface ColumnSelectorProps {
  columns: ColumnOption[]
  hidden: Set<string>
  onChange: (hidden: Set<string>) => void
  className?: string
}

export function ColumnSelector({ columns, hidden, onChange, className }: ColumnSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (key: string) => {
    const next = new Set(hidden)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onChange(next)
  }

  const visibleCount = columns.length - hidden.size

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50',
          open && 'border-gray-300 bg-gray-50'
        )}
      >
        <Columns3 className="h-4 w-4" />
        <span>Columns</span>
        {hidden.size > 0 && (
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
            {visibleCount}/{columns.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 pb-1.5 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Columns</span>
            {hidden.size > 0 && (
              <button
                type="button"
                onClick={() => onChange(new Set())}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                Show all
              </button>
            )}
          </div>
          {columns.map((col) => {
            const checked = !hidden.has(col.key)
            return (
              <label
                key={col.key}
                className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(col.key)}
                  className="h-3.5 w-3.5 rounded accent-primary"
                />
                {col.label}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
