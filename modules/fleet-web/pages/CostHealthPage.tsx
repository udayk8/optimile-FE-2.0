import React, { useState, useEffect } from 'react';
import { CostEvent, Vehicle, CostCategory } from '../types';
import { CostAPI, VehicleAPI } from '../services/mockDatabase';
import { IconCircleDollar, IconTruck, IconCheck, IconAlert } from '../components/Icons';

export const CostHealthPage: React.FC = () => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [events, setEvents] = useState<CostEvent[]>([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const [v, e] = await Promise.all([VehicleAPI.getAll(), CostAPI.getEvents()]);
        setVehicles(v);
        setEvents(e);
        if (v.length > 0) setSelectedVehicleId(v[0].vehicle_id);
        setIsLoading(false);
    };

    const vehicleEvents = events.filter(e => e.vehicle_id === selectedVehicleId);
    
    // Aggregation Logic
    const totalCost = vehicleEvents.reduce((sum, e) => sum + (e.cost_signal || 0), 0);
    const fuelCost = vehicleEvents.filter(e => e.cost_category === CostCategory.FUEL).reduce((sum, e) => sum + (e.cost_signal || 0), 0);
    const maintenanceCost = vehicleEvents.filter(e => e.cost_category === CostCategory.MAINTENANCE).reduce((sum, e) => sum + (e.cost_signal || 0), 0);
    
    const confidenceScore = vehicleEvents.length > 0 
        ? Math.round((vehicleEvents.filter(e => e.confidence_flag === 'High' || e.confidence_flag === 'Actual').length / vehicleEvents.length) * 100)
        : 100;

    const selectedVehicle = vehicles.find(v => v.vehicle_id === selectedVehicleId);

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading Cost Health...</div>;

    return (
        <div>
            <div className="mb-6">
                 <h1 className="text-2xl font-bold text-gray-900 mb-4">Vehicle Cost Health</h1>
                 <div className="w-full sm:w-64">
                    <select 
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                        value={selectedVehicleId}
                        onChange={e => setSelectedVehicleId(e.target.value)}
                    >
                        {vehicles.map(v => <option key={v.vehicle_id} value={v.vehicle_id}>{v.registration_number}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                            <IconCircleDollar className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Signal Cost</p>
                            <p className="text-2xl font-bold text-gray-900">₹{totalCost.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                 <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                            <IconCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Data Confidence Score</p>
                            <p className="text-2xl font-bold text-gray-900">{confidenceScore}%</p>
                        </div>
                    </div>
                </div>
                 <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mr-4">
                            <IconAlert className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Signal Ratio (Fuel:Maint)</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {maintenanceCost > 0 ? (fuelCost / maintenanceCost).toFixed(1) : '∞'}:1
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg border border-gray-200">
                 <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-medium text-gray-900">Cost Event Stream (Signals sent to TMS)</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Read Only</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost Signal</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                            </tr>
                        </thead>
                         <tbody className="bg-white divide-y divide-gray-200">
                            {vehicleEvents.length === 0 ? (
                                <tr><td colSpan={5} className="p-4 text-center text-gray-500">No cost events recorded.</td></tr>
                            ) : (
                                vehicleEvents.map(e => (
                                    <tr key={e.cost_event_id}>
                                        <td className="px-6 py-4 text-sm text-gray-900">{new Date(e.event_date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{e.cost_category}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{e.source}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">₹{e.cost_signal?.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{e.confidence_flag}</td>
                                    </tr>
                                ))
                            )}
                         </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};