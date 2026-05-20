import * as React from 'react'
import { cn } from './utils/cn'

export type DataTableColumn<T> = {
  key: string
  header: string
  align?: 'left' | 'right' | 'center'
  className?: string
  render: (row: T) => React.ReactNode
}

export interface DataTableProps<T> {
  rows: T[]
  columns: DataTableColumn<T>[]
  getRowKey: (row: T) => string
  onRowClick?: (row: T) => void
  getRowClassName?: (row: T) => string | undefined
  mobileCardRender?: (row: T) => React.ReactNode
  emptyState?: React.ReactNode
  className?: string
}

export function DataTable<T>({
  rows,
  columns,
  getRowKey,
  onRowClick,
  getRowClassName,
  mobileCardRender,
  emptyState,
  className,
}: DataTableProps<T>) {
  if (rows.length === 0 && emptyState) return <>{emptyState}</>

  return (
    <div className={cn('overflow-hidden rounded-xl border border-gray-200 bg-white', className)}>
      {mobileCardRender ? (
        <div className="space-y-3 p-4 md:hidden">
          {rows.map((row) => (
            <React.Fragment key={getRowKey(row)}>{mobileCardRender(row)}</React.Fragment>
          ))}
        </div>
      ) : null}
      <div className={cn('overflow-x-auto', mobileCardRender && 'hidden md:block')}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500',
                    column.align === 'right' && 'text-right',
                    column.align === 'center' && 'text-center',
                    column.className
                  )}
                  scope="col"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {rows.map((row) => (
              <tr
                key={getRowKey(row)}
                className={cn(onRowClick && 'cursor-pointer hover:bg-gray-50', getRowClassName?.(row))}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 py-4 text-sm text-gray-700',
                      column.align === 'right' && 'text-right',
                      column.align === 'center' && 'text-center',
                      column.className
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
