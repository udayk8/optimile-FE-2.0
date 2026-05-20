import { useEffect, useRef, useState } from 'react'
import { ChevronDown, RotateCcw } from 'lucide-react'

export interface DriverMultiSelectOption {
  id: string
  name: string
  mobile: string
}

interface DriverMultiSelectProps {
  drivers: DriverMultiSelectOption[]
  selectedIds: string[]
  onToggle: (id: string) => void
  placeholder?: string
  disabled?: boolean
  emptyMessage?: string
  summaryOverride?: string
  onReset?: () => void
  resetLabel?: string
  resetDisabled?: boolean
}

export function DriverMultiSelect({
  drivers,
  selectedIds,
  onToggle,
  placeholder = 'Select drivers',
  disabled = false,
  emptyMessage = 'No drivers available.',
  summaryOverride,
  onReset,
  resetLabel = 'Keep current drivers',
  resetDisabled = false,
}: DriverMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  const selectedDrivers = drivers.filter((d) => selectedIds.includes(d.id))
  const defaultLabel =
    selectedDrivers.length === 0
      ? placeholder
      : selectedDrivers.length <= 2
      ? selectedDrivers.map((d) => d.name).join(', ')
      : `${selectedDrivers.length} drivers selected`
  const buttonLabel = summaryOverride ?? defaultLabel
  const showPlaceholderStyle = !summaryOverride && selectedDrivers.length === 0

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 text-left text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60"
      >
        <span className={`truncate ${showPlaceholderStyle ? 'text-gray-400' : 'text-text'}`}>
          {buttonLabel}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !disabled && (
        <div className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-md border border-gray-200 bg-white p-2 shadow-lg">
          {onReset && (
            <>
              <button
                type="button"
                onClick={() => { onReset(); setOpen(false) }}
                disabled={resetDisabled}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm font-semibold text-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {resetLabel}
              </button>
              <div className="my-1 border-t border-gray-100" />
            </>
          )}
          {drivers.length === 0 ? (
            <p className="px-2 py-1 text-sm text-gray-500">{emptyMessage}</p>
          ) : (
            drivers.map((d) => (
              <label
                key={d.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={selectedIds.includes(d.id)}
                  onChange={() => onToggle(d.id)}
                />
                <span className="font-medium text-text">{d.name}</span>
                <span className="text-gray-500">· {d.mobile}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  )
}
