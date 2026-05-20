import React, { useState, useEffect } from 'react';
import { MaintenanceSchedule, WorkOrder, WorkOrderStatus, MaintenanceType, ConfidenceFlag, Vehicle, MaintenanceTemplate, VehicleType, MaintenanceTemplateItem, ComponentType, WorkOrderType, WorkshopType, IssueSource, MaintenanceKPIs, VehicleMaintenanceHealth, MaintenanceHealthStatus, EnergyMaintenanceSignal, WorkOrderPart, SparePart, WorkOrderPartStatus, InventoryStock, Vendor, VendorInvoice, InvoiceLineItem, InvoiceStatus } from '../types';
import { MaintenanceAPI, VehicleAPI, EnergyAPI } from '../services/mockDatabase';
import { InventoryAPI, VendorAPI, InvoiceAPI } from '../services/mockDatabase1';
import { Button, Input, Select, Badge, Modal } from '../components/UI';
import { IconWrench, IconPlus, IconCheck, IconAlert, IconTemplate, IconTrash, IconTow, IconMechanic, IconClock, IconMapPin, IconSiren, IconHeartbeat, IconTrendDown, IconChart, IconZap, IconBox, IconClipboardCheck, IconFile, IconCircleDollar, IconEdit } from '../components/Icons';

export const MaintenancePage: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'work-orders' | 'templates'>('dashboard');
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [templates, setTemplates] = useState<MaintenanceTemplate[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [kpis, setKpis] = useState<MaintenanceKPIs | null>(null);
  const [healthScores, setHealthScores] = useState<VehicleMaintenanceHealth[]>([]);
  const [energySignals, setEnergySignals] = useState<EnergyMaintenanceSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  
  // Detail Modal Tabs
  const [detailTab, setDetailTab] = useState<'overview' | 'parts' | 'invoices'>('overview');

  // Work Order Details - Parts State
  const [woParts, setWoParts] = useState<WorkOrderPart[]>([]);
  const [availableParts, setAvailableParts] = useState<SparePart[]>([]);
  const [hubStock, setHubStock] = useState<InventoryStock[]>([]);
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [newWoPart, setNewWoPart] = useState({ part_id: '', quantity: 1, hub_id: 'Pune Hub' });

  // Invoice State
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isAddingInvoice, setIsAddingInvoice] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
      vendor_id: '',
      invoice_number: '',
      invoice_date: new Date().toISOString().split('T')[0],
      items: [] as any[]
  });
  const [newLineItem, setNewLineItem] = useState({
      item_type: 'Part',
      reference_id: '',
      description: '',
      quantity: 1,
      rate: '',
      gst_rate: '18'
  });

  // Work Order Form (Creation)
  const [formData, setFormData] = useState({
    vehicle_id: '',
    issue_type: '',
    type: WorkOrderType.REPAIR,
    odometer_reading: '',
    workshop_name: '',
    workshop_type: WorkshopType.INTERNAL,
    start_date: new Date().toISOString().slice(0, 16),
    status: WorkOrderStatus.OPEN,
    reported_by: IssueSource.DRIVER,
    location: '',
    is_immobilized: false,
    towing_required: false
  });

  // Closure Form (In Detail Modal)
  const [closureData, setClosureData] = useState({
      status: WorkOrderStatus.CLOSED,
      remarks: '',
      parts_cost_signal: '',
      labour_cost_signal: '',
      downtime_hours: ''
  });

  // Template Form
  const [templateForm, setTemplateForm] = useState<{
      name: string;
      applicable_vehicle_type: VehicleType;
      items: Partial<MaintenanceTemplateItem>[];
  }>({
      name: '',
      applicable_vehicle_type: VehicleType.TRUCK,
      items: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [sData, wData, vData, tData, kpiData, eSignals] = await Promise.all([
        MaintenanceAPI.getSchedules(),
        MaintenanceAPI.getWorkOrders(),
        VehicleAPI.getAll(),
        MaintenanceAPI.getTemplates(),
        MaintenanceAPI.getDashboardKPIs(),
        EnergyAPI.getMaintenanceSignals()
      ]);
      setSchedules(sData);
      setWorkOrders(wData.sort((a,b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()));
      setVehicles(vData);
      setTemplates(tData);
      setKpis(kpiData);
      setEnergySignals(eSignals);

      // Fetch health scores for all vehicles
      const scores = await Promise.all(vData.map(v => MaintenanceAPI.getVehicleHealth(v.vehicle_id)));
      setHealthScores(scores);

    } catch (error) {
      console.error("Failed to fetch maintenance data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateModal = (isBreakdown = false, predefinedVehicleId?: string, predefinedIssue?: string) => {
      setFormData({
        vehicle_id: predefinedVehicleId || '',
        issue_type: isBreakdown ? 'Breakdown - ' : (predefinedIssue || ''),
        type: isBreakdown ? WorkOrderType.BREAKDOWN : WorkOrderType.REPAIR,
        odometer_reading: '',
        workshop_name: '',
        workshop_type: isBreakdown ? WorkshopType.ROADSIDE : WorkshopType.INTERNAL,
        start_date: new Date().toISOString().slice(0, 16),
        status: WorkOrderStatus.OPEN,
        reported_by: isBreakdown ? IssueSource.DRIVER : IssueSource.OPS,
        location: '',
        is_immobilized: isBreakdown,
        towing_required: false
      });
      setIsModalOpen(true);
  };

  const handleSubmitWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await MaintenanceAPI.createWorkOrder({
        vehicle_id: formData.vehicle_id,
        issue_type: formData.issue_type,
        type: formData.type,
        odometer_reading: parseInt(formData.odometer_reading),
        workshop_name: formData.workshop_name,
        workshop_type: formData.workshop_type,
        start_date: new Date(formData.start_date).toISOString(),
        status: formData.status as WorkOrderStatus,
        reported_by: formData.reported_by,
        location: formData.location || undefined,
        is_immobilized: formData.is_immobilized,
        towing_required: formData.towing_required,
        confidence_flag: ConfidenceFlag.ESTIMATED
      });
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      alert("Error creating work order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetail = async (wo: WorkOrder) => {
      setSelectedWorkOrder(wo);
      setDetailTab('overview');
      setClosureData({
          status: wo.status,
          remarks: wo.remarks || '',
          parts_cost_signal: wo.parts_cost_signal?.toString() || '',
          labour_cost_signal: wo.labour_cost_signal?.toString() || '',
          downtime_hours: wo.downtime_hours?.toString() || ''
      });
      
      // Fetch parts and invoices for this WO
      try {
          const [parts, allParts, stock, allVendors, allInvoices] = await Promise.all([
              MaintenanceAPI.getParts(wo.work_order_id),
              InventoryAPI.getParts(),
              InventoryAPI.getStock('Pune Hub'),
              VendorAPI.getAll(),
              InvoiceAPI.getByWorkOrder(wo.work_order_id)
          ]);
          setWoParts(parts);
          setAvailableParts(allParts);
          setHubStock(stock);
          setVendors(allVendors);
          setInvoices(allInvoices);
      } catch(e) {
          console.error("Failed to load details");
      }

      setIsDetailModalOpen(true);
  };

  const handleUpdateWorkOrder = async () => {
      if (!selectedWorkOrder) return;
      
      // Validation: Ensure all Issued parts are Consumed before closing
      if (closureData.status === WorkOrderStatus.CLOSED) {
          const pendingParts = woParts.some(p => p.status === WorkOrderPartStatus.ISSUED);
          if (pendingParts) {
              alert("Cannot close Work Order. Some parts are marked as 'Issued' but not 'Consumed'. Please consume or return them.");
              return;
          }
      }

      setIsSubmitting(true);
      try {
          await MaintenanceAPI.updateWorkOrder(selectedWorkOrder.work_order_id, {
              status: closureData.status,
              remarks: closureData.remarks,
              parts_cost_signal: closureData.parts_cost_signal ? parseFloat(closureData.parts_cost_signal) : undefined,
              labour_cost_signal: closureData.labour_cost_signal ? parseFloat(closureData.labour_cost_signal) : undefined,
              downtime_hours: closureData.downtime_hours ? parseFloat(closureData.downtime_hours) : undefined
          });
          setIsDetailModalOpen(false);
          fetchData();
      } catch (e) {
          alert("Error updating work order");
      } finally {
          setIsSubmitting(false);
      }
  };

  // --- Part Management Handlers ---
  const handleAddPartToWO = async () => {
      if (!selectedWorkOrder || !newWoPart.part_id) return;
      setIsAddingPart(true);
      try {
          await MaintenanceAPI.addPart({
              work_order_id: selectedWorkOrder.work_order_id,
              part_id: newWoPart.part_id,
              quantity_required: newWoPart.quantity,
              hub_id: newWoPart.hub_id
          });
          // Refresh
          const parts = await MaintenanceAPI.getParts(selectedWorkOrder.work_order_id);
          setWoParts(parts);
          setNewWoPart({ part_id: '', quantity: 1, hub_id: 'Pune Hub' });
      } catch(e) {
          alert("Error adding part");
      } finally {
          setIsAddingPart(false);
      }
  };

  const handleIssuePart = async (woPartId: string) => {
      try {
          await MaintenanceAPI.issuePart(woPartId);
          if (selectedWorkOrder) {
              const parts = await MaintenanceAPI.getParts(selectedWorkOrder.work_order_id);
              setWoParts(parts);
              const stock = await InventoryAPI.getStock('Pune Hub');
              setHubStock(stock);
          }
      } catch (e: any) {
          alert(e.message || "Failed to issue part");
      }
  };

  const handleConsumePart = async (woPartId: string) => {
      try {
          await MaintenanceAPI.consumePart(woPartId);
          if (selectedWorkOrder) {
              const parts = await MaintenanceAPI.getParts(selectedWorkOrder.work_order_id);
              setWoParts(parts);
              const stock = await InventoryAPI.getStock('Pune Hub');
              setHubStock(stock);
          }
      } catch (e: any) {
          alert(e.message || "Failed to consume part");
      }
  };

  // --- Invoice Handlers ---
  const handleAddInvoiceItem = () => {
      if (!newLineItem.description && newLineItem.item_type === 'Labour') return;
      if (!newLineItem.reference_id && newLineItem.item_type === 'Part') return;

      setNewInvoice(prev => ({
          ...prev,
          items: [...prev.items, {
              ...newLineItem,
              description: newLineItem.item_type === 'Part' 
                  ? getPartName(newLineItem.reference_id)
                  : newLineItem.description,
              rate: parseFloat(newLineItem.rate),
              gst_rate: parseInt(newLineItem.gst_rate)
          }]
      }));
      setNewLineItem({ item_type: 'Part', reference_id: '', description: '', quantity: 1, rate: '', gst_rate: '18' });
  };

  const handleCreateInvoice = async () => {
      if (!selectedWorkOrder) return;
      if (newInvoice.items.length === 0) {
          alert("Please add at least one line item.");
          return;
      }
      setIsSubmitting(true);
      try {
          await InvoiceAPI.create({
              ...newInvoice,
              work_order_id: selectedWorkOrder.work_order_id
          });
          const invs = await InvoiceAPI.getByWorkOrder(selectedWorkOrder.work_order_id);
          setInvoices(invs);
          setIsAddingInvoice(false);
          setNewInvoice({ vendor_id: '', invoice_number: '', invoice_date: new Date().toISOString().split('T')[0], items: [] });
      } catch(e) {
          alert("Error creating invoice");
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleApproveInvoice = async (invoiceId: string) => {
      try {
          await InvoiceAPI.approveInvoice(invoiceId);
          if (selectedWorkOrder) {
              const invs = await InvoiceAPI.getByWorkOrder(selectedWorkOrder.work_order_id);
              setInvoices(invs);
          }
      } catch (e: any) {
          alert(e.message || "Cannot approve invoice");
      }
  };

  const getPartName = (id: string) => availableParts.find(p => p.part_id === id)?.part_name || id;
  const getAvailableStock = (partId: string) => hubStock.find(s => s.part_id === partId)?.available_quantity || 0;

  // --- Template Handlers ---
  const handleAddTemplateItem = () => {
      setTemplateForm({
          ...templateForm,
          items: [...templateForm.items, { name: '', item_type: 'Service', criticality: 'Medium', frequency_km: 10000 }]
      });
  };

  const handleRemoveTemplateItem = (index: number) => {
      const newItems = [...templateForm.items];
      newItems.splice(index, 1);
      setTemplateForm({ ...templateForm, items: newItems });
  };

  const handleTemplateItemChange = (index: number, field: keyof MaintenanceTemplateItem, value: any) => {
      const newItems = [...templateForm.items];
      newItems[index] = { ...newItems[index], [field]: value };
      setTemplateForm({ ...templateForm, items: newItems });
  };

  const handleSubmitTemplate = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
          await MaintenanceAPI.createTemplate({
              name: templateForm.name,
              applicable_vehicle_type: templateForm.applicable_vehicle_type,
              items: templateForm.items.map(item => ({ ...item, item_id: crypto.randomUUID() } as MaintenanceTemplateItem))
          });
          setIsTemplateModalOpen(false);
          setTemplateForm({ name: '', applicable_vehicle_type: VehicleType.TRUCK, items: [] });
          fetchData();
      } catch (e) {
          alert("Error saving template");
      } finally {
          setIsSubmitting(false);
      }
  };

  const getVehicleReg = (id: string) => vehicles.find(v => v.vehicle_id === id)?.registration_number || id;

  const getTypeBadgeColor = (type: WorkOrderType) => {
      switch(type) {
          case WorkOrderType.BREAKDOWN: return 'red';
          case WorkOrderType.REPAIR: return 'yellow';
          default: return 'blue';
      }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading Maintenance Data...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Maintenance & Repair</h1>
        <div className="flex space-x-3">
          <div className="bg-white rounded-lg shadow-sm p-1 border border-gray-200">
            <button 
                onClick={() => setView('dashboard')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${view === 'dashboard' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
            >
                Dashboard
            </button>
            <button 
                onClick={() => setView('work-orders')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${view === 'work-orders' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
            >
                Work Orders
            </button>
            <button 
                onClick={() => setView('templates')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${view === 'templates' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
            >
                Templates
            </button>
          </div>
          {view === 'templates' ? (
              <Button onClick={() => setIsTemplateModalOpen(true)}>
                  <IconPlus className="w-5 h-5 mr-2" />
                  New Template
              </Button>
          ) : (
              <div className="flex space-x-2">
                  <Button variant="secondary" onClick={() => handleOpenCreateModal(false)}>
                    <IconPlus className="w-5 h-5 mr-2" />
                    New Repair
                  </Button>
                  <Button variant="danger" onClick={() => handleOpenCreateModal(true)}>
                    <IconSiren className="w-5 h-5 mr-2" />
                    Report Breakdown
                  </Button>
              </div>
          )}
        </div>
      </div>

      {view === 'dashboard' && kpis && (
        <div className="space-y-6">
            {/* Health Score Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-medium text-gray-500">Fleet Health</div>
                        <IconHeartbeat className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex space-x-2">
                        <div className="text-center flex-1 border-r border-gray-100">
                            <div className="text-2xl font-bold text-green-600">{healthScores.filter(h => h.health_status === MaintenanceHealthStatus.GOOD).length}</div>
                            <div className="text-xs text-gray-500">Good</div>
                        </div>
                        <div className="text-center flex-1 border-r border-gray-100">
                            <div className="text-2xl font-bold text-yellow-600">{healthScores.filter(h => h.health_status === MaintenanceHealthStatus.WATCH).length}</div>
                            <div className="text-xs text-gray-500">Watch</div>
                        </div>
                        <div className="text-center flex-1">
                            <div className="text-2xl font-bold text-red-600">{healthScores.filter(h => h.health_status === MaintenanceHealthStatus.CRITICAL).length}</div>
                            <div className="text-xs text-gray-500">Critical</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-medium text-gray-500">Service Overdue</div>
                        <IconClock className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex items-baseline">
                        <span className={`text-3xl font-bold ${kpis.overdue_services_count > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            {kpis.overdue_services_count}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">vehicles</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-medium text-gray-500">Avg Downtime</div>
                        <IconTrendDown className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex items-baseline">
                        <span className="text-3xl font-bold text-gray-900">{kpis.avg_downtime_hours}</span>
                        <span className="ml-2 text-sm text-gray-500">hours/repair</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-medium text-gray-500">Breakdowns (30d)</div>
                        <IconSiren className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="flex items-baseline">
                        <span className="text-3xl font-bold text-gray-900">{kpis.breakdowns_last_30_days}</span>
                        <span className="ml-2 text-sm text-gray-500">incidents</span>
                    </div>
                </div>
            </div>

            {/* Upcoming Schedule Table */}
            <div className="bg-white shadow rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="font-medium text-gray-900">Upcoming Preventive Maintenance</h3>
                </div>
                {schedules.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No scheduled maintenance tasks found.</div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-white">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Due (Est.)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {schedules.map(sch => (
                                <tr key={sch.schedule_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{getVehicleReg(sch.vehicle_id)}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{sch.maintenance_type}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {sch.next_due_km} km <span className="text-gray-400">|</span> {new Date(sch.next_due_date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge color={sch.status === 'Overdue' ? 'red' : sch.status === 'Due' ? 'yellow' : 'green'}>{sch.status}</Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm">
                                        <button 
                                            onClick={() => handleOpenCreateModal(false, sch.vehicle_id, `${sch.maintenance_type} - Preventive`)}
                                            className="text-primary-600 hover:text-primary-900 font-medium"
                                        >
                                            Create WO
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
      )}

      {view === 'work-orders' && (
        <div className="bg-white shadow rounded-lg border border-gray-200">
             <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Breakdown Info</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {workOrders.map(w => (
                        <tr key={w.work_order_id} className={w.type === WorkOrderType.BREAKDOWN ? 'bg-red-50' : ''}>
                            <td className="px-6 py-4">
                                <Badge color={getTypeBadgeColor(w.type)}>{w.type}</Badge>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{getVehicleReg(w.vehicle_id)}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                                {w.issue_type}
                                <div className="text-xs text-gray-500 mt-1">{w.workshop_name} ({w.workshop_type})</div>
                            </td>
                            <td className="px-6 py-4">
                                <Badge color={w.status === WorkOrderStatus.CLOSED ? 'gray' : 'blue'}>{w.status}</Badge>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                                {w.type === WorkOrderType.BREAKDOWN ? (
                                    <div className="flex flex-col space-y-1">
                                        <span className="flex items-center text-xs"><IconMapPin className="w-3 h-3 mr-1"/> {w.location || 'Unknown'}</span>
                                        {w.towing_required && <span className="flex items-center text-xs text-red-600 font-bold"><IconTow className="w-3 h-3 mr-1"/> Towing</span>}
                                    </div>
                                ) : '-'}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium">
                                <button 
                                    onClick={() => handleOpenDetail(w)}
                                    className="text-primary-600 hover:text-primary-900"
                                >
                                    Manage
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}

      {view === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.length === 0 ? (
                  <div className="col-span-full p-12 text-center text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                      <IconTemplate className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p>No maintenance templates created yet.</p>
                      <p className="text-xs mt-1">Create templates to standardize service schedules across vehicle types.</p>
                  </div>
              ) : (
                  templates.map(t => (
                      <div key={t.template_id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                              <h3 className="text-lg font-bold text-gray-900">{t.name}</h3>
                              <Badge color="blue">{t.applicable_vehicle_type}</Badge>
                          </div>
                          <div className="mb-4">
                              <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Service Items ({t.items.length})</p>
                              <div className="space-y-2">
                                  {t.items.slice(0, 3).map((item, idx) => (
                                      <div key={idx} className="flex justify-between text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                          <span>{item.name}</span>
                                          <span className="text-xs text-gray-400">{item.frequency_km}km</span>
                                      </div>
                                  ))}
                                  {t.items.length > 3 && (
                                      <div className="text-xs text-center text-gray-400 pt-1">
                                          + {t.items.length - 3} more items
                                      </div>
                                  )}
                              </div>
                          </div>
                          <div className="pt-3 border-t border-gray-100 flex justify-end">
                              <button className="text-sm text-primary-600 font-medium hover:text-primary-800 flex items-center">
                                  <IconEdit className="w-3 h-3 mr-1" />
                                  Edit Template
                              </button>
                          </div>
                      </div>
                  ))
              )}
          </div>
      )}

      {/* Detail & Closure Modal */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title={`Manage Work Order #${selectedWorkOrder?.work_order_id.slice(0,6)}`}>
          {selectedWorkOrder && (
              <div className="space-y-6">
                  {/* Summary */}
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{selectedWorkOrder.issue_type}</h3>
                          <Badge color={getTypeBadgeColor(selectedWorkOrder.type)}>{selectedWorkOrder.type}</Badge>
                      </div>
                      <div className="text-sm text-gray-600 grid grid-cols-2 gap-2">
                          <div>Vehicle: <span className="font-medium text-gray-900">{getVehicleReg(selectedWorkOrder.vehicle_id)}</span></div>
                          <div>Workshop: <span className="font-medium text-gray-900">{selectedWorkOrder.workshop_name}</span></div>
                          <div>Date: <span className="font-medium text-gray-900">{new Date(selectedWorkOrder.start_date).toLocaleString()}</span></div>
                          <div>Odometer: <span className="font-medium text-gray-900">{selectedWorkOrder.odometer_reading.toLocaleString()} km</span></div>
                      </div>
                  </div>

                  {/* Tabs */}
                  <div className="border-b border-gray-200">
                      <nav className="-mb-px flex space-x-4">
                          <button 
                            onClick={() => setDetailTab('overview')}
                            className={`pb-2 px-1 border-b-2 text-sm font-medium ${detailTab === 'overview' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                          >
                              Update & Close
                          </button>
                          <button 
                            onClick={() => setDetailTab('parts')}
                            className={`pb-2 px-1 border-b-2 text-sm font-medium ${detailTab === 'parts' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                          >
                              Spare Parts ({woParts.length})
                          </button>
                          <button 
                            onClick={() => setDetailTab('invoices')}
                            className={`pb-2 px-1 border-b-2 text-sm font-medium ${detailTab === 'invoices' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                          >
                              Vendor Invoices ({invoices.length})
                          </button>
                      </nav>
                  </div>

                  {/* Tab Content: Parts */}
                  {detailTab === 'parts' && (
                      <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
                          {/* Part Add Section */}
                          {selectedWorkOrder.status !== WorkOrderStatus.CLOSED && (
                              <div className="p-3 bg-gray-50 border-b border-gray-200 flex space-x-2">
                                  <Select 
                                      label="" 
                                      options={availableParts.map(p => ({ label: p.part_name, value: p.part_id }))}
                                      value={newWoPart.part_id}
                                      onChange={e => setNewWoPart({...newWoPart, part_id: e.target.value})}
                                      className="flex-1 mb-0 text-sm"
                                  />
                                  <Input 
                                      label="" 
                                      type="number"
                                      min="1"
                                      value={newWoPart.quantity}
                                      onChange={e => setNewWoPart({...newWoPart, quantity: parseInt(e.target.value)})}
                                      className="w-20 mb-0 text-sm"
                                  />
                                  <Button size="sm" onClick={handleAddPartToWO} disabled={!newWoPart.part_id || isAddingPart}>
                                      Add
                                  </Button>
                              </div>
                          )}

                          {woParts.length === 0 ? (
                              <div className="p-4 text-center text-sm text-gray-500">No parts added to this work order.</div>
                          ) : (
                              <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                      <tr>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Part</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                                      </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                      {woParts.map(part => {
                                          const avail = getAvailableStock(part.part_id);
                                          return (
                                              <tr key={part.wo_part_id}>
                                                  <td className="px-3 py-2 text-sm text-gray-900">
                                                      {getPartName(part.part_id)}
                                                      {part.status === WorkOrderPartStatus.PLANNED && (
                                                          <div className={`text-xs ${avail >= part.quantity_required ? 'text-green-600' : 'text-red-600'}`}>
                                                              Stock: {avail} available
                                                          </div>
                                                      )}
                                                  </td>
                                                  <td className="px-3 py-2 text-sm text-gray-900">{part.quantity_required}</td>
                                                  <td className="px-3 py-2 text-sm">
                                                      <span className={`px-2 py-0.5 rounded text-xs ${
                                                          part.status === WorkOrderPartStatus.CONSUMED ? 'bg-green-100 text-green-800' :
                                                          part.status === WorkOrderPartStatus.ISSUED ? 'bg-blue-100 text-blue-800' :
                                                          'bg-gray-100 text-gray-800'
                                                      }`}>
                                                          {part.status}
                                                      </span>
                                                  </td>
                                                  <td className="px-3 py-2 text-right text-xs">
                                                      {part.status === WorkOrderPartStatus.PLANNED && (
                                                          <button 
                                                              onClick={() => handleIssuePart(part.wo_part_id)}
                                                              disabled={avail < part.quantity_required}
                                                              className="text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                                          >
                                                              Issue
                                                          </button>
                                                      )}
                                                      {part.status === WorkOrderPartStatus.ISSUED && (
                                                          <button 
                                                              onClick={() => handleConsumePart(part.wo_part_id)}
                                                              className="text-green-600 hover:text-green-800 font-medium"
                                                          >
                                                              Consume
                                                          </button>
                                                      )}
                                                  </td>
                                              </tr>
                                          );
                                      })}
                                  </tbody>
                              </table>
                          )}
                      </div>
                  )}

                  {/* Tab Content: Invoices */}
                  {detailTab === 'invoices' && (
                      <div className="space-y-4">
                          {isAddingInvoice ? (
                              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                                  <h4 className="text-sm font-bold mb-3">Record New Invoice</h4>
                                  <div className="grid grid-cols-2 gap-3 mb-3">
                                      <Select 
                                          label="Vendor" 
                                          options={vendors.map(v => ({ label: v.vendor_name, value: v.vendor_id }))}
                                          value={newInvoice.vendor_id}
                                          onChange={e => setNewInvoice({...newInvoice, vendor_id: e.target.value})}
                                          className="mb-0"
                                      />
                                      <Input 
                                          label="Invoice No"
                                          value={newInvoice.invoice_number}
                                          onChange={e => setNewInvoice({...newInvoice, invoice_number: e.target.value})}
                                          className="mb-0"
                                      />
                                  </div>
                                  <Input 
                                      label="Invoice Date"
                                      type="date"
                                      value={newInvoice.invoice_date}
                                      onChange={e => setNewInvoice({...newInvoice, invoice_date: e.target.value})}
                                  />
                                  
                                  <div className="border-t border-gray-200 pt-3 mt-3">
                                      <h5 className="text-xs font-semibold text-gray-600 uppercase mb-2">Line Items</h5>
                                      <div className="flex space-x-2 items-end mb-2">
                                          <div className="w-1/4">
                                              <label className="text-xs text-gray-500">Type</label>
                                              <select 
                                                  className="w-full text-sm border-gray-300 rounded p-1.5"
                                                  value={newLineItem.item_type}
                                                  onChange={e => setNewLineItem({...newLineItem, item_type: e.target.value, reference_id: '', description: ''})}
                                              >
                                                  <option value="Part">Part</option>
                                                  <option value="Labour">Labour</option>
                                              </select>
                                          </div>
                                          <div className="flex-1">
                                              <label className="text-xs text-gray-500">Item / Desc</label>
                                              {newLineItem.item_type === 'Part' ? (
                                                  <select 
                                                      className="w-full text-sm border-gray-300 rounded p-1.5"
                                                      value={newLineItem.reference_id}
                                                      onChange={e => setNewLineItem({...newLineItem, reference_id: e.target.value})}
                                                  >
                                                      <option value="">Select Part</option>
                                                      {woParts.map(p => (
                                                          <option key={p.wo_part_id} value={p.part_id}>{getPartName(p.part_id)} (Qty: {p.quantity_consumed})</option>
                                                      ))}
                                                  </select>
                                              ) : (
                                                  <input 
                                                      className="w-full text-sm border-gray-300 rounded p-1.5"
                                                      placeholder="e.g. Engine Overhaul Labour"
                                                      value={newLineItem.description}
                                                      onChange={e => setNewLineItem({...newLineItem, description: e.target.value})}
                                                  />
                                              )}
                                          </div>
                                          <div className="w-16">
                                              <label className="text-xs text-gray-500">Qty</label>
                                              <input 
                                                  type="number" 
                                                  className="w-full text-sm border-gray-300 rounded p-1.5"
                                                  value={newLineItem.quantity}
                                                  onChange={e => setNewLineItem({...newLineItem, quantity: parseInt(e.target.value)})}
                                              />
                                          </div>
                                          <div className="w-20">
                                              <label className="text-xs text-gray-500">Rate</label>
                                              <input 
                                                  type="number" 
                                                  className="w-full text-sm border-gray-300 rounded p-1.5"
                                                  value={newLineItem.rate}
                                                  onChange={e => setNewLineItem({...newLineItem, rate: e.target.value})}
                                              />
                                          </div>
                                          <div className="w-16">
                                              <label className="text-xs text-gray-500">GST%</label>
                                              <select 
                                                  className="w-full text-sm border-gray-300 rounded p-1.5"
                                                  value={newLineItem.gst_rate}
                                                  onChange={e => setNewLineItem({...newLineItem, gst_rate: e.target.value})}
                                              >
                                                  <option value="0">0%</option>
                                                  <option value="5">5%</option>
                                                  <option value="12">12%</option>
                                                  <option value="18">18%</option>
                                                  <option value="28">28%</option>
                                              </select>
                                          </div>
                                          <Button size="sm" onClick={handleAddInvoiceItem}>+</Button>
                                      </div>

                                      <div className="space-y-1">
                                          {newInvoice.items.map((item, idx) => (
                                              <div key={idx} className="flex justify-between text-xs bg-white p-2 rounded border border-gray-200">
                                                  <span>{item.description} (x{item.quantity})</span>
                                                  <span className="font-mono">₹{item.quantity * item.rate} + {item.gst_rate}% GST</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>

                                  <div className="flex justify-end space-x-2 mt-4">
                                      <Button size="sm" variant="secondary" onClick={() => setIsAddingInvoice(false)}>Cancel</Button>
                                      <Button size="sm" onClick={handleCreateInvoice} isLoading={isSubmitting}>Submit Invoice</Button>
                                  </div>
                              </div>
                          ) : (
                              <div className="flex justify-between items-center mb-2">
                                  <h4 className="text-sm font-medium text-gray-700">Vendor Invoices</h4>
                                  <Button size="sm" onClick={() => setIsAddingInvoice(true)}>+ Record Invoice</Button>
                              </div>
                          )}

                          {invoices.length === 0 && !isAddingInvoice ? (
                              <div className="p-4 text-center text-gray-500 text-sm border border-dashed rounded-md">No invoices recorded yet.</div>
                          ) : (
                              <div className="space-y-3">
                                  {invoices.map(inv => (
                                      <div key={inv.invoice_id} className="bg-white border border-gray-200 rounded-md p-3">
                                          <div className="flex justify-between items-start mb-2">
                                              <div>
                                                  <div className="font-bold text-sm text-gray-900">{vendors.find(v => v.vendor_id === inv.vendor_id)?.vendor_name}</div>
                                                  <div className="text-xs text-gray-500">#{inv.invoice_number} • {new Date(inv.invoice_date).toLocaleDateString()}</div>
                                              </div>
                                              <Badge color={inv.status === InvoiceStatus.APPROVED ? 'green' : inv.status === InvoiceStatus.PAID ? 'blue' : 'yellow'}>{inv.status}</Badge>
                                          </div>
                                          <div className="flex justify-between items-end">
                                              <div className="text-xs text-gray-500">
                                                  <div>Subtotal: ₹{inv.subtotal_amount.toLocaleString()}</div>
                                                  <div>GST: ₹{inv.gst_amount.toLocaleString()}</div>
                                              </div>
                                              <div className="text-right">
                                                  <div className="text-sm font-bold text-gray-900">₹{inv.total_amount.toLocaleString()}</div>
                                                  {inv.status === InvoiceStatus.SUBMITTED && (
                                                      <button 
                                                          onClick={() => handleApproveInvoice(inv.invoice_id)}
                                                          className={`text-xs mt-1 ${selectedWorkOrder.status === WorkOrderStatus.CLOSED ? 'text-blue-600 hover:text-blue-800 underline' : 'text-gray-400 cursor-not-allowed'}`}
                                                          title={selectedWorkOrder.status !== WorkOrderStatus.CLOSED ? "Close Work Order to approve" : ""}
                                                          disabled={selectedWorkOrder.status !== WorkOrderStatus.CLOSED}
                                                      >
                                                          Approve
                                                      </button>
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  )}

                  {/* Tab Content: Overview (Status Update) */}
                  {detailTab === 'overview' && (
                      <div className="pt-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Update Status</h4>
                          <div className="flex space-x-2 mb-4">
                              {[WorkOrderStatus.OPEN, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.CLOSED].map(status => (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => setClosureData({...closureData, status})}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md border ${closureData.status === status ? 'bg-primary-50 border-primary-500 text-primary-700 ring-1 ring-primary-500' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                  >
                                      {status}
                                  </button>
                              ))}
                          </div>

                          {closureData.status === WorkOrderStatus.CLOSED && (
                              <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 space-y-4 mb-4">
                                  <div className="flex items-center text-sm text-yellow-800 font-medium mb-2">
                                      <IconCheck className="w-4 h-4 mr-2" />
                                      Closing Requirements
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      <Input 
                                          label="Parts Cost (Signal)"
                                          type="number"
                                          value={closureData.parts_cost_signal}
                                          onChange={e => setClosureData({...closureData, parts_cost_signal: e.target.value})}
                                          placeholder="Est. Value"
                                      />
                                      <Input 
                                          label="Labour Cost (Signal)"
                                          type="number"
                                          value={closureData.labour_cost_signal}
                                          onChange={e => setClosureData({...closureData, labour_cost_signal: e.target.value})}
                                          placeholder="Est. Value"
                                      />
                                  </div>
                                  <Input 
                                      label="Downtime (Hours)"
                                      type="number"
                                      value={closureData.downtime_hours}
                                      onChange={e => setClosureData({...closureData, downtime_hours: e.target.value})}
                                      placeholder="e.g. 48"
                                  />
                              </div>
                          )}

                          <div className="mt-4">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks / Technician Notes</label>
                              <textarea 
                                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm p-2 border"
                                  rows={3}
                                  value={closureData.remarks}
                                  onChange={e => setClosureData({...closureData, remarks: e.target.value})}
                                  placeholder="Describe work done..."
                              />
                          </div>
                      </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                      <Button variant="secondary" onClick={() => setIsDetailModalOpen(false)}>Close</Button>
                      {detailTab === 'overview' && (
                          <Button onClick={handleUpdateWorkOrder} isLoading={isSubmitting}>
                              {closureData.status === WorkOrderStatus.CLOSED ? 'Close & Restore Vehicle' : 'Update Order'}
                          </Button>
                      )}
                  </div>
              </div>
          )}
      </Modal>

      {/* Create Template Modal */}
      <Modal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} title="Create Maintenance Template">
          <form onSubmit={handleSubmitTemplate}>
              <div className="space-y-4">
                  <Input 
                      label="Template Name" 
                      value={templateForm.name} 
                      onChange={e => setTemplateForm({...templateForm, name: e.target.value})}
                      required
                      placeholder="e.g. 6x4 Truck Standard"
                  />
                  <Select 
                      label="Applicable Vehicle Type"
                      options={Object.values(VehicleType).map(v => ({ label: v, value: v }))}
                      value={templateForm.applicable_vehicle_type}
                      onChange={e => setTemplateForm({...templateForm, applicable_vehicle_type: e.target.value as VehicleType})}
                      required
                  />
                  
                  <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-medium text-gray-700">Maintenance Items</label>
                          <button type="button" onClick={handleAddTemplateItem} className="text-sm text-primary-600 hover:text-primary-800 font-medium">
                              + Add Item
                          </button>
                      </div>
                      
                      {templateForm.items.length === 0 && (
                          <div className="text-sm text-gray-500 italic p-2 bg-gray-50 rounded">No items added.</div>
                      )}

                      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                          {templateForm.items.map((item, index) => (
                              <div key={index} className="flex items-start space-x-2 bg-gray-50 p-3 rounded-md relative group">
                                  <div className="flex-1 grid grid-cols-2 gap-2">
                                      <input 
                                          className="block w-full text-xs border-gray-300 rounded-md shadow-sm p-1.5"
                                          placeholder="Item Name"
                                          value={item.name}
                                          onChange={e => handleTemplateItemChange(index, 'name', e.target.value)}
                                          required
                                      />
                                      {/* ... other inputs ... */}
                                  </div>
                                  <button type="button" onClick={() => handleRemoveTemplateItem(index)} className="text-gray-400 hover:text-red-500">
                                      <IconTrash className="w-4 h-4" />
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                  <Button type="button" variant="secondary" onClick={() => setIsTemplateModalOpen(false)}>Cancel</Button>
                  <Button type="submit" isLoading={isSubmitting}>Save Template</Button>
              </div>
          </form>
      </Modal>
      
      {/* Create WO Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={formData.type === WorkOrderType.BREAKDOWN ? "Report Breakdown" : "Create Work Order"}>
        <form onSubmit={handleSubmitWorkOrder}>
             <div className="grid grid-cols-1 gap-4">
                 <Select 
                    label="Vehicle" 
                    options={vehicles.map(v => ({ label: v.registration_number, value: v.vehicle_id }))}
                    value={formData.vehicle_id}
                    onChange={e => setFormData({...formData, vehicle_id: e.target.value})}
                    required
                />
                <Input 
                    label="Issue Description" 
                    value={formData.issue_type}
                    onChange={e => setFormData({...formData, issue_type: e.target.value})}
                    required
                />
                <Select 
                    label="Type"
                    options={Object.values(WorkOrderType).map(v => ({ label: v, value: v }))}
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as WorkOrderType})}
                    required
                 />
                 <Input 
                    label="Odometer (km)" 
                    type="number"
                    value={formData.odometer_reading}
                    onChange={e => setFormData({...formData, odometer_reading: e.target.value})}
                    required
                />
                 <Input 
                    label="Workshop" 
                    value={formData.workshop_name}
                    onChange={e => setFormData({...formData, workshop_name: e.target.value})}
                    required
                />
            </div>
             <div className="mt-6 flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" isLoading={isSubmitting} variant={formData.type === WorkOrderType.BREAKDOWN ? 'danger' : 'primary'}>
                    {formData.type === WorkOrderType.BREAKDOWN ? 'Log Breakdown' : 'Create Order'}
                </Button>
            </div>
        </form>
      </Modal>
    </div>
  );
};