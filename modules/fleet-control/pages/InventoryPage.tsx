import React, { useState, useEffect } from 'react';
import { SparePart, InventoryStock, InventoryMovement, PartCategory, MovementType, ReorderAlert, ReorderStatus, PurchaseRequest, RequestStatus } from '../types';
// Updated import to use new mockDatabase1
import { InventoryAPI, PurchaseRequestAPI } from '../services/mockDatabase1';
import { Button, Input, Select, Badge, Modal } from '../components/UI';
import { IconBox, IconPlus, IconSearch, IconAlert, IconHistory, IconRefresh, IconCheck, IconTruck, IconCircleDollar, IconChart, IconClipboardCheck } from '../components/Icons';

export const InventoryPage: React.FC = () => {
    const [view, setView] = useState<'catalog' | 'stock' | 'movements' | 'procurement'>('stock');
    const [parts, setParts] = useState<SparePart[]>([]);
    const [stock, setStock] = useState<InventoryStock[]>([]);
    const [movements, setMovements] = useState<InventoryMovement[]>([]);
    const [alerts, setAlerts] = useState<ReorderAlert[]>([]);
    const [requests, setRequests] = useState<PurchaseRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Create Part Modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newPart, setNewPart] = useState({
        part_name: '',
        part_category: PartCategory.OTHER,
        part_code: '',
        unit_of_measure: 'Nos',
        is_consumable: true,
        compatible_vehicle_types: '',
        status: 'Active',
        standard_cost: '',
        gst_rate: '18',
        hsn_code: '',
        // Opening Stock Fields
        opening_stock: '',
        opening_hub: 'Pune Hub',
        opening_cost: ''
    });

    // Adjust Stock Modal
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [adjustment, setAdjustment] = useState({
        part_id: '',
        hub_id: 'Pune Hub',
        type: MovementType.IN,
        quantity: 0,
        reference_type: 'Manual',
        reference_id: '',
        reason: '',
        unit_cost: '' 
    });

    // Purchase Request Modal
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [newRequest, setNewRequest] = useState({
        part_id: '',
        hub_id: 'Pune Hub',
        quantity: '',
        priority: 'Normal',
        notes: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, [view]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // First ensure we have up to date alerts
            if (view === 'procurement') {
                await InventoryAPI.runReorderScan();
            }

            const [p, s, m, a, r] = await Promise.all([
                InventoryAPI.getParts(),
                InventoryAPI.getStock(),
                InventoryAPI.getMovements(),
                InventoryAPI.getReorderAlerts(),
                PurchaseRequestAPI.getAll()
            ]);
            setParts(p);
            setStock(s);
            setMovements(m);
            setAlerts(a);
            setRequests(r);
        } catch (error) {
            console.error("Failed to load inventory data");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreatePart = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const createdPart = await InventoryAPI.createPart({
                ...newPart,
                compatible_vehicle_types: newPart.compatible_vehicle_types.split(',').map(s => s.trim()),
                standard_cost: newPart.standard_cost ? parseFloat(newPart.standard_cost) : 0,
                gst_rate: parseInt(newPart.gst_rate)
            });

            // Handle Opening Stock if provided
            if (newPart.opening_stock && parseFloat(newPart.opening_stock) > 0) {
                await InventoryAPI.adjustStock({
                    part_id: createdPart.part_id,
                    hub_id: newPart.opening_hub,
                    type: MovementType.IN,
                    quantity: parseFloat(newPart.opening_stock),
                    reference_type: 'Manual',
                    reference_id: 'Opening Balance',
                    performed_by: 'Current User',
                    reason: 'Initial Stock Upload',
                    unit_cost: newPart.opening_cost ? parseFloat(newPart.opening_cost) : (newPart.standard_cost ? parseFloat(newPart.standard_cost) : undefined)
                });
            }

            setIsCreateModalOpen(false);
            setNewPart({
                part_name: '',
                part_category: PartCategory.OTHER,
                part_code: '',
                unit_of_measure: 'Nos',
                is_consumable: true,
                compatible_vehicle_types: '',
                status: 'Active',
                standard_cost: '',
                gst_rate: '18',
                hsn_code: '',
                opening_stock: '',
                opening_hub: 'Pune Hub',
                opening_cost: ''
            });
            loadData();
        } catch (error) {
            alert("Error creating part");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAdjustStock = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await InventoryAPI.adjustStock({
                part_id: adjustment.part_id,
                hub_id: adjustment.hub_id,
                type: adjustment.type,
                quantity: Number(adjustment.quantity),
                reference_type: adjustment.reference_type as any,
                reference_id: adjustment.reference_id,
                performed_by: 'Current User',
                reason: adjustment.reason,
                unit_cost: adjustment.unit_cost ? parseFloat(adjustment.unit_cost) : undefined
            });
            setIsAdjustModalOpen(false);
            setAdjustment({
                part_id: '',
                hub_id: 'Pune Hub',
                type: MovementType.IN,
                quantity: 0,
                reference_type: 'Manual',
                reference_id: '',
                reason: '',
                unit_cost: ''
            });
            loadData();
        } catch (error: any) {
            alert(error.message || "Error adjusting stock");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleQuickAddStock = (item: InventoryStock) => {
        setAdjustment({
            part_id: item.part_id,
            hub_id: item.hub_id,
            type: MovementType.IN,
            quantity: 0,
            reference_type: 'Manual',
            reference_id: '',
            reason: '',
            unit_cost: item.average_cost ? item.average_cost.toString() : ''
        });
        setIsAdjustModalOpen(true);
    };

    const handleUpdateAlert = async (id: string, status: ReorderStatus) => {
        await InventoryAPI.updateAlertStatus(id, status);
        loadData();
    };

    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await PurchaseRequestAPI.create({
                part_id: newRequest.part_id,
                hub_id: newRequest.hub_id,
                quantity: parseInt(newRequest.quantity),
                requested_by: 'Current User',
                priority: newRequest.priority as any,
                notes: newRequest.notes
            });
            setIsRequestModalOpen(false);
            setNewRequest({ part_id: '', hub_id: 'Pune Hub', quantity: '', priority: 'Normal', notes: '' });
            loadData();
        } catch (error) {
            alert("Failed to raise request");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateRequest = async (id: string, status: RequestStatus) => {
        await PurchaseRequestAPI.updateStatus(id, status);
        loadData();
    };

    // Auto-fill Unit Cost when selecting a part for IN adjustment
    const handlePartSelectForAdjustment = (partId: string) => {
        const part = parts.find(p => p.part_id === partId);
        const currentStock = stock.find(s => s.part_id === partId && s.hub_id === adjustment.hub_id);
        
        let cost = '';
        if (adjustment.type === MovementType.IN) {
            // Default to standard cost or current average
            cost = part?.standard_cost?.toString() || currentStock?.average_cost?.toString() || '';
        } 
        setAdjustment(prev => ({ ...prev, part_id: partId, unit_cost: cost }));
    };

    const filteredParts = parts.filter(p => 
        p.part_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.part_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getPartName = (id: string) => parts.find(p => p.part_id === id)?.part_name || id;
    const getPartCode = (id: string) => parts.find(p => p.part_id === id)?.part_code || id;

    // KPI Calcs
    const lowStockCount = stock.filter(s => s.available_quantity <= s.minimum_quantity).length;
    // Updated stock value calculation based on weighted avg cost
    const totalInventoryValue = stock.reduce((sum, s) => sum + (s.inventory_value || 0), 0);
    const activeAlerts = alerts.filter(a => a.status === ReorderStatus.OPEN).length;

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading Inventory...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Inventory Command Center</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage parts, monitor stock levels, and valuation.</p>
                </div>
                <div className="flex space-x-2">
                    <button 
                        onClick={() => setView('stock')}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${view === 'stock' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-700 border border-gray-300'}`}
                    >
                        Hub Stock
                    </button>
                    <button 
                        onClick={() => setView('procurement')}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${view === 'procurement' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-700 border border-gray-300'}`}
                    >
                        Procurement
                        {activeAlerts > 0 && <span className="ml-2 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-bold">{activeAlerts}</span>}
                    </button>
                    <button 
                        onClick={() => setView('catalog')}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${view === 'catalog' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-700 border border-gray-300'}`}
                    >
                        Catalog
                    </button>
                    <button 
                        onClick={() => setView('movements')}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${view === 'movements' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-700 border border-gray-300'}`}
                    >
                        History
                    </button>
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Stock Health</span>
                        <IconBox className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex items-baseline">
                        <span className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{lowStockCount}</span>
                        <span className="ml-2 text-xs text-gray-500">Low Stock Items</span>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Total Value</span>
                        <IconCircleDollar className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex items-baseline">
                        <span className="text-2xl font-bold text-gray-900">₹{(totalInventoryValue/1000).toFixed(1)}k</span>
                        <span className="ml-2 text-xs text-gray-500">Asset Value</span>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Open Alerts</span>
                        <IconAlert className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="flex items-baseline">
                        <span className="text-2xl font-bold text-gray-900">{activeAlerts}</span>
                        <span className="ml-2 text-xs text-gray-500">Need Action</span>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Movements (7d)</span>
                        <IconChart className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex items-baseline">
                        <span className="text-2xl font-bold text-gray-900">{movements.length}</span>
                        <span className="ml-2 text-xs text-gray-500">Transactions</span>
                    </div>
                </div>
            </div>

            {view === 'catalog' && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <div className="relative w-72">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <IconSearch className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                placeholder="Search parts..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button onClick={() => setIsCreateModalOpen(true)}>
                            <IconPlus className="w-5 h-5 mr-2" />
                            Add Spare Part
                        </Button>
                    </div>

                    <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part Details</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Financials</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredParts.map(part => (
                                    <tr key={part.part_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{part.part_name}</div>
                                            <div className="text-xs text-gray-500 font-mono">{part.part_code}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{part.part_category}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <div>Std Cost: ₹{part.standard_cost?.toLocaleString()}</div>
                                            <div className="text-xs">GST: {part.gst_rate}%</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge color={part.status === 'Active' ? 'green' : 'red'}>{part.status}</Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {view === 'stock' && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-4">
                            <Select 
                                label="" 
                                options={[{label: 'Pune Hub', value: 'Pune Hub'}, {label: 'Mumbai Depot', value: 'Mumbai Depot'}]}
                                value="Pune Hub" // Fixed for mock
                                onChange={() => {}}
                                className="w-48 mb-0"
                            />
                        </div>
                        <Button onClick={() => setIsAdjustModalOpen(true)} variant="secondary">
                            <IconRefresh className="w-5 h-5 mr-2" />
                            Adjust Stock
                        </Button>
                    </div>

                    <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reserved</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Cost</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {stock.map(item => (
                                    <tr key={item.stock_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{getPartName(item.part_id)}</div>
                                            <div className="text-xs text-gray-500">{getPartCode(item.part_id)}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-900">{item.available_quantity}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{item.reserved_quantity}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">₹{Math.round(item.average_cost || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">₹{Math.round(item.inventory_value || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            {item.available_quantity <= item.minimum_quantity ? (
                                                <Badge color="red">Low Stock</Badge>
                                            ) : (
                                                <Badge color="green">Healthy</Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleQuickAddStock(item)}
                                                className="text-primary-600 hover:text-primary-900 text-xs font-medium flex items-center justify-end"
                                            >
                                                <IconPlus className="w-3 h-3 mr-1" />
                                                Add Stock
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {view === 'procurement' && (
                <div>
                    {/* System Alerts Section */}
                    <div className="mb-8">
                        <div className="mb-4 bg-blue-50 border border-blue-100 p-4 rounded-md flex items-start">
                            <IconAlert className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-bold text-blue-900">Automated Reorder Alerts</h4>
                                <p className="text-sm text-blue-800">
                                    Generated automatically when stock falls below minimum levels. 
                                </p>
                            </div>
                        </div>

                        <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part / Hub</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Suggested Order</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {alerts.map(alert => (
                                        <tr key={alert.alert_id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900">{getPartName(alert.part_id)}</div>
                                                <div className="text-xs text-gray-500">{alert.hub_id}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-red-600 font-bold">{alert.current_quantity}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{alert.minimum_quantity}</td>
                                            <td className="px-6 py-4 text-sm font-medium text-blue-600">{alert.suggested_reorder_quantity} Units</td>
                                            <td className="px-6 py-4">
                                                <Badge color={alert.status === ReorderStatus.OPEN ? 'red' : alert.status === ReorderStatus.ORDERED ? 'green' : 'yellow'}>
                                                    {alert.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                {alert.status === ReorderStatus.OPEN && (
                                                    <Button size="sm" variant="secondary" onClick={() => handleUpdateAlert(alert.alert_id, ReorderStatus.ACKNOWLEDGED)}>
                                                        Ack
                                                    </Button>
                                                )}
                                                {alert.status !== ReorderStatus.ORDERED && (
                                                    <Button size="sm" onClick={() => handleUpdateAlert(alert.alert_id, ReorderStatus.ORDERED)}>
                                                        Mark Ordered
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {alerts.length === 0 && (
                                        <tr><td colSpan={6} className="p-8 text-center text-gray-500">No active procurement alerts.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Manual Requisitions Section */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center">
                                <IconClipboardCheck className="w-5 h-5 mr-2 text-gray-500" />
                                Manual Purchase Requests
                            </h3>
                            <Button onClick={() => setIsRequestModalOpen(true)}>
                                <IconPlus className="w-4 h-4 mr-2" />
                                Raise Request
                            </Button>
                        </div>

                        <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requester</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {requests.map(req => (
                                        <tr key={req.request_id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900">{getPartName(req.part_id)}</div>
                                                <div className="text-xs text-gray-500">{req.hub_id}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900 font-bold">{req.quantity}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{req.requested_by}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{new Date(req.request_date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4">
                                                <Badge color={req.priority === 'Urgent' ? 'red' : 'blue'}>{req.priority}</Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge color={req.status === RequestStatus.APPROVED ? 'green' : req.status === RequestStatus.ORDERED ? 'blue' : req.status === RequestStatus.REJECTED ? 'red' : 'yellow'}>
                                                    {req.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {req.status === RequestStatus.PENDING && (
                                                    <div className="flex justify-end space-x-2">
                                                        <button 
                                                            onClick={() => handleUpdateRequest(req.request_id, RequestStatus.APPROVED)}
                                                            className="text-green-600 hover:text-green-800 text-xs font-medium"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button 
                                                            onClick={() => handleUpdateRequest(req.request_id, RequestStatus.REJECTED)}
                                                            className="text-red-600 hover:text-red-800 text-xs font-medium"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}
                                                {req.status === RequestStatus.APPROVED && (
                                                    <button 
                                                        onClick={() => handleUpdateRequest(req.request_id, RequestStatus.ORDERED)}
                                                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                                    >
                                                        Mark Ordered
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {requests.length === 0 && (
                                        <tr><td colSpan={7} className="p-8 text-center text-gray-500">No manual requests found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {view === 'movements' && (
                <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {movements.map(m => (
                                <tr key={m.movement_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-900">{new Date(m.timestamp).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{getPartName(m.part_id)}</td>
                                    <td className="px-6 py-4">
                                        <Badge color={m.movement_type === MovementType.IN ? 'green' : m.movement_type === MovementType.OUT ? 'red' : 'blue'}>
                                            {m.movement_type}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{m.quantity}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">₹{m.unit_cost?.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">₹{m.total_cost?.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        <div>{m.reference_type}</div>
                                        <div className="text-xs">{m.reference_id || m.reason}</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Part Modal */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Add Spare Part">
                <form onSubmit={handleCreatePart}>
                    <Input 
                        label="Part Name" 
                        value={newPart.part_name} 
                        onChange={e => setNewPart({...newPart, part_name: e.target.value})} 
                        required 
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Part Code" 
                            value={newPart.part_code} 
                            onChange={e => setNewPart({...newPart, part_code: e.target.value})} 
                            required 
                        />
                        <Select 
                            label="Category" 
                            options={Object.values(PartCategory).map(c => ({ label: c, value: c }))} 
                            value={newPart.part_category}
                            onChange={e => setNewPart({...newPart, part_category: e.target.value as PartCategory})}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Unit of Measure" 
                            value={newPart.unit_of_measure} 
                            onChange={e => setNewPart({...newPart, unit_of_measure: e.target.value})} 
                            required 
                        />
                        <Input 
                            label="Standard Cost (₹)" 
                            type="number"
                            value={newPart.standard_cost} 
                            onChange={e => setNewPart({...newPart, standard_cost: e.target.value})} 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Select 
                            label="GST Rate (%)" 
                            options={[0, 5, 12, 18, 28].map(r => ({ label: `${r}%`, value: r.toString() }))}
                            value={newPart.gst_rate}
                            onChange={e => setNewPart({...newPart, gst_rate: e.target.value})}
                        />
                        <Input 
                            label="HSN Code" 
                            value={newPart.hsn_code} 
                            onChange={e => setNewPart({...newPart, hsn_code: e.target.value})} 
                        />
                    </div>
                    <Input 
                        label="Compatible Vehicles (comma sep)" 
                        value={newPart.compatible_vehicle_types} 
                        onChange={e => setNewPart({...newPart, compatible_vehicle_types: e.target.value})} 
                        placeholder="Truck, Trailer"
                    />
                    
                    {/* Opening Stock Section */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Opening Stock (Optional)</h4>
                        <div className="grid grid-cols-3 gap-3">
                            <Input 
                                label="Quantity" 
                                type="number"
                                value={newPart.opening_stock}
                                onChange={e => setNewPart({...newPart, opening_stock: e.target.value})}
                                placeholder="0"
                                className="mb-0"
                            />
                            <Select 
                                label="Hub" 
                                options={[{label: 'Pune Hub', value: 'Pune Hub'}]}
                                value={newPart.opening_hub}
                                onChange={e => setNewPart({...newPart, opening_hub: e.target.value})}
                                className="mb-0"
                            />
                            <Input 
                                label="Unit Cost" 
                                type="number"
                                value={newPart.opening_cost}
                                onChange={e => setNewPart({...newPart, opening_cost: e.target.value})}
                                placeholder={newPart.standard_cost || '0'}
                                className="mb-0"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={isSubmitting}>Create Part</Button>
                    </div>
                </form>
            </Modal>

            {/* Adjust Stock Modal */}
            <Modal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} title="Adjust Stock">
                <form onSubmit={handleAdjustStock}>
                    <Select 
                        label="Part" 
                        options={parts.map(p => ({ label: `${p.part_name} (${p.part_code})`, value: p.part_id }))} 
                        value={adjustment.part_id}
                        onChange={e => handlePartSelectForAdjustment(e.target.value)}
                        required
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Select 
                            label="Hub" 
                            options={[{label: 'Pune Hub', value: 'Pune Hub'}]} 
                            value={adjustment.hub_id}
                            onChange={e => setAdjustment({...adjustment, hub_id: e.target.value})}
                            required
                        />
                        <Select 
                            label="Action" 
                            options={Object.values(MovementType).map(t => ({ label: t, value: t }))} 
                            value={adjustment.type}
                            onChange={e => setAdjustment({...adjustment, type: e.target.value as MovementType})}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Quantity" 
                            type="number"
                            min="1"
                            value={adjustment.quantity} 
                            onChange={e => setAdjustment({...adjustment, quantity: parseInt(e.target.value)})} 
                            required 
                        />
                        {/* Show Cost Input only for IN / ADJUSTMENT additions */}
                        {(adjustment.type === MovementType.IN || (adjustment.type === MovementType.ADJUSTMENT)) && (
                            <Input 
                                label="Unit Cost (₹)" 
                                type="number"
                                value={adjustment.unit_cost} 
                                onChange={e => setAdjustment({...adjustment, unit_cost: e.target.value})} 
                                placeholder="Auto from Master"
                            />
                        )}
                    </div>
                    
                    {/* Value Summary */}
                    {adjustment.quantity > 0 && (
                        <div className="mb-4 text-right text-sm text-gray-600 font-medium">
                            Total Adjustment Value: ₹{((parseInt(adjustment.quantity as any) || 0) * (parseFloat(adjustment.unit_cost) || 0)).toLocaleString()}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Select 
                            label="Reference Type" 
                            options={['WorkOrder', 'Manual', 'Vendor'].map(t => ({ label: t, value: t }))} 
                            value={adjustment.reference_type}
                            onChange={e => setAdjustment({...adjustment, reference_type: e.target.value})}
                            required
                        />
                        <Input 
                            label="Ref ID / Reason" 
                            value={adjustment.reference_id || adjustment.reason} 
                            onChange={e => {
                                if (adjustment.reference_type === 'Manual') setAdjustment({...adjustment, reason: e.target.value, reference_id: ''});
                                else setAdjustment({...adjustment, reference_id: e.target.value, reason: ''});
                            }} 
                            placeholder={adjustment.reference_type === 'Manual' ? "Reason for adjustment" : "WO-123 / PO-456"}
                            required
                        />
                    </div>
                    
                    {adjustment.type === MovementType.OUT && (
                        <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 mb-4 border border-yellow-200">
                            <IconAlert className="w-4 h-4 inline mr-1" />
                            Stock OUT will use the current Weighted Average Cost.
                        </div>
                    )}

                    <div className="mt-6 flex justify-end space-x-3">
                        <Button type="button" variant="secondary" onClick={() => setIsAdjustModalOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={isSubmitting}>Confirm Adjustment</Button>
                    </div>
                </form>
            </Modal>

            {/* Purchase Request Modal */}
            <Modal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} title="Raise Purchase Request">
                <form onSubmit={handleCreateRequest}>
                    <Select 
                        label="Part" 
                        options={parts.map(p => ({ label: `${p.part_name} (${p.part_code})`, value: p.part_id }))} 
                        value={newRequest.part_id}
                        onChange={e => setNewRequest({...newRequest, part_id: e.target.value})}
                        required
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Select 
                            label="Hub" 
                            options={[{label: 'Pune Hub', value: 'Pune Hub'}]} 
                            value={newRequest.hub_id}
                            onChange={e => setNewRequest({...newRequest, hub_id: e.target.value})}
                            required
                        />
                        <Select 
                            label="Priority" 
                            options={[{label: 'Normal', value: 'Normal'}, {label: 'Urgent', value: 'Urgent'}]} 
                            value={newRequest.priority}
                            onChange={e => setNewRequest({...newRequest, priority: e.target.value})}
                            required
                        />
                    </div>
                    <Input 
                        label="Quantity" 
                        type="number"
                        min="1"
                        value={newRequest.quantity} 
                        onChange={e => setNewRequest({...newRequest, quantity: e.target.value})} 
                        required 
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Notes</label>
                        <textarea 
                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm p-2 border"
                            rows={3}
                            value={newRequest.notes}
                            onChange={e => setNewRequest({...newRequest, notes: e.target.value})}
                            placeholder="Why is this needed?"
                        />
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <Button type="button" variant="secondary" onClick={() => setIsRequestModalOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={isSubmitting}>Submit Request</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};