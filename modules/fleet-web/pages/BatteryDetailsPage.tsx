
import React, { useState, useEffect } from 'react';
import { Battery, BatteryInstallation, BatteryStatus, Vehicle, BatteryHealthRecord, BatteryFailureEvent, BatteryHealthStatus, BatteryFailureType, BatteryCostEvent, GarageVisit, WorkOrder, WorkOrderStatus, GarageVisitStatus } from '../types';
import { BatteryAPI, BatteryHealthAPI, BatteryFailureAPI, BatteryCostAPI } from '../services/mockDatabase2';
import { VehicleAPI, MaintenanceAPI } from '../services/mockDatabase';
import { GarageVisitAPI } from '../services/mockDatabase1';
import { Button, Badge, Modal, Input, Select } from '../components/UI';
import { IconArrowRight, IconBattery, IconTruck, IconHistory, IconWrench, IconTrash, IconHeartbeat, IconAlert, IconCheck, IconPlus, IconCircleDollar, IconMechanic } from '../components/Icons';

interface Props {
    batteryId: string;
    onBack: () => void;
}

export const BatteryDetailsPage: React.FC<Props> = ({ batteryId, onBack }) => {
    const [battery, setBattery] = useState<Battery | null>(null);
    const [history, setHistory] = useState<BatteryInstallation[]>([]);
    const [health, setHealth] = useState<BatteryHealthRecord[]>([]);
    const [failures, setFailures] = useState<BatteryFailureEvent[]>([]);
    const [costs, setCosts] = useState<BatteryCostEvent[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    
    // Context Options
    const [activeVisits, setActiveVisits] = useState<GarageVisit[]>([]);
    const [activeWorkOrders, setActiveWorkOrders] = useState<WorkOrder[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'lifecycle' | 'health' | 'failures' | 'financials'>('overview');

    // Install Modal
    const [isInstallOpen, setIsInstallOpen] = useState(false);
    const [installForm, setInstallForm] = useState({ 
        vehicle_id: '', 
        installed_at: new Date().toISOString().slice(0, 16), 
        odometer: '',
        visit_id: '',
        work_order_id: '',
        technician_name: ''
    });

    // Remove Modal
    const [isRemoveOpen, setIsRemoveOpen] = useState(false);
    const [removeForm, setRemoveForm] = useState({ 
        removed_at: new Date().toISOString().slice(0, 16), 
        odometer: '', 
        reason: 'Rotation',
        visit_id: '',
        work_order_id: ''
    });

    // Health Modal
    const [isHealthOpen, setIsHealthOpen] = useState(false);
    const [healthForm, setHealthForm] = useState({ 
        voltage_reading: '', 
        health_status: BatteryHealthStatus.GOOD, 
        inspection_date: new Date().toISOString().split('T')[0],
        remarks: ''
    });

    // Failure Modal
    const [isFailureOpen, setIsFailureOpen] = useState(false);
    const [failureForm, setFailureForm] = useState({
        failure_date: new Date().toISOString().split('T')[0],
        odometer: '',
        failure_type: BatteryFailureType.SUDDEN
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, [batteryId]);

    useEffect(() => {
        // Fetch context when vehicle changes in Install Modal
        if (isInstallOpen && installForm.vehicle_id) {
            fetchContext(installForm.vehicle_id);
        } else {
            setActiveVisits([]);
            setActiveWorkOrders([]);
        }
    }, [installForm.vehicle_id, isInstallOpen]);

    useEffect(() => {
        // Fetch context for removal (current vehicle)
        if (isRemoveOpen && battery?.current_vehicle_id) {
            fetchContext(battery.current_vehicle_id);
        }
    }, [isRemoveOpen, battery]);

    const loadData = async () => {
        setIsLoading(true);
        const [b, h, v, hr, fr, cr] = await Promise.all([
            BatteryAPI.getById(batteryId),
            BatteryAPI.getInstallations(batteryId),
            VehicleAPI.getAll(),
            BatteryHealthAPI.getByBattery(batteryId),
            BatteryFailureAPI.getByBattery(batteryId),
            BatteryCostAPI.getByBattery(batteryId)
        ]);
        setBattery(b || null);
        setHistory(h);
        setVehicles(v);
        setHealth(hr);
        setFailures(fr);
        setCosts(cr);
        setIsLoading(false);
    };

    const fetchContext = async (vehicleId: string) => {
        const [visits, wos] = await Promise.all([
            GarageVisitAPI.getAll(),
            MaintenanceAPI.getWorkOrders()
        ]);
        setActiveVisits(visits.filter(v => v.vehicle_id === vehicleId && v.visit_status !== GarageVisitStatus.COMPLETED));
        setActiveWorkOrders(wos.filter(w => w.vehicle_id === vehicleId && w.status !== WorkOrderStatus.CLOSED));
    };

    const handleInstall = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!battery) return;
        setIsSubmitting(true);
        try {
            await BatteryAPI.install({
                battery_id: battery.battery_id,
                vehicle_id: installForm.vehicle_id,
                installed_at: new Date(installForm.installed_at).toISOString(),
                odometer: parseInt(installForm.odometer),
                visit_id: installForm.visit_id || undefined,
                work_order_id: installForm.work_order_id || undefined,
                technician_name: installForm.technician_name
            });
            setIsInstallOpen(false);
            loadData();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemove = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!battery) return;
        setIsSubmitting(true);
        try {
            await BatteryAPI.remove({
                battery_id: battery.battery_id,
                removed_at: new Date(removeForm.removed_at).toISOString(),
                odometer: parseInt(removeForm.odometer),
                reason: removeForm.reason,
                visit_id: removeForm.visit_id || undefined,
                work_order_id: removeForm.work_order_id || undefined
            });
            setIsRemoveOpen(false);
            loadData();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleScrap = async () => {
        if (!battery) return;
        if (!window.confirm("Are you sure you want to SCRAP this battery? This is irreversible.")) return;
        await BatteryAPI.updateStatus(battery.battery_id, BatteryStatus.SCRAPPED);
        loadData();
    };

    const handleLogHealth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!battery) return;
        setIsSubmitting(true);
        try {
            await BatteryHealthAPI.add({
                battery_id: battery.battery_id,
                health_status: healthForm.health_status,
                voltage_reading: parseFloat(healthForm.voltage_reading),
                inspection_date: healthForm.inspection_date,
                remarks: healthForm.remarks
            });
            setIsHealthOpen(false);
            setHealthForm({ voltage_reading: '', health_status: BatteryHealthStatus.GOOD, inspection_date: new Date().toISOString().split('T')[0], remarks: '' });
            loadData();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReportFailure = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!battery) return;
        if (!battery.current_vehicle_id) {
            alert("Battery must be installed on a vehicle to report a failure.");
            return;
        }
        if(!window.confirm("Reporting a failure will mark the battery as FAILED and remove it from the vehicle. Continue?")) return;

        setIsSubmitting(true);
        try {
            await BatteryFailureAPI.reportFailure({
                battery_id: battery.battery_id,
                vehicle_id: battery.current_vehicle_id,
                failure_date: failureForm.failure_date,
                odometer: parseInt(failureForm.odometer),
                failure_type: failureForm.failure_type
            });
            setIsFailureOpen(false);
            loadData();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getVehicleReg = (id: string) => vehicles.find(v => v.vehicle_id === id)?.registration_number || id;

    if (!battery) return <div>Loading...</div>;

    const getStatusColor = (status: BatteryStatus) => {
        switch(status) {
            case BatteryStatus.INSTALLED: return 'green';
            case BatteryStatus.IN_STOCK: return 'blue';
            case BatteryStatus.FAILED: return 'red';
            case BatteryStatus.SCRAPPED: return 'gray';
            default: return 'gray';
        }
    };

    const getHealthColor = (status: BatteryHealthStatus) => {
        switch(status) {
            case BatteryHealthStatus.GOOD: return 'green';
            case BatteryHealthStatus.WEAK: return 'yellow';
            case BatteryHealthStatus.CRITICAL: return 'red';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4 mb-4">
                <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
                    <IconArrowRight className="w-6 h-6 transform rotate-180" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">{battery.serial_number}</h1>
                    <p className="text-sm text-gray-500">{battery.brand} {battery.model} ({battery.battery_type})</p>
                </div>
                <Badge color={getStatusColor(battery.status)}>{battery.status}</Badge>
                
                {battery.status === BatteryStatus.IN_STOCK && (
                    <Button onClick={() => setIsInstallOpen(true)}>
                        <IconWrench className="w-4 h-4 mr-2" />
                        Install
                    </Button>
                )}
                {battery.status === BatteryStatus.INSTALLED && (
                    <>
                        <Button variant="secondary" onClick={() => setIsRemoveOpen(true)}>
                            <IconWrench className="w-4 h-4 mr-2" />
                            Remove
                        </Button>
                        <Button variant="danger" onClick={() => setIsFailureOpen(true)}>
                            <IconAlert className="w-4 h-4 mr-2" />
                            Report Failure
                        </Button>
                    </>
                )}
                {(battery.status === BatteryStatus.FAILED || battery.status === BatteryStatus.IN_STOCK) && (
                    <Button variant="danger" onClick={handleScrap}>
                        <IconTrash className="w-4 h-4 mr-2" />
                        Scrap
                    </Button>
                )}
            </div>

            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    {['Overview', 'Lifecycle', 'Health', 'Financials', 'Failures'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab.toLowerCase() as any)}
                            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === tab.toLowerCase()
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {activeTab === 'overview' && (
                <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2 flex items-center">
                        <IconBattery className="w-5 h-5 mr-2 text-gray-500" />
                        Asset Specifications
                    </h3>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                        <div>
                            <dt className="text-gray-500">Capacity</dt>
                            <dd className="font-medium text-gray-900">{battery.capacity_ah} Ah</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Voltage</dt>
                            <dd className="font-medium text-gray-900">{battery.voltage} V</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Purchased</dt>
                            <dd className="font-medium text-gray-900">{battery.purchase_date}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Cost</dt>
                            <dd className="font-medium text-gray-900">₹{battery.purchase_cost.toLocaleString()}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Warranty Exp</dt>
                            <dd className="font-medium text-gray-900">{battery.warranty_expiry_date}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Current Vehicle</dt>
                            <dd className="font-medium text-blue-600">{battery.current_vehicle_id ? getVehicleReg(battery.current_vehicle_id) : 'N/A'}</dd>
                        </div>
                    </dl>
                </div>
            )}

            {activeTab === 'lifecycle' && (
                <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2 flex items-center">
                        <IconHistory className="w-5 h-5 mr-2 text-gray-500" />
                        Installation History
                    </h3>
                    <div className="space-y-4 max-h-60 overflow-y-auto">
                        {history.map((inst, idx) => (
                            <div key={inst.installation_id} className="relative pl-6 border-l-2 border-gray-200 pb-4 last:pb-0">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 bg-gray-200 rounded-full border-2 border-white"></div>
                                <div className="text-sm">
                                    <div className="flex justify-between">
                                        <span className="font-medium text-gray-900">Installed in {getVehicleReg(inst.vehicle_id)}</span>
                                        <span className="text-xs text-gray-400">{inst.visit_id ? 'Garage Visit Linked' : ''}</span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {new Date(inst.installed_at).toLocaleDateString()} • {inst.odometer_at_install.toLocaleString()} km
                                        {inst.technician_name && <span> • Tech: {inst.technician_name}</span>}
                                    </div>
                                    
                                    {inst.removed_at ? (
                                        <div className="mt-2 bg-red-50 p-2 rounded text-red-800 text-xs">
                                            <div>Removed: {new Date(inst.removed_at).toLocaleDateString()}</div>
                                            <div>Reason: {inst.removal_reason}</div>
                                            <div>Km Run: {inst.odometer_at_removal ? (inst.odometer_at_removal - inst.odometer_at_install).toLocaleString() : 0} km</div>
                                        </div>
                                    ) : (
                                        <div className="mt-2 text-green-600 text-xs font-medium">Currently Active</div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {history.length === 0 && <div className="text-gray-500 text-sm">No installation history.</div>}
                    </div>
                </div>
            )}

            {activeTab === 'financials' && (
                <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-gray-900 flex items-center">
                            <IconCircleDollar className="w-5 h-5 mr-2 text-gray-500" />
                            Cost & Value Tracking
                        </h3>
                    </div>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-white">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Context</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {costs.map(c => (
                                <tr key={c.cost_id}>
                                    <td className="px-6 py-4 text-sm text-gray-900">{new Date(c.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{c.cost_type}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">₹{c.cost_amount.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{c.vehicle_id ? getVehicleReg(c.vehicle_id) : '-'}</td>
                                    <td className="px-6 py-4 text-xs text-gray-500">
                                        {c.visit_id && <div>Visit ID: {c.visit_id.slice(0,8)}...</div>}
                                        {c.work_order_id && <div>WO ID: {c.work_order_id.slice(0,8)}...</div>}
                                    </td>
                                </tr>
                            ))}
                            {costs.length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No cost events recorded.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'health' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <Button size="sm" onClick={() => setIsHealthOpen(true)}>
                            <IconPlus className="w-4 h-4 mr-2" />
                            Log Health Check
                        </Button>
                    </div>
                    <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voltage</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {health.map(rec => (
                                    <tr key={rec.record_id}>
                                        <td className="px-6 py-4 text-sm text-gray-900">{new Date(rec.inspection_date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-sm font-mono text-gray-900">{rec.voltage_reading} V</td>
                                        <td className="px-6 py-4">
                                            <Badge color={getHealthColor(rec.health_status)}>{rec.health_status}</Badge>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{rec.remarks || '-'}</td>
                                    </tr>
                                ))}
                                {health.length === 0 && (
                                    <tr><td colSpan={4} className="p-4 text-center text-gray-500">No health records logged.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'failures' && (
                <div className="bg-white shadow rounded-lg border border-red-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-red-50">
                        <h3 className="font-bold text-red-900 flex items-center">
                            <IconAlert className="w-5 h-5 mr-2" />
                            Failure Events
                        </h3>
                    </div>
                    {failures.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No failure events recorded.</div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {failures.map(f => (
                                <div key={f.failure_id} className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-gray-900">{f.failure_type}</span>
                                        {f.within_warranty ? (
                                            <Badge color="red">Under Warranty</Badge>
                                        ) : (
                                            <Badge color="gray">Out of Warranty</Badge>
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <p>Date: {f.failure_date}</p>
                                        <p>Vehicle: {getVehicleReg(f.vehicle_id)}</p>
                                        <p>Odometer: {f.odometer} km</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Install Modal */}
            <Modal isOpen={isInstallOpen} onClose={() => setIsInstallOpen(false)} title="Install Battery">
                <form onSubmit={handleInstall}>
                    <Select 
                        label="Vehicle"
                        options={vehicles.map(v => ({ label: v.registration_number, value: v.vehicle_id }))}
                        value={installForm.vehicle_id}
                        onChange={e => setInstallForm({...installForm, vehicle_id: e.target.value})}
                        required
                    />
                    
                    {/* Integrated Fields */}
                    <div className="bg-blue-50 p-3 rounded border border-blue-100 mb-4">
                        <h4 className="text-xs font-bold text-blue-900 mb-2 uppercase">Operational Context (Optional)</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Active Garage Visit</label>
                                <select
                                    className="block w-full text-xs border-gray-300 rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500"
                                    value={installForm.visit_id}
                                    onChange={e => setInstallForm({...installForm, visit_id: e.target.value})}
                                >
                                    <option value="">None</option>
                                    {activeVisits.map(v => (
                                        <option key={v.visit_id} value={v.visit_id}>
                                            {new Date(v.entry_datetime).toLocaleDateString()} - {v.reason_for_visit}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Active Work Order</label>
                                <select
                                    className="block w-full text-xs border-gray-300 rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500"
                                    value={installForm.work_order_id}
                                    onChange={e => setInstallForm({...installForm, work_order_id: e.target.value})}
                                >
                                    <option value="">None</option>
                                    {activeWorkOrders.map(w => (
                                        <option key={w.work_order_id} value={w.work_order_id}>
                                            {w.issue_type}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Installation Date"
                            type="datetime-local"
                            value={installForm.installed_at}
                            onChange={e => setInstallForm({...installForm, installed_at: e.target.value})}
                            required
                        />
                        <Input 
                            label="Odometer (km)"
                            type="number"
                            value={installForm.odometer}
                            onChange={e => setInstallForm({...installForm, odometer: e.target.value})}
                            required
                        />
                    </div>
                    
                    <Input 
                        label="Technician Name"
                        value={installForm.technician_name}
                        onChange={e => setInstallForm({...installForm, technician_name: e.target.value})}
                        placeholder="e.g. Rahul Sharma"
                    />

                    <div className="mt-6 flex justify-end space-x-3">
                        <Button type="button" variant="secondary" onClick={() => setIsInstallOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={isSubmitting}>Confirm Installation</Button>
                    </div>
                </form>
            </Modal>

            {/* Remove Modal */}
            <Modal isOpen={isRemoveOpen} onClose={() => setIsRemoveOpen(false)} title="Remove Battery">
                <form onSubmit={handleRemove}>
                    {/* Context for Removal */}
                    <div className="bg-red-50 p-3 rounded border border-red-100 mb-4">
                        <h4 className="text-xs font-bold text-red-900 mb-2 uppercase">Removal Context</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Active Garage Visit</label>
                                <select
                                    className="block w-full text-xs border-gray-300 rounded-md p-1.5"
                                    value={removeForm.visit_id}
                                    onChange={e => setRemoveForm({...removeForm, visit_id: e.target.value})}
                                >
                                    <option value="">None</option>
                                    {activeVisits.map(v => (
                                        <option key={v.visit_id} value={v.visit_id}>{new Date(v.entry_datetime).toLocaleDateString()} - {v.reason_for_visit}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Removal Date"
                            type="datetime-local"
                            value={removeForm.removed_at}
                            onChange={e => setRemoveForm({...removeForm, removed_at: e.target.value})}
                            required
                        />
                        <Input 
                            label="Odometer (km)"
                            type="number"
                            value={removeForm.odometer}
                            onChange={e => setRemoveForm({...removeForm, odometer: e.target.value})}
                            required
                        />
                    </div>
                    <Select 
                        label="Reason"
                        options={['Rotation', 'Maintenance', 'Theft', 'Disposal'].map(r => ({ label: r, value: r }))}
                        value={removeForm.reason}
                        onChange={e => setRemoveForm({...removeForm, reason: e.target.value})}
                        required
                    />
                    <div className="mt-6 flex justify-end space-x-3">
                        <Button type="button" variant="secondary" onClick={() => setIsRemoveOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={isSubmitting} variant="danger">Confirm Removal</Button>
                    </div>
                </form>
            </Modal>

            {/* Health Modal */}
            <Modal isOpen={isHealthOpen} onClose={() => setIsHealthOpen(false)} title="Log Health Inspection">
                <form onSubmit={handleLogHealth}>
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Date"
                            type="date"
                            value={healthForm.inspection_date}
                            onChange={e => setHealthForm({...healthForm, inspection_date: e.target.value})}
                            required
                        />
                        <Input 
                            label="Voltage (V)"
                            type="number"
                            step="0.1"
                            value={healthForm.voltage_reading}
                            onChange={e => setHealthForm({...healthForm, voltage_reading: e.target.value})}
                            required
                        />
                    </div>
                    <Select 
                        label="Condition"
                        options={Object.values(BatteryHealthStatus).map(s => ({ label: s, value: s }))}
                        value={healthForm.health_status}
                        onChange={e => setHealthForm({...healthForm, health_status: e.target.value as BatteryHealthStatus})}
                        required
                    />
                    <Input 
                        label="Remarks"
                        value={healthForm.remarks}
                        onChange={e => setHealthForm({...healthForm, remarks: e.target.value})}
                    />
                    <div className="mt-6 flex justify-end space-x-3">
                        <Button type="button" variant="secondary" onClick={() => setIsHealthOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={isSubmitting}>Log Record</Button>
                    </div>
                </form>
            </Modal>

            {/* Failure Modal */}
            <Modal isOpen={isFailureOpen} onClose={() => setIsFailureOpen(false)} title="Report Battery Failure">
                <form onSubmit={handleReportFailure}>
                    <div className="bg-red-50 p-4 mb-4 rounded text-sm text-red-800">
                        Warning: This will mark the battery as FAILED and detach it from the current vehicle.
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Failure Date"
                            type="date"
                            value={failureForm.failure_date}
                            onChange={e => setFailureForm({...failureForm, failure_date: e.target.value})}
                            required
                        />
                        <Input 
                            label="Odometer (km)"
                            type="number"
                            value={failureForm.odometer}
                            onChange={e => setFailureForm({...failureForm, odometer: e.target.value})}
                            required
                        />
                    </div>
                    <Select 
                        label="Failure Type"
                        options={Object.values(BatteryFailureType).map(t => ({ label: t, value: t }))}
                        value={failureForm.failure_type}
                        onChange={e => setFailureForm({...failureForm, failure_type: e.target.value as BatteryFailureType})}
                        required
                    />
                    <div className="mt-6 flex justify-end space-x-3">
                        <Button type="button" variant="secondary" onClick={() => setIsFailureOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={isSubmitting} variant="danger">Confirm Failure</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
