import React, { useState, useEffect } from 'react';
import { Filter, Search } from 'lucide-react';
import { Trip, TripStatus, Vehicle, Driver, VehicleStatus, DriverStatus } from '../types/fleet.types';
import { TripAPI, VehicleAPI, DriverAPI, ConfidenceAPI } from '../services/mockDatabase';
import { TyreAPI } from '../services/tyreDatabase';
import { Button, Select, Badge, Modal } from '../components/UI';
import { IconEdit, IconArrowRight, IconShieldExclamation } from '../components/Icons';
import { TripDetailsPage } from './TripDetailsPage';

export const DispatchPage: React.FC = () => {
  // Navigation State
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // Data State
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicleTyreHealth, setVehicleTyreHealth] = useState<Record<string, 'Healthy' | 'Warning' | 'Critical'>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  // Guardrail State
  const [guardrailWarnings, setGuardrailWarnings] = useState<string[]>([]);

  // Inline banner state
  const [dispatchBanner, setDispatchBanner] = useState<{type:'error'|'warning', msg:string}|null>(null);
  const [modalError, setModalError] = useState<string|null>(null);

  // Cancel confirm state
  const [cancelConfirmId, setCancelConfirmId] = useState<string|null>(null);

  // Form State
  const [formData, setFormData] = useState({
    booking_reference: '',
    origin: '',
    destination: '',
    scheduled_start_time: '',
    vehicle_id: '',
    driver_id: ''
  });

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

      // Fetch tyre health for all vehicles
      if (vData.length > 0) {
        const vehicleIds = vData.map(v => v.vehicle_id);
        const healthMap = await TyreAPI.getBulkTyreHealth(vehicleIds);
        setVehicleTyreHealth(healthMap);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Operational Guardrails Check
  const checkGuardrails = async (vehicleId: string, driverId: string) => {
      const warnings: string[] = [];

      if (vehicleId) {
          const confidence = await ConfidenceAPI.getVehicleConfidence(vehicleId);
          if (confidence.score === 'Low') {
              warnings.push(`Warning: Selected vehicle has LOW data confidence. Missing signals: ${confidence.details.join(', ')}.`);
          }
          const vehicle = vehicles.find(v => v.vehicle_id === vehicleId);
          if (vehicle?.status === VehicleStatus.MAINTENANCE) {
              warnings.push("Critical: Vehicle is marked for Maintenance.");
          }

          // NEW: Tyre Health Check
          try {
              const tyreHealth = await TyreAPI.getTyreHealth(vehicleId);

              if (tyreHealth.overall === 'Critical') {
                  warnings.push(`CRITICAL: Vehicle has ${tyreHealth.criticalCount} tyre(s) requiring immediate attention. ${tyreHealth.warnings.join(', ')}. [View Tyre Status →]`);
              } else if (tyreHealth.overall === 'Warning') {
                  warnings.push(`Warning: Vehicle has ${tyreHealth.criticalCount} tyre issue(s). ${tyreHealth.warnings.join(', ')}. [Check Tyre Status →]`);
              }
          } catch (error) {
              console.error('Failed to check tyre health:', error);
          }
      }

      if (driverId) {
          const driver = drivers.find(d => d.driver_id === driverId);
          if (driver?.status !== DriverStatus.ACTIVE) {
              warnings.push(`Warning: Driver status is ${driver?.status}.`);
          }
      }

      setGuardrailWarnings(warnings);
  };

  useEffect(() => {
    if (!isModalOpen) return;
    checkGuardrails(formData.vehicle_id, formData.driver_id);
  }, [formData.vehicle_id, formData.driver_id, isModalOpen]);

  const handleOpenModal = (trip: Trip) => {
    setGuardrailWarnings([]);
    setEditingTrip(trip);
    setFormData({
      booking_reference: trip.booking_reference,
      origin: trip.origin,
      destination: trip.destination,
      scheduled_start_time: trip.scheduled_start_time.slice(0, 16),
      vehicle_id: trip.vehicle_id || '',
      driver_id: trip.driver_id || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setModalError(null);
    try {
      const payload: any = {
        booking_reference: formData.booking_reference,
        origin: formData.origin,
        destination: formData.destination,
        scheduled_start_time: new Date(formData.scheduled_start_time).toISOString(),
        vehicle_id: formData.vehicle_id || null,
        driver_id: formData.driver_id || null,
        status: editingTrip!.status
      };

      await TripAPI.update(editingTrip!.trip_id, payload);
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      setModalError("Error saving trip. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatch = async (trip: Trip) => {
    if (!trip.vehicle_id || !trip.driver_id) {
      handleOpenModal(trip);
      return;
    }

    // Quick guardrail check before dispatch
    const confidence = await ConfidenceAPI.getVehicleConfidence(trip.vehicle_id);
    if (confidence.score === 'Low') {
        setDispatchBanner({ type: 'warning', msg: `Warning: Vehicle for ${trip.booking_reference} has low data confidence. Dispatching anyway.` });
        setTimeout(() => setDispatchBanner(null), 4000);
    }

    await TripAPI.update(trip.trip_id, { status: TripStatus.DISPATCHED });
    fetchData();
  };

  const filteredTrips = trips.filter(t => {
    const matchesSearch = t.booking_reference.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.destination.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus ? t.status === filterStatus : true;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: TripStatus) => {
    switch(status) {
      case TripStatus.PLANNED: return 'blue';
      case TripStatus.DISPATCHED: return 'yellow';
      case TripStatus.IN_TRANSIT: return 'green';
      case TripStatus.COMPLETED: return 'gray';
      default: return 'gray';
    }
  };

  const getName = (id: string | null, list: any[], key: string) => {
      if (!id) return '-';
      return list.find(i => i[key === 'vehicle' ? 'vehicle_id' : 'driver_id'] === id)?.[key === 'vehicle' ? 'registration_number' : 'name'] || 'Unknown';
  };

  if (selectedTripId) {
      return <TripDetailsPage tripId={selectedTripId} onBack={() => setSelectedTripId(null)} />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dispatch Console</h1>
      </div>

      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <label className="relative min-w-[280px] flex-1" htmlFor="dispatch-search">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              id="dispatch-search"
              type="text"
              className="h-12 w-full rounded-2xl border border-gray-300 bg-white pl-12 pr-4 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Search by reference, origin or destination…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>
          <Button
            className="h-12 min-w-[140px] rounded-2xl px-5"
            variant="secondary"
            onClick={() => setShowFilters(f => !f)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
            {filterStatus && (
              <span className="ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-white">1</span>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-widest text-gray-500">Status</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFilterStatus('')}
                className={filterStatus === '' ? 'rounded-full border border-primary bg-primary/10 px-4 py-2 text-sm font-semibold text-primary' : 'rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-primary/40 hover:text-primary'}
              >
                All
              </button>
              {Object.values(TripStatus).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilterStatus(s === filterStatus ? '' : s)}
                  className={filterStatus === s ? 'rounded-full border border-primary bg-primary/10 px-4 py-2 text-sm font-semibold text-primary' : 'rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-primary/40 hover:text-primary'}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {dispatchBanner && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${dispatchBanner.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-yellow-200 bg-yellow-50 text-yellow-700'}`}>
          {dispatchBanner.msg}
        </div>
      )}

      <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Loading dispatch data...</div>
        ) : filteredTrips.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No trips found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle / Driver</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTrips.map((trip) => (
                  <tr key={trip.trip_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{trip.booking_reference}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{trip.origin}</div>
                        <div className="text-xs text-gray-500 flex items-center">
                            <IconArrowRight className="w-3 h-3 mr-1" />
                            {trip.destination}
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(trip.scheduled_start_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex flex-col">
                            <span>{getName(trip.vehicle_id, vehicles, 'vehicle')}</span>
                            <span className="text-xs text-gray-400">{getName(trip.driver_id, drivers, 'driver')}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge color={getStatusColor(trip.status)}>{trip.status}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                            {trip.status === TripStatus.PLANNED && (
                                <Button size="sm" variant="secondary" onClick={() => handleDispatch(trip)}>Dispatch</Button>
                            )}
                            {(trip.status === TripStatus.PLANNED || trip.status === TripStatus.DISPATCHED) && (
                                cancelConfirmId === trip.trip_id ? (
                                    <span className="flex items-center gap-1 text-xs">
                                        <span className="text-gray-500">Sure?</span>
                                        <button type="button" onClick={async () => { await TripAPI.update(trip.trip_id, { status: TripStatus.CANCELLED }); setCancelConfirmId(null); fetchData(); }} className="text-red-600 font-semibold hover:text-red-800">Yes</button>
                                        <button type="button" onClick={() => setCancelConfirmId(null)} className="text-gray-400 hover:text-gray-600">No</button>
                                    </span>
                                ) : (
                                    <button type="button" onClick={() => setCancelConfirmId(trip.trip_id)} className="text-xs text-red-500 hover:text-red-700">Cancel</button>
                                )
                            )}
                            <button onClick={() => handleOpenModal(trip)} className="text-gray-400 hover:text-gray-600">
                                <IconEdit className="w-4 h-4" />
                            </button>
                             <button onClick={() => setSelectedTripId(trip.trip_id)} className="text-primary hover:text-secondary bg-primary/10 px-2 py-1 rounded text-xs flex items-center">
                                View
                                <IconArrowRight className="w-3 h-3 ml-1" />
                            </button>
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Assign Vehicle & Driver">
        <form onSubmit={handleSubmit}>
          {(() => { return (
          <>
          {modalError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{modalError}</div>
          )}
          {guardrailWarnings.length > 0 && (
              <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex">
                      <div className="flex-shrink-0">
                          <IconShieldExclamation className="h-5 w-5 text-yellow-400" />
                      </div>
                      <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">Operational Guardrails Active</h3>
                          <div className="mt-2 text-sm text-yellow-700">
                              <ul className="list-disc list-inside space-y-1">
                                  {guardrailWarnings.map((w, i) => <li key={i}>{w}</li>)}
                              </ul>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Reference</span>
              <span className="font-medium text-gray-900">{formData.booking_reference}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Origin</span>
              <span className="font-medium text-gray-900">{formData.origin}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Destination</span>
              <span className="font-medium text-gray-900">{formData.destination}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Scheduled</span>
              <span className="font-medium text-gray-900">{formData.scheduled_start_time ? new Date(formData.scheduled_start_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 mt-2">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Resource Assignment</h4>
              <Select
                label="Vehicle"
                options={[
                  { label: 'Unassigned', value: '' },
                  ...vehicles
                    .filter(v => v.status === VehicleStatus.ACTIVE)
                    .map(v => {
                      const health = vehicleTyreHealth[v.vehicle_id];
                      const healthIcon = health === 'Critical' ? '🔴' : health === 'Warning' ? '🟡' : '🟢';
                      return {
                        label: `${healthIcon} ${v.registration_number} (${v.vehicle_type})`,
                        value: v.vehicle_id
                      };
                    })
                ]}
                value={formData.vehicle_id}
                onChange={e => setFormData({...formData, vehicle_id: e.target.value})}
              />
              <Select
                label="Driver"
                options={[
                  { label: 'Unassigned', value: '' },
                  ...drivers
                    .filter(d => d.status === DriverStatus.ACTIVE)
                    .map(d => ({ label: d.name, value: d.driver_id }))
                ]}
                value={formData.driver_id}
                onChange={e => setFormData({...formData, driver_id: e.target.value})}
              />
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting} variant={guardrailWarnings.length > 0 ? "danger" : "primary"}>
                {guardrailWarnings.length > 0 ? 'Accept Risk & Save' : 'Save Assignment'}
            </Button>
          </div>
          </> ); })()}
        </form>
      </Modal>
    </div>
  );
};