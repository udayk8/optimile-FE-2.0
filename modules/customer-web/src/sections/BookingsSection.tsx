import { Badge } from '@shared-ui/badge'
import { Button } from '@shared-ui/button'
import { Card, CardContent } from '@shared-ui/card'
import { FileSpreadsheet, Filter, Plus } from 'lucide-react'
import { STATUS_META, statusCount } from '../shared/customer-types'
import type { Booking } from '../shared/customer-types'

type Props = {
  bookings: Booking[]
  filteredBookings: Booking[]
  activeExceptions: Booking[]
  statusTab: string
  setStatusTab: (tab: string) => void
  onNewBooking: () => void
  onSelectBooking: (id: string) => void
}

export function BookingsSection({ bookings, filteredBookings, activeExceptions, statusTab, setStatusTab, onNewBooking, onSelectBooking }: Props) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-text">Bookings</h2>
          <p className="text-sm text-gray-500">Full lifecycle view aligned to BRD customer statuses.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm"><Filter className="h-4 w-4" /> Filters</Button>
          <Button variant="outline" size="sm"><FileSpreadsheet className="h-4 w-4" /> CSV</Button>
          <Button size="sm" onClick={onNewBooking}><Plus className="h-4 w-4" /> New Booking</Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          ['all', 'All Bookings', bookings.length],
          ['active', 'Active', statusCount(bookings, ['DISPATCHED', 'IN_TRANSIT', 'IN_TRANSIT_DELAYED', 'IN_TRANSIT_EXCEPTION'])],
          ['pending', 'Pending', statusCount(bookings, ['DRAFT', 'PENDING_RATE_APPROVAL', 'PENDING_AUCTION', 'PENDING_ASSIGNMENT', 'READY_FOR_DISPATCH'])],
          ['completed', 'Completed', statusCount(bookings, ['DELIVERED'])],
          ['exceptions', 'Exceptions', activeExceptions.length],
          ['cancelled', 'Cancelled', statusCount(bookings, ['CANCELLED'])],
        ].map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusTab(String(key))}
            className={`flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold ${
              statusTab === key ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
            <span className={`rounded-full px-2 py-0.5 text-xs ${statusTab === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>{count}</span>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Booking ID</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Weight</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">ETA</th>
                  <th className="px-4 py-3">Booking Date</th>
                  <th className="px-4 py-3">Created By</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="cursor-pointer border-t border-gray-100 hover:bg-primary/5"
                    onClick={() => onSelectBooking(booking.id)}
                  >
                    <td className="px-4 py-4">
                      <p className="font-extrabold text-primary">{booking.id}</p>
                      <p className="text-xs text-gray-500">{booking.salesOrder}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-text">{booking.origin} to {booking.destination}</p>
                      <p className="text-xs text-gray-500">{booking.consignee}</p>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{booking.vehicle}</td>
                    <td className="px-4 py-4 text-gray-600">{booking.weight} MTS</td>
                    <td className="px-4 py-4"><Badge variant={STATUS_META[booking.status].badge}>{STATUS_META[booking.status].label}</Badge></td>
                    <td className={`px-4 py-4 font-semibold ${booking.status === 'IN_TRANSIT_DELAYED' ? 'text-danger' : 'text-gray-600'}`}>{booking.eta}</td>
                    <td className="px-4 py-4 text-gray-600">{booking.bookingDate}</td>
                    <td className="px-4 py-4 text-gray-600">{booking.createdBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
