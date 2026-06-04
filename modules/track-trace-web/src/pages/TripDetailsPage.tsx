import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { Trip, TripStatus, Vehicle, Driver, TrackerDeviceKind, TrackerStatus } from '../types/fleet.types';
import type { VehicleTrackingDevice } from '../types/fleet.types';
import type { TrackingSource } from '../types/tracking.types';
import { TripAPI, VehicleAPI, DriverAPI, TelematicsAPI, TrackingDeviceAPI } from '../services/mockDatabase';
import { Button } from '../components/UI';
import { IconTruck, IconUsers, IconCalendar, IconMap, IconArrowRight } from '../components/Icons';
import { useTrackingStore } from '../store/trackingStore';
import { useTrackTraceRouting } from '../hooks/useTrackTraceRouting';
import { getRoutePerformance } from '../services/analyticsApi';
import type { RoutePerformance } from '../types/analytics.types';
import { useAuth } from '@shared-auth';
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Map a vehicle's installed device kind to the tracking source it feeds.
function deviceKindToSource(kind: TrackerDeviceKind): TrackingSource {
  switch (kind) {
    case TrackerDeviceKind.GPS_TRACKING: return 'GPS_DEVICE';
    case TrackerDeviceKind.SIM_TRACKING: return 'FASTAG';
    case TrackerDeviceKind.DRIVER_APP:   return 'DRIVER_APP';
    case TrackerDeviceKind.MANUAL:       return 'MANUAL';
    default:                             return 'GPS_DEVICE';
  }
}

// Short pill label for an installed device. `hasMultipleGps` distinguishes
// primary/secondary GPS units when a vehicle carries more than one.
function installedDeviceLabel(d: VehicleTrackingDevice, hasMultipleGps: boolean): string {
  switch (d.device_kind) {
    case TrackerDeviceKind.GPS_TRACKING:
      return hasMultipleGps ? (d.is_primary ? 'GPS Primary' : 'GPS Secondary') : 'GPS';
    case TrackerDeviceKind.SIM_TRACKING: return 'SIM';
    case TrackerDeviceKind.DRIVER_APP:   return 'App';
    case TrackerDeviceKind.MANUAL:       return 'Manual';
    default:                             return 'GPS';
  }
}

interface TripDetailsPageProps {
  tripId: string;
  onBack: () => void;
}

export const TripDetailsPage: React.FC<TripDetailsPageProps> = ({ tripId, onBack }) => {
  const { activeTrips, alerts, geofences, switchTripTrackingSource } = useTrackingStore()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { scopedPath } = useTrackTraceRouting()
  const trackingTrip = activeTrips.find((t) => t.id === tripId) ?? null

  const [trip, setTrip] = useState<Trip | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string|null>(null);
  const [trackedDistanceKm, setTrackedDistanceKm] = useState<number | null>(null);
  const [routeRows, setRouteRows] = useState<RoutePerformance[]>([]);
  // Tracking devices actually installed on this trip's vehicle (real inventory).
  const [installedDevices, setInstalledDevices] = useState<VehicleTrackingDevice[]>([]);

  useEffect(() => {
    loadTripDetails();
  }, [tripId]);

  // TD3: fetch corridor performance once trip loads (origin/destination available)
  useEffect(() => {
    if (!trip) return
    let active = true
    void getRoutePerformance({}).then((rows) => { if (active) setRouteRows(rows) }).catch(() => {})
    return () => { active = false }
  }, [trip?.origin, trip?.destination]) // eslint-disable-line react-hooks/exhaustive-deps

  // TD1: open (non-Resolved) alerts for this trip
  const tripAlerts = useMemo(
    () => alerts.filter((a) => a.tripId === tripId && a.status !== 'Resolved'),
    [alerts, tripId],
  )

  // TD2: geofence zones linked to this trip
  const tripGeofences = useMemo(
    () => geofences.filter((g) => g.linkedEntityId === tripId && g.linkedEntityType === 'TRIP'),
    [geofences, tripId],
  )

  // TD3: find matching corridor row
  const corridorRow = useMemo(() => {
    if (!trip) return null
    const key = trip.origin.toLowerCase() + '-' + trip.destination.toLowerCase()
    return routeRows.find((r) => r.laneId === key) ?? null
  }, [routeRows, trip])

  const loadTripDetails = async () => {
    setIsLoading(true);
    setInstalledDevices([]);
    try {
      const tripData = await TripAPI.getById(tripId);
      if (tripData) {
        setTrip(tripData);
        if (tripData.vehicle_id) {
          const vData = await VehicleAPI.getById(tripData.vehicle_id);
          setVehicle(vData || null);
          if (tripData.status === TripStatus.IN_TRANSIT || tripData.status === TripStatus.COMPLETED) {
            const dist = await TelematicsAPI.getTripDistance(tripData.vehicle_id);
            setTrackedDistanceKm(dist);
          }
          // Tracking sources available to this booking = devices fitted to its vehicle.
          const installed = await TrackingDeviceAPI.getAllByVehicleId(tripData.vehicle_id);
          setInstalledDevices(installed);
        }
        if (tripData.driver_id) {
          const dData = await DriverAPI.getById(tripData.driver_id);
          setDriver(dData || null);
        }
      }
    } catch {
      setActionError('Trip details could not be loaded. Please try again.');
      setTimeout(() => setActionError(null), 4000);
    } finally {
      setIsLoading(false);
    }
  };


  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading trip details...</div>;
  if (!trip) return (
    <div className="p-8 text-center">
      <p className="text-sm font-medium text-danger">Trip not found.</p>
      <button type="button" onClick={onBack} className="mt-2 text-sm text-primary hover:underline">← Go back</button>
    </div>
  );

  const STATUS_STYLE: Record<TripStatus, { dot: string; bg: string; text: string; label: string }> = {
    [TripStatus.PLANNED]:    { dot: 'bg-primary',  bg: 'bg-primary/10',  text: 'text-primary',  label: 'Booked' },
    [TripStatus.DISPATCHED]: { dot: 'bg-primary',  bg: 'bg-primary/10',  text: 'text-primary',  label: 'Booked' },
    [TripStatus.IN_TRANSIT]: { dot: 'bg-success',  bg: 'bg-success/10',  text: 'text-success',  label: 'In Transit' },
    [TripStatus.COMPLETED]:  { dot: 'bg-gray-400', bg: 'bg-gray-100',    text: 'text-gray-600', label: 'Completed' },
    [TripStatus.CANCELLED]:  { dot: 'bg-danger',   bg: 'bg-danger/10',   text: 'text-danger',   label: 'Cancelled' },
  };
  const statusStyle = STATUS_STYLE[trip.status] ?? STATUS_STYLE[TripStatus.PLANNED];

  // Compact "last ping" string for the tracking control (e.g. "2m", "5h", "29d")
  const pingAgo = (iso?: string): string => {
    if (!iso) return '—';
    const diffMs = Date.now() - new Date(iso).getTime();
    if (diffMs < 0) return 'now';
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.round(hrs / 24)}d`;
  };

  // The tracking control is driven by the vehicle's real device inventory, sorted
  // primary-first, so only the devices actually fitted to this booking show.
  const trackingDevices = [...installedDevices].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
  const hasMultipleGps = installedDevices.filter((d) => d.device_kind === TrackerDeviceKind.GPS_TRACKING).length > 1;

  // Resolve which installed device is currently the live source: match the active
  // tracking source, preferring the primary device; otherwise fall back to primary.
  const activeSource = trackingTrip?.activeSource ?? trackingTrip?.primarySource;
  const activeDeviceId = (() => {
    if (trackingDevices.length === 0) return null;
    if (activeSource) {
      const matches = trackingDevices.filter((d) => deviceKindToSource(d.device_kind) === activeSource);
      if (matches.length) return (matches.find((d) => d.is_primary) ?? matches[0]).tracker_id;
    }
    return (trackingDevices.find((d) => d.is_primary) ?? trackingDevices[0]).tracker_id;
  })();

  // Switch the live source to the chosen installed device by matching it to the
  // tracking-store device of the same source.
  const selectDevice = (d: VehicleTrackingDevice) => {
    if (!trackingTrip) return;
    const targetSource = deviceKindToSource(d.device_kind);
    const synthetic = trackingTrip.trackingDevices?.find((td) => td.source === targetSource);
    if (synthetic) switchTripTrackingSource(trackingTrip.id, synthetic.id, user?.email ?? 'operator');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
            <IconArrowRight className="w-6 h-6 transform rotate-180" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Trip {trip.booking_reference}</h1>
            <p className="text-sm text-gray-500 flex items-center mt-1">
                <IconCalendar className="w-4 h-4 mr-1" />
                {new Date(trip.scheduled_start_time).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${statusStyle.bg} ${statusStyle.text} border-current/20`}>
            <span className={`h-2 w-2 rounded-full ${statusStyle.dot} ${trip.status === TripStatus.IN_TRANSIT ? 'animate-pulse' : ''}`} />
            {statusStyle.label}
          </span>

          {(trip.status === TripStatus.PLANNED || trip.status === TripStatus.DISPATCHED) && (
            <Button variant="secondary" disabled title="Coming soon" className="cursor-not-allowed opacity-40">Cancel Trip</Button>
          )}

          {trip.status === TripStatus.PLANNED && (
            <Button disabled title="Coming soon" className="cursor-not-allowed opacity-40">Dispatch Trip</Button>
          )}
          {trip.status === TripStatus.DISPATCHED && (
            <Button disabled title="Coming soon" className="cursor-not-allowed opacity-40">Start Trip</Button>
          )}
          {trip.status === TripStatus.IN_TRANSIT && (
            <Button disabled title="Coming soon" variant="primary" className="cursor-not-allowed opacity-40">Complete Trip</Button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{actionError}</div>
      )}

      {/* TD1: Open alerts */}
      {tripAlerts.length > 0 && (
        <div className="rounded-xl border border-danger/30 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-[13px] font-semibold text-text">
              {tripAlerts.length} open alert{tripAlerts.length !== 1 ? 's' : ''}
            </p>
            <button
              type="button"
              onClick={() => navigate(scopedPath('/alerts') + '?tripId=' + encodeURIComponent(tripId))}
              className="text-[12px] font-semibold text-primary hover:underline"
            >
              View all →
            </button>
          </div>
          <div className="flex flex-wrap gap-2 px-4 py-3">
            {tripAlerts.slice(0, 3).map((alert) => {
              const severityColors: Record<string, string> = {
                Critical: 'bg-red-100 text-red-700 border-red-200',
                High: 'bg-orange-100 text-orange-700 border-orange-200',
                Medium: 'bg-amber-100 text-amber-700 border-amber-200',
                Low: 'bg-blue-100 text-blue-700 border-blue-200',
              }
              return (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => navigate(scopedPath('/alerts') + '?alert=' + encodeURIComponent(alert.id))}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition hover:opacity-80 ${severityColors[alert.severity] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}
                >
                  <span className="font-bold">{alert.severity}</span>
                  <span className="opacity-70">·</span>
                  <span>{alert.type}</span>
                  <span className="max-w-[120px] truncate font-normal opacity-70">{alert.message}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* TD2: Geofence zones */}
      {tripGeofences.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-[13px] font-semibold text-text">
              {tripGeofences.length} geofence zone{tripGeofences.length !== 1 ? 's' : ''}
            </p>
            <button
              type="button"
              onClick={() => navigate(scopedPath('/geofences') + '?search=' + encodeURIComponent(tripId))}
              className="text-[12px] font-semibold text-primary hover:underline"
            >
              View all →
            </button>
          </div>
          <div className="flex flex-wrap gap-2 px-4 py-3">
            {tripGeofences.slice(0, 3).map((gf) => {
              const typeColors: Record<string, string> = {
                Pickup: 'bg-blue-100 text-blue-700',
                Drop: 'bg-teal-100 text-teal-700',
                Warehouse: 'bg-indigo-100 text-indigo-700',
                Checkpoint: 'bg-purple-100 text-purple-700',
                'Restricted Zone': 'bg-red-100 text-red-700',
                Yard: 'bg-orange-100 text-orange-600',
                'Customer Site': 'bg-green-100 text-green-700',
                Custom: 'bg-gray-100 text-gray-600',
              }
              return (
                <span
                  key={gf.id}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold ${typeColors[gf.type] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  <span>{gf.type}</span>
                  <span className="font-normal opacity-70 max-w-[100px] truncate">{gf.name}</span>
                </span>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="lg:col-span-1 space-y-6">
            {/* Route Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <IconMap className="w-5 h-5 mr-2 text-gray-500" />
                    Route Details
                </h3>
                <div className="flex flex-col gap-0">
                    <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center flex-shrink-0">
                            <div className="w-3 h-3 rounded-full bg-primary ring-4 ring-primary/10 mt-1" />
                            <div className="w-0.5 bg-gray-200 flex-1 my-1 relative" style={{ minHeight: '2rem' }} />
                        </div>
                        <div className="pb-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Origin</p>
                            <p className="text-sm font-semibold text-gray-900 mt-0.5">{trip.origin}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center flex-shrink-0">
                            <div className="w-3 h-3 rounded-full bg-white border-2 border-gray-400 mt-1" />
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Destination</p>
                            <p className="text-sm font-semibold text-gray-900 mt-0.5">{trip.destination}</p>
                        </div>
                    </div>
                </div>
                {/* TD3: Corridor avg performance */}
                {corridorRow && (
                  <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 space-y-1.5">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-400">Corridor Avg</p>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${corridorRow.averageDelayMinutes > 90 ? 'bg-red-100 text-red-700' : corridorRow.averageDelayMinutes > 30 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {corridorRow.averageDelayMinutes} min avg delay
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${corridorRow.efficiencyScore >= 95 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {corridorRow.efficiencyScore}% efficiency
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(scopedPath('/route-performance'))}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      View corridor history →
                    </button>
                  </div>
                )}
            </div>

            {/* Assignment Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <IconTruck className="w-5 h-5 mr-2 text-gray-500" />
                    Assignment
                </h3>

                <div className="space-y-4">
                    <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">Vehicle</p>
                        {vehicle ? (
                            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                <IconTruck className="w-8 h-8 text-primary mr-3" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{vehicle.registration_number}</p>
                                    <p className="text-xs text-gray-500">{vehicle.vehicle_type}</p>
                                </div>
                            </div>
                        ) : trackingTrip?.vehicleNumber ? (
                            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                <IconTruck className="w-8 h-8 text-primary mr-3" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{trackingTrip.vehicleNumber}</p>
                                    {trackingTrip.vehicleType && <p className="text-xs text-gray-500">{trackingTrip.vehicleType}</p>}
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 bg-warning/10 text-warning rounded-lg text-sm">
                              No vehicle assigned
                              <br />
                              <button type="button" onClick={onBack} className="mt-2 text-xs font-semibold text-warning underline">← Go back to assign</button>
                            </div>
                        )}
                    </div>

                    <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">Driver</p>
                        {driver ? (
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <IconUsers className="w-8 h-8 text-primary" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900 truncate">{driver.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{driver.phone}</p>
                                </div>
                                {driver.phone && (
                                    <a
                                        href={`tel:${driver.phone}`}
                                        title={`Call ${driver.name}`}
                                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white transition hover:brightness-110"
                                    >
                                        <Phone className="h-4 w-4" />
                                    </a>
                                )}
                            </div>
                        ) : trackingTrip?.driverName ? (
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <IconUsers className="w-8 h-8 text-primary" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900 truncate">{trackingTrip.driverName}</p>
                                    {trackingTrip.driverMobile && <p className="text-xs text-gray-500 truncate">{trackingTrip.driverMobile}</p>}
                                </div>
                                {trackingTrip.driverMobile && (
                                    <a
                                        href={`tel:${trackingTrip.driverMobile}`}
                                        title={`Call ${trackingTrip.driverName}`}
                                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white transition hover:brightness-110"
                                    >
                                        <Phone className="h-4 w-4" />
                                    </a>
                                )}
                            </div>
                        ) : (
                            <div className="p-3 bg-warning/10 text-warning rounded-lg text-sm">
                              No driver assigned
                              <br />
                              <button type="button" onClick={onBack} className="mt-2 text-xs font-semibold text-warning underline">← Go back to assign</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Right Column: Map */}
        <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-full min-h-[400px] flex flex-col">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap justify-between items-center gap-3 flex-shrink-0">
                    <h3 className="font-medium text-gray-900">Route Map</h3>
                    {trackingDevices.length > 0 && (
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Tracking Devices</span>
                        <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1 shadow-sm">
                          {trackingDevices.map((device) => {
                            const isActive = device.tracker_id === activeDeviceId
                            const unavailable = device.status !== TrackerStatus.ACTIVE
                            const label = installedDeviceLabel(device, hasMultipleGps)
                            return (
                              <button
                                key={device.tracker_id}
                                type="button"
                                disabled={unavailable || !trackingTrip}
                                onClick={() => selectDevice(device)}
                                title={unavailable ? `${device.model} — ${device.status}` : `${device.manufacturer} ${device.model} · last ping ${pingAgo(device.last_ping)} ago`}
                                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold transition
                                  ${unavailable
                                    ? 'cursor-not-allowed text-gray-300'
                                    : isActive
                                      ? 'bg-primary text-white shadow-sm'
                                      : 'text-gray-500 hover:bg-gray-100'
                                  }`}
                              >
                                {isActive && !unavailable && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                                <span className="flex flex-col items-start leading-tight">
                                  <span>{label}</span>
                                  <span className={`text-[9px] font-medium ${unavailable ? 'text-gray-300' : isActive ? 'text-white/70' : 'text-gray-400'}`}>
                                    {unavailable ? device.status : `${pingAgo(device.last_ping)} ago`}
                                  </span>
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                </div>

                <div className="relative flex-1 min-h-0">
                    {!GOOGLE_MAPS_API_KEY ? (
                        <div className="flex h-full items-center justify-center bg-gray-50 p-6 text-center">
                            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8">
                                <p className="text-sm font-medium text-gray-600">Route map unavailable</p>
                                <p className="mt-1 text-xs text-gray-400">Map configuration is missing. Contact your administrator.</p>
                            </div>
                        </div>
                    ) : (
                        <iframe
                            title="Trip Route"
                            width="100%"
                            height="100%"
                            style={{ border: 0, display: 'block', minHeight: '350px' }}
                            src={`https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_API_KEY}&origin=${encodeURIComponent(trip.origin)}&destination=${encodeURIComponent(trip.destination)}&mode=driving`}
                            allowFullscreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        />
                    )}
                </div>

                {/* Trip progress + metrics — compact, below map */}
                {(() => {
                  const isBooked    = trip.status === TripStatus.PLANNED || trip.status === TripStatus.DISPATCHED
                  const isInTransit = trip.status === TripStatus.IN_TRANSIT
                  const isCompleted = trip.status === TripStatus.COMPLETED
                  const isCancelled = trip.status === TripStatus.CANCELLED
                  const activeStep  = isBooked ? 0 : isInTransit ? 1 : isCompleted || isCancelled ? 2 : 0
                  const eta   = trackingTrip?.currentEta ?? trackingTrip?.plannedEta
                  const delay = trackingTrip?.delayMinutes ?? 0
                  const pct   = trip.estimated_distance_km && trackedDistanceKm !== null
                    ? Math.min(100, Math.round((trackedDistanceKm / trip.estimated_distance_km) * 100))
                    : null

                  const stages = [
                    {
                      key: 'booked', label: 'Booked',
                      icon: (active: boolean, done: boolean) => (
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                          {done || active
                            ? <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            : <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />}
                        </svg>
                      ),
                    },
                    {
                      key: 'in-transit', label: 'In Transit',
                      icon: () => (
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                          <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                          <path d="M3 4a1 1 0 00-1 1v7a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1v-1h3a1 1 0 00.8-.4l2-2.667A1 1 0 0017 7h-4V5a1 1 0 00-1-1H3z" />
                        </svg>
                      ),
                    },
                    {
                      key: 'completed', label: 'Completed',
                      icon: () => (
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                          <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                        </svg>
                      ),
                    },
                  ]

                  return (
                    <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50/60 px-4 py-3">

                      {/* Stage timeline — small */}
                      <div className="flex items-center mb-3">
                        {stages.map((stage, idx) => {
                          const done   = idx < activeStep
                          const active = idx === activeStep
                          const iconBg = done
                            ? 'bg-primary text-white'
                            : active
                              ? 'bg-primary text-white ring-2 ring-primary/15'
                              : 'bg-gray-200 text-gray-400'
                          return (
                            <React.Fragment key={stage.key}>
                              <div className="flex flex-col items-center gap-1 min-w-0">
                                <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${iconBg}`}>
                                  {stage.icon(active, done)}
                                </div>
                                <span className={`text-[10px] font-semibold whitespace-nowrap ${active ? 'text-primary' : done ? 'text-gray-600' : 'text-gray-400'}`}>
                                  {stage.label}
                                </span>
                              </div>
                              {idx < stages.length - 1 && (
                                <div className="relative mx-2 h-0.5 flex-1 mb-3">
                                  <div className="absolute inset-0 rounded-full bg-gray-200" />
                                  <div className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all" style={{ width: idx < activeStep ? '100%' : '0%' }} />
                                </div>
                              )}
                            </React.Fragment>
                          )
                        })}
                      </div>

                      {/* Metrics row */}
                      <div className="flex items-start divide-x divide-gray-200">
                        <div className="flex-1 pr-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Expected</p>
                          <p className="mt-0.5 text-2xl font-extrabold leading-none text-gray-900">
                            {trip.estimated_distance_km ? trip.estimated_distance_km.toLocaleString() : '—'}
                            <span className="ml-1 text-[11px] font-medium text-gray-400">km</span>
                          </p>
                        </div>
                        <div className="flex-1 px-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{isInTransit ? 'Tracked' : 'Actual'}</p>
                          <p className="mt-0.5 text-2xl font-extrabold leading-none text-gray-900">
                            {trackedDistanceKm !== null ? trackedDistanceKm.toLocaleString() : '—'}
                            <span className="ml-1 text-[11px] font-medium text-gray-400">km</span>
                          </p>
                        </div>
                        <div className="flex-1 px-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">ETA</p>
                          <div className="mt-0.5 flex items-baseline gap-1.5 flex-wrap">
                            <p className="text-2xl font-extrabold leading-none text-gray-900">
                              {trackingTrip?.remainingDistanceKm === 0 ? 'Arrived' : eta ? new Date(eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                            </p>
                            {delay > 0 && (
                              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600 leading-none">+{delay}m</span>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 pl-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Progress</p>
                          <p className={`mt-0.5 text-2xl font-extrabold leading-none ${pct !== null ? 'text-blue-600' : 'text-gray-900'}`}>
                            {pct !== null ? `${pct}%` : '—'}
                          </p>
                          {pct !== null && !isCompleted && (
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                              <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  )
                })()}
            </div>
        </div>
      </div>
    </div>
  );
};
