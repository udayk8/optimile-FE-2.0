import { 
    SparePart, InventoryStock, InventoryMovement, PartCategory, MovementType, ReorderAlert, ReorderStatus,
    OpsException, ExceptionSeverity, ExceptionStatus,
    Vendor, VendorInvoice, InvoiceLineItem, InvoiceStatus, WorkOrder, WorkOrderStatus,
    VendorPayment, PaymentStatus, VendorLedgerSummary,
    PurchaseRequest, RequestStatus,
    Garage, GarageType, GarageVisit, GarageVisitStatus, VisitReason, VehicleStatus,
    GarageRepairJob, GaragePartUsage, GarageLabour, GarageVisitCostSummary,
    GarageKPIs, GaragePerformanceStat, HighMaintenanceVehicle, GarageClosureStatus, GarageApprovalLevel, GarageVisitApproval
} from '../types';
import { VehicleAPI, MaintenanceAPI } from './mockDatabase';

// Helper delay function
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- SEED DATA ---
const SEED_VENDORS: Vendor[] = [
    { vendor_id: 'ven1', vendor_name: 'City Garage Services', gstin: '27ABCDE1234F1Z5', address: 'Plot 4, MIDC, Pune', service_categories: ['Labour', 'Service'], status: 'Active' },
    { vendor_id: 'ven2', vendor_name: 'Genuine Auto Parts', gstin: '27FGHIJ5678K1Z9', address: 'Shop 12, Transport Nagar, Pune', service_categories: ['Parts'], status: 'Active' },
    { vendor_id: 'ven3', vendor_name: 'Highway Rescue 24x7', gstin: '27KLMNO9012L1Z3', address: 'NH48, Satara', service_categories: ['Towing', 'Emergency'], status: 'Active' },
    { vendor_id: 'ven4', vendor_name: 'Precision Truck Repairs', gstin: '27PQRSU3456M1Z7', address: 'Gate No 5, Chakan MIDC, Pune', service_categories: ['Labour', 'Service'], status: 'Active' },
    { vendor_id: 'ven5', vendor_name: 'National Lubes & Oils', gstin: '27TUVWX7890N1Z2', address: 'Warehouse 8, Bhosari, Pune', service_categories: ['Parts', 'Lubricants'], status: 'Active' }
];

const SEED_PURCHASE_REQUESTS: PurchaseRequest[] = [
    {
        request_id: 'pr1',
        part_id: 'p2',
        hub_id: 'Pune Hub',
        quantity: 25,
        requested_by: 'Rahul Sharma',
        request_date: new Date(Date.now() - 2 * 86400000).toISOString(),
        status: RequestStatus.PENDING,
        priority: 'Urgent',
        notes: 'Stock running low due to upcoming maintenance schedule'
    },
    {
        request_id: 'pr2',
        part_id: 'p5',
        hub_id: 'Pune Hub',
        quantity: 40,
        requested_by: 'Amit Kulkarni',
        request_date: new Date(Date.now() - 5 * 86400000).toISOString(),
        status: RequestStatus.APPROVED,
        priority: 'Normal',
        notes: 'Bulk order for scheduled oil change across fleet'
        },
        {
            request_id: 'pr3',
            part_id: 'p7',
            hub_id: 'Pune Hub',
            quantity: 60,
            requested_by: 'Sneha Patil',
            request_date: new Date(Date.now() - 1 * 86400000).toISOString(),
            status: RequestStatus.PENDING,
            priority: 'Normal',
            notes: 'Gearbox oil required for upcoming preventive maintenance'
            },
            {
                request_id: 'pr4',
                part_id: 'p11',
                hub_id: 'Pune Hub',
                quantity: 20,
                requested_by: 'Vikram Deshpande',
                request_date: new Date(Date.now() - 7 * 86400000).toISOString(),
                status: RequestStatus.REJECTED,
                priority: 'Normal',
                notes: 'Rejected due to sufficient existing stock at warehouse'
                }
];

const SEED_GARAGES: Garage[] = [
    {
        garage_id: 'g1',
        garage_name: 'Pune Central Workshop',
        garage_type: GarageType.INTERNAL,
        location: 'Pune Hub',
        supported_vehicle_types: ['Truck', 'Container', 'Trailer'],
        status: 'Active'
    },
    {
        garage_id: 'g2',
        garage_name: 'City Garage Services',
        garage_type: GarageType.EXTERNAL,
        location: 'Mumbai - Andheri',
        supported_vehicle_types: ['Truck'],
        contact_details: '9876543210',
        status: 'Active'
    },
    {
  garage_id: 'g3',
  garage_name: 'Nashik Regional Workshop',
  garage_type: GarageType.INTERNAL,
  location: 'Nashik Hub',
  supported_vehicle_types: ['Truck', 'Trailer'],
  status: 'Active'
  },
  {
  garage_id: 'g4',
  garage_name: 'Highway Auto Care',
  garage_type: GarageType.EXTERNAL,
  location: 'NH48 – Lonavala',
  supported_vehicle_types: ['Truck', 'Container'],
  contact_details: '9123456789',
  status: 'Active'
  }
];

// Enhanced MockDatabase to interact with existing keys
class MockDatabaseEnhanced {
    // Read directly from the existing localStorage keys
    getParts(): SparePart[] { return JSON.parse(localStorage.getItem('optimile_spare_parts') || '[]'); }
    getStock(): InventoryStock[] { return JSON.parse(localStorage.getItem('optimile_inventory_stock') || '[]'); }
    getMovements(): InventoryMovement[] { return JSON.parse(localStorage.getItem('optimile_inventory_movements') || '[]'); }
    getReorderAlerts(): ReorderAlert[] { return JSON.parse(localStorage.getItem('optimile_reorder_alerts') || '[]'); }
    getExceptions(): OpsException[] { return JSON.parse(localStorage.getItem('optimile_exceptions') || '[]'); }
    
    // Vendor & Invoice Getters
    getVendors(): Vendor[] { 
        const v = localStorage.getItem('optimile_vendors');
        return v ? JSON.parse(v) : SEED_VENDORS; // Default seed if not present
    }
    getInvoices(): VendorInvoice[] { return JSON.parse(localStorage.getItem('optimile_vendor_invoices') || '[]'); }
    getInvoiceItems(): InvoiceLineItem[] { return JSON.parse(localStorage.getItem('optimile_invoice_items') || '[]'); }
    getPayments(): VendorPayment[] { return JSON.parse(localStorage.getItem('optimile_vendor_payments') || '[]'); }
    getWorkOrders(): WorkOrder[] { return JSON.parse(localStorage.getItem('optimile_work_orders') || '[]'); }
    getPurchaseRequests(): PurchaseRequest[] { 
        const pr = localStorage.getItem('optimile_purchase_requests');
        return pr ? JSON.parse(pr) : SEED_PURCHASE_REQUESTS;
    }
    getGarages(): Garage[] {
        const g = localStorage.getItem('optimile_garages');
        return g ? JSON.parse(g) : SEED_GARAGES;
    }
    getGarageVisits(): GarageVisit[] {
        return JSON.parse(localStorage.getItem('optimile_garage_visits') || '[]');
    }
    getGarageJobs(): GarageRepairJob[] {
        return JSON.parse(localStorage.getItem('optimile_garage_jobs') || '[]');
    }
    getGarageParts(): GaragePartUsage[] {
        return JSON.parse(localStorage.getItem('optimile_garage_parts') || '[]');
    }
    getGarageLabour(): GarageLabour[] {
        return JSON.parse(localStorage.getItem('optimile_garage_labour') || '[]');
    }

    // Write back
    saveParts(data: SparePart[]) { localStorage.setItem('optimile_spare_parts', JSON.stringify(data)); }
    saveStock(data: InventoryStock[]) { localStorage.setItem('optimile_inventory_stock', JSON.stringify(data)); }
    saveMovements(data: InventoryMovement[]) { localStorage.setItem('optimile_inventory_movements', JSON.stringify(data)); }
    saveReorderAlerts(data: ReorderAlert[]) { localStorage.setItem('optimile_reorder_alerts', JSON.stringify(data)); }
    saveExceptions(data: OpsException[]) { localStorage.setItem('optimile_exceptions', JSON.stringify(data)); }
    
    // Vendor & Invoice Savers
    saveVendors(data: Vendor[]) { localStorage.setItem('optimile_vendors', JSON.stringify(data)); }
    saveInvoices(data: VendorInvoice[]) { localStorage.setItem('optimile_vendor_invoices', JSON.stringify(data)); }
    saveInvoiceItems(data: InvoiceLineItem[]) { localStorage.setItem('optimile_invoice_items', JSON.stringify(data)); }
    savePayments(data: VendorPayment[]) { localStorage.setItem('optimile_vendor_payments', JSON.stringify(data)); }
    savePurchaseRequests(data: PurchaseRequest[]) { localStorage.setItem('optimile_purchase_requests', JSON.stringify(data)); }
    saveGarages(data: Garage[]) { localStorage.setItem('optimile_garages', JSON.stringify(data)); }
    saveGarageVisits(data: GarageVisit[]) { localStorage.setItem('optimile_garage_visits', JSON.stringify(data)); }
    saveGarageJobs(data: GarageRepairJob[]) { localStorage.setItem('optimile_garage_jobs', JSON.stringify(data)); }
    saveGarageParts(data: GaragePartUsage[]) { localStorage.setItem('optimile_garage_parts', JSON.stringify(data)); }
    saveGarageLabour(data: GarageLabour[]) { localStorage.setItem('optimile_garage_labour', JSON.stringify(data)); }
}

const db = new MockDatabaseEnhanced();

// ... [InventoryAPI, PurchaseRequestAPI, VendorAPI, InvoiceAPI, PaymentAPI, FinanceSyncAPI, GarageAPI, GarageJobAPI, GaragePartAPI, GarageLabourAPI remain unchanged] ...
export const InventoryAPI = {
    getParts: async (): Promise<SparePart[]> => {
        await delay(400);
        return db.getParts();
    },
    
    createPart: async (part: any) => {
        await delay(500);
        const newPart = { 
            ...part, 
            part_id: crypto.randomUUID(),
            standard_cost: part.standard_cost ? Number(part.standard_cost) : undefined,
            gst_rate: part.gst_rate ? Number(part.gst_rate) : 0
        };
        const all = db.getParts();
        db.saveParts([...all, newPart]);
        return newPart;
    },

    getStock: async (hubId?: string): Promise<InventoryStock[]> => {
        await delay(400);
        const stock = db.getStock();
        const enrichedStock = stock.map(s => {
            if (s.average_cost === undefined) {
                const part = db.getParts().find(p => p.part_id === s.part_id);
                s.average_cost = part?.standard_cost || 0;
            }
            s.inventory_value = (s.available_quantity || 0) * (s.average_cost || 0);
            return s;
        });
        
        return hubId ? enrichedStock.filter(s => s.hub_id === hubId) : enrichedStock;
    },

    getMovements: async (partId?: string, hubId?: string): Promise<InventoryMovement[]> => {
        await delay(400);
        let movs = db.getMovements();
        if (partId) movs = movs.filter(m => m.part_id === partId);
        if (hubId) movs = movs.filter(m => m.hub_id === hubId);
        return movs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    },

    getReorderAlerts: async (hubId?: string): Promise<ReorderAlert[]> => {
        await delay(300);
        let alerts = db.getReorderAlerts();
        if (hubId) alerts = alerts.filter(a => a.hub_id === hubId);
        return alerts.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },

    updateAlertStatus: async (alertId: string, status: ReorderStatus) => {
        await delay(300);
        const all = db.getReorderAlerts();
        const idx = all.findIndex(a => a.alert_id === alertId);
        if (idx !== -1) {
            all[idx].status = status;
            db.saveReorderAlerts(all);
        }
    },

    runReorderScan: async () => {
        const stock = db.getStock();
        const parts = db.getParts();
        const existingAlerts = db.getReorderAlerts();
        const exceptions = db.getExceptions();
        const newAlerts: ReorderAlert[] = [];
        
        let alertsChanged = false;
        let exceptionsChanged = false;

        stock.forEach(item => {
            if (item.available_quantity <= item.minimum_quantity) {
                const existing = existingAlerts.find(a => a.part_id === item.part_id && a.hub_id === item.hub_id && a.status !== ReorderStatus.ORDERED);
                
                if (!existing) {
                    const newAlert: ReorderAlert = {
                        alert_id: crypto.randomUUID(),
                        part_id: item.part_id,
                        hub_id: item.hub_id,
                        current_quantity: item.available_quantity,
                        minimum_quantity: item.minimum_quantity,
                        suggested_reorder_quantity: item.reorder_quantity,
                        status: ReorderStatus.OPEN,
                        created_at: new Date().toISOString()
                    };
                    existingAlerts.push(newAlert);
                    newAlerts.push(newAlert);
                    alertsChanged = true;

                    const partName = parts.find(p => p.part_id === item.part_id)?.part_name || 'Unknown Part';
                    const exception: OpsException = {
                        exception_id: crypto.randomUUID(),
                        exception_type: 'SPARE_PART_SHORTAGE',
                        entity_type: 'Inventory',
                        entity_id: item.part_id,
                        severity: ExceptionSeverity.HIGH,
                        detected_at: new Date().toISOString(),
                        status: ExceptionStatus.OPEN,
                        source_module: 'Inventory',
                        description: `Low Stock: ${partName} at ${item.hub_id}. Available: ${item.available_quantity}, Min: ${item.minimum_quantity}.`,
                        recommendation: `Procure ${item.reorder_quantity} units immediately to avoid maintenance delays.`
                    };
                    exceptions.push(exception);
                    exceptionsChanged = true;
                }
            }
        });

        if (alertsChanged) db.saveReorderAlerts(existingAlerts);
        if (exceptionsChanged) db.saveExceptions(exceptions);
        
        return newAlerts;
    },

    adjustStock: async (data: { 
        part_id: string, 
        hub_id: string, 
        type: MovementType, 
        quantity: number, 
        reference_type: 'WorkOrder' | 'Manual' | 'Vendor', 
        reference_id: string, 
        performed_by: string,
        reason?: string,
        unit_cost?: number 
    }) => {
        await delay(600);
        const stock = db.getStock();
        const parts = db.getParts();
        let item = stock.find(s => s.part_id === data.part_id && s.hub_id === data.hub_id);
        const partMaster = parts.find(p => p.part_id === data.part_id);

        if (!item) {
            if (data.type === MovementType.OUT || data.type === MovementType.RESERVE) {
                throw new Error("Cannot transact. Part not found in this Hub.");
            }
            item = {
                stock_id: crypto.randomUUID(),
                part_id: data.part_id,
                hub_id: data.hub_id,
                available_quantity: 0,
                reserved_quantity: 0,
                minimum_quantity: 0,
                reorder_quantity: 0,
                last_updated_at: new Date().toISOString(),
                average_cost: partMaster?.standard_cost || 0,
                inventory_value: 0
            };
            stock.push(item);
        }

        let txnUnitCost = data.unit_cost || 0;
        let txnTotalCost = 0;
        const currentQty = item.available_quantity;
        const currentAvgCost = item.average_cost || 0;

        if (data.type === MovementType.IN || (data.type === MovementType.ADJUSTMENT && data.quantity > 0)) {
            if (!txnUnitCost && txnUnitCost !== 0) {
                txnUnitCost = partMaster?.standard_cost || currentAvgCost || 0;
            }
            const totalValueBefore = currentQty * currentAvgCost;
            const valueAdded = data.quantity * txnUnitCost;
            const newTotalQty = currentQty + data.quantity;
            if (newTotalQty > 0) {
                item.average_cost = (totalValueBefore + valueAdded) / newTotalQty;
            }
            item.available_quantity += data.quantity;
            txnTotalCost = valueAdded;

        } else if (data.type === MovementType.OUT || data.type === MovementType.CONSUME_RESERVED) {
            txnUnitCost = currentAvgCost;
            txnTotalCost = data.quantity * txnUnitCost;
            if (data.type === MovementType.OUT) {
                if (item.available_quantity < data.quantity) throw new Error("Insufficient stock");
                item.available_quantity -= data.quantity;
            } else {
                if (item.reserved_quantity < data.quantity) throw new Error("Insufficient reserved stock");
                item.reserved_quantity -= data.quantity;
            }
        } else if (data.type === MovementType.RESERVE) {
            if (item.available_quantity < data.quantity) throw new Error("Insufficient stock");
            item.available_quantity -= data.quantity;
            item.reserved_quantity += data.quantity;
            txnUnitCost = currentAvgCost;
        }

        item.inventory_value = item.available_quantity * (item.average_cost || 0);
        item.last_updated_at = new Date().toISOString();
        db.saveStock(stock);

        const mov: InventoryMovement = {
            movement_id: crypto.randomUUID(),
            part_id: data.part_id,
            hub_id: data.hub_id,
            movement_type: data.type,
            quantity: data.quantity,
            reference_type: data.reference_type,
            reference_id: data.reference_id,
            performed_by: data.performed_by,
            timestamp: new Date().toISOString(),
            reason: data.reason,
            unit_cost: txnUnitCost,
            total_cost: txnTotalCost,
            gst_rate: partMaster?.gst_rate || 0
        };
        const allMovs = db.getMovements();
        db.saveMovements([mov, ...allMovs]);

        if ([MovementType.OUT, MovementType.RESERVE, MovementType.CONSUME_RESERVED].includes(data.type)) {
            await InventoryAPI.runReorderScan();
        }
    }
};

export const PurchaseRequestAPI = {
    getAll: async (): Promise<PurchaseRequest[]> => {
        await delay(300);
        return db.getPurchaseRequests().sort((a,b) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime());
    },
    create: async (data: Omit<PurchaseRequest, 'request_id' | 'status' | 'request_date'>) => {
        await delay(500);
        const newRequest: PurchaseRequest = {
            ...data,
            request_id: crypto.randomUUID(),
            status: RequestStatus.PENDING,
            request_date: new Date().toISOString()
        };
        const all = db.getPurchaseRequests();
        db.savePurchaseRequests([...all, newRequest]);
        return newRequest;
    },
    updateStatus: async (requestId: string, status: RequestStatus) => {
        await delay(300);
        const all = db.getPurchaseRequests();
        const index = all.findIndex(r => r.request_id === requestId);
        if (index !== -1) {
            all[index].status = status;
            db.savePurchaseRequests(all);
        }
    }
};

export const VendorAPI = {
    getAll: async (): Promise<Vendor[]> => {
        await delay(400);
        return db.getVendors();
    },
    getById: async (id: string): Promise<Vendor | undefined> => {
        await delay(200);
        return db.getVendors().find(v => v.vendor_id === id);
    },
    create: async (vendor: any) => {
        await delay(500);
        const newVendor = { ...vendor, vendor_id: crypto.randomUUID(), status: 'Active' };
        const all = db.getVendors();
        db.saveVendors([newVendor, ...all]);
        return newVendor;
    },
    getLedger: async (vendorId: string): Promise<VendorLedgerSummary> => {
        await delay(600);
        const invoices = db.getInvoices().filter(i => i.vendor_id === vendorId && i.status !== InvoiceStatus.REJECTED);
        const payments = db.getPayments().filter(p => p.vendor_id === vendorId && p.status === PaymentStatus.PAID);

        const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
        const totalPaid = payments.reduce((sum, pm) => sum + pm.paid_amount, 0);
        const outstandingAmount = totalInvoiced - totalPaid;

        const now = new Date();
        const aging = { '0-30': 0, '31-60': 0, '60+': 0 };

        invoices.forEach(inv => {
            const invPayments = payments.filter(p => p.invoice_id === inv.invoice_id);
            const invPaid = invPayments.reduce((sum, p) => sum + p.paid_amount, 0);
            const invBalance = inv.total_amount - invPaid;

            if (invBalance > 0) {
                const invDate = new Date(inv.invoice_date);
                const diffTime = Math.abs(now.getTime() - invDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays <= 30) aging['0-30'] += invBalance;
                else if (diffDays <= 60) aging['31-60'] += invBalance;
                else aging['60+'] += invBalance;
            }
        });

        return {
            vendor_id: vendorId,
            total_invoiced: totalInvoiced,
            total_paid: totalPaid,
            outstanding_amount: outstandingAmount,
            aging
        };
    }
};

export const InvoiceAPI = {
    getAll: async (): Promise<VendorInvoice[]> => {
        await delay(300);
        return db.getInvoices();
    },
    getByWorkOrder: async (workOrderId: string): Promise<VendorInvoice[]> => {
        await delay(300);
        const invoices = db.getInvoices().filter(i => i.work_order_id === workOrderId);
        const items = db.getInvoiceItems();
        return invoices.map(inv => ({
            ...inv,
            items: items.filter(i => i.invoice_id === inv.invoice_id)
        }));
    },
    getByVisit: async (visitId: string): Promise<VendorInvoice[]> => {
        await delay(300);
        const invoices = db.getInvoices().filter(i => i.visit_id === visitId);
        const items = db.getInvoiceItems();
        const payments = db.getPayments();
        
        return invoices.map(inv => {
            const invPayments = payments.filter(p => p.invoice_id === inv.invoice_id && p.status === PaymentStatus.PAID);
            const paid = invPayments.reduce((sum, p) => sum + p.paid_amount, 0);
            return {
                ...inv,
                items: items.filter(i => i.invoice_id === inv.invoice_id),
                amount_paid: paid,
                balance_amount: inv.total_amount - paid
            };
        });
    },
    getByVendor: async (vendorId: string): Promise<VendorInvoice[]> => {
        await delay(300);
        const invoices = db.getInvoices().filter(i => i.vendor_id === vendorId);
        const payments = db.getPayments();
        return invoices.map(inv => {
            const invPayments = payments.filter(p => p.invoice_id === inv.invoice_id && p.status === PaymentStatus.PAID);
            const paid = invPayments.reduce((sum, p) => sum + p.paid_amount, 0);
            return {
                ...inv,
                amount_paid: paid,
                balance_amount: inv.total_amount - paid
            };
        });
    },
    create: async (data: { 
        vendor_id: string, 
        work_order_id?: string, 
        visit_id?: string, 
        invoice_number: string, 
        invoice_date: string, 
        items: Omit<InvoiceLineItem, 'line_id' | 'invoice_id' | 'amount'>[] 
    }) => {
        await delay(600);
        const invoice_id = crypto.randomUUID();
        let subtotal = 0;
        let total_gst = 0;
        let cgst = 0, sgst = 0, igst = 0; 

        const processedItems: InvoiceLineItem[] = data.items.map(item => {
            const amount = item.quantity * item.rate;
            const gstAmount = amount * (item.gst_rate / 100);
            subtotal += amount;
            total_gst += gstAmount;
            cgst += gstAmount / 2;
            sgst += gstAmount / 2;
            return { ...item, line_id: crypto.randomUUID(), invoice_id, amount };
        });

        const newInvoice: VendorInvoice = {
            invoice_id,
            vendor_id: data.vendor_id,
            work_order_id: data.work_order_id || '',
            visit_id: data.visit_id || undefined,
            invoice_number: data.invoice_number,
            invoice_date: data.invoice_date,
            subtotal_amount: subtotal,
            gst_amount: total_gst,
            total_amount: subtotal + total_gst,
            gst_breakup: { cgst, sgst, igst },
            status: InvoiceStatus.SUBMITTED,
            created_at: new Date().toISOString(),
            amount_paid: 0,
            balance_amount: subtotal + total_gst
        };

        const allInvoices = db.getInvoices();
        const allItems = db.getInvoiceItems();
        
        db.saveInvoices([...allInvoices, newInvoice]);
        db.saveInvoiceItems([...allItems, ...processedItems]);
        
        if (data.visit_id) {
            const visits = db.getGarageVisits();
            const visit = visits.find(v => v.visit_id === data.visit_id);
            if (visit) {
                visit.invoice_ids = [...(visit.invoice_ids || []), invoice_id];
                db.saveGarageVisits(visits);
            }
        }
        return newInvoice;
    },
    approveInvoice: async (invoiceId: string) => {
        await delay(500);
        const invoices = db.getInvoices();
        const idx = invoices.findIndex(i => i.invoice_id === invoiceId);
        if (idx === -1) throw new Error("Invoice not found");
        invoices[idx].status = InvoiceStatus.APPROVED;
        db.saveInvoices(invoices);
        return invoices[idx];
    },
    rejectInvoice: async (invoiceId: string) => {
        await delay(300);
        const invoices = db.getInvoices();
        const idx = invoices.findIndex(i => i.invoice_id === invoiceId);
        if (idx !== -1) {
            invoices[idx].status = InvoiceStatus.REJECTED;
            db.saveInvoices(invoices);
        }
    }
};

export const PaymentAPI = {
    recordPayment: async (data: Omit<VendorPayment, 'payment_id' | 'status' | 'created_at'>) => {
        await delay(600);
        const invoices = db.getInvoices();
        const invIndex = invoices.findIndex(i => i.invoice_id === data.invoice_id);
        if (invIndex === -1) throw new Error("Invoice not found");
        const invoice = invoices[invIndex];

        const payment: VendorPayment = {
            ...data,
            payment_id: crypto.randomUUID(),
            status: PaymentStatus.PAID,
            created_at: new Date().toISOString()
        };

        const payments = db.getPayments();
        db.savePayments([...payments, payment]);

        const allPayments = [...payments, payment].filter(p => p.invoice_id === data.invoice_id && p.status === PaymentStatus.PAID);
        const totalPaid = allPayments.reduce((sum, p) => sum + p.paid_amount, 0);

        if (totalPaid >= invoice.total_amount) {
            invoices[invIndex].status = InvoiceStatus.PAID;
        } else {
            invoices[invIndex].status = InvoiceStatus.PARTIALLY_PAID;
        }
        
        invoices[invIndex].amount_paid = totalPaid;
        invoices[invIndex].balance_amount = invoice.total_amount - totalPaid;

        db.saveInvoices(invoices);
        return payment;
    },
    getPaymentsByVendor: async (vendorId: string): Promise<VendorPayment[]> => {
        await delay(300);
        return db.getPayments().filter(p => p.vendor_id === vendorId).sort((a,b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
    }
};

export const FinanceSyncAPI = {
    getVendorInvoices: async () => {
        await delay(400);
        return db.getInvoices().filter(i => i.status === InvoiceStatus.APPROVED || i.status === InvoiceStatus.PAID || i.status === InvoiceStatus.PARTIALLY_PAID);
    },
    getVendorPayments: async () => {
        await delay(400);
        return db.getPayments();
    },
    getGarageRepairCosts: async () => {
        await delay(500);
        return db.getGarageVisits().filter(v => v.visit_status === GarageVisitStatus.COMPLETED && v.cost_summary);
    }
};

// --- Garage Management APIs ---
export const GarageAPI = {
    getAll: async (): Promise<Garage[]> => {
        await delay(300);
        return db.getGarages();
    },
    create: async (data: Omit<Garage, 'garage_id'>) => {
        await delay(500);
        const newGarage: Garage = {
            ...data,
            garage_id: crypto.randomUUID()
        };
        const all = db.getGarages();
        db.saveGarages([...all, newGarage]);
        return newGarage;
    },
    updateStatus: async (id: string, status: 'Active' | 'Inactive') => {
        await delay(300);
        const all = db.getGarages();
        const idx = all.findIndex(g => g.garage_id === id);
        if (idx !== -1) {
            all[idx].status = status;
            db.saveGarages(all);
        }
    }
};

export const GarageJobAPI = {
    getByVisit: async (visitId: string): Promise<GarageRepairJob[]> => {
        await delay(300);
        return db.getGarageJobs().filter(j => j.visit_id === visitId);
    },
    add: async (data: Omit<GarageRepairJob, 'job_id' | 'status'>) => {
        await delay(400);
        const newJob: GarageRepairJob = { ...data, job_id: crypto.randomUUID(), status: 'Planned' };
        const all = db.getGarageJobs();
        db.saveGarageJobs([...all, newJob]);
        return newJob;
    },
    updateStatus: async (jobId: string, status: 'Planned' | 'In Progress' | 'Completed') => {
        await delay(300);
        const all = db.getGarageJobs();
        const idx = all.findIndex(j => j.job_id === jobId);
        if (idx !== -1) {
            all[idx].status = status;
            db.saveGarageJobs(all);
        }
    }
};

export const GaragePartAPI = {
    getByVisit: async (visitId: string): Promise<GaragePartUsage[]> => {
        await delay(300);
        return db.getGarageParts().filter(p => p.visit_id === visitId);
    },
    add: async (data: Omit<GaragePartUsage, 'usage_id'>, hubId: string) => {
        await delay(500);
        if (data.source === 'Inventory') {
            await InventoryAPI.adjustStock({
                part_id: data.part_id,
                hub_id: hubId,
                type: MovementType.OUT,
                quantity: data.quantity,
                reference_type: 'Manual', 
                reference_id: data.visit_id,
                performed_by: 'Garage Module',
                reason: 'Garage Repair Usage'
            });
        }
        const newUsage: GaragePartUsage = { ...data, usage_id: crypto.randomUUID() };
        const all = db.getGarageParts();
        db.saveGarageParts([...all, newUsage]);
        return newUsage;
    }
};

export const GarageLabourAPI = {
    getByVisit: async (visitId: string): Promise<GarageLabour[]> => {
        await delay(300);
        return db.getGarageLabour().filter(l => l.visit_id === visitId);
    },
    add: async (data: Omit<GarageLabour, 'labour_id'>) => {
        await delay(400);
        const newLabour: GarageLabour = { ...data, labour_id: crypto.randomUUID() };
        const all = db.getGarageLabour();
        db.saveGarageLabour([...all, newLabour]);
        return newLabour;
    }
};

export const GarageVisitAPI = {
    getAll: async (): Promise<GarageVisit[]> => {
        await delay(400);
        return db.getGarageVisits().sort((a,b) => new Date(b.entry_datetime).getTime() - new Date(a.entry_datetime).getTime());
    },
    
    checkIn: async (data: Omit<GarageVisit, 'visit_id' | 'visit_status' | 'downtime_hours' | 'created_by' | 'closure_status'>) => {
        await delay(600);
        
        // 1. Validation: Check if vehicle already has an OPEN visit
        const activeVisits = db.getGarageVisits().filter(v => 
            v.vehicle_id === data.vehicle_id && 
            v.visit_status !== GarageVisitStatus.COMPLETED && 
            v.visit_status !== GarageVisitStatus.CANCELLED
        );
        if (activeVisits.length > 0) {
            throw new Error("Vehicle already has an active garage visit. Close it first.");
        }

        // 2. Create Visit
        const newVisit: GarageVisit = {
            ...data,
            visit_id: crypto.randomUUID(),
            visit_status: GarageVisitStatus.CHECKED_IN,
            closure_status: GarageClosureStatus.DRAFT,
            created_by: 'Current User',
            downtime_hours: 0,
            payment_status: 'Pending',
            approvals: []
        };
        
        const allVisits = db.getGarageVisits();
        db.saveGarageVisits([newVisit, ...allVisits]);

        // 3. Update Vehicle Status -> Maintenance
        await VehicleAPI.update(data.vehicle_id, { status: VehicleStatus.MAINTENANCE });

        // 4. Link Work Orders (Update their status)
        if (newVisit.linked_work_order_ids) {
            for (const woId of newVisit.linked_work_order_ids) {
                await MaintenanceAPI.updateWorkOrder(woId, {
                    status: WorkOrderStatus.IN_PROGRESS,
                    visit_id: newVisit.visit_id
                });
            }
        }

        return newVisit;
    },

    calculateCosts: async (visitId: string): Promise<GarageVisitCostSummary> => {
        const parts = db.getGarageParts().filter(p => p.visit_id === visitId);
        const labour = db.getGarageLabour().filter(l => l.visit_id === visitId);

        const partsCost = parts.reduce((sum, p) => sum + (p.quantity * p.unit_cost), 0);
        const labourCost = labour.reduce((sum, l) => sum + l.total_amount, 0);
        const serviceCost = 0; // Placeholder for now
        
        const gstAmount = (partsCost + labourCost + serviceCost) * 0.18;
        const totalCost = partsCost + labourCost + serviceCost + gstAmount;

        return {
            parts_cost: partsCost,
            labour_cost: labourCost,
            service_cost: serviceCost,
            gst_amount: gstAmount,
            total_cost: totalCost,
            cost_confidence: 'High'
        };
    },

    // New: Readiness Validation
    validateReadiness: async (visitId: string, exitData: { exit_datetime: string, odometer_out: number }): Promise<{ isValid: boolean, errors: string[] }> => {
        await delay(200);
        const errors: string[] = [];
        
        // Fetch Context
        const visit = db.getGarageVisits().find(v => v.visit_id === visitId);
        if (!visit) throw new Error("Visit not found");
        
        const jobs = db.getGarageJobs().filter(j => j.visit_id === visitId);
        const parts = db.getGarageParts().filter(p => p.visit_id === visitId);
        const labour = db.getGarageLabour().filter(l => l.visit_id === visitId);
        const garage = db.getGarages().find(g => g.garage_id === visit.garage_id);

        // 1. Operational Checks
        const incompleteJobs = jobs.filter(j => j.status !== 'Completed');
        if (incompleteJobs.length > 0) {
            errors.push(`${incompleteJobs.length} Repair Jobs are not marked as Completed.`);
        }
        if (!exitData.exit_datetime) errors.push("Exit Date & Time is missing.");
        if (!exitData.odometer_out) errors.push("Exit Odometer is missing.");
        if (exitData.odometer_out < visit.odometer_in) errors.push("Exit Odometer cannot be less than Entry Odometer.");

        // 2. Financial Checks (For External Garages)
        if (garage?.garage_type === GarageType.EXTERNAL) {
            // Check for Invoice
            const invoices = db.getInvoices().filter(i => i.visit_id === visitId);
            if (invoices.length === 0) {
                errors.push("External Garage Visit requires at least one Vendor Invoice.");
            } else {
                // Check if Invoice has GST Breakup (Simple check if total > 0)
                const invalidInv = invoices.find(i => i.gst_amount <= 0 && i.total_amount > 0); 
                // Simplified logic: Assume GST amount > 0 is required if taxable.
                // Or just check if items exist
                const items = db.getInvoiceItems().filter(item => invoices.map(i => i.invoice_id).includes(item.invoice_id));
                if (items.length === 0) errors.push("Uploaded invoice has no line items.");
            }
        }

        // 3. Parts & Labour Consistency
        if (jobs.length > 0 && parts.length === 0 && labour.length === 0) {
            errors.push("Jobs recorded but no Parts or Labour consumed. Please verify.");
        }

        return { isValid: errors.length === 0, errors };
    },

    submitForApproval: async (visitId: string, data: { exit_datetime: string, odometer_out: number, remarks?: string }) => {
        await delay(500);
        
        // Run Validation
        const validation = await GarageVisitAPI.validateReadiness(visitId, data);
        if (!validation.isValid) {
            throw new Error(`Validation Failed: ${validation.errors.join(", ")}`);
        }

        // Calculate Costs
        const costs = await GarageVisitAPI.calculateCosts(visitId);
        
        // Calculate Downtime
        const visit = db.getGarageVisits().find(v => v.visit_id === visitId);
        if (!visit) throw new Error("Visit not found");
        
        const entryTime = new Date(visit.entry_datetime).getTime();
        const exitTime = new Date(data.exit_datetime).getTime();
        const downtime = Math.max(0, (exitTime - entryTime) / (1000 * 60 * 60)); // hours

        // Update Visit State
        const allVisits = db.getGarageVisits();
        const idx = allVisits.findIndex(v => v.visit_id === visitId);
        if (idx !== -1) {
            allVisits[idx] = {
                ...allVisits[idx],
                exit_datetime: data.exit_datetime,
                odometer_out: data.odometer_out,
                remarks: data.remarks,
                downtime_hours: parseFloat(downtime.toFixed(1)),
                cost_summary: costs,
                closure_status: GarageClosureStatus.READY_FOR_APPROVAL
            };
            db.saveGarageVisits(allVisits);
        }
        
        return allVisits[idx];
    },

    // New: Ops Approval
    approveOps: async (visitId: string, remarks?: string) => {
        await delay(500);
        const allVisits = db.getGarageVisits();
        const idx = allVisits.findIndex(v => v.visit_id === visitId);
        if (idx === -1) throw new Error("Visit not found");
        
        const visit = allVisits[idx];
        if (visit.closure_status !== GarageClosureStatus.READY_FOR_APPROVAL) {
            throw new Error("Visit is not pending Ops Approval.");
        }

        const approval: GarageVisitApproval = {
            approval_id: crypto.randomUUID(),
            visit_id: visitId,
            approval_level: GarageApprovalLevel.OPS,
            approved_by: 'Ops Manager', // Mock User
            approved_at: new Date().toISOString(),
            status: 'Approved',
            remarks: remarks
        };

        allVisits[idx].approvals = [...(visit.approvals || []), approval];
        allVisits[idx].closure_status = GarageClosureStatus.OPS_APPROVED;
        
        db.saveGarageVisits(allVisits);
        return allVisits[idx];
    },

    rejectOps: async (visitId: string, remarks?: string) => {
        await delay(500);
        const allVisits = db.getGarageVisits();
        const idx = allVisits.findIndex(v => v.visit_id === visitId);
        if (idx === -1) throw new Error("Visit not found");

        const visit = allVisits[idx];
        
        const rejection: GarageVisitApproval = {
            approval_id: crypto.randomUUID(),
            visit_id: visitId,
            approval_level: GarageApprovalLevel.OPS,
            approved_by: 'Ops Manager',
            approved_at: new Date().toISOString(),
            status: 'Rejected',
            remarks: remarks
        };

        allVisits[idx].approvals = [...(visit.approvals || []), rejection];
        allVisits[idx].closure_status = GarageClosureStatus.DRAFT; // Revert to Draft
        
        db.saveGarageVisits(allVisits);
        return allVisits[idx];
    },

    // New: Finance Approval
    approveFinance: async (visitId: string, remarks?: string) => {
        await delay(500);
        const allVisits = db.getGarageVisits();
        const idx = allVisits.findIndex(v => v.visit_id === visitId);
        if (idx === -1) throw new Error("Visit not found");
        
        const visit = allVisits[idx];
        if (visit.closure_status !== GarageClosureStatus.OPS_APPROVED) {
            throw new Error("Visit is not pending Finance Approval (Must be Ops Approved first).");
        }

        const approval: GarageVisitApproval = {
            approval_id: crypto.randomUUID(),
            visit_id: visitId,
            approval_level: GarageApprovalLevel.FINANCE,
            approved_by: 'Finance Manager', // Mock User
            approved_at: new Date().toISOString(),
            status: 'Approved',
            remarks: remarks
        };

        // Final Costing Update in case of adjustments
        const costs = await GarageVisitAPI.calculateCosts(visitId);
        if (costs) costs.cost_confidence = 'High'; // Finance verified

        allVisits[idx].approvals = [...(visit.approvals || []), approval];
        allVisits[idx].closure_status = GarageClosureStatus.CLOSED; // Final Closure
        allVisits[idx].visit_status = GarageVisitStatus.COMPLETED;
        allVisits[idx].cost_summary = costs;
        
        db.saveGarageVisits(allVisits);

        // Update Vehicle Status -> Active (if not already)
        await VehicleAPI.update(visit.vehicle_id, { status: VehicleStatus.ACTIVE });

        // Update Linked Work Orders (Final closure)
        if (visit.linked_work_order_ids) {
            const count = visit.linked_work_order_ids.length;
            if (count > 0) {
                const partCostShare = costs.parts_cost / count;
                const labourCostShare = costs.labour_cost / count;
                
                for (const woId of visit.linked_work_order_ids) {
                    await MaintenanceAPI.updateWorkOrder(woId, {
                        status: WorkOrderStatus.CLOSED,
                        downtime_hours: visit.downtime_hours,
                        parts_cost_signal: partCostShare,
                        labour_cost_signal: labourCostShare,
                        confidence_flag: 'Actual' // High confidence
                    });
                }
            }
        }

        return allVisits[idx];
    },

    rejectFinance: async (visitId: string, remarks?: string) => {
        await delay(500);
        const allVisits = db.getGarageVisits();
        const idx = allVisits.findIndex(v => v.visit_id === visitId);
        if (idx === -1) throw new Error("Visit not found");

        const visit = allVisits[idx];
        
        const rejection: GarageVisitApproval = {
            approval_id: crypto.randomUUID(),
            visit_id: visitId,
            approval_level: GarageApprovalLevel.FINANCE,
            approved_by: 'Finance Manager',
            approved_at: new Date().toISOString(),
            status: 'Rejected',
            remarks: remarks
        };

        allVisits[idx].approvals = [...(visit.approvals || []), rejection];
        allVisits[idx].closure_status = GarageClosureStatus.OPS_APPROVED; // Revert to Ops Approved to allow cost edits
        
        db.saveGarageVisits(allVisits);
        return allVisits[idx];
    },

    checkOut: async (visitId: string, data: { exit_datetime: string, odometer_out: number, remarks?: string, close_linked_work_orders?: boolean }) => {
        await delay(600);
        
        const allVisits = db.getGarageVisits();
        const idx = allVisits.findIndex(v => v.visit_id === visitId);
        
        if (idx === -1) throw new Error("Visit not found");
        
        const visit = allVisits[idx];
        
        // This is now likely bypassed by the approval workflow, but kept for direct admin closure if needed
        visit.visit_status = GarageVisitStatus.COMPLETED;
        visit.closure_status = GarageClosureStatus.CLOSED;

        db.saveGarageVisits(allVisits);

        await VehicleAPI.update(visit.vehicle_id, { status: VehicleStatus.ACTIVE });

        if (data.close_linked_work_orders && visit.linked_work_order_ids) {
            const count = visit.linked_work_order_ids.length;
            if (count > 0) {
                const partCostShare = (visit.cost_summary?.parts_cost || 0) / count;
                const labourCostShare = (visit.cost_summary?.labour_cost || 0) / count;
                
                for (const woId of visit.linked_work_order_ids) {
                    await MaintenanceAPI.updateWorkOrder(woId, {
                        status: WorkOrderStatus.CLOSED,
                        downtime_hours: visit.downtime_hours,
                        parts_cost_signal: partCostShare,
                        labour_cost_signal: labourCostShare,
                    });
                }
            }
        }

        return visit;
    },

    updateStatus: async (visitId: string, status: GarageVisitStatus) => {
        await delay(300);
        const allVisits = db.getGarageVisits();
        const idx = allVisits.findIndex(v => v.visit_id === visitId);
        if (idx !== -1) {
            allVisits[idx].visit_status = status;
            db.saveGarageVisits(allVisits);
        }
    }
};

export const GarageIntelligenceAPI = {
    getKPIs: async (): Promise<GarageKPIs> => {
        await delay(500);
        const visits = db.getGarageVisits().filter(v => v.visit_status === GarageVisitStatus.COMPLETED);
        
        if (visits.length === 0) {
            return {
                avg_downtime_hours: 0,
                avg_cost_per_visit: 0,
                total_maintenance_spend: 0,
                repeat_repair_rate: 0
            };
        }

        const totalDowntime = visits.reduce((sum, v) => sum + (v.downtime_hours || 0), 0);
        const totalCost = visits.reduce((sum, v) => sum + (v.cost_summary?.total_cost || 0), 0);
        
        let repeats = 0;
        visits.forEach((v, i) => {
            const prevVisit = visits.find((pv, j) => 
                j !== i && 
                pv.vehicle_id === v.vehicle_id && 
                new Date(pv.entry_datetime) < new Date(v.entry_datetime) &&
                (new Date(v.entry_datetime).getTime() - new Date(pv.entry_datetime).getTime()) < (30 * 24 * 60 * 60 * 1000)
            );
            if (prevVisit) repeats++;
        });

        return {
            avg_downtime_hours: Math.round(totalDowntime / visits.length),
            avg_cost_per_visit: Math.round(totalCost / visits.length),
            total_maintenance_spend: Math.round(totalCost),
            repeat_repair_rate: Math.round((repeats / visits.length) * 100)
        };
    },

    getGaragePerformance: async (): Promise<GaragePerformanceStat[]> => {
        await delay(600);
        const garages = db.getGarages();
        const visits = db.getGarageVisits().filter(v => v.visit_status === GarageVisitStatus.COMPLETED);

        return garages.map(garage => {
            const gVisits = visits.filter(v => v.garage_id === garage.garage_id);
            const count = gVisits.length;
            
            if (count === 0) {
                return {
                    garage_id: garage.garage_id,
                    garage_name: garage.garage_name,
                    visit_count: 0,
                    avg_downtime: 0,
                    avg_cost: 0,
                    total_spend: 0,
                    performance_score: 'Good'
                };
            }

            const totalTime = gVisits.reduce((sum, v) => sum + (v.downtime_hours || 0), 0);
            const totalCost = gVisits.reduce((sum, v) => sum + (v.cost_summary?.total_cost || 0), 0);
            
            const avgTime = totalTime / count;
            const score = avgTime < 24 ? 'Excellent' : avgTime < 72 ? 'Good' : 'Poor';

            return {
                garage_id: garage.garage_id,
                garage_name: garage.garage_name,
                visit_count: count,
                avg_downtime: Math.round(avgTime),
                avg_cost: Math.round(totalCost / count),
                total_spend: Math.round(totalCost),
                performance_score: score
            };
        });
    },

    getHighMaintenanceVehicles: async (): Promise<HighMaintenanceVehicle[]> => {
        await delay(600);
        const vehicles = await VehicleAPI.getAll(); 
        const visits = db.getGarageVisits().filter(v => v.visit_status === GarageVisitStatus.COMPLETED);

        const vehicleStats: Record<string, HighMaintenanceVehicle> = {};

        visits.forEach(v => {
            if (!vehicleStats[v.vehicle_id]) {
                const vehicle = vehicles.find(veh => veh.vehicle_id === v.vehicle_id);
                vehicleStats[v.vehicle_id] = {
                    vehicle_id: v.vehicle_id,
                    registration_number: vehicle?.registration_number || 'Unknown',
                    visit_count: 0,
                    total_downtime: 0,
                    total_cost: 0
                };
            }
            vehicleStats[v.vehicle_id].visit_count += 1;
            vehicleStats[v.vehicle_id].total_downtime += (v.downtime_hours || 0);
            vehicleStats[v.vehicle_id].total_cost += (v.cost_summary?.total_cost || 0);
        });

        return Object.values(vehicleStats)
            .sort((a, b) => b.total_cost - a.total_cost)
            .slice(0, 5); 
    }
};