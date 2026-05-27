import { Button } from '@shared-ui'

export function PaginationStrip({
  page,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions,
  onPrev,
  onNext,
  onPageSizeChange,
  itemLabel = 'items',
}: {
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
  pageSizeOptions?: number[]
  onPrev: () => void
  onNext: () => void
  onPageSizeChange?: (pageSize: number) => void
  itemLabel?: string
}) {
  if (totalItems === 0) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalItems)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-5 py-4">
      <p className="text-sm text-gray-600">
        Showing <span className="font-semibold text-text">{from}–{to}</span> of{' '}
        <span className="font-semibold text-text">{totalItems}</span> {itemLabel}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {pageSizeOptions?.length && onPageSizeChange ? (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span>Rows</span>
            <select
              className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              value={pageSize}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        ) : null}
        <Button disabled={page === 1} onClick={onPrev} size="sm" variant="outline">← Prev</Button>
        <span className="min-w-[4rem] text-center text-sm font-semibold text-gray-600">
          {page} / {totalPages}
        </span>
        <Button disabled={page === totalPages} onClick={onNext} size="sm" variant="outline">Next →</Button>
      </div>
    </div>
  )
}
