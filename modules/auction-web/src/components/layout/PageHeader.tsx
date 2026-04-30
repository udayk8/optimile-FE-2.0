import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@admin/utils/cn'

interface Breadcrumb {
  label: string
  path?: string
}

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: Breadcrumb[]
  action?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, breadcrumbs, action, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-6 space-y-3', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-500">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="h-3 w-3 text-gray-300" />}
              {crumb.path ? (
                <Link to={crumb.path} className="text-primary transition-colors hover:text-secondary">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-text">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-accent">Optimile Auction</p>
          <h1 className="mt-1 text-2xl font-extrabold text-text">{title}</h1>
          {description && <p className="mt-2 max-w-4xl text-sm text-gray-600">{description}</p>}
        </div>
        {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
      </div>
      </section>
    </div>
  )
}
