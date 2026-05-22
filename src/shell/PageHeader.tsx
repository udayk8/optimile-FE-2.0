import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
  eyebrow?: string
  actions?: ReactNode
  children?: ReactNode
}

/**
 * Standard page header for module pages. Use at the top of any page rendered
 * inside the unified shell to keep titles and action bars consistent.
 */
export function PageHeader({ title, subtitle, eyebrow, actions, children }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary/80">
            {eyebrow}
          </p>
        )}
        <h1 className="truncate text-2xl font-extrabold text-foreground sm:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
