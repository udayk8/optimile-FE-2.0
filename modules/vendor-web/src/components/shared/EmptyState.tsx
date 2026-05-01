import { cn } from '@vendor/lib/cn'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center', className)}>
      {icon && <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500">{icon}</div>}
      <h3 className="text-base font-bold text-text">{title}</h3>
      {description && <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
