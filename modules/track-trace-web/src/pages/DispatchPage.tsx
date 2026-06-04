import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Search, Send, X } from 'lucide-react';
import { Trip, TripStatus, Vehicle, Driver } from '../types/fleet.types';
import { TripAPI, VehicleAPI, DriverAPI } from '../services/mockDatabase';
import { IconEdit, IconArrowRight } from '../components/Icons';
import { TripDetailsPage } from './TripDetailsPage';
import { useTrackingStore } from '../store/trackingStore';
import { useTrackTraceRouting } from '../hooks/useTrackTraceRouting';

function sourceTag(label: string, active: boolean, color: string) {
  return active ? (
    <span key={label} className={`rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide ${color}`}>{label}</span>
  ) : null
}

export const DispatchPage: React.FC = () => {
  // Navigation State
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const { activeTrips, alerts, geofences } = useTrackingStore();
  const { scopedPath } = useTrackTraceRouting();

  // Data State
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') ?? '');
  // activeFilter: TripStatus string | 'delayed' | 'offline' | ''
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;


  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tData, vData, dData] = await Promise.all([
        TripAPI.getAll(),
        VehicleAPI.getAll(),
        DriverAPI.getAll()
      ]);
      setTrips(tData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setVehicles(vData);
      setDrivers(dData);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { setPage(1) }, [searchTerm, activeFilter])

  const getName = (id: string | null, list: any[], key: string) => {
    if (!id) return '-';
    return list.find(i => i[key === 'vehicle' ? 'vehicle_id' : 'driver_id'] === id)?.[key === 'vehicle' ? 'registration_number' : 'name'] || 'Unknown';
  };

  const getStatusBadge = (status: TripStatus) => {
    switch(status) {
      case TripStatus.PLANNED:
      case TripStatus.DISPATCHED: return 'bg-primary/10 text-primary';
      case TripStatus.IN_TRANSIT: return 'bg-blue-100 text-blue-700';
      case TripStatus.COMPLETED:  return 'bg-emerald-100 text-emerald-700';
      case TripStatus.CANCELLED:  return 'bg-red-100 text-red-600';
      default:                    return 'bg-gray-100 text-gray-500';
    }
  };

  const getStatusLabel = (status: TripStatus) => {
    if (status === TripStatus.PLANNED || status === TripStatus.DISPATCHED) return 'Booked';
    return status;
  };

  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      const term = searchTerm.toLowerCase()
      const vehicleName = getName(t.vehicle_id, vehicles, 'vehicle').toLowerCase()
      const matchesSearch = t.booking_reference.toLowerCase().includes(term) ||
                            t.origin.toLowerCase().includes(term) ||
                            t.destination.toLowerCase().includes(term) ||
                            vehicleName.includes(term)

      let matchesFilter = true
      if (activeFilter === 'booked') {
        matchesFilter = t.status === TripStatus.PLANNED || t.status === TripStatus.DISPATCHED
      } else if (activeFilter === 'delayed') {
        const at = activeTrips.find(at => at.id === t.trip_id)
        matchesFilter = !!at && at.delayMinutes > 0
      } else if (activeFilter === 'offline') {
        const at = activeTrips.find(at => at.id === t.trip_id)
        matchesFilter = !!at && at.isOffline
      } else if (activeFilter) {
        matchesFilter = t.status === activeFilter
      }

      return matchesSearch && matchesFilter
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips, vehicles, searchTerm, activeFilter, activeTrips])

  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / PAGE_SIZE))
  const pagedTrips = filteredTrips.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const stats = useMemo(() => {
    const booked = trips.filter(t => t.status === TripStatus.PLANNED || t.status === TripStatus.DISPATCHED).length
    const enRoute = trips.filter(t => t.status === TripStatus.IN_TRANSIT).length
    const delayed = activeTrips.filter(t => t.delayMinutes > 0 && !['Completed', 'Cancelled'].includes(t.status)).length
    const offline = activeTrips.filter(t => t.isOffline).length
    const openAlerts = alerts.filter(a => a.status !== 'Resolved').length
    return { booked, enRoute, delayed, offline, openAlerts }
  }, [trips, activeTrips, alerts])

  const alertsByTripId = useMemo(() => {
    const severityOrder = ['Critical', 'High', 'Medium', 'Low']
    const map: Record<string, { count: number; worst: string }> = {}
    alerts.forEach((a) => {
      if (a.status === 'Resolved') return
      const existing = map[a.tripId]
      if (!existing) {
        map[a.tripId] = { count: 1, worst: a.severity }
      } else {
        existing.count += 1
        if (severityOrder.indexOf(a.severity) < severityOrder.indexOf(existing.worst)) {
          existing.worst = a.severity
        }
      }
    })
    return map
  }, [alerts])

  // DP1: geofence zone count per trip for badge in Trip ID cell
  const geofencesByTripId = useMemo(() => {
    const map: Record<string, { count: number }> = {}
    geofences.forEach((g) => {
      if (g.linkedEntityType !== 'TRIP') return
      const existing = map[g.linkedEntityId]
      if (!existing) map[g.linkedEntityId] = { count: 1 }
      else existing.count += 1
    })
    return map
  }, [geofences])

  if (selectedTripId) {
      return <TripDetailsPage tripId={selectedTripId} onBack={() => setSelectedTripId(null)} />;
  }

  return (
    <div className="min-w-0">

      {/* ── Status strip ───────────────────────────────────────── */}
      <div className="mb-6 flex items-stretch overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Total Active */}
        <div className="flex min-w-0 flex-1 flex-col justify-center px-6 py-4">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-500">Total Active</p>
          <p className="mt-1 text-3xl font-extrabold text-gray-900">{trips.length}</p>
        </div>

        {([
          {
            label: 'Booked',
            value: stats.booked,
            dot: 'bg-primary',
            numColor: 'text-gray-900',
            bg: '',
            filter: 'booked',
          },
          {
            label: 'In Transit',
            value: stats.enRoute,
            dot: 'bg-blue-600',
            numColor: 'text-blue-700',
            bg: '',
            filter: TripStatus.IN_TRANSIT,
          },
          {
            label: 'Delayed',
            value: stats.delayed,
            dot: 'bg-amber-400',
            numColor: stats.delayed > 0 ? 'text-amber-600' : 'text-gray-900',
            bg: stats.delayed > 0 ? 'bg-amber-50' : '',
            filter: 'delayed',
          },
          {
            label: 'Offline',
            value: stats.offline,
            dot: 'bg-red-500',
            numColor: stats.offline > 0 ? 'text-red-600' : 'text-gray-900',
            bg: stats.offline > 0 ? 'bg-red-50' : '',
            filter: 'offline',
          },
        ] as const).map(({ label, value, dot, numColor, bg, filter }) => {
          const isActive = activeFilter === filter
          return (
            <button
              key={label}
              type="button"
              onClick={() => setActiveFilter(isActive ? '' : filter)}
              className={[
                'flex min-w-0 flex-1 flex-col justify-center border-l border-gray-200 px-5 py-4 text-left transition cursor-pointer',
                bg,
                isActive ? 'ring-2 ring-inset ring-primary/30' : 'hover:brightness-95',
              ].filter(Boolean).join(' ')}
            >
              <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-gray-500">
                <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                {label}
                {isActive && <span className="ml-auto text-[10px] font-bold text-primary">× clear</span>}
              </p>
              <p className={`mt-1 text-3xl font-extrabold ${numColor}`}>{value}</p>
            </button>
          )
        })}
      </div>

      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <label className="relative min-w-[280px] flex-1" htmlFor="dispatch-search">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              id="dispatch-search"
              type="text"
              className="h-12 w-full rounded-2xl border border-gray-300 bg-white pl-12 pr-10 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Search by trip ID, vehicle, origin or destination…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
                <div className="ml-auto h-4 w-16 animate-pulse rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No trips found.</div>
        ) : (
          <table className="w-full table-fixed divide-y divide-gray-200">
            <colgroup>
              <col className="w-[130px]" />
              <col className="w-[150px]" />
              <col className="w-[180px]" />
              <col className="w-[110px]" />
              <col className="w-[150px]" />
              <col className="w-[120px]" />
              <col className="w-[100px]" />
              <col className="w-[110px]" />
            </colgroup>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Trip ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Route</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Schedule</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ETA / Delay</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Tracking</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {pagedTrips.map((trip) => {
                const trackingTrip = activeTrips.find((t) => t.id === trip.trip_id)
                const isOffline = trackingTrip?.isOffline ?? false
                const hasGps  = trackingTrip?.primarySource === 'GPS_DEVICE' || trackingTrip?.activeSource === 'GPS_DEVICE'
                const hasSim  = trackingTrip?.primarySource === 'FASTAG'     || trackingTrip?.activeSource === 'FASTAG'
                const hasApp  = trackingTrip?.primarySource === 'DRIVER_APP' || trackingTrip?.activeSource === 'DRIVER_APP'
                const hasAny  = hasGps || hasSim || hasApp
                return (
                <tr key={trip.trip_id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedTripId(trip.trip_id)}>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-text">{trip.booking_reference}</span>
                    {/* Alert badge */}
                    {(() => {
                      const tripAlerts = alertsByTripId[trip.trip_id]
                      if (!tripAlerts) return null
                      const colors: Record<string, string> = {
                        Critical: 'bg-red-100 text-red-700',
                        High:     'bg-orange-100 text-orange-700',
                        Medium:   'bg-amber-100 text-amber-700',
                        Low:      'bg-blue-100 text-blue-700',
                      }
                      return (
                        <Link
                          to={scopedPath(`/alerts?tripId=${trip.trip_id}`)}
                          onClick={(e) => e.stopPropagation()}
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold transition hover:opacity-80 ${colors[tripAlerts.worst]}`}
                        >
                          {tripAlerts.count} alert{tripAlerts.count > 1 ? 's' : ''} · {tripAlerts.worst}
                        </Link>
                      )
                    })()}
                    {/* DP1: geofence zone badge */}
                    {(() => {
                      const zones = geofencesByTripId[trip.trip_id]
                      if (!zones) return null
                      return (
                        <Link
                          to={scopedPath('/geofences') + '?search=' + encodeURIComponent(trip.trip_id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 transition hover:opacity-80"
                        >
                          📍 {zones.count} zone{zones.count > 1 ? 's' : ''}
                        </Link>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {(() => {
                      // Booking-derived trips have no fleet vehicle/driver record —
                      // fall back to the tracking trip's labels.
                      const vehicleName = getName(trip.vehicle_id, vehicles, 'vehicle')
                      const driverName = getName(trip.driver_id, drivers, 'driver')
                      return (
                        <>
                          <div className="truncate">{vehicleName !== '-' ? vehicleName : trackingTrip?.vehicleNumber ?? '-'}</div>
                          <div className="truncate text-xs text-gray-400">{driverName !== '-' ? driverName : trackingTrip?.driverName ?? '-'}</div>
                        </>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="truncate text-sm text-gray-900">{trip.origin}</div>
                    <div className="flex items-center truncate text-xs text-gray-500">
                      <IconArrowRight className="mr-1 h-3 w-3 shrink-0" />
                      <span className="truncate">{trip.destination}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(trip.scheduled_start_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    {trackingTrip ? (() => {
                      const total = trackingTrip.distanceCoveredKm + trackingTrip.remainingDistanceKm
                      const progress = total > 0 ? Math.round((trackingTrip.distanceCoveredKm / total) * 100) : 0
                      const delayed = trackingTrip.delayMinutes > 0
                      const offline = trackingTrip.isOffline
                      return (
                        <div>
                          {offline ? (
                            <span className="text-xs font-semibold text-gray-500">Offline</span>
                          ) : delayed ? (
                            <span className="text-xs font-bold text-red-600">+{trackingTrip.delayMinutes} min</span>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-600">On time</span>
                          )}
                          <div className="mt-1 h-1 w-full rounded-full bg-gray-100">
                            <div
                              className={`h-1 rounded-full ${delayed ? 'bg-red-400' : 'bg-emerald-500'}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="mt-0.5 text-[10px] text-gray-400">{progress}% · {trackingTrip.remainingDistanceKm} km left</p>
                        </div>
                      )
                    })() : (
                      <span className="text-xs text-gray-400">
                        {[TripStatus.PLANNED, TripStatus.COMPLETED, TripStatus.CANCELLED].includes(trip.status) ? '—' : 'No tracking'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {!hasAny ? (
                        <span className="rounded px-1.5 py-0.5 text-xs font-bold uppercase bg-gray-100 text-gray-500">Manual</span>
                      ) : (
                        <>
                          {hasGps && sourceTag('GPS', !isOffline, 'bg-emerald-100 text-emerald-700')}
                          {hasSim  && sourceTag('SIM', !isOffline, 'bg-blue-100 text-blue-700')}
                          {hasApp  && sourceTag('App', !isOffline, 'bg-violet-100 text-violet-700')}
                        </>
                      )}
                      {isOffline && <span className="rounded px-1.5 py-0.5 text-xs font-bold uppercase bg-red-100 text-red-600">Offline</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${getStatusBadge(trip.status)}`}>{getStatusLabel(trip.status)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1">
                        {trip.status === TripStatus.PLANNED && (
                          <button type="button" disabled title="Dispatch" className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg bg-gray-100 text-gray-300">
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {(trip.status === TripStatus.PLANNED || trip.status === TripStatus.DISPATCHED) && (
                          <button type="button" disabled title="Cancel" className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg bg-gray-100 text-gray-300">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button disabled title="Edit" className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg bg-gray-100 text-gray-300">
                          <IconEdit className="h-4 w-4" />
                        </button>
                        <button title="View details" onClick={(e) => { e.stopPropagation(); setSelectedTripId(trip.trip_id) }} className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition hover:bg-primary hover:text-white">
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="text-[10px] text-gray-400">Actions coming soon</span>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ─────────────────────────────────────────── */}
      {!isLoading && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
          <p className="text-sm text-gray-500">
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filteredTrips.length)}–{Math.min(page * PAGE_SIZE, filteredTrips.length)} of {filteredTrips.length} trips
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="min-w-[80px] text-center text-sm font-medium text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}

    </div>
  );
};