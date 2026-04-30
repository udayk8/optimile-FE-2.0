import * as React from 'react'
import { cn } from './utils/cn'

export interface FieldProps {
  label: string
  children: React.ReactNode
  description?: string
  error?: string
  className?: string
}

export function Field({ label, children, description, error, className }: FieldProps) {
  return (
    <div className={cn(className)}>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</label>
      {children}
      {description && <p className="mt-2 text-xs text-gray-600">{description}</p>}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  )
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60',
      className
    )}
    {...props}
  />
))
Select.displayName = 'Select'
