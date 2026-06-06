import { Badge } from '@shared-ui/badge'
import { Button } from '@shared-ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@shared-ui/card'
import { AlertTriangle, CheckCircle2, ClipboardCheck, ClipboardList, Clock3, ShieldCheck, Truck } from 'lucide-react'
import type { useCustomerBookings } from '../hooks/useCustomerBookings'
import { CONSIGNEE_ANALYTICS, FINANCE_TILES, STATUS_META, otdClass, statusCount } from '../shared/customer-types'
import type { Booking } from '../shared/customer-types'

type Props = {
  bookings: Booking[]
  activeExceptions: Booking[]
  activeBookings: Booking[]
  kpiCounts: ReturnType<typeof useCustomerBookings>['kpiCounts']
  onViewExceptions: () => void
  onSelectBooking: (id: string) => void
}

export function OverviewSection({ bookings, activeExceptions, activeBookings, kpiCounts, onViewExceptions, onSelectBooking }: Props) {
  const kpis = [
    { label: 'Total Trips', value: kpiCounts.total, detail: 'Date range: last 30 days', icon: ClipboardList, tone: 'text-primary' },
    { label: 'Active Trips', value: kpiCounts.active, detail: '1 delayed, 1 exception', icon: Truck, tone: 'text-success' },
    { label: 'Pending POD', value: kpiCounts.pendingPod, detail: 'Awaiting delivery proof', icon: ClipboardCheck, tone: 'text-warning' },
    { label: 'Completed', value: kpiCounts.completed, detail: '1 on-time delivery', icon: CheckCircle2, tone: 'text-success' },
    { label: 'Delayed', value: kpiCounts.delayed, detail: '+1 vs yesterday', icon: Clock3, tone: 'text-danger' },
    { label: 'Cancelled', value: kpiCounts.cancelled, detail: '0.0% cancellation rate', icon: AlertTriangle, tone: 'text-danger' },
    { label: 'SLA Score', value: '88%', detail: '+4% vs prior period', icon: ShieldCheck, tone: 'text-primary' },
  ]

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{kpi.label}</p>
                <Icon className={`h-4 w-4 ${kpi.tone}`} />
              </div>
              <p className="mt-3 text-2xl font-extrabold text-text">{kpi.value}</p>
              <p className="mt-1 text-xs text-gray-500">{kpi.detail}</p>
            </div>
          )
        })}
      </section>

      <section className="rounded-lg border border-danger/20 bg-danger/5 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-danger" />
            <div>
              <p className="font-extrabold text-text">{activeExceptions.length} active customer-visible exceptions</p>
              <p className="mt-1 text-sm text-gray-600">
                {statusCount(bookings, ['IN_TRANSIT_DELAYED'])} delayed shipment and {statusCount(bookings, ['IN_TRANSIT_EXCEPTION'])} operational exception require attention.
              </p>
            </div>
          </div>
          <Button variant="destructive" onClick={onViewExceptions}>
            View Exceptions
          </Button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Trip Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex h-7 overflow-hidden rounded-lg bg-gray-100">
                {[
                  { label: 'Completed', value: 18, color: 'bg-success' },
                  { label: 'Active', value: 42, color: 'bg-primary' },
                  { label: 'Pending POD', value: 11, color: 'bg-warning' },
                  { label: 'Unfulfilled', value: 7, color: 'bg-secondary' },
                  { label: 'Cancelled', value: 2, color: 'bg-danger' },
                ].map((item) => (
                  <div key={item.label} className={item.color} style={{ width: `${item.value}%` }} title={`${item.label}: ${item.value}`} />
                ))}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-5">
                {['Completed', 'Active', 'Pending POD', 'Unfulfilled', 'Cancelled'].map((label) => (
                  <div key={label} className="text-xs font-semibold text-gray-500">{label}</div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold text-text">7-day booking creation trend</p>
                <Badge variant="success">+12% week over week</Badge>
              </div>
              <div className="grid h-40 grid-cols-7 items-end gap-3">
                {[38, 62, 45, 72, 52, 88, 66].map((height, index) => (
                  <div key={index} className="flex h-full flex-col justify-end gap-2">
                    <div className="rounded-t-lg bg-primary/80" style={{ height: `${height}%` }} />
                    <p className="text-center text-xs font-semibold text-gray-500">D{index + 1}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live Shipments Feed</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[410px] space-y-3 overflow-y-auto">
            {activeBookings.map((booking) => (
              <button
                key={booking.id}
                type="button"
                onClick={() => onSelectBooking(booking.id)}
                className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-primary/30 hover:bg-primary/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-extrabold text-text">{booking.id}</p>
                    <p className="truncate text-sm text-gray-500">{booking.origin} to {booking.destination}</p>
                  </div>
                  <Badge variant={STATUS_META[booking.status].badge}>{STATUS_META[booking.status].label}</Badge>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-3">
                  <span>{booking.vehicle}</span>
                  <span>ETA: {booking.eta}</span>
                  <span>{booking.lastUpdate}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${booking.progress}%` }} />
                </div>
                {booking.exceptionNote && <p className="mt-2 text-xs font-semibold text-danger">{booking.exceptionNote}</p>}
              </button>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Consignee Analytics</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="border-b border-gray-200 py-3">Consignee</th>
                  <th className="border-b border-gray-200 py-3">Trips</th>
                  <th className="border-b border-gray-200 py-3">OTD</th>
                </tr>
              </thead>
              <tbody>
                {CONSIGNEE_ANALYTICS.map((item) => (
                  <tr key={item.name}>
                    <td className="border-b border-gray-100 py-3 font-semibold text-text">{item.name}</td>
                    <td className="border-b border-gray-100 py-3 text-gray-600">{item.trips}</td>
                    <td className={`border-b border-gray-100 py-3 font-extrabold ${otdClass(item.otd)}`}>{item.otd}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Finance Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {FINANCE_TILES.map((tile) => (
              <div key={tile.label} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{tile.label}</p>
                <p className="mt-2 text-2xl font-extrabold text-text">{tile.value}</p>
                <p className="mt-1 text-xs text-gray-500">{tile.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </>
  )
}
