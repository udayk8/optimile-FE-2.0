import { cn } from '@auction/lib/cn'

interface HeroCardProps {
  eyebrow?: string
  title: string
  subtitle?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

/**
 * HeroCard — Page-level header card used at the top of every module page.
 * 
 * Per Constitution Rule 5:
 * - White background, rounded 16-20px, light border
 * - Orange uppercase eyebrow label
 * - Main title + subtitle
 * - Optional left icon block + right action
 */
export function HeroCard({ eyebrow, title, subtitle, icon, action, className }: HeroCardProps) {
  return (
    <div className={cn(
      'bg-white rounded-hero border border-[#E5E7EB] p-6 mb-6',
      className
    )}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {icon && (
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#EFF6FF] shrink-0">
              {icon}
            </div>
          )}
          <div>
            {eyebrow && (
              <span className="eyebrow">{eyebrow}</span>
            )}
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight mt-0.5">{title}</h1>
            {subtitle && (
              <p className="text-sm text-[#64748B] mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  )
}
