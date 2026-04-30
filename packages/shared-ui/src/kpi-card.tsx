import * as React from 'react'
import { cn } from './utils/cn'

export interface KpiCardProps {
  title: string
  value: string | number
  unit?: string
  insight?: string
  icon?: React.ReactNode
  onClick?: () => void
  className?: string
  children?: React.ReactNode
}

export function KpiCard({ title, value, unit, insight, icon, onClick, className, children }: KpiCardProps) {
  return (
    <section
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-5 shadow-sm',
        onClick && 'cursor-pointer transition hover:shadow-card-hover',
        className
      )}
      onClick={onClick}
    >
      <div className="mb-3 flex items-start justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{title}</p>
        {icon && <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>}
      </div>
      <div className="flex items-end gap-1.5">
        <p className="text-3xl font-extrabold leading-none text-text">{value}</p>
        {unit && <span className="mb-0.5 text-sm text-gray-600">{unit}</span>}
      </div>
      {insight && <p className="mt-2 text-xs leading-relaxed text-gray-500">{insight}</p>}
      {children && <div className="mt-3">{children}</div>}
    </section>
  )
}
