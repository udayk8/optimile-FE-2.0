import * as React from 'react'
import { cn } from './utils/cn'

export interface InfoGridProps extends React.HTMLAttributes<HTMLDListElement> {}

export function InfoGrid({ className, ...props }: InfoGridProps) {
  return <dl className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-4', className)} {...props} />
}

export interface InfoItemProps {
  label: string
  children: React.ReactNode
  className?: string
}

export function InfoItem({ label, children, className }: InfoItemProps) {
  return (
    <div className={cn(className)}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-text">{children}</dd>
    </div>
  )
}
