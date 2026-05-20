import { Link } from 'react-router-dom'
import { Button, DataTable } from '@shared-ui'
import type { TrackingTrip } from '../types/tracking.types'
import { TrackingStatusBadge } from './TrackingStatusBadge'

function formatRelativeAge(timestamp: string) {
  const diffMs = new Date(timestamp).getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / 60000)
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, 'minute')
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, 'hour')
  }

  const diffDays = Math.round(diffHours / 24)
  return formatter.format(diffDays, 'day')
}

function delayTone(trip: TrackingTrip) {
  if (trip.delayMinutes >= 120 || trip.isOffline || trip.routeDeviationKm >= 10) return 'bg-danger/10 text-danger'
  if (trip.delayMinutes > 0 || trip.routeDeviationKm > 0) return 'bg-warning/10 text-warning'
  return 'bg-success/10 text-success'
}

export function ActiveTripsTable({
  trips,
  showMobileCards = false,
  previewMode = false,
  tripBasePath,
  selectedTripId,
  onSelectTrip,
}: {
  trips: TrackingTrip[]
  /** Show card layout on mobile (< md). Does NOT slice rows. */
  showMobileCards?: boolean
  /** Limit to 5 rows — for dashboard preview only. */
  previewMode?: boolean
  tripBasePath: string
  selectedTripId?: string
  onSelectTrip?: (tripId: string) => void
}) {
  const rows = previewMode ? trips.slice(0, 5) : trips

  if (showMobileCards) {
    return (
      <div>
        <div className="space-y-3 p-4 md:hidden">
          {rows.map((row) => (
            <div
              key={row.id}
              className={`rounded-2xl border p-4 transition ${
                row.id === selectedTripId ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-extrabold text-text">{row.id}</p>
                  <p className="mt-1 text-xs font-semibold text-gray-500">{row.bookingId}</p>
                  <p className="mt-2 text-sm text-gray-600">{row.customerName}</p>
                </div>
                <TrackingStatusBadge
                  status={row.status}
                  description={`${row.sourceHealth ?? 'Healthy'} source`}
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-gray-50 px-3 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Vehicle / Driver</p>
                  <p className="mt-1 text-sm font-semibold text-text">{row.vehicleNumber}</p>
                  <p className="text-xs text-gray-500">{row.driverName}</p>
                </div>
                <div className="rounded-xl bg-gray-50 px-3 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">ETA</p>
                  <p className="mt-1 text-sm font-semibold text-text">{new Date(row.currentEta ?? row.eta).toLocaleString('en-IN')}</p>
                  <p className="text-xs text-gray-500">{formatRelativeAge(row.lastUpdatedAt)}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className={`rounded-full px-2.5 py-1 ${delayTone(row)}`}>
                  {row.delayMinutes > 0 ? `${row.delayMinutes} min delay` : 'On time'}
                </span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">
                  {row.routeDeviationKm > 0 ? `${row.routeDeviationKm} km off route` : 'On route'}
                </span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">
                  {row.etaConfidence ?? 'Medium'} confidence
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {onSelectTrip ? (
                  <Button
                    className="w-full sm:w-auto"
                    size="sm"
                    variant={row.id === selectedTripId ? 'default' : 'outline'}
                    onClick={() => onSelectTrip(row.id)}
                  >
                    {row.id === selectedTripId ? 'Inspecting trip' : 'Inspect trip'}
                  </Button>
                ) : null}
                <Button asChild className="w-full sm:w-auto" size="sm" variant="outline">
                  <Link to={`${tripBasePath}/${row.id}`}>Open trip detail</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block">
          <DataTable
            className="rounded-none border-0"
            rows={rows}
            getRowKey={(row) => row.id}
            onRowClick={onSelectTrip ? (row) => onSelectTrip(row.id) : undefined}
            getRowClassName={(row) =>
              row.id === selectedTripId ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : undefined
            }
            columns={[
              {
                key: 'tripId',
                header: 'Trip ID',
                render: (row) => (
                  <div className="space-y-1">
                    <p className="font-extrabold text-text">{row.id}</p>
                    <p className="text-xs font-semibold text-gray-500">{row.bookingId}</p>
                    <p className="text-xs text-gray-500">{row.lastLocationLabel}</p>
                  </div>
                ),
              },
              {
                key: 'vehicleNumber',
                header: 'Vehicle / Driver',
                render: (row) => (
                  <div className="space-y-1">
                    <p className="font-semibold text-text">{row.vehicleNumber}</p>
                    <p className="text-xs text-gray-500">{row.vehicleType}</p>
                    <p className="text-sm text-gray-700">{row.driverName}</p>
                  </div>
                ),
              },
              {
                key: 'lane',
                header: 'Route / Customer',
                render: (row) => (
                  <div className="space-y-1">
                    <p className="font-semibold text-text">{row.customerName}</p>
                    <p className="text-sm text-gray-700">{row.origin}</p>
                    <p className="text-xs text-gray-500">{row.destination}</p>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Current Status',
                render: (row) => (
                  <TrackingStatusBadge
                    status={row.status}
                    description={`${row.sourceHealth ?? 'Healthy'} source · ${row.activeSource ?? 'GPS_DEVICE'}`}
                  />
                ),
              },
              {
                key: 'eta',
                header: 'ETA Risk',
                render: (row) => (
                  <div className="space-y-2">
                    <p className="font-semibold text-text">{new Date(row.currentEta ?? row.eta).toLocaleString('en-IN')}</p>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      <span className={`rounded-full px-2.5 py-1 ${delayTone(row)}`}>
                        {row.delayMinutes > 0 ? `${row.delayMinutes} min delay` : 'On time'}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">{row.etaConfidence ?? 'Medium'} confidence</span>
                      {row.routeDeviationKm > 0 ? (
                        <span className="rounded-full bg-warning/10 px-2.5 py-1 text-warning">{row.routeDeviationKm} km off route</span>
                      ) : null}
                    </div>
                  </div>
                ),
              },
              {
                key: 'lastUpdatedAt',
                header: 'Freshness',
                render: (row) => (
                  <div className="space-y-1">
                    <p className="font-semibold text-text">{formatRelativeAge(row.lastUpdatedAt)}</p>
                    <p className="text-xs text-gray-500">{new Date(row.lastUpdatedAt).toLocaleTimeString('en-IN')}</p>
                  </div>
                ),
              },
              {
                key: 'action',
                header: 'Action',
                render: (row) => (
                  <div className="flex flex-col items-start gap-2">
                    {onSelectTrip ? (
                      <Button
                        size="sm"
                        variant={row.id === selectedTripId ? 'default' : 'outline'}
                        onClick={(event) => {
                          event.stopPropagation()
                          onSelectTrip(row.id)
                        }}
                      >
                        {row.id === selectedTripId ? 'Inspecting' : 'Inspect'}
                      </Button>
                    ) : null}
                    <Button asChild size="sm" variant="outline">
                      <Link
                        onClick={(event) => event.stopPropagation()}
                        to={`${tripBasePath}/${row.id}`}
                      >
                        Open trip
                      </Link>
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
    )
  }

  return (
    <DataTable
      className="rounded-none border-0"
      rows={rows}
      getRowKey={(row) => row.id}
      onRowClick={onSelectTrip ? (row) => onSelectTrip(row.id) : undefined}
      getRowClassName={(row) =>
        row.id === selectedTripId ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : undefined
      }
      columns={[
        {
          key: 'tripId',
          header: 'Trip ID',
          render: (row) => (
            <div className="space-y-1">
              <p className="font-extrabold text-text">{row.id}</p>
              <p className="text-xs font-semibold text-gray-500">{row.bookingId}</p>
              <p className="text-xs text-gray-500">{row.lastLocationLabel}</p>
            </div>
          ),
        },
        {
          key: 'vehicleNumber',
          header: 'Vehicle / Driver',
          render: (row) => (
            <div className="space-y-1">
              <p className="font-semibold text-text">{row.vehicleNumber}</p>
              <p className="text-xs text-gray-500">{row.vehicleType}</p>
              <p className="text-sm text-gray-700">{row.driverName}</p>
            </div>
          ),
        },
        {
          key: 'lane',
          header: 'Route / Customer',
          render: (row) => (
            <div className="space-y-1">
              <p className="font-semibold text-text">{row.customerName}</p>
              <p className="text-sm text-gray-700">{row.origin}</p>
              <p className="text-xs text-gray-500">{row.destination}</p>
            </div>
          ),
        },
        {
          key: 'status',
          header: 'Current Status',
          render: (row) => (
            <TrackingStatusBadge
              status={row.status}
              description={`${row.sourceHealth ?? 'Healthy'} source · ${row.activeSource ?? 'GPS_DEVICE'}`}
            />
          ),
        },
        {
          key: 'eta',
          header: 'ETA Risk',
          render: (row) => (
            <div className="space-y-2">
              <p className="font-semibold text-text">{new Date(row.currentEta ?? row.eta).toLocaleString('en-IN')}</p>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className={`rounded-full px-2.5 py-1 ${delayTone(row)}`}>
                  {row.delayMinutes > 0 ? `${row.delayMinutes} min delay` : 'On time'}
                </span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">{row.etaConfidence ?? 'Medium'} confidence</span>
                {row.routeDeviationKm > 0 ? (
                  <span className="rounded-full bg-warning/10 px-2.5 py-1 text-warning">{row.routeDeviationKm} km off route</span>
                ) : null}
              </div>
            </div>
          ),
        },
        {
          key: 'lastUpdatedAt',
          header: 'Freshness',
          render: (row) => (
            <div className="space-y-1">
              <p className="font-semibold text-text">{formatRelativeAge(row.lastUpdatedAt)}</p>
              <p className="text-xs text-gray-500">{new Date(row.lastUpdatedAt).toLocaleTimeString('en-IN')}</p>
            </div>
          ),
        },
        {
          key: 'action',
          header: 'Action',
          render: (row) => (
            <div className="flex flex-col items-start gap-2">
              {onSelectTrip ? (
                <Button
                  size="sm"
                  variant={row.id === selectedTripId ? 'default' : 'outline'}
                  onClick={(event) => {
                    event.stopPropagation()
                    onSelectTrip(row.id)
                  }}
                >
                  {row.id === selectedTripId ? 'Inspecting' : 'Inspect'}
                </Button>
              ) : null}
              <Button asChild size="sm" variant="outline">
                <Link
                  onClick={(event) => event.stopPropagation()}
                  to={`${tripBasePath}/${row.id}`}
                >
                  Open trip
                </Link>
              </Button>
            </div>
          ),
        },
      ]}
    />
  )
}
