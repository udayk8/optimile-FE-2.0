import { cn } from '@admin/utils/cn'

interface KPICardProps {
  title: string
  value: string | number
  unit?: string
  insight?: string
  icon?: React.ReactNode
  onClick?: () => void
  className?: string
  children?: React.ReactNode
}

/**
 * KPICard — Standardized metric card used on dashboards and summary sections.
 * 
 * Per Constitution Rule 9:
 * - Small title (uppercase muted)
 * - Big metric number (32-40px bold)
 * - Unit or supporting label
 * - Optional insight text
 * - Optional colored icon block top-right
 */
export function KPICard({ title, value, unit, insight, icon, onClick, className, children }: KPICardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-card border border-[#E5E7EB] p-5',
        onClick && 'cursor-pointer hover:shadow-card-hover transition-shadow',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">{title}</span>
        {icon && (
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#F8FAFC]">
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-3xl font-bold text-[#0F172A] leading-none">{value}</span>
        {unit && <span className="text-sm text-[#64748B] mb-0.5">{unit}</span>}
      </div>
      {insight && (
        <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">{insight}</p>
      )}
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}
