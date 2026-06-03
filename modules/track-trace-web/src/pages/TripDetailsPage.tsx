import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trip, TripStatus, Vehicle, Driver } from '../types/fleet.types';
import { TripAPI, VehicleAPI, DriverAPI, TelematicsAPI } from '../services/mockDatabase';
import { Button } from '../components/UI';
import { IconTruck, IconUsers, IconCalendar, IconMap, IconArrowRight } from '../components/Icons';
import { useTrackingStore } from '../store/trackingStore';
import { useTrackTraceRouting } from '../hooks/useTrackTraceRouting';
import { getRoutePerformance } from '../services/analyticsApi';
import type { RoutePerformance } from '../types/analytics.types';
import { useAuth } from '@shared-auth';
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

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
    [TripStatus.PLANNED]:    { dot: 'bg-primary',  bg: 'bg-primary/10',  text: 'text-primary',  label: 'Planned' },
    [TripStatus.DISPATCHED]: { dot: 'bg-warning',  bg: 'bg-warning/10',  text: 'text-warning',  label: 'Dispatched' },
    [TripStatus.IN_TRANSIT]: { dot: 'bg-success',  bg: 'bg-success/10',  text: 'text-success',  label: 'In Transit' },
    [TripStatus.COMPLETED]:  { dot: 'bg-gray-400', bg: 'bg-gray-100',    text: 'text-gray-600', label: 'Completed' },
    [TripStatus.CANCELLED]:  { dot: 'bg-danger',   bg: 'bg-danger/10',   text: 'text-danger',   label: 'Cancelled' },
  };
  const statusStyle = STATUS_STYLE[trip.status] ?? STATUS_STYLE[TripStatus.PLANNED];

  const steps = [TripStatus.PLANNED, TripStatus.DISPATCHED, TripStatus.IN_TRANSIT, TripStatus.COMPLETED];
  const currentStepIndex = steps.indexOf(trip.status);

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
          {/* TD5: View Replay for in-transit or completed trips */}
          {(trip.status === TripStatus.IN_TRANSIT || trip.status === TripStatus.COMPLETED) && (
            <Button variant="secondary" onClick={() => navigate(scopedPath('/trips/' + tripId + '/replay'))}>
              View Replay →
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{actionError}</div>
      )}

      {/* Tracking device switcher */}
      {trackingTrip?.trackingDevices && trackingTrip.trackingDevices.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-400">Tracking Devices</p>
          <div className="flex flex-wrap gap-2">
            {trackingTrip.trackingDevices.map((device) => {
              const isActive = device.id === trackingTrip.activeTrackingDeviceId
              const sourceLabel: Record<string, string> = {
                GPS_DEVICE: 'GPS', FASTAG: 'SIM', DRIVER_APP: 'App', ANPR: 'ANPR', MANUAL: 'Manual',
              }
              const sourceColor: Record<string, string> = {
                GPS_DEVICE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                FASTAG:     'bg-blue-100 text-blue-700 border-blue-200',
                DRIVER_APP: 'bg-violet-100 text-violet-700 border-violet-200',
                ANPR:       'bg-amber-100 text-amber-700 border-amber-200',
                MANUAL:     'bg-gray-100 text-gray-600 border-gray-200',
              }
              const unavailable = device.status === 'Unavailable' || device.status === 'Faulted'
              return (
                <button
                  key={device.id}
                  type="button"
                  disabled={unavailable}
                  onClick={() => switchTripTrackingSource(trackingTrip.id, device.id, user?.email ?? 'operator')}
                  title={unavailable ? `${device.label} — ${device.status}` : `Switch to ${device.label}`}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-semibold transition
                    ${unavailable ? 'cursor-not-allowed opacity-40 bg-gray-50 border-gray-200 text-gray-400' :
                      isActive
                        ? `${sourceColor[device.source] ?? 'bg-gray-100 text-gray-700 border-gray-200'} ring-2 ring-primary/30`
                        : `${sourceColor[device.source] ?? 'bg-gray-100 text-gray-700 border-gray-200'} opacity-60 hover:opacity-100`
                    }`}
                >
                  <span className={`h-2 w-2 rounded-full ${isActive && !unavailable ? 'bg-current animate-pulse' : 'bg-current opacity-40'}`} />
                  <span>{sourceLabel[device.source] ?? device.source}</span>
                  <span className="font-normal text-[11px] opacity-70">{device.label}</span>
                  {isActive && <span className="ml-1 rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">Active</span>}
                  {unavailable && <span className="ml-1 text-[10px] font-normal">{device.status}</span>}
                </button>
              )
            })}
          </div>
          {trackingTrip.lastSourceSwitchedAt && (
            <p className="mt-2.5 text-[11px] text-gray-400">
              Last switched by <span className="font-semibold">{trackingTrip.lastSourceSwitchedBy}</span> at {new Date(trackingTrip.lastSourceSwitchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        {trip.status === TripStatus.CANCELLED ? (
          <div className="rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">Trip Cancelled</div>
        ) : (
          <div className="relative flex items-center justify-between w-full">
              <div className="absolute left-0 top-4 h-0.5 w-full bg-gray-200" />
              <div
                className={`absolute left-0 top-4 h-0.5 transition-all ${statusStyle.dot}`}
                style={{ width: currentStepIndex >= 0 ? `${(currentStepIndex / (steps.length - 1)) * 100}%` : '0%' }}
              />
              {steps.map((step, index) => {
                  const isCompleted = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  const stepStyle = STATUS_STYLE[step];
                  return (
                      <div key={step} className="relative flex flex-col items-center bg-white px-2 z-10">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                            isCompleted
                              ? `${stepStyle.bg} ${stepStyle.text} border-current`
                              : 'bg-white border-gray-300 text-gray-300'
                          }`}>
                              {isCompleted
                                ? <span className={`h-2.5 w-2.5 rounded-full ${stepStyle.dot}`} />
                                : <div className="w-2 h-2 bg-gray-300 rounded-full" />
                              }
                          </div>
                          <span className={`mt-2 text-xs ${isCurrent ? `font-bold ${stepStyle.text}` : isCompleted ? 'font-medium text-gray-700' : 'font-normal text-gray-400'}`}>
                            {step}
                          </span>
                      </div>
                  );
              })}
          </div>
        )}
      </div>

      {/* Distance metrics strip */}
      {(trip.estimated_distance_km || trackedDistanceKm !== null) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Expected Distance</p>
            {trip.estimated_distance_km ? (
              <>
                <p className="text-2xl font-bold text-gray-900">
                  {trip.estimated_distance_km.toLocaleString()}
                  <span className="ml-1 text-sm font-medium text-gray-400">km</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">Planned route estimate</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">Not set</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              {trip.status === TripStatus.IN_TRANSIT ? 'Tracked So Far' : 'Actual Distance'}
            </p>
            {trackedDistanceKm !== null ? (
              <>
                <p className="text-2xl font-bold text-gray-900">
                  {trackedDistanceKm.toLocaleString()}
                  <span className="ml-1 text-sm font-medium text-gray-400">km</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">Via GPS tracking device</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">
                {trip.status === TripStatus.PLANNED || trip.status === TripStatus.DISPATCHED
                  ? 'Trip not started'
                  : 'No telemetry data'}
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              {trip.status === TripStatus.COMPLETED ? 'Distance Variance' : 'Progress'}
            </p>
            {trip.estimated_distance_km && trackedDistanceKm !== null ? (() => {
              const pct = Math.min(100, Math.round((trackedDistanceKm / trip.estimated_distance_km) * 100));
              const remaining = trip.estimated_distance_km - trackedDistanceKm;
              const isCompleted = trip.status === TripStatus.COMPLETED;
              return (
                <>
                  <p className="text-2xl font-bold text-gray-900">
                    {isCompleted
                      ? `${remaining >= 0 ? '+' : ''}${Math.abs(Math.round(remaining))} km`
                      : `${pct}%`}
                  </p>
                  {!isCompleted && (
                    <>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-success transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {remaining > 0 ? `${Math.round(remaining).toLocaleString()} km remaining` : 'Route completed'}
                      </p>
                    </>
                  )}
                  {isCompleted && (
                    <p className="text-xs text-gray-400 mt-1">
                      {remaining >= 0 ? 'Over estimated by' : 'Under estimated by'} {Math.abs(Math.round(remaining))} km
                    </p>
                  )}
                </>
              );
            })() : (
              <p className="text-sm text-gray-400">
                {trip.status === TripStatus.PLANNED || trip.status === TripStatus.DISPATCHED
                  ? 'Awaiting departure'
                  : 'Insufficient data'}
              </p>
            )}
          </div>

        </div>
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
                            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                <IconUsers className="w-8 h-8 text-primary mr-3" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{driver.name}</p>
                                    <p className="text-xs text-gray-500">{driver.phone}</p>
                                </div>
                            </div>
                        ) : trackingTrip?.driverName ? (
                            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                <IconUsers className="w-8 h-8 text-primary mr-3" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{trackingTrip.driverName}</p>
                                    {trackingTrip.driverMobile && <p className="text-xs text-gray-500">{trackingTrip.driverMobile}</p>}
                                </div>
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
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center flex-shrink-0">
                    <h3 className="font-medium text-gray-900">Route Map</h3>
                    {trip.status === TripStatus.IN_TRANSIT && (
                        <span className="flex items-center text-xs text-success bg-success/10 px-2 py-1 rounded-full">
                            <span className="w-2 h-2 bg-success rounded-full animate-pulse mr-2"></span>
                            Live
                        </span>
                    )}
                </div>
                <div className="flex-1 min-h-0">
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
            </div>
        </div>
      </div>
    </div>
  );
};
