import type { ChangeEvent } from 'react'
import { CalendarDays, Search } from 'lucide-react'
import { Input } from '@vendor/components/ui/input'
import { Button } from '@vendor/components/ui/button'

/**
 * Consistent search + date-range filter bar shared by every vendor-web list
 * page. Search box on the left, From/To date + Clear on the right, all on one
 * line. Filters are unapplied by default (empty strings).
 */
export function PageFilterBar({
  search,
  onSearch,
  searchPlaceholder = 'Search…',
  fromDate,
  toDate,
  onFromDate,
  onToDate,
  onClear,
}: {
  search: string
  onSearch: (value: string) => void
  searchPlaceholder?: string
  fromDate: string
  toDate: string
  onFromDate: (value: string) => void
  onToDate: (value: string) => void
  onClear: () => void
}) {
  const hasFilters = Boolean(search || fromDate || toDate)
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={search}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CalendarDays className="h-4 w-4 text-gray-400" />
        <Input type="date" value={fromDate} onChange={(e: ChangeEvent<HTMLInputElement>) => onFromDate(e.target.value)} className="w-[160px]" />
        <Input type="date" value={toDate} onChange={(e: ChangeEvent<HTMLInputElement>) => onToDate(e.target.value)} className="w-[160px]" />
        {hasFilters && (
          <Button variant="outline" size="sm" onClick={onClear}>Clear</Button>
        )}
      </div>
    </div>
  )
}
