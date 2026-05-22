
import React, { useState, useEffect } from 'react';
import { Battery, BatteryStatus, BatteryType, Vehicle, BatteryIntelligence } from '../types';
import { BatteryAPI, BatteryIntelligenceAPI } from '../services/mockDatabase2';
import { VehicleAPI } from '../services/mockDatabase';
import { Button, Input, Select, Badge, Modal } from '../components/UI';
import { IconBattery, IconPlus, IconSearch, IconArrowRight, IconChart, IconAlert, IconCheck } from '../components/Icons';
import { BatteryDetailsPage } from './BatteryDetailsPage';

export const BatteryPage: React.FC = () => {
    const [view, setView] = useState<'registry' | 'intelligence'>('registry');
    const [batteries, setBatteries] = useState<Battery[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [intel, setIntel] = useState<BatteryIntelligence | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [selectedBatteryId, setSelectedBatteryId] = useState<string | null>(null);

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newBattery, setNewBattery] = useState({
        serial_number: '',
        battery_type: BatteryType.STARTER,
        brand: '',
        model: '',
        capacity_ah: '',
        voltage: '12',
        purchase_date: new Date().toISOString().split('T')[0],
        warranty_months: '12',
        purchase_cost: ''
    });

    useEffect(() => {
        loadData();
    }, [selectedBatteryId, view]); // Reload when returning from details or switching views

    const loadData = async () => {
        setIsLoading(true);
        const [b, v] = await Promise.all([BatteryAPI.getAll(), VehicleAPI.getAll()]);
        setBatteries(b);
        setVehicles(v);
        
        if (view === 'intelligence') {
            const i = await BatteryIntelligenceAPI.getStats();
            setIntel(i);
        }
        
        setIsLoading(false);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Calculate warranty expiry
            const purchaseDate = new Date(newBattery.purchase_date);
            const warrantyExpiry = new Date(purchaseDate);
            warrantyExpiry.setMonth(warrantyExpiry.getMonth() + parseInt(newBattery.warranty_months));

            await BatteryAPI.create({
                ...newBattery,
                capacity_ah: parseInt(newBattery.capacity_ah),
                voltage: parseInt(newBattery.voltage),
                warranty_months: parseInt(newBattery.warranty_months),
                purchase_cost: parseFloat(newBattery.purchase_cost),
                warranty_expiry_date: warrantyExpiry.toISOString().split('T')[0],
                battery_type: newBattery.battery_type as BatteryType
            });
            setIsModalOpen(false);
            loadData();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getVehicleReg = (id?: string) => vehicles.find(v => v.vehicle_id === id)?.registration_number || id;

    const filteredBatteries = batteries.filter(b => {
        const matchesSearch = b.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              b.brand.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus ? b.status === filterStatus : true;
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: BatteryStatus) => {
        switch(status) {
            case BatteryStatus.INSTALLED: return 'green';
            case BatteryStatus.IN_STOCK: return 'blue';
            case BatteryStatus.FAILED: return 'red';
            case BatteryStatus.SCRAPPED: return 'gray';
            default: return 'gray';
        }
    };

    if (selectedBatteryId) {
        return <BatteryDetailsPage batteryId={selectedBatteryId} onBack={() => setSelectedBatteryId(null)} />;
    }

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading Batteries...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Battery Registry</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage battery lifecycle, installations, and warranty.</p>
                </div>
                <div className="flex space-x-2">
                    <button 
                        onClick={() => setView('registry')}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${view === 'registry' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-700 border border-gray-300'}`}
                    >
                        Registry
                    </button>
                    <button 
                        onClick={() => setView('intelligence')}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${view === 'intelligence' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-700 border border-gray-300'}`}
                    >
                        Intelligence
                    </button>
                    {view === 'registry' && (
                        <Button onClick={() => setIsModalOpen(true)}>
                            <IconPlus className="w-5 h-5 mr-2" />
                            Add Battery
                        </Button>
                    )}
                </div>
            </div>

            {view === 'intelligence' && intel && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Warranty Risk Card */}
                        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Warranty Risk</h3>
                                    <p className="text-xs text-gray-500">Expiring in &lt; 30 days</p>
                                </div>
                                <div className="p-2 bg-yellow-100 rounded-full text-yellow-600">
                                    <IconAlert className="w-6 h-6" />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-4">{intel.expiringWarranties.length}</div>
                            {intel.expiringWarranties.length > 0 ? (
                                <div className="space-y-2">
                                    {intel.expiringWarranties.slice(0, 3).map(b => (
                                        <div key={b.battery_id} className="text-sm flex justify-between bg-gray-50 p-2 rounded">
                                            <span>{b.serial_number}</span>
                                            <span className="text-red-600">{b.warranty_expiry_date}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No immediate expiries.</p>
                            )}
                        </div>

                        {/* Failures Card */}
                        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Failure Analysis</h3>
                                    <p className="text-xs text-gray-500">Failures covered by Warranty</p>
                                </div>
                                <div className="p-2 bg-red-100 rounded-full text-red-600">
                                    <IconChart className="w-6 h-6" />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-2">{intel.failuresInWarranty}</div>
                            <p className="text-xs text-gray-500 mb-4">Battery failures that occurred before warranty expiry.</p>
                        </div>
                    </div>

                    {/* Brand Performance Table */}
                    <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <h3 className="font-bold text-gray-900">Brand Reliability Stats</h3>
                        </div>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-white">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Assets</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Failures</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Failure Rate</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {intel.brandFailureRates.map((stat, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4 font-medium text-gray-900">{stat.brand}</td>
                                        <td className="px-6 py-4 text-gray-500">{stat.total}</td>
                                        <td className="px-6 py-4 text-gray-500">{stat.failures}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                                    <div className={`h-2 rounded-full ${stat.ratePct > 10 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${stat.ratePct}%` }}></div>
                                                </div>
                                                <span className="text-sm font-medium">{stat.ratePct}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {view === 'registry' && (
                <>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex space-x-4">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <IconSearch className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                placeholder="Search by Serial No, Brand..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="w-48">
                            <select
                                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="">All Statuses</option>
                                {Object.values(BatteryStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial Number</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Make / Model</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specs</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Asset</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredBatteries.map(b => (
                                    <tr key={b.battery_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 flex items-center">
                                            <div className="p-2 bg-gray-100 rounded-full mr-3 text-gray-500">
                                                <IconBattery className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-900">{b.serial_number}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            <div>{b.brand}</div>
                                            <div className="text-xs text-gray-500">{b.model}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {b.capacity_ah}Ah / {b.voltage}V
                                            <div className="text-xs text-gray-400">{b.battery_type}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge color={getStatusColor(b.status)}>{b.status}</Badge>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {b.current_vehicle_id ? (
                                                <span className="font-medium text-blue-600">{getVehicleReg(b.current_vehicle_id)}</span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => setSelectedBatteryId(b.battery_id)}
                                                className="text-primary-600 hover:text-primary-900 text-sm font-medium flex items-center justify-end"
                                            >
                                                Details <IconArrowRight className="w-4 h-4 ml-1" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredBatteries.length === 0 && <div className="p-8 text-center text-gray-500">No batteries found.</div>}
                    </div>
                </>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register New Battery">
                <form onSubmit={handleCreate}>
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Serial Number" 
                            value={newBattery.serial_number}
                            onChange={e => setNewBattery({...newBattery, serial_number: e.target.value})}
                            required
                        />
                        <Select 
                            label="Type"
                            options={Object.values(BatteryType).map(t => ({ label: t, value: t }))}
                            value={newBattery.battery_type}
                            onChange={e => setNewBattery({...newBattery, battery_type: e.target.value as BatteryType})}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Brand" 
                            value={newBattery.brand}
                            onChange={e => setNewBattery({...newBattery, brand: e.target.value})}
                            required
                        />
                        <Input 
                            label="Model" 
                            value={newBattery.model}
                            onChange={e => setNewBattery({...newBattery, model: e.target.value})}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Capacity (Ah)" 
                            type="number"
                            value={newBattery.capacity_ah}
                            onChange={e => setNewBattery({...newBattery, capacity_ah: e.target.value})}
                            required
                        />
                        <Select 
                            label="Voltage"
                            options={[{label: '12V', value: '12'}, {label: '24V', value: '24'}]}
                            value={newBattery.voltage}
                            onChange={e => setNewBattery({...newBattery, voltage: e.target.value})}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <Input 
                            label="Purchase Date" 
                            type="date"
                            value={newBattery.purchase_date}
                            onChange={e => setNewBattery({...newBattery, purchase_date: e.target.value})}
                            required
                        />
                        <Input 
                            label="Warranty (Months)" 
                            type="number"
                            value={newBattery.warranty_months}
                            onChange={e => setNewBattery({...newBattery, warranty_months: e.target.value})}
                            required
                        />
                        <Input 
                            label="Cost (₹)" 
                            type="number"
                            value={newBattery.purchase_cost}
                            onChange={e => setNewBattery({...newBattery, purchase_cost: e.target.value})}
                            required
                        />
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={isSubmitting}>Register Asset</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
