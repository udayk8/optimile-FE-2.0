import React, { useState, useEffect } from 'react';
import { Garage, GarageVisit, GarageVisitStatus, VisitReason, Vehicle, GarageType, GarageRepairJob, GaragePartUsage, GarageLabour, SparePart, VendorInvoice, Vendor, GarageKPIs, GaragePerformanceStat, HighMaintenanceVehicle, WorkOrder, WorkOrderStatus, GarageClosureStatus, GarageApprovalLevel } from '../types';
import { GarageAPI, GarageVisitAPI, GarageJobAPI, GaragePartAPI, GarageLabourAPI, InventoryAPI, VendorAPI, InvoiceAPI, GarageIntelligenceAPI } from '../services/mockDatabase1';
import { VehicleAPI, MaintenanceAPI } from '../services/mockDatabase';
import { Button, Input, Select, Badge, Modal } from '../components/UI';
import { IconMechanic, IconPlus, IconSearch, IconCheck, IconArrowRight, IconClock, IconTruck, IconWrench, IconBox, IconUsers, IconCircleDollar, IconFile, IconChart, IconAlert, IconShield, IconShieldExclamation } from '../components/Icons';

export const GaragePage: React.FC = () => {
    const [view, setView] = useState<'visits' | 'garages' | 'analytics'>('visits');
    const [visits, setVisits] = useState<GarageVisit[]>([]);
    const [garages, setGarages] = useState<Garage[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [partsCatalog, setPartsCatalog] = useState<SparePart[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Analytics Data
    const [kpis, setKpis] = useState<GarageKPIs | null>(null);
    const [performance, setPerformance] = useState<GaragePerformanceStat[]>([]);
    const [highCostVehicles, setHighCostVehicles] = useState<HighMaintenanceVehicle[]>([]);

    // Check-In Modal
    const [isCheckInOpen, setIsCheckInOpen] = useState(false);
    const [checkInForm, setCheckInForm] = useState({
        vehicle_id: '',
        garage_id: '',
        entry_datetime: new Date().toISOString().slice(0, 16),
        odometer_in: '',
        reason_for_visit: VisitReason.SCHEDULED_SERVICE,
        linked_work_order_ids: [] as string[]
    });
    // State to hold open work orders for the selected vehicle in check-in
    const [openWorkOrders, setOpenWorkOrders] = useState<WorkOrder[]>([]);

    // Manage Visit Modal (Replaces simple Check-Out)
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [selectedVisit, setSelectedVisit] = useState<GarageVisit | null>(null);
    const [linkedWorkOrders, setLinkedWorkOrders] = useState<WorkOrder[]>([]); // For Manage Modal
    const [manageTab, setManageTab] = useState<'overview' | 'jobs' | 'parts' | 'labour' | 'financials' | 'closure'>('overview');

    // Manage Visit Sub-Data
    const [visitJobs, setVisitJobs] = useState<GarageRepairJob[]>([]);
    const [visitParts, setVisitParts] = useState<GaragePartUsage[]>([]);
    const [visitLabour, setVisitLabour] = useState<GarageLabour[]>([]);
    const [visitInvoices, setVisitInvoices] = useState<VendorInvoice[]>([]);
    const [liveCosts, setLiveCosts] = useState({ parts: 0, labour: 0, total: 0 });

    // Validation State
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // Ops Approval State
    const [opsRemarks, setOpsRemarks] = useState('');
    // Finance Approval State
    const [financeRemarks, setFinanceRemarks] = useState('');

    // Sub-Forms
    const [newJob, setNewJob] = useState({ description: '', job_type: 'Repair' });
    const [newPart, setNewPart] = useState({ part_id: '', quantity: '1', source: 'Inventory', unit_cost: '' });
    const [newLabour, setNewLabour] = useState({ labour_type: 'Mechanical', hours: '', rate: '500' });
    const [invoiceForm, setInvoiceForm] = useState({ vendor_id: '', invoice_number: '' });
    const [closureForm, setClosureForm] = useState({
        exit_datetime: '',
        odometer_out: '',
        remarks: '',
        close_linked_work_orders: true
    });

    // Garage Master Modal
    const [isGarageModalOpen, setIsGarageModalOpen] = useState(false);
    const [newGarage, setNewGarage] = useState({
        garage_name: '',
        garage_type: GarageType.INTERNAL,
        location: '',
        supported_vehicle_types: '',
        contact_details: '',
        status: 'Active'
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, [view]);

    // Fetch open work orders when vehicle is selected in Check-In
    useEffect(() => {
        if (isCheckInOpen && checkInForm.vehicle_id) {
            fetchOpenWorkOrders(checkInForm.vehicle_id);
        } else {
            setOpenWorkOrders([]);
        }
    }, [checkInForm.vehicle_id, isCheckInOpen]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            if (view === 'analytics') {
                const [k, p, h] = await Promise.all([
                    GarageIntelligenceAPI.getKPIs(),
                    GarageIntelligenceAPI.getGaragePerformance(),
                    GarageIntelligenceAPI.getHighMaintenanceVehicles()
                ]);
                setKpis(k);
                setPerformance(p);
                setHighCostVehicles(h);
            } else {
                const [v, g, visits, parts, vends] = await Promise.all([
                    VehicleAPI.getAll(),
                    GarageAPI.getAll(),
                    GarageVisitAPI.getAll(),
                    InventoryAPI.getParts(),
                    VendorAPI.getAll()
                ]);
                setVehicles(v);
                setGarages(g);
                setVisits(visits);
                setPartsCatalog(parts);
                setVendors(vends);
            }
        } catch (error) {
            console.error("Failed to load garage data");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchOpenWorkOrders = async (vehicleId: string) => {
        try {
            const allWos = await MaintenanceAPI.getWorkOrders();
            const relevant = allWos.filter(w =>
                w.vehicle_id === vehicleId &&
                (w.status === WorkOrderStatus.OPEN || w.status === WorkOrderStatus.IN_PROGRESS)
            );
            setOpenWorkOrders(relevant);
        } catch (error) {
            console.error("Failed to fetch WOs");
        }
    };

    // --- Visit Management Handlers ---

    const handleOpenManage = async (visit: GarageVisit) => {
        setSelectedVisit(visit);
        setManageTab('overview');
        setClosureForm({
            exit_datetime: visit.exit_datetime ? visit.exit_datetime.slice(0, 16) : new Date().toISOString().slice(0, 16),
            odometer_out: visit.odometer_out ? visit.odometer_out.toString() : visit.odometer_in.toString(),
            remarks: visit.remarks || '',
            close_linked_work_orders: true
        });
        setValidationErrors([]);
        setInvoiceForm({ vendor_id: '', invoice_number: '' });
        setOpsRemarks('');
        setFinanceRemarks('');

        // Load sub-data
        const [jobs, parts, labour, invoices, allWos] = await Promise.all([
            GarageJobAPI.getByVisit(visit.visit_id),
            GaragePartAPI.getByVisit(visit.visit_id),
            GarageLabourAPI.getByVisit(visit.visit_id),
            InvoiceAPI.getByVisit(visit.visit_id),
            MaintenanceAPI.getWorkOrders() // Fetch all to find linked ones
        ]);
        setVisitJobs(jobs);
        setVisitParts(parts);
        setVisitLabour(labour);
        setVisitInvoices(invoices);

        // Filter linked WOs
        if (visit.linked_work_order_ids && visit.linked_work_order_ids.length > 0) {
            setLinkedWorkOrders(allWos.filter(w => visit.linked_work_order_ids?.includes(w.work_order_id)));
        } else {
            setLinkedWorkOrders([]);
        }

        recalcCosts(parts, labour);

        setIsManageModalOpen(true);
    };

    const recalcCosts = (parts: GaragePartUsage[], labour: GarageLabour[]) => {
        const pCost = parts.reduce((sum, p) => sum + (p.quantity * p.unit_cost), 0);
        const lCost = labour.reduce((sum, l) => sum + l.total_amount, 0);
        setLiveCosts({
            parts: pCost,
            labour: lCost,
            total: pCost + lCost
        });
    };

    const handleAddJob = async () => {
        if (!selectedVisit || !newJob.description) return;
        const job = await GarageJobAPI.add({
            visit_id: selectedVisit.visit_id,
            description: newJob.description,
            job_type: newJob.job_type as any
        });
        setVisitJobs([...visitJobs, job]);
        setNewJob({ description: '', job_type: 'Repair' });
    };

    const handleCompleteJob = async (jobId: string) => {
        await GarageJobAPI.updateStatus(jobId, 'Completed');
        setVisitJobs(prev => prev.map(j => j.job_id === jobId ? { ...j, status: 'Completed' } : j));
    };

    const handleAddPart = async () => {
        if (!selectedVisit || !newPart.part_id) return;

        // Find part cost if inventory
        let cost = parseFloat(newPart.unit_cost);
        if (newPart.source === 'Inventory') {
            const partMaster = partsCatalog.find(p => p.part_id === newPart.part_id);
            if (partMaster) cost = partMaster.standard_cost || 0;
        }

        try {
            const partUsage = await GaragePartAPI.add({
                visit_id: selectedVisit.visit_id,
                part_id: newPart.part_id,
                quantity: parseFloat(newPart.quantity),
                source: newPart.source as any,
                unit_cost: cost
            }, 'Pune Hub');

            const newPartsList = [...visitParts, partUsage];
            setVisitParts(newPartsList);
            recalcCosts(newPartsList, visitLabour);
            setNewPart({ part_id: '', quantity: '1', source: 'Inventory', unit_cost: '' });
        } catch (e: any) {
            alert(e.message || "Failed to add part");
        }
    };

    const handleAddLabour = async () => {
        if (!selectedVisit || !newLabour.hours) return;
        const hours = parseFloat(newLabour.hours);
        const rate = parseFloat(newLabour.rate);
        const labour = await GarageLabourAPI.add({
            visit_id: selectedVisit.visit_id,
            labour_type: newLabour.labour_type as any,
            hours: hours,
            rate: rate,
            total_amount: hours * rate
        });
        const newLabourList = [...visitLabour, labour];
        setVisitLabour(newLabourList);
        recalcCosts(visitParts, newLabourList);
        setNewLabour({ labour_type: 'Mechanical', hours: '', rate: '500' });
    };

    const handleGenerateInvoice = async () => {
        if (!selectedVisit || !invoiceForm.vendor_id) return;
        setIsSubmitting(true);
        try {
            const items = [
                ...visitParts.map(p => ({
                    item_type: 'Part' as any,
                    reference_id: p.part_id,
                    description: getPartName(p.part_id),
                    quantity: p.quantity,
                    rate: p.unit_cost,
                    gst_rate: 18
                })),
                ...visitLabour.map(l => ({
                    item_type: 'Labour' as any,
                    description: `${l.labour_type} Labour`,
                    quantity: l.hours,
                    rate: l.rate,
                    gst_rate: 18
                }))
            ];

            await InvoiceAPI.create({
                vendor_id: invoiceForm.vendor_id,
                visit_id: selectedVisit.visit_id,
                invoice_number: invoiceForm.invoice_number,
                invoice_date: new Date().toISOString().split('T')[0],
                items: items
            });

            const invs = await InvoiceAPI.getByVisit(selectedVisit.visit_id);
            setVisitInvoices(invs);
            alert("Invoice created from visit costs.");
        } catch (e) {
            alert("Failed to generate invoice");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitForApproval = async () => {
        if (!selectedVisit) return;
        setValidationErrors([]);
        setIsSubmitting(true);
        try {
            const updatedVisit = await GarageVisitAPI.submitForApproval(selectedVisit.visit_id, {
                exit_datetime: new Date(closureForm.exit_datetime).toISOString(),
                odometer_out: parseInt(closureForm.odometer_out),
                remarks: closureForm.remarks
            });
            setSelectedVisit(updatedVisit);
            // Optionally auto-close if in mock/simplified mode, but user asked for workflow
            // For now, we update local state
            loadData();
        } catch (error: any) {
            if (error.message.startsWith("Validation Failed")) {
                const errors = error.message.replace("Validation Failed: ", "").split(", ");
                setValidationErrors(errors);
            } else {
                alert(error.message || "Failed to submit for approval");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpsAction = async (action: 'Approve' | 'Reject') => {
        if (!selectedVisit) return;
        setIsSubmitting(true);
        try {
            let updatedVisit;
            if (action === 'Approve') {
                updatedVisit = await GarageVisitAPI.approveOps(selectedVisit.visit_id, opsRemarks);
            } else {
                updatedVisit = await GarageVisitAPI.rejectOps(selectedVisit.visit_id, opsRemarks);
            }
            setSelectedVisit(updatedVisit);
            loadData();
        } catch (error: any) {
            alert(error.message || `Failed to ${action} visit`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFinanceAction = async (action: 'Approve' | 'Reject') => {
        if (!selectedVisit) return;
        setIsSubmitting(true);
        try {
            let updatedVisit;
            if (action === 'Approve') {
                updatedVisit = await GarageVisitAPI.approveFinance(selectedVisit.visit_id, financeRemarks);
            } else {
                updatedVisit = await GarageVisitAPI.rejectFinance(selectedVisit.visit_id, financeRemarks);
            }
            setSelectedVisit(updatedVisit);
            loadData();
        } catch (error: any) {
            alert(error.message || `Failed to ${action} visit`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFinalClose = async () => {
        if (!selectedVisit) return;
        if (!window.confirm("This will finalize the visit and deduct costs. Continue?")) return;

        setIsSubmitting(true);
        try {
            await GarageVisitAPI.checkOut(selectedVisit.visit_id, {
                exit_datetime: new Date(closureForm.exit_datetime).toISOString(),
                odometer_out: parseInt(closureForm.odometer_out),
                remarks: closureForm.remarks,
                close_linked_work_orders: closureForm.close_linked_work_orders
            });
            setIsManageModalOpen(false);
            setSelectedVisit(null);
            loadData();
        } catch (error: any) {
            alert(error.message || "Failed to close visit");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCheckIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await GarageVisitAPI.checkIn({
                vehicle_id: checkInForm.vehicle_id,
                garage_id: checkInForm.garage_id,
                entry_datetime: new Date(checkInForm.entry_datetime).toISOString(),
                odometer_in: parseInt(checkInForm.odometer_in),
                reason_for_visit: checkInForm.reason_for_visit,
                linked_work_order_ids: checkInForm.linked_work_order_ids
            });
            setIsCheckInOpen(false);
            setCheckInForm({
                vehicle_id: '',
                garage_id: '',
                entry_datetime: new Date().toISOString().slice(0, 16),
                odometer_in: '',
                reason_for_visit: VisitReason.SCHEDULED_SERVICE,
                linked_work_order_ids: []
            });
            loadData();
        } catch (error: any) {
            console.log(error.message, "djkgzyukjsfiukdsgfhoidssjfi");

            alert(error.message || "Failed to check in vehicle");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateGarage = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await GarageAPI.create({
                ...newGarage,
                supported_vehicle_types: newGarage.supported_vehicle_types.split(',').map(s => s.trim()),
                status: newGarage.status as 'Active' | 'Inactive'
            });
            setIsGarageModalOpen(false);
            const g = await GarageAPI.getAll();
            setGarages(g);
        } catch (error) {
            alert("Failed to add garage");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getVehicleReg = (id: string) => vehicles.find(v => v.vehicle_id === id)?.registration_number || id;
    const getGarageName = (id: string) => garages.find(g => g.garage_id === id)?.garage_name || id;
    const getPartName = (id: string) => partsCatalog.find(p => p.part_id === id)?.part_name || id;
    const getGarageType = (id: string) => garages.find(g => g.garage_id === id)?.garage_type;

    const filteredVisits = visits.filter(v =>
        getVehicleReg(v.vehicle_id).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeVisitsCount = visits.filter(v => v.visit_status !== GarageVisitStatus.COMPLETED && v.visit_status !== GarageVisitStatus.CANCELLED).length;

    const getClosureStatusColor = (status?: GarageClosureStatus) => {
        switch (status) {
            case GarageClosureStatus.DRAFT: return 'bg-gray-100 text-gray-800';
            case GarageClosureStatus.READY_FOR_APPROVAL: return 'bg-blue-100 text-blue-800';
            case GarageClosureStatus.OPS_APPROVED: return 'bg-purple-100 text-purple-800';
            case GarageClosureStatus.FINANCE_APPROVED: return 'bg-yellow-100 text-yellow-800';
            case GarageClosureStatus.CLOSED: return 'bg-green-100 text-green-800';
            case GarageClosureStatus.REJECTED: return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Helper to check if inputs should be disabled (Locked)
    const isOperationalLocked = (visit: GarageVisit) => {
        return visit.closure_status === GarageClosureStatus.OPS_APPROVED ||
            visit.closure_status === GarageClosureStatus.FINANCE_APPROVED ||
            visit.closure_status === GarageClosureStatus.CLOSED ||
            visit.closure_status === GarageClosureStatus.READY_FOR_APPROVAL; // Ops Reviewing
    };

    const isFinancialLocked = (visit: GarageVisit) => {
        return visit.closure_status === GarageClosureStatus.FINANCE_APPROVED ||
            visit.closure_status === GarageClosureStatus.CLOSED;
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading Garage Data...</div>;

    return (
        <div>
            {/* ... [Header and Table rendering remains largely same, just ensuring context for Modals] ... */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Garage Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Track repairs, downtime, and workshop efficiency.</p>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setView('visits')}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${view === 'visits' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-700 border border-gray-300'}`}
                    >
                        Visits & Jobs
                    </button>
                    <button
                        onClick={() => setView('analytics')}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${view === 'analytics' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-700 border border-gray-300'}`}
                    >
                        Intelligence
                    </button>
                    <button
                        onClick={() => setView('garages')}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${view === 'garages' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-700 border border-gray-300'}`}
                    >
                        Garage Master
                    </button>
                </div>
            </div>

            {view === 'analytics' && kpis && (
                <div className="space-y-6">
                    {/* Fleet Level KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Avg Downtime / Visit</div>
                            <div className="text-3xl font-bold text-gray-900">{kpis.avg_downtime_hours} <span className="text-sm font-normal text-gray-500">hrs</span></div>
                        </div>
                        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Avg Cost / Visit</div>
                            <div className="text-3xl font-bold text-gray-900">₹{kpis.avg_cost_per_visit.toLocaleString()}</div>
                        </div>
                        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Total Maint. Spend</div>
                            <div className="text-3xl font-bold text-gray-900">₹{(kpis.total_maintenance_spend / 1000).toFixed(1)}k</div>
                        </div>
                        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Repeat Repair Rate</div>
                            <div className={`text-3xl font-bold ${kpis.repeat_repair_rate > 10 ? 'text-red-600' : 'text-green-600'}`}>
                                {kpis.repeat_repair_rate}%
                            </div>
                            <div className="text-xs text-gray-400 mt-1">Target: &lt; 5%</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Garage Performance Table */}
                        <div className="bg-white shadow rounded-lg border border-gray-200">
                            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                                <h3 className="font-bold text-gray-900 flex items-center">
                                    <IconMechanic className="w-5 h-5 mr-2 text-gray-500" />
                                    Garage Performance
                                </h3>
                            </div>
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-white">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Garage</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Time</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Cost</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {performance.map(p => (
                                        <tr key={p.garage_id}>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900">{p.garage_name}</div>
                                                <div className="text-xs text-gray-500">{p.visit_count} visits</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">{p.avg_downtime}h</td>
                                            <td className="px-6 py-4 text-sm text-gray-900">₹{p.avg_cost.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <Badge color={p.performance_score === 'Excellent' ? 'green' : p.performance_score === 'Good' ? 'blue' : 'red'}>
                                                    {p.performance_score}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* High Maintenance Vehicles */}
                        <div className="bg-white shadow rounded-lg border border-gray-200">
                            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                                <h3 className="font-bold text-gray-900 flex items-center">
                                    <IconAlert className="w-5 h-5 mr-2 text-red-500" />
                                    Top Spenders (Costliest Assets)
                                </h3>
                            </div>
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-white">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visits</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Downtime</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Spend</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {highCostVehicles.map(v => (
                                        <tr key={v.vehicle_id}>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{v.registration_number}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{v.visit_count}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{v.total_downtime}h</td>
                                            <td className="px-6 py-4 text-sm font-bold text-red-600">₹{v.total_cost.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {highCostVehicles.length === 0 && (
                                        <tr><td colSpan={4} className="p-6 text-center text-gray-500">No data available.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {view === 'visits' && (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <div className="relative w-72">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <IconSearch className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                placeholder="Search by Vehicle..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="bg-blue-50 px-3 py-1 rounded-md border border-blue-100 text-sm text-blue-700 font-medium">
                                <IconMechanic className="w-4 h-4 inline mr-2" />
                                {activeVisitsCount} Vehicles in Garage
                            </div>
                            <Button onClick={() => setIsCheckInOpen(true)}>
                                <IconPlus className="w-5 h-5 mr-2" />
                                New Check-In
                            </Button>
                        </div>
                    </div>

                    <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Garage</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredVisits.map(visit => {
                                    const isActive = visit.visit_status !== GarageVisitStatus.COMPLETED && visit.visit_status !== GarageVisitStatus.CANCELLED;
                                    return (
                                        <tr key={visit.visit_id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900">{getVehicleReg(visit.vehicle_id)}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{getGarageName(visit.garage_id)}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900">{new Date(visit.entry_datetime).toLocaleDateString()}</div>
                                                <div className="text-xs text-gray-500">{new Date(visit.entry_datetime).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{visit.reason_for_visit}</td>
                                            <td className="px-6 py-4">
                                                <Badge color={isActive ? 'blue' : 'green'}>{visit.visit_status}</Badge>
                                                {!isActive && visit.downtime_hours && (
                                                    <div className="text-xs text-gray-400 mt-1 flex items-center">
                                                        <IconClock className="w-3 h-3 mr-1" />
                                                        {visit.downtime_hours}h
                                                    </div>
                                                )}
                                                {visit.cost_summary && !isActive && (
                                                    <div className="text-xs font-medium text-gray-600 mt-1">₹{Math.round(visit.cost_summary.total_cost).toLocaleString()}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {isActive ? (
                                                    <Button size="sm" onClick={() => handleOpenManage(visit)}>
                                                        Manage
                                                    </Button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleOpenManage(visit)} // Allow viewing closed details
                                                        className="text-primary-600 hover:text-primary-900 text-xs font-medium"
                                                    >
                                                        View Details
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredVisits.length === 0 && (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">No garage visits found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {view === 'garages' && (
                <div>
                    <div className="flex justify-end mb-6">
                        <Button onClick={() => setIsGarageModalOpen(true)}>
                            <IconPlus className="w-5 h-5 mr-2" />
                            Add Garage
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {garages.map(g => (
                            <div key={g.garage_id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-lg font-bold text-gray-900">{g.garage_name}</h3>
                                    <Badge color={g.garage_type === GarageType.INTERNAL ? 'blue' : 'yellow'}>{g.garage_type}</Badge>
                                </div>
                                <p className="text-sm text-gray-500 mb-4 flex items-center">
                                    <IconMechanic className="w-4 h-4 mr-1" />
                                    {g.location}
                                </p>
                                <div className="text-xs text-gray-500 space-y-1">
                                    <div><strong>Supports:</strong> {g.supported_vehicle_types.join(', ')}</div>
                                    <div><strong>Contact:</strong> {g.contact_details || '-'}</div>
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                                    <span className={`text-xs px-2 py-1 rounded ${g.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                        {g.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Manage Visit Modal */}
            <Modal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} title="Manage Garage Visit">
                {selectedVisit && (
                    <div className="space-y-4">
                        {/* Summary Header */}
                        <div className="bg-gray-50 p-3 rounded-md flex justify-between items-center text-sm">
                            <div>
                                <span className="font-bold text-gray-900 mr-2">{getVehicleReg(selectedVisit.vehicle_id)}</span>
                                <span className="text-gray-500">at {getGarageName(selectedVisit.garage_id)}</span>
                            </div>
                            <div className="flex space-x-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getClosureStatusColor(selectedVisit.closure_status)}`}>
                                    {selectedVisit.closure_status || 'Draft'}
                                </span>
                                <Badge color="blue">{selectedVisit.visit_status}</Badge>
                            </div>
                        </div>

                        {/* Ops Approval Banner */}
                        {selectedVisit.closure_status === GarageClosureStatus.READY_FOR_APPROVAL && (
                            <div className="bg-blue-50 border border-blue-200 rounded p-4">
                                <div className="flex items-start">
                                    <IconShieldExclamation className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-blue-900">Ops Approval Required</h4>
                                        <p className="text-xs text-blue-800 mt-1 mb-2">Review job details and costs before approving vehicle exit.</p>

                                        <div className="mt-2">
                                            <label className="block text-xs font-medium text-blue-900 mb-1">Approver Remarks</label>
                                            <input
                                                className="w-full text-sm border-blue-300 rounded p-1.5 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="e.g. Repairs verified, safe to release."
                                                value={opsRemarks}
                                                onChange={e => setOpsRemarks(e.target.value)}
                                            />
                                        </div>

                                        <div className="flex space-x-2 mt-3 justify-end">
                                            <Button size="sm" variant="danger" onClick={() => handleOpsAction('Reject')} isLoading={isSubmitting}>
                                                Reject (Return to Draft)
                                            </Button>
                                            <Button size="sm" onClick={() => handleOpsAction('Approve')} isLoading={isSubmitting}>
                                                Approve Release
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Finance Approval Banner */}
                        {selectedVisit.closure_status === GarageClosureStatus.OPS_APPROVED && (
                            <div className="bg-purple-50 border border-purple-200 rounded p-4">
                                <div className="flex items-start">
                                    <IconCircleDollar className="w-5 h-5 text-purple-600 mr-2 mt-0.5" />
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-purple-900">Finance Approval Required</h4>
                                        <p className="text-xs text-purple-800 mt-1 mb-2">Verify final costs, invoices, and GST compliance.</p>

                                        <div className="grid grid-cols-2 gap-4 text-xs text-purple-900 mb-3 bg-white p-2 rounded border border-purple-100">
                                            <div>
                                                <span className="text-gray-500">Total Cost:</span> <span className="font-bold">₹{Math.round(liveCosts.total * 1.18).toLocaleString()}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Invoices:</span> <span className="font-bold">{visitInvoices.length} Attached</span>
                                            </div>
                                        </div>

                                        <div className="mt-2">
                                            <label className="block text-xs font-medium text-purple-900 mb-1">Finance Remarks</label>
                                            <input
                                                className="w-full text-sm border-purple-300 rounded p-1.5 focus:ring-purple-500 focus:border-purple-500"
                                                placeholder="e.g. Invoice matched, cost approved."
                                                value={financeRemarks}
                                                onChange={e => setFinanceRemarks(e.target.value)}
                                            />
                                        </div>

                                        <div className="flex space-x-2 mt-3 justify-end">
                                            <Button size="sm" variant="danger" onClick={() => handleFinanceAction('Reject')} isLoading={isSubmitting}>
                                                Reject (Back to Ops)
                                            </Button>
                                            <Button size="sm" onClick={() => handleFinanceAction('Approve')} isLoading={isSubmitting}>
                                                Approve & Close
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="border-b border-gray-200 overflow-x-auto">
                            <nav className="-mb-px flex space-x-4">
                                {['Overview', 'Jobs', 'Parts', 'Labour', 'Financials', 'Closure'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setManageTab(tab.toLowerCase() as any)}
                                        className={`whitespace-nowrap pb-2 px-1 border-b-2 text-sm font-medium ${manageTab === tab.toLowerCase()
                                                ? 'border-primary-500 text-primary-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {manageTab === 'overview' && (
                            <div className="py-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                    <div><strong>Entry:</strong> {new Date(selectedVisit.entry_datetime).toLocaleString()}</div>
                                    <div><strong>Reason:</strong> {selectedVisit.reason_for_visit}</div>
                                    <div><strong>Odometer In:</strong> {selectedVisit.odometer_in} km</div>
                                    <div><strong>Garage Type:</strong> {getGarageType(selectedVisit.garage_id)}</div>
                                </div>
                                <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
                                    <p><strong>Jobs Pending:</strong> {visitJobs.filter(j => j.status !== 'Completed').length}</p>
                                    <p><strong>Parts Used:</strong> {visitParts.length}</p>
                                    <p><strong>Total Cost (Est):</strong> ₹{Math.round(liveCosts.total).toLocaleString()}</p>
                                </div>

                                {linkedWorkOrders.length > 0 && (
                                    <div className="border border-gray-200 rounded p-3 bg-gray-50">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Linked Work Orders</h4>
                                        <div className="space-y-2">
                                            {linkedWorkOrders.map(wo => (
                                                <div key={wo.work_order_id} className="text-sm flex justify-between bg-white p-2 rounded border border-gray-100">
                                                    <span>{wo.issue_type}</span>
                                                    <Badge color="blue">{wo.status}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {manageTab === 'jobs' && (
                            <div className="space-y-4">
                                {/* ... Jobs UI ... */}
                                <div className="flex space-x-2">
                                    <Input
                                        label=""
                                        placeholder="Job Description"
                                        value={newJob.description}
                                        onChange={e => setNewJob({ ...newJob, description: e.target.value })}
                                        className="flex-1 mb-0"
                                        disabled={isOperationalLocked(selectedVisit)}
                                    />
                                    <Select
                                        label=""
                                        options={['Repair', 'Service', 'Inspection'].map(t => ({ label: t, value: t }))}
                                        value={newJob.job_type}
                                        onChange={e => setNewJob({ ...newJob, job_type: e.target.value })}
                                        className="w-32 mb-0"
                                        disabled={isOperationalLocked(selectedVisit)}
                                    />
                                    <Button size="sm" onClick={handleAddJob} disabled={isOperationalLocked(selectedVisit)}>Add Job</Button>
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {visitJobs.map(job => (
                                        <div key={job.job_id} className="flex justify-between items-center p-2 bg-white border rounded">
                                            <div>
                                                <div className="text-sm font-medium">{job.description}</div>
                                                <div className="text-xs text-gray-500">{job.job_type}</div>
                                            </div>
                                            {job.status === 'Completed' ? (
                                                <Badge color="green">Done</Badge>
                                            ) : (
                                                <button
                                                    onClick={() => handleCompleteJob(job.job_id)}
                                                    className="text-xs text-blue-600 border border-blue-600 px-2 py-1 rounded hover:bg-blue-50"
                                                    disabled={isOperationalLocked(selectedVisit)}
                                                >
                                                    Mark Done
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {visitJobs.length === 0 && <p className="text-center text-gray-500 text-sm p-4">No jobs added yet.</p>}
                                </div>
                            </div>
                        )}

                        {manageTab === 'parts' && (
                            <div className="space-y-4">
                                {/* ... Parts UI ... */}
                                <div className="flex space-x-2">
                                    <Select
                                        label=""
                                        options={partsCatalog.map(p => ({ label: p.part_name, value: p.part_id }))}
                                        value={newPart.part_id}
                                        onChange={e => setNewPart({ ...newPart, part_id: e.target.value })}
                                        className="flex-1 mb-0"
                                        disabled={isOperationalLocked(selectedVisit)}
                                    />
                                    <Input
                                        label=""
                                        placeholder="Qty"
                                        type="number"
                                        value={newPart.quantity}
                                        onChange={e => setNewPart({ ...newPart, quantity: e.target.value })}
                                        className="w-20 mb-0"
                                        disabled={isOperationalLocked(selectedVisit)}
                                    />
                                    <Button size="sm" onClick={handleAddPart} disabled={isOperationalLocked(selectedVisit)}>Add</Button>
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {visitParts.map(part => (
                                        <div key={part.usage_id} className="flex justify-between items-center p-2 bg-white border rounded">
                                            <div>
                                                <div className="text-sm font-medium">{getPartName(part.part_id)}</div>
                                                <div className="text-xs text-gray-500">{part.source} • ₹{part.unit_cost}/unit</div>
                                            </div>
                                            <div className="font-bold text-sm">x{part.quantity}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {manageTab === 'labour' && (
                            <div className="space-y-4">
                                {/* ... Labour UI ... */}
                                <div className="flex space-x-2">
                                    <Select
                                        label=""
                                        options={['Mechanical', 'Electrical', 'Body', 'General'].map(t => ({ label: t, value: t }))}
                                        value={newLabour.labour_type}
                                        onChange={e => setNewLabour({ ...newLabour, labour_type: e.target.value })}
                                        className="w-32 mb-0"
                                        disabled={isOperationalLocked(selectedVisit)}
                                    />
                                    <Input
                                        label=""
                                        placeholder="Hours"
                                        type="number"
                                        value={newLabour.hours}
                                        onChange={e => setNewLabour({ ...newLabour, hours: e.target.value })}
                                        className="w-20 mb-0"
                                        disabled={isOperationalLocked(selectedVisit)}
                                    />
                                    <Input
                                        label=""
                                        placeholder="Rate"
                                        type="number"
                                        value={newLabour.rate}
                                        onChange={e => setNewLabour({ ...newLabour, rate: e.target.value })}
                                        className="w-24 mb-0"
                                        disabled={isFinancialLocked(selectedVisit)}
                                    />
                                    <Button size="sm" onClick={handleAddLabour} disabled={isOperationalLocked(selectedVisit)}>Add</Button>
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {visitLabour.map(lab => (
                                        <div key={lab.labour_id} className="flex justify-between items-center p-2 bg-white border rounded">
                                            <div>
                                                <div className="text-sm font-medium">{lab.labour_type}</div>
                                                <div className="text-xs text-gray-500">{lab.hours} hrs @ ₹{lab.rate}/hr</div>
                                            </div>
                                            <div className="font-bold text-sm">₹{lab.total_amount}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {manageTab === 'financials' && (
                            <div className="space-y-6">
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <h4 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center">
                                        <IconCircleDollar className="w-4 h-4 mr-2" />
                                        Repair Cost Summary
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Parts Total</span>
                                            <span>₹{liveCosts.parts.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Labour Total</span>
                                            <span>₹{liveCosts.labour.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-500">
                                            <span>Estimated GST (18%)</span>
                                            <span>₹{Math.round(liveCosts.total * 0.18).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-gray-300 font-bold text-base">
                                            <span>Total Estimated Cost</span>
                                            <span>₹{Math.round(liveCosts.total * 1.18).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {getGarageType(selectedVisit.garage_id) === 'External' && (
                                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                                        <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                                            <IconFile className="w-4 h-4 mr-2" />
                                            Vendor Invoice (External)
                                        </h4>

                                        {visitInvoices.length > 0 ? (
                                            <div className="space-y-2">
                                                {visitInvoices.map(inv => (
                                                    <div key={inv.invoice_id} className="flex justify-between items-center text-sm bg-green-50 p-2 rounded border border-green-100">
                                                        <span>Invoice #{inv.invoice_number}</span>
                                                        <span className="font-bold">₹{inv.total_amount.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <p className="text-xs text-gray-500">Generate an invoice for this vendor based on the logged costs above.</p>
                                                <div className="flex space-x-2">
                                                    <Select
                                                        label=""
                                                        options={vendors.map(v => ({ label: v.vendor_name, value: v.vendor_id }))}
                                                        value={invoiceForm.vendor_id}
                                                        onChange={e => setInvoiceForm({ ...invoiceForm, vendor_id: e.target.value })}
                                                        className="flex-1 mb-0"
                                                        disabled={isFinancialLocked(selectedVisit)}
                                                    />
                                                    <Input
                                                        label=""
                                                        placeholder="Inv No"
                                                        value={invoiceForm.invoice_number}
                                                        onChange={e => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })}
                                                        className="w-32 mb-0"
                                                        disabled={isFinancialLocked(selectedVisit)}
                                                    />
                                                </div>
                                                <Button size="sm" onClick={handleGenerateInvoice} disabled={(!invoiceForm.vendor_id || !invoiceForm.invoice_number) || isFinancialLocked(selectedVisit)}>
                                                    Create Invoice
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {manageTab === 'closure' && (
                            <div className="space-y-4">
                                {validationErrors.length > 0 && (
                                    <div className="bg-red-50 p-3 rounded border border-red-200">
                                        <h4 className="text-xs font-bold text-red-800 uppercase mb-2 flex items-center">
                                            <IconAlert className="w-4 h-4 mr-2" />
                                            Readiness Checks Failed
                                        </h4>
                                        <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                                            {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                                        </ul>
                                    </div>
                                )}

                                {/* Closure Summary */}
                                <div className="bg-green-50 p-4 rounded text-sm border border-green-100 mb-4">
                                    <div className="flex justify-between items-center font-bold text-green-900 mb-2">
                                        <span>Final Visit Cost</span>
                                        <span>₹{Math.round(liveCosts.total * 1.18).toLocaleString()}</span>
                                    </div>
                                    <p className="text-green-700 text-xs">Includes estimated taxes. This will be posted to vehicle maintenance history.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Exit Time"
                                        type="datetime-local"
                                        value={closureForm.exit_datetime}
                                        onChange={e => setClosureForm({ ...closureForm, exit_datetime: e.target.value })}
                                        disabled={isOperationalLocked(selectedVisit)}
                                    />
                                    <Input
                                        label="Odometer Out (km)"
                                        type="number"
                                        value={closureForm.odometer_out}
                                        onChange={e => setClosureForm({ ...closureForm, odometer_out: e.target.value })}
                                        disabled={isOperationalLocked(selectedVisit)}
                                    />
                                </div>

                                {linkedWorkOrders.length > 0 && selectedVisit.visit_status !== GarageVisitStatus.COMPLETED && (
                                    <div className="flex items-center mt-2 p-3 bg-blue-50 rounded border border-blue-100">
                                        <input
                                            type="checkbox"
                                            id="closeLinked"
                                            checked={closureForm.close_linked_work_orders}
                                            onChange={e => setClosureForm({ ...closureForm, close_linked_work_orders: e.target.checked })}
                                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                            disabled={isOperationalLocked(selectedVisit)}
                                        />
                                        <label htmlFor="closeLinked" className="ml-2 block text-sm text-blue-900">
                                            Close {linkedWorkOrders.length} linked work orders and distribute costs
                                        </label>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Closing Remarks</label>
                                    <textarea
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm p-2 border"
                                        rows={3}
                                        value={closureForm.remarks}
                                        onChange={e => setClosureForm({ ...closureForm, remarks: e.target.value })}
                                        disabled={isOperationalLocked(selectedVisit)}
                                    />
                                </div>
                                <div className="flex justify-end pt-4 border-t border-gray-200">
                                    {selectedVisit.visit_status !== GarageVisitStatus.COMPLETED && (
                                        <>
                                            {(selectedVisit.closure_status === GarageClosureStatus.DRAFT || selectedVisit.closure_status === GarageClosureStatus.REJECTED || selectedVisit.closure_status === undefined) ? (
                                                <Button onClick={handleSubmitForApproval} isLoading={isSubmitting} variant="primary">
                                                    Validate & Submit for Approval
                                                </Button>
                                            ) : (
                                                <div className="flex items-center space-x-3">
                                                    <span className="text-sm font-medium text-gray-500 italic">
                                                        Waiting for Approval ({selectedVisit.closure_status})
                                                    </span>
                                                    {(selectedVisit.closure_status === GarageClosureStatus.OPS_APPROVED || selectedVisit.closure_status === GarageClosureStatus.FINANCE_APPROVED || selectedVisit.closure_status === GarageClosureStatus.READY_FOR_APPROVAL) && (
                                                        <Button onClick={handleFinalClose} isLoading={isSubmitting} variant="secondary">
                                                            Force Close (Admin)
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Check-In Modal & Add Garage Modal remains same ... */}
            {/* Check-In Modal */}
            <Modal isOpen={isCheckInOpen} onClose={() => setIsCheckInOpen(false)} title="Garage Check-In">
                <form onSubmit={handleCheckIn}>
                    <Select
                        label="Vehicle"
                        options={vehicles.map(v => ({ label: v.registration_number, value: v.vehicle_id }))}
                        value={checkInForm.vehicle_id}
                        onChange={e => setCheckInForm({ ...checkInForm, vehicle_id: e.target.value, linked_work_order_ids: [] })}
                        required
                    />

                    {/* Linked Work Orders Selection */}
                    {openWorkOrders.length > 0 && (
                        <div className="mb-4 bg-gray-50 p-3 rounded border border-gray-200">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Link Open Work Orders</label>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                                {openWorkOrders.map(wo => (
                                    <div key={wo.work_order_id} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id={`wo-${wo.work_order_id}`}
                                            value={wo.work_order_id}
                                            checked={checkInForm.linked_work_order_ids.includes(wo.work_order_id)}
                                            onChange={(e) => {
                                                const id = wo.work_order_id;
                                                if (e.target.checked) {
                                                    setCheckInForm(prev => ({ ...prev, linked_work_order_ids: [...prev.linked_work_order_ids, id] }));
                                                } else {
                                                    setCheckInForm(prev => ({ ...prev, linked_work_order_ids: prev.linked_work_order_ids.filter(i => i !== id) }));
                                                }
                                            }}
                                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor={`wo-${wo.work_order_id}`} className="ml-2 block text-sm text-gray-900 cursor-pointer">
                                            {wo.issue_type} ({wo.type})
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <Select
                        label="Garage"
                        options={garages.map(g => ({ label: g.garage_name, value: g.garage_id }))}
                        value={checkInForm.garage_id}
                        onChange={e => setCheckInForm({ ...checkInForm, garage_id: e.target.value })}
                        required
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Entry Time"
                            type="datetime-local"
                            value={checkInForm.entry_datetime}
                            onChange={e => setCheckInForm({ ...checkInForm, entry_datetime: e.target.value })}
                            required
                        />
                        <Input
                            label="Odometer (km)"
                            type="number"
                            value={checkInForm.odometer_in}
                            onChange={e => setCheckInForm({ ...checkInForm, odometer_in: e.target.value })}
                            required
                        />
                    </div>
                    <Select
                        label="Reason"
                        options={Object.values(VisitReason).map(r => ({ label: r, value: r }))}
                        value={checkInForm.reason_for_visit}
                        onChange={e => setCheckInForm({ ...checkInForm, reason_for_visit: e.target.value as VisitReason })}
                        required
                    />
                    <div className="mt-6 flex justify-end space-x-3">
                        <Button type="button" variant="secondary" onClick={() => setIsCheckInOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={isSubmitting}>Check In</Button>
                    </div>
                </form>
            </Modal>

            {/* Add Garage Modal */}
            <Modal isOpen={isGarageModalOpen} onClose={() => setIsGarageModalOpen(false)} title="Add New Garage">
                <form onSubmit={handleCreateGarage}>
                    <Input
                        label="Garage Name"
                        value={newGarage.garage_name}
                        onChange={e => setNewGarage({ ...newGarage, garage_name: e.target.value })}
                        required
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Type"
                            options={Object.values(GarageType).map(t => ({ label: t, value: t }))}
                            value={newGarage.garage_type}
                            onChange={e => setNewGarage({ ...newGarage, garage_type: e.target.value as GarageType })}
                            required
                        />
                        <Input
                            label="Location"
                            value={newGarage.location}
                            onChange={e => setNewGarage({ ...newGarage, location: e.target.value })}
                            required
                        />
                    </div>
                    <Input
                        label="Supported Vehicles (comma sep)"
                        value={newGarage.supported_vehicle_types}
                        onChange={e => setNewGarage({ ...newGarage, supported_vehicle_types: e.target.value })}
                        placeholder="Truck, Trailer"
                    />
                    <Input
                        label="Contact Details"
                        value={newGarage.contact_details}
                        onChange={e => setNewGarage({ ...newGarage, contact_details: e.target.value })}
                    />
                    <div className="mt-6 flex justify-end space-x-3">
                        <Button type="button" variant="secondary" onClick={() => setIsGarageModalOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={isSubmitting}>Add Garage</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};