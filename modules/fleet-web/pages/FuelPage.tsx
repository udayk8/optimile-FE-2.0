import React, { useState, useEffect } from 'react';
import { FuelEvent, AdBlueEvent, ConfidenceFlag, Vehicle, FuelType, EmissionStandard, EnergyAnomaly } from '../types';
import { FuelAPI, AdBlueAPI, VehicleAPI, EnergyAPI } from '../services/mockDatabase';
import { Button, Input, Select, Badge, Modal } from '../components/UI';
import { IconFuel, IconPlus, IconAlert, IconDroplet, IconCheck, IconZap, IconChart } from '../components/Icons';

export const FuelPage: React.FC = () => {
  const [fuelEvents, setFuelEvents] = useState<FuelEvent[]>([]);
  const [adBlueEvents, setAdBlueEvents] = useState<AdBlueEvent[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [anomalies, setAnomalies] = useState<EnergyAnomaly[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  
  // View State
  const [viewType, setViewType] = useState<'FUEL' | 'ADBLUE'>('FUEL');

  // Modals
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [isAdBlueModalOpen, setIsAdBlueModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms
  const [fuelForm, setFuelForm] = useState({
      vehicle_id: '',
      event_date: new Date().toISOString().slice(0, 16),
      fuel_quantity_liters: '',
      odometer_reading: '',
      fuel_source: 'Pump',
      vendor_name: '',
      location: '',
      total_cost_signal: '',
      confidence_flag: ConfidenceFlag.ACTUAL,
      fuel_type: FuelType.DIESEL
  });

  const [adBlueForm, setAdBlueForm] = useState({
      vehicle_id: '',
      event_date: new Date().toISOString().slice(0, 16),
      quantity_liters: '',
      odometer_reading: '',
      vendor_name: '',
      source_type: 'Actual',
      confidence_flag: ConfidenceFlag.ACTUAL
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [fData, aData, vData, aAnomaly] = await Promise.all([
        FuelAPI.getEvents(),
        AdBlueAPI.getEvents(),
        VehicleAPI.getAll(),
        EnergyAPI.getAnomalies()
      ]);
      setFuelEvents(fData.sort((a,b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()));
      setAdBlueEvents(aData.sort((a,b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()));
      setVehicles(vData);
      setAnomalies(aAnomaly);
    } catch (error) {
      console.error("Failed to fetch fuel/energy data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFuelSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
          await FuelAPI.addEvent({
              ...fuelForm,
              fuel_quantity_liters: parseFloat(fuelForm.fuel_quantity_liters),
              odometer_reading: parseInt(fuelForm.odometer_reading),
              total_cost_signal: fuelForm.total_cost_signal ? parseFloat(fuelForm.total_cost_signal) : undefined,
              fuel_source: fuelForm.fuel_source as any,
              source_type: 'Actual',
              confidence_flag: fuelForm.confidence_flag
          });
          setIsFuelModalOpen(false);
          fetchData();
      } catch(e) {
          alert("Error adding fuel event");
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleAdBlueSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
          await AdBlueAPI.addEvent({
              ...adBlueForm,
              quantity_liters: parseFloat(adBlueForm.quantity_liters),
              odometer_reading: parseInt(adBlueForm.odometer_reading),
              source_type: 'Actual',
              confidence_flag: adBlueForm.confidence_flag
          });
          setIsAdBlueModalOpen(false);
          fetchData();
      } catch(e) {
          alert("Error adding AdBlue event");
      } finally {
          setIsSubmitting(false);
      }
  };

  const selectedVehicle = vehicles.find(v => v.vehicle_id === selectedVehicleId);
  const isBS6 = selectedVehicle?.emission_standard === EmissionStandard.BS6;

  const filteredFuelEvents = selectedVehicleId ? fuelEvents.filter(e => e.vehicle_id === selectedVehicleId) : fuelEvents;
  const filteredAdBlueEvents = selectedVehicleId ? adBlueEvents.filter(e => e.vehicle_id === selectedVehicleId) : adBlueEvents;

  // Simple Abnormal Logic (Mock)
  const isAbnormalFuel = (liters: number) => liters > 300; 

  const getVehicleReg = (id: string) => vehicles.find(v => v.vehicle_id === id)?.registration_number || id;

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading Energy Data...</div>;

  // Fleet Stats
  const totalFuel = fuelEvents.reduce((acc, curr) => acc + curr.fuel_quantity_liters, 0);
  const totalAdBlue = adBlueEvents.reduce((acc, curr) => acc + curr.quantity_liters, 0);
  const fleetEfficiency = totalFuel > 0 ? (totalFuel / 100).toFixed(2) : '3.5'; // Mock avg
  const fleetAdBlueRatio = totalFuel > 0 ? ((totalAdBlue / totalFuel) * 100).toFixed(2) : '0';

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Fuel & Energy Console</h1>
        <div className="flex space-x-2">
            <Button variant={viewType === 'FUEL' ? 'primary' : 'secondary'} onClick={() => setViewType('FUEL')}>
                <IconFuel className="w-5 h-5 mr-2" />
                Fuel Logs
            </Button>
            <Button variant={viewType === 'ADBLUE' ? 'primary' : 'secondary'} onClick={() => setViewType('ADBLUE')}>
                <IconDroplet className="w-5 h-5 mr-2" />
                AdBlue (DEF)
            </Button>
        </div>
      </div>

      {/* Fleet Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center text-sm text-gray-500 mb-2">
                  <IconZap className="w-4 h-4 mr-2" />
                  Fleet Efficiency
              </div>
              <div className="text-2xl font-bold text-gray-900">{fleetEfficiency} <span className="text-sm font-normal text-gray-500">km/l</span></div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center text-sm text-gray-500 mb-2">
                  <IconDroplet className="w-4 h-4 mr-2" />
                  AdBlue Compliance
              </div>
              <div className="text-2xl font-bold text-gray-900">{fleetAdBlueRatio}% <span className="text-sm font-normal text-gray-500">ratio</span></div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center text-sm text-gray-500 mb-2">
                  <IconAlert className="w-4 h-4 mr-2" />
                  Active Anomalies
              </div>
              <div className={`text-2xl font-bold ${anomalies.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {anomalies.length}
              </div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center text-sm text-gray-500 mb-2">
                  <IconChart className="w-4 h-4 mr-2" />
                  Total Fuel Vol
              </div>
              <div className="text-2xl font-bold text-gray-900">{totalFuel.toLocaleString()} <span className="text-sm font-normal text-gray-500">L</span></div>
          </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="w-full sm:w-64">
             <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Vehicle</label>
             <select 
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                value={selectedVehicleId}
                onChange={e => {
                    setSelectedVehicleId(e.target.value);
                    if (e.target.value) {
                        const v = vehicles.find(veh => veh.vehicle_id === e.target.value);
                        // Auto-switch to AdBlue view if user specifically wants to check a BS6 vehicle but maybe was on Fuel tab? No, let's keep user control.
                    }
                }}
             >
                 <option value="">All Vehicles</option>
                 {vehicles.map(v => (
                     <option key={v.vehicle_id} value={v.vehicle_id}>{v.registration_number} ({v.emission_standard || 'BS4'})</option>
                 ))}
             </select>
        </div>

        {viewType === 'FUEL' ? (
            <Button onClick={() => {
                setFuelForm(prev => ({...prev, vehicle_id: selectedVehicleId || ''}));
                setIsFuelModalOpen(true);
            }}>
                <IconPlus className="w-5 h-5 mr-2" />
                Log Fuel
            </Button>
        ) : (
            <Button onClick={() => {
                setAdBlueForm(prev => ({...prev, vehicle_id: selectedVehicleId || ''}));
                setIsAdBlueModalOpen(true);
            }}>
                <IconPlus className="w-5 h-5 mr-2" />
                Log AdBlue
            </Button>
        )}
      </div>

      {viewType === 'ADBLUE' && selectedVehicleId && !isBS6 && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                  <div className="flex-shrink-0">
                      <IconAlert className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                          Selected vehicle <strong>{selectedVehicle?.registration_number}</strong> is marked as <strong>{selectedVehicle?.emission_standard || 'BS4'}</strong>. 
                          AdBlue logging is typically required only for <strong>BS6</strong> vehicles.
                      </p>
                  </div>
              </div>
          </div>
      )}

      <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
         {viewType === 'FUEL' ? (
             <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Odometer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost Signal</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {filteredFuelEvents.map(e => (
                        <tr key={e.fuel_event_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">{new Date(e.event_date).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{getVehicleReg(e.vehicle_id)}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                                <Badge color="gray">{e.fuel_type}</Badge>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{e.odometer_reading.toLocaleString()} km</td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                                {e.fuel_quantity_liters} L
                                {isAbnormalFuel(e.fuel_quantity_liters) && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">High</span>}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{e.vendor_name}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">₹{e.total_cost_signal?.toLocaleString()}</td>
                            <td className="px-6 py-4">
                                <Badge color={e.confidence_flag === 'High' ? 'green' : e.confidence_flag === 'Medium' ? 'yellow' : 'red'}>{e.confidence_flag}</Badge>
                            </td>
                        </tr>
                    ))}
                    {filteredFuelEvents.length === 0 && (
                        <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No fuel events recorded.</td></tr>
                    )}
                </tbody>
             </table>
         ) : (
             <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-blue-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase">Vehicle</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase">Odometer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase">AdBlue Qty (L)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase">Vendor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase">Source</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase">Confidence</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAdBlueEvents.map(e => (
                        <tr key={e.adblue_event_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">{new Date(e.event_date).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{getVehicleReg(e.vehicle_id)}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{e.odometer_reading.toLocaleString()} km</td>
                            <td className="px-6 py-4 text-sm font-bold text-blue-600">
                                <span className="flex items-center"><IconDroplet className="w-3 h-3 mr-1"/> {e.quantity_liters} L</span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{e.vendor_name}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{e.source_type}</td>
                            <td className="px-6 py-4">
                                <Badge color={e.confidence_flag === 'High' ? 'green' : e.confidence_flag === 'Medium' ? 'yellow' : 'red'}>{e.confidence_flag}</Badge>
                            </td>
                        </tr>
                    ))}
                    {filteredAdBlueEvents.length === 0 && (
                        <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No AdBlue (DEF) events recorded.</td></tr>
                    )}
                </tbody>
             </table>
         )}
      </div>

       {/* Fuel Modal */}
       <Modal isOpen={isFuelModalOpen} onClose={() => setIsFuelModalOpen(false)} title="Log Fuel Event">
        <form onSubmit={handleFuelSubmit}>
            <Select 
                label="Vehicle" 
                options={vehicles.map(v => ({ label: `${v.registration_number} (${v.fuel_type || 'Diesel'})`, value: v.vehicle_id }))}
                value={fuelForm.vehicle_id}
                onChange={e => {
                    const v = vehicles.find(vh => vh.vehicle_id === e.target.value);
                    setFuelForm({...fuelForm, vehicle_id: e.target.value, fuel_type: v?.fuel_type || FuelType.DIESEL });
                }}
                required
            />
            <div className="grid grid-cols-2 gap-4">
                 <Input 
                    label="Date Time" 
                    type="datetime-local"
                    value={fuelForm.event_date}
                    onChange={e => setFuelForm({...fuelForm, event_date: e.target.value})}
                    required
                />
                 <Input 
                    label="Odometer (km)" 
                    type="number"
                    value={fuelForm.odometer_reading}
                    onChange={e => setFuelForm({...fuelForm, odometer_reading: e.target.value})}
                    required
                />
            </div>
             <div className="grid grid-cols-2 gap-4">
                 <Input 
                    label="Fuel Quantity (L)" 
                    type="number"
                    step="0.01"
                    value={fuelForm.fuel_quantity_liters}
                    onChange={e => setFuelForm({...fuelForm, fuel_quantity_liters: e.target.value})}
                    required
                />
                 <Input 
                    label="Total Cost Signal (₹)" 
                    type="number"
                    step="0.01"
                    value={fuelForm.total_cost_signal}
                    onChange={e => setFuelForm({...fuelForm, total_cost_signal: e.target.value})}
                />
            </div>
             <div className="grid grid-cols-2 gap-4">
                 <Input 
                    label="Vendor Name" 
                    value={fuelForm.vendor_name}
                    onChange={e => setFuelForm({...fuelForm, vendor_name: e.target.value})}
                    required
                />
                 <Input 
                    label="Location" 
                    value={fuelForm.location}
                    onChange={e => setFuelForm({...fuelForm, location: e.target.value})}
                    required
                />
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={() => setIsFuelModalOpen(false)}>Cancel</Button>
                <Button type="submit" isLoading={isSubmitting}>Save Fuel Log</Button>
            </div>
        </form>
      </Modal>

      {/* AdBlue Modal */}
      <Modal isOpen={isAdBlueModalOpen} onClose={() => setIsAdBlueModalOpen(false)} title="Log AdBlue (DEF) Event">
        <form onSubmit={handleAdBlueSubmit}>
            <div className="bg-blue-50 p-3 rounded mb-4 text-xs text-blue-800 flex items-start">
                <IconDroplet className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                <span>AdBlue tracking is mandatory for BS6 compliance. Ensure accurate quantity logging.</span>
            </div>

            <Select 
                label="Vehicle" 
                options={vehicles.filter(v => v.emission_standard === EmissionStandard.BS6 || v.vehicle_id === adBlueForm.vehicle_id).map(v => ({ label: v.registration_number, value: v.vehicle_id }))}
                value={adBlueForm.vehicle_id}
                onChange={e => setAdBlueForm({...adBlueForm, vehicle_id: e.target.value})}
                required
            />
            {adBlueForm.vehicle_id === '' && (
                <p className="text-xs text-gray-500 mb-4 -mt-3">Only BS6 vehicles are shown by default.</p>
            )}

            <div className="grid grid-cols-2 gap-4">
                 <Input 
                    label="Date Time" 
                    type="datetime-local"
                    value={adBlueForm.event_date}
                    onChange={e => setAdBlueForm({...adBlueForm, event_date: e.target.value})}
                    required
                />
                 <Input 
                    label="Odometer (km)" 
                    type="number"
                    value={adBlueForm.odometer_reading}
                    onChange={e => setAdBlueForm({...adBlueForm, odometer_reading: e.target.value})}
                    required
                />
            </div>
             <div className="grid grid-cols-2 gap-4">
                 <Input 
                    label="AdBlue Quantity (L)" 
                    type="number"
                    step="0.01"
                    value={adBlueForm.quantity_liters}
                    onChange={e => setAdBlueForm({...adBlueForm, quantity_liters: e.target.value})}
                    required
                />
                 <Input 
                    label="Vendor Name" 
                    value={adBlueForm.vendor_name}
                    onChange={e => setAdBlueForm({...adBlueForm, vendor_name: e.target.value})}
                    required
                />
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={() => setIsAdBlueModalOpen(false)}>Cancel</Button>
                <Button type="submit" isLoading={isSubmitting}>Save DEF Log</Button>
            </div>
        </form>
      </Modal>
    </div>
  );
};