import type { ReactNode } from 'react'

export function EmptyPlaceholder({
  title,
  description,
  compact = false,
  action,
}: {
  title: string
  description: string
  compact?: boolean
  action?: ReactNode
}) {
  return (
    <div
      className={`rounded-xl border border-dashed border-gray-200 bg-white ${
        compact ? 'px-5 py-8 text-left' : 'px-6 py-10 text-center'
      }`}
    >
      <h3 className="text-lg font-bold text-text">{title}</h3>
      <p className={`mt-2 text-sm leading-6 text-gray-500 ${compact ? 'max-w-none' : 'mx-auto max-w-2xl'}`}>
        {description}
      </p>
      {action && (
        <div className={`mt-5 ${compact ? '' : 'flex justify-center'}`}>
          {action}
        </div>
      )}
    </div>
  )
}
