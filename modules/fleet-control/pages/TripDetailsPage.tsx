import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trip, TripStatus, Vehicle, Driver } from '../types';
import { TripAPI, VehicleAPI, DriverAPI, ConfidenceAPI, TelematicsAPI } from '../services/mockDatabase';
import { Button, Badge } from '../components/UI';
import { IconTruck, IconUsers, IconCalendar, IconMap, IconClock, IconCheck, IconArrowRight, IconX } from '../components/Icons';
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

interface TripDetailsPageProps {
  tripId: string;
  onBack: () => void;
}

export const TripDetailsPage: React.FC<TripDetailsPageProps> = ({ tripId, onBack }) => {
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState<string|null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [trackedDistanceKm, setTrackedDistanceKm] = useState<number | null>(null);

  useEffect(() => {
    loadTripDetails();
  }, [tripId]);

  const loadTripDetails = async () => {
    setIsLoading(true);
    try {
      const tripData = await TripAPI.getById(tripId);
      if (tripData) {
        setTrip(tripData);
        if (tripData.vehicle_id) {
          const vData = await VehicleAPI.getById(tripData.vehicle_id);
          setVehicle(vData || null);
          // Fetch GPS-computed distance for active or completed trips
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
    } catch (error) {
      console.error("Failed to load trip details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: TripStatus) => {
    if (!trip) return;
    setIsUpdating(true);
    try {
      // Validation for Dispatch
      if (newStatus === TripStatus.DISPATCHED && (!trip.vehicle_id || !trip.driver_id)) {
        setActionError("Assign a vehicle and driver before dispatching.");
        setTimeout(() => setActionError(null), 4000);
        setIsUpdating(false);
        return;
      }

      // Confidence check before dispatching
      if (newStatus === TripStatus.DISPATCHED && trip.vehicle_id) {
        const confidence = await ConfidenceAPI.getVehicleConfidence(trip.vehicle_id);
        if (confidence.score === 'Low') {
          setActionError("Warning: Vehicle has low data confidence. Proceeding with dispatch.");
          setTimeout(() => setActionError(null), 4000);
        }
      }

      await TripAPI.update(trip.trip_id, { status: newStatus });
      await loadTripDetails();
    } catch (error) {
      setActionError("Failed to update status. Please try again.");
      setTimeout(() => setActionError(null), 4000);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading trip details...</div>;
  if (!trip) return (
    <div className="p-8 text-center">
      <p className="text-sm font-medium text-red-600">Trip not found.</p>
      <button type="button" onClick={onBack} className="mt-2 text-sm text-primary-600 hover:underline">← Back to Dispatch Console</button>
    </div>
  );

  const STATUS_STYLE: Record<TripStatus, { dot: string; bg: string; text: string; label: string }> = {
    [TripStatus.PLANNED]:    { dot: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700',   label: 'Planned' },
    [TripStatus.DISPATCHED]: { dot: 'bg-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'Dispatched' },
    [TripStatus.IN_TRANSIT]: { dot: 'bg-emerald-500',bg: 'bg-emerald-50',text: 'text-emerald-700',label: 'In Transit' },
    [TripStatus.COMPLETED]:  { dot: 'bg-gray-400',   bg: 'bg-gray-100',  text: 'text-gray-600',   label: 'Completed' },
    [TripStatus.CANCELLED]:  { dot: 'bg-red-500',    bg: 'bg-red-50',    text: 'text-red-700',    label: 'Cancelled' },
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
            showCancelConfirm ? (
              <span className="flex items-center gap-2">
                <Button variant="danger" onClick={() => { setShowCancelConfirm(false); handleStatusUpdate(TripStatus.CANCELLED); }} isLoading={isUpdating}>Confirm Cancel</Button>
                <Button variant="secondary" onClick={() => setShowCancelConfirm(false)}>Keep Trip</Button>
              </span>
            ) : (
              <Button variant="secondary" onClick={() => setShowCancelConfirm(true)}>Cancel Trip</Button>
            )
          )}

          {trip.status === TripStatus.PLANNED && (
             <Button onClick={() => handleStatusUpdate(TripStatus.DISPATCHED)} isLoading={isUpdating} disabled={!trip.vehicle_id || !trip.driver_id}>
                Dispatch Trip
             </Button>
          )}
          {trip.status === TripStatus.DISPATCHED && (
             <Button onClick={() => handleStatusUpdate(TripStatus.IN_TRANSIT)} isLoading={isUpdating}>
                Start Trip
             </Button>
          )}
          {trip.status === TripStatus.IN_TRANSIT && (
             <Button onClick={() => handleStatusUpdate(TripStatus.COMPLETED)} isLoading={isUpdating} variant="primary">
                Complete Trip
             </Button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{actionError}</div>
      )}

      {/* Timeline */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        {trip.status === TripStatus.CANCELLED ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">Trip Cancelled</div>
        ) : (
          <div className="relative flex items-center justify-between w-full">
              {/* Gray base track */}
              <div className="absolute left-0 top-4 h-0.5 w-full bg-gray-200" />
              {/* Filled track — grows with progress, uses current status colour */}
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

      {/* Distance metrics strip — only when at least one value is available */}
      {(trip.estimated_distance_km || trackedDistanceKm !== null) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Expected Distance */}
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

          {/* Tracked Distance */}
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

          {/* Progress / Variance */}
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
                          className="h-full rounded-full bg-emerald-500 transition-all"
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
                    {/* Origin */}
                    <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center flex-shrink-0">
                            <div className="w-3 h-3 rounded-full bg-primary-500 ring-4 ring-primary-100 mt-1" />
                            <div className="w-0.5 bg-gray-200 flex-1 my-1 relative" style={{ minHeight: '2rem' }} />
                        </div>
                        <div className="pb-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Origin</p>
                            <p className="text-sm font-semibold text-gray-900 mt-0.5">{trip.origin}</p>
                        </div>
                    </div>
                    {/* Destination */}
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
                                <IconTruck className="w-8 h-8 text-primary-500 mr-3" />
                                <div>
                                    <button type="button" onClick={() => navigate('/fleet/fleet', { state: { openVehicleId: trip.vehicle_id } })} className="text-sm font-medium text-primary-600 hover:underline">{vehicle.registration_number}</button>
                                    <p className="text-xs text-gray-500">{vehicle.vehicle_type}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm">No vehicle assigned<br /><button type="button" onClick={onBack} className="mt-2 text-xs font-semibold text-amber-700 underline">← Go back to assign</button></div>
                        )}
                    </div>
                    
                    <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">Driver</p>
                        {driver ? (
                            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                <IconUsers className="w-8 h-8 text-primary-500 mr-3" />
                                <div>
                                    <button type="button" onClick={() => navigate('/fleet/drivers', { state: { openDriverId: trip.driver_id } })} className="text-sm font-medium text-primary-600 hover:underline">{driver.name}</button>
                                    <p className="text-xs text-gray-500">{driver.phone}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm">No driver assigned<br /><button type="button" onClick={onBack} className="mt-2 text-xs font-semibold text-amber-700 underline">← Go back to assign</button></div>
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
                        <span className="flex items-center text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
                            Live
                        </span>
                    )}
                </div>
                <div className="flex-1 min-h-0">
                    {!GOOGLE_MAPS_API_KEY ? (
                        <div className="flex h-full items-center justify-center bg-gray-50 p-6 text-center">
                            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8">
                                <p className="text-sm font-medium text-gray-600">Google Maps key missing</p>
                                <p className="mt-1 text-xs text-gray-400">Set <code>VITE_GOOGLE_MAPS_API_KEY</code> to show the route map.</p>
                            </div>
                        </div>
                    ) : (
                        <iframe
                            title="Trip Route"
                            width="100%"
                            height="100%"
                            style={{ border: 0, display: 'block', minHeight: '350px' }}
                            src={`https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_API_KEY}&origin=${encodeURIComponent(trip.origin)}&destination=${encodeURIComponent(trip.destination)}&mode=driving`}
                            allowFullScreen
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