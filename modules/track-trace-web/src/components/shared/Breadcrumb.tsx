import { Link } from 'react-router-dom'

export function Breadcrumb({
  items,
}: {
  items: Array<{ label: string; to?: string }>
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1.5">
          {index > 0 && <span className="text-gray-300" aria-hidden="true">/</span>}
          {item.to ? (
            <Link className="transition-colors hover:text-text" to={item.to}>
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-text" aria-current="page">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
