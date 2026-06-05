import { useMemo, useState } from 'react'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Button } from '@vendor/components/ui/button'
import { useAppStore } from '@vendor/stores/app.store'
import { ExceptionRecord, ExceptionStatus } from '@vendor/types'
import { AlertTriangle, ArrowRight, ChevronLeft, ChevronRight, Search } from 'lucide-react'

import { useModuleNavigate as useNavigate, ModuleLink as Link } from '@vendor/hooks/useModuleRoute'
import { formatDateTime } from '@vendor/lib/date-utils'

const PAGE_SIZE = 6

const STATE_FILTERS: Array<'ALL' | ExceptionStatus> = ['ALL', 'OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
const STATUS_ORDER: Record<ExceptionStatus, number> = {
  OPEN: 0,
  ACKNOWLEDGED: 1,
  IN_PROGRESS: 2,
  RESOLVED: 3,
  CLOSED: 4,
}
const SEVERITY_ORDER: Record<ExceptionRecord['severity'], number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
}

const statusLabel = (value: ExceptionStatus) => value.replace('_', ' ')

export default function SupportHubPage() {
  const navigate = useNavigate()
  const exceptions = useAppStore((state) => state.exceptions)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | ExceptionStatus>('ALL')
  const [page, setPage] = useState(1)

  const filteredExceptions = useMemo(() => {
    const query = search.trim().toLowerCase()
    return [...exceptions]
      .filter((item) => {
        const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter
        const matchesSearch = query
          ? [item.id, item.bookingId, item.route, item.issueType, item.vehicle, item.driver].some((value) =>
              value.toLowerCase().includes(query),
            )
          : true
        return matchesStatus && matchesSearch
      })
      .sort((a, b) => {
        const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
        if (severityDiff !== 0) return severityDiff
        const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
        if (statusDiff !== 0) return statusDiff
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
  }, [exceptions, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredExceptions.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filteredExceptions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const openCount = exceptions.filter((item) => item.status === 'OPEN').length
  const activeCount = exceptions.filter((item) => item.status === 'ACKNOWLEDGED' || item.status === 'IN_PROGRESS').length
  const resolvedCount = exceptions.filter((item) => item.status === 'RESOLVED' || item.status === 'CLOSED').length
  const breachedCount = exceptions.filter((item) => item.severity === 'CRITICAL' && item.status !== 'CLOSED').length

  return (
    <div className="space-y-6">
      <HeroCard
        eyebrow="SUPPORT"
        title="Exceptions"
        subtitle="Raise booking-linked incidents, sort by severity, and drive them through the lifecycle"
        icon={<AlertTriangle className="h-6 w-6 text-primary" />}
      />

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Open', value: openCount, note: 'Newly reported or waiting to be handled.' },
          { label: 'Active', value: activeCount, note: 'Acknowledged or in progress cases.' },
          { label: 'Resolved', value: resolvedCount, note: 'Completed exceptions kept for history.' },
          { label: 'Critical', value: breachedCount, note: 'Top severity items surface first automatically.' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-gray-500">{item.label}</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-text">{item.value}</div>
            <div className="mt-2 text-sm text-gray-500">{item.note}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text">Exception Workspace</h3>
            <p className="mt-1 text-sm text-gray-500">Create, track, and resolve booking-linked incidents from one table.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Search exception, booking, route, driver"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:bg-white sm:w-[300px]"
              />
            </div>
            <Button variant="outline" onClick={() => navigate('/vendor/report-exception')}>
              Report Exception
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-6 py-4">
          <div className="flex w-fit gap-1 rounded-lg bg-gray-100 p-1">
            {STATE_FILTERS.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setStatusFilter(item)
                  setPage(1)
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${
                  statusFilter === item ? 'bg-white text-text shadow-sm' : 'text-gray-600 hover:text-primary'
                }`}
              >
                {item === 'ALL' ? 'All' : statusLabel(item)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-left">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                <th className="px-5 py-3 font-bold">Exception</th>
                <th className="px-5 py-3 font-bold">Booking</th>
                <th className="px-5 py-3 font-bold">Route</th>
                <th className="px-5 py-3 font-bold">Issue type</th>
                <th className="px-5 py-3 font-bold">Severity</th>
                <th className="px-5 py-3 font-bold">Status</th>
                <th className="px-5 py-3 font-bold">SLA</th>
                <th className="px-5 py-3 font-bold">Created</th>
                <th className="px-5 py-3 font-bold">Last Update</th>
                <th className="px-5 py-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="font-mono text-sm font-semibold text-text">{item.id}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-400">{item.driver}</div>
                  </td>
                  <td className="px-5 py-4 text-sm text-text">{item.bookingId}</td>
                  <td className="px-5 py-4 text-sm text-text">{item.route}</td>
                  <td className="px-5 py-4 text-sm text-text">{item.issueType}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-text">{item.severity}</td>
                  <td className="px-5 py-4 text-sm text-text">{statusLabel(item.status)}</td>
                  <td className="px-5 py-4 text-sm text-text">{new Date(item.slaDueAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className="px-5 py-4 text-sm text-text">{new Date(item.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-5 py-4 text-sm text-text">{formatDateTime(item.timeline[item.timeline.length - 1]?.timestamp ?? item.updatedAt ?? item.createdAt)}</td>
                  <td className="px-5 py-4 text-right">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/support/exception/${item.id}`)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
          <span>
            Showing {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filteredExceptions.length)} of {filteredExceptions.length}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <span className="rounded-lg bg-gray-50 px-3 py-2 font-semibold text-text">
              Page {safePage} of {totalPages}
            </span>
            <Button variant="outline" disabled={safePage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
