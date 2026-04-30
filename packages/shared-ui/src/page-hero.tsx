import * as React from 'react'
import { cn } from './utils/cn'

export interface PageHeroProps {
  eyebrow?: string
  title: string
  subtitle?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function PageHero({ eyebrow, title, subtitle, icon, action, className }: PageHeroProps) {
  return (
    <section className={cn('rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:p-7', className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          {icon && <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>}
          <div>
            {eyebrow && <p className="text-sm font-bold uppercase tracking-wide text-accent">{eyebrow}</p>}
            <h1 className="mt-1 text-2xl font-extrabold text-text">{title}</h1>
            {subtitle && <p className="mt-2 max-w-4xl text-sm text-gray-600">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
      </div>
    </section>
  )
}
