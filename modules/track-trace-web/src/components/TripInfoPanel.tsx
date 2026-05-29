import { Card } from '@shared-ui'
import type { TrackingTrip } from '../types/tracking.types'

const items = [
  ['Trip ID', 'id'],
  ['Booking ID', 'bookingId'],
  ['Customer', 'customerName'],
  ['Vehicle Number', 'vehicleNumber'],
  ['Driver Name', 'driverName'],
  ['Driver Mobile', 'driverMobile'],
  ['Origin', 'origin'],
  ['Destination', 'destination'],
  ['Current Status', 'status'],
  ['Last Location Update', 'lastLocationLabel'],
] as const

export function TripInfoPanel({ trip }: { trip: TrackingTrip }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Trip Summary</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {items.map(([label, key]) => (
          <div key={key}>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>
            <p className="mt-1 text-sm font-semibold text-text">{String(trip[key])}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
