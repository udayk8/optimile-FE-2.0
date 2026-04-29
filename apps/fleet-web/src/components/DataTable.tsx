import { ReactNode, useMemo, useState } from 'react';
import { EmptyState } from './EmptyState';

export interface DataTableColumn<T> {
  align?: 'left' | 'center' | 'right';
  header: string;
  key: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => number | string;
}

interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  emptyMessage?: string;
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  rows: T[];
}

const alignClasses = {
  center: 'text-center',
  left: 'text-left',
  right: 'text-right',
};

type SortDirection = 'asc' | 'desc';

export function DataTable<T>({ columns, emptyMessage = 'No records found.', getRowKey, onRowClick, pageSize, rows }: DataTableProps<T>) {
  const [sort, setSort] = useState<{ direction: SortDirection; key: string } | null>(null);
  const [page, setPage] = useState(1);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((item) => item.key === sort.key);
    if (!column?.sortValue) return rows;
    return [...rows].sort((a, b) => {
      const first = column.sortValue?.(a) ?? '';
      const second = column.sortValue?.(b) ?? '';
      const comparison = typeof first === 'number' && typeof second === 'number'
        ? first - second
        : String(first).localeCompare(String(second));
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [columns, rows, sort]);

  const totalPages = pageSize ? Math.max(1, Math.ceil(sortedRows.length / pageSize)) : 1;
  const safePage = Math.min(page, totalPages);
  const visibleRows = pageSize ? sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize) : sortedRows;

  if (rows.length === 0) {
    return <EmptyState description={emptyMessage} title="Nothing to show" />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => {
                const canSort = column.sortable && column.sortValue;
                const active = sort?.key === column.key;
                return (
                  <th
                    className={`px-4 py-3 ${alignClasses[column.align ?? 'left']} text-xs font-bold uppercase tracking-wide text-gray-500`}
                    key={column.key}
                  >
                    {canSort ? (
                      <button
                        className="inline-flex items-center gap-1 font-bold uppercase tracking-wide hover:text-primary"
                        onClick={() => {
                          setPage(1);
                          setSort((current) => current?.key === column.key
                            ? { key: column.key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
                            : { key: column.key, direction: 'asc' });
                        }}
                        type="button"
                      >
                        {column.header}
                        <span className="text-[10px]">{active ? (sort.direction === 'asc' ? 'ASC' : 'DESC') : 'SORT'}</span>
                      </button>
                    ) : column.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {visibleRows.map((row) => (
              <tr
                className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : 'hover:bg-gray-50'}
                key={getRowKey(row)}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td className={`px-4 py-4 ${alignClasses[column.align ?? 'left']} text-sm text-gray-700`} key={column.key}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageSize && totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm">
          <span className="font-semibold text-gray-600">Page {safePage} of {totalPages}</span>
          <div className="flex gap-2">
            <button className="rounded-lg border border-gray-300 bg-white px-3 py-1 font-semibold text-gray-700 disabled:opacity-50" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">Previous</button>
            <button className="rounded-lg border border-gray-300 bg-white px-3 py-1 font-semibold text-gray-700 disabled:opacity-50" disabled={safePage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} type="button">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
