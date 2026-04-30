import * as React from 'react'
import { cn } from './utils/cn'

export interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  search?: React.ReactNode
  actions?: React.ReactNode
}

export function FilterBar({ search, actions, className, children, ...props }: FilterBarProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)} {...props}>
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {search}
        {children}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
