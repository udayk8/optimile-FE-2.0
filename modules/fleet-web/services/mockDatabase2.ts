
import { Battery, BatteryInstallation, BatteryStatus, BatteryType, BatteryHealthRecord, BatteryFailureEvent, BatteryHealthStatus, BatteryFailureType, BatteryIntelligence, BatteryCostEvent } from '../types';
import { MaintenanceAPI } from './mockDatabase';
import { GaragePartAPI } from './mockDatabase1';

const SEED_BATTERIES: Battery[] = [
    {
        battery_id: 'b1',
        serial_number: 'EX-2023-001',
        battery_type: BatteryType.STARTER,
        brand: 'Exide',
        model: 'Xpress Heavy Duty',
        capacity_ah: 150,
        voltage: 12,
        purchase_date: '2023-01-15',
        warranty_months: 24,
        warranty_expiry_date: '2025-01-15',
        purchase_cost: 12000,
        status: BatteryStatus.INSTALLED,
        current_vehicle_id: 'v1'
    },
    {
        battery_id: 'b2',
        serial_number: 'AM-2023-889',
        battery_type: BatteryType.STARTER,
        brand: 'Amaron',
        model: 'Hi-Life Pro',
        capacity_ah: 180,
        voltage: 12,
        purchase_date: '2023-06-10',
        warranty_months: 36,
        warranty_expiry_date: '2026-06-10',
        purchase_cost: 14500,
        status: BatteryStatus.IN_STOCK
    },
    {
        battery_id: 'b3',
        serial_number: 'EX-2022-554',
        battery_type: BatteryType.AUXILIARY,
        brand: 'Exide',
        model: 'InvaTubular',
        capacity_ah: 200,
        voltage: 12,
        purchase_date: '2022-03-20',
        warranty_months: 24,
        warranty_expiry_date: '2024-03-20',
        purchase_cost: 18000,
        status: BatteryStatus.FAILED
    },
    {
        battery_id: 'b4',
        serial_number: 'SF-2023-112',
        battery_type: BatteryType.STARTER,
        brand: 'SF Sonic',
        model: 'Trucker',
        capacity_ah: 130,
        voltage: 12,
        purchase_date: '2023-11-05',
        warranty_months: 18,
        warranty_expiry_date: '2025-05-05',
        purchase_cost: 9500,
        status: BatteryStatus.INSTALLED,
        current_vehicle_id: 'v3'
    },
    {
        battery_id: 'b5',
        serial_number: 'AM-2021-009',
        battery_type: BatteryType.STARTER,
        brand: 'Amaron',
        model: 'Go',
        capacity_ah: 150,
        voltage: 12,
        purchase_date: '2021-02-01',
        warranty_months: 24,
        warranty_expiry_date: '2023-02-01',
        purchase_cost: 11000,
        status: BatteryStatus.FAILED
    }
];

const SEED_INSTALLATIONS: BatteryInstallation[] = [
    {
        installation_id: 'bi1',
        battery_id: 'b1',
        vehicle_id: 'v1',
        installed_at: '2023-01-20T10:00:00',
        odometer_at_install: 45000,
        technician_name: 'Amit Singh'
    },
    {
        installation_id: 'bi2',
        battery_id: 'b4',
        vehicle_id: 'v3',
        installed_at: '2023-11-10T14:30:00',
        odometer_at_install: 12000,
        technician_name: 'Rajesh Kumar'
    },
    {
        installation_id: 'bi3',
        battery_id: 'b3',
        vehicle_id: 'v2',
        installed_at: '2022-03-25T09:00:00',
        odometer_at_install: 80000,
        removed_at: '2024-02-15T11:00:00',
        odometer_at_removal: 145000,
        removal_reason: 'Failure - Not holding charge',
        technician_name: 'Vikram'
    }
];

const SEED_HEALTH: BatteryHealthRecord[] = [
    { record_id: 'h1', battery_id: 'b1', health_status: BatteryHealthStatus.GOOD, voltage_reading: 12.6, inspection_date: '2024-01-10' },
    { record_id: 'h2', battery_id: 'b1', health_status: BatteryHealthStatus.GOOD, voltage_reading: 12.5, inspection_date: '2023-07-10' },
    { record_id: 'h3', battery_id: 'b3', health_status: BatteryHealthStatus.CRITICAL, voltage_reading: 10.2, inspection_date: '2024-02-14', remarks: 'Won\'t hold charge' }
];

const SEED_FAILURES: BatteryFailureEvent[] = [
    { failure_id: 'f1', battery_id: 'b3', vehicle_id: 'v2', failure_date: '2024-02-15', odometer: 145000, failure_type: BatteryFailureType.GRADUAL, within_warranty: true },
    { failure_id: 'f2', battery_id: 'b5', vehicle_id: 'v1', failure_date: '2023-01-10', odometer: 40000, failure_type: BatteryFailureType.SUDDEN, within_warranty: true }
];

const SEED_COSTS: BatteryCostEvent[] = [
    { cost_id: 'bc1', battery_id: 'b1', vehicle_id: 'v1', cost_amount: 12000, cost_type: 'Replacement', date: '2023-01-20T10:00:00' },
    { cost_id: 'bc2', battery_id: 'b4', vehicle_id: 'v3', cost_amount: 9500, cost_type: 'Replacement', date: '2023-11-10T14:30:00' }
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class MockDatabase2 {
    constructor() {
        this.init();
    }

    private init() {
        if (!localStorage.getItem('optimile_batteries')) {
            localStorage.setItem('optimile_batteries', JSON.stringify(SEED_BATTERIES));
        }
        if (!localStorage.getItem('optimile_battery_installations')) {
            localStorage.setItem('optimile_battery_installations', JSON.stringify(SEED_INSTALLATIONS));
        }
        if (!localStorage.getItem('optimile_battery_health')) {
            localStorage.setItem('optimile_battery_health', JSON.stringify(SEED_HEALTH));
        }
        if (!localStorage.getItem('optimile_battery_failures')) {
            localStorage.setItem('optimile_battery_failures', JSON.stringify(SEED_FAILURES));
        }
        if (!localStorage.getItem('optimile_battery_costs')) {
            localStorage.setItem('optimile_battery_costs', JSON.stringify(SEED_COSTS));
        }
    }

    getBatteries(): Battery[] {
        return JSON.parse(localStorage.getItem('optimile_batteries') || '[]');
    }

    getInstallations(): BatteryInstallation[] {
        return JSON.parse(localStorage.getItem('optimile_battery_installations') || '[]');
    }

    getHealth(): BatteryHealthRecord[] {
        return JSON.parse(localStorage.getItem('optimile_battery_health') || '[]');
    }

    getFailures(): BatteryFailureEvent[] {
        return JSON.parse(localStorage.getItem('optimile_battery_failures') || '[]');
    }

    getCosts(): BatteryCostEvent[] {
        return JSON.parse(localStorage.getItem('optimile_battery_costs') || '[]');
    }

    saveBatteries(data: Battery[]) {
        localStorage.setItem('optimile_batteries', JSON.stringify(data));
    }

    saveInstallations(data: BatteryInstallation[]) {
        localStorage.setItem('optimile_battery_installations', JSON.stringify(data));
    }

    saveHealth(data: BatteryHealthRecord[]) {
        localStorage.setItem('optimile_battery_health', JSON.stringify(data));
    }

    saveFailures(data: BatteryFailureEvent[]) {
        localStorage.setItem('optimile_battery_failures', JSON.stringify(data));
    }

    saveCosts(data: BatteryCostEvent[]) {
        localStorage.setItem('optimile_battery_costs', JSON.stringify(data));
    }
}

const db = new MockDatabase2();

export const BatteryCostAPI = {
    getByBattery: async (batteryId: string): Promise<BatteryCostEvent[]> => {
        await delay(300);
        return db.getCosts().filter(c => c.battery_id === batteryId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    logEvent: async (data: Omit<BatteryCostEvent, 'cost_id'>) => {
        const newEvent: BatteryCostEvent = { ...data, cost_id: crypto.randomUUID() };
        const all = db.getCosts();
        db.saveCosts([...all, newEvent]);
        return newEvent;
    }
};

export const BatteryAPI = {
    getAll: async (): Promise<Battery[]> => {
        await delay(300);
        return db.getBatteries();
    },

    getById: async (id: string): Promise<Battery | undefined> => {
        await delay(200);
        return db.getBatteries().find(b => b.battery_id === id);
    },

    create: async (data: Omit<Battery, 'battery_id' | 'status'>) => {
        await delay(400);
        const newBattery: Battery = {
            ...data,
            battery_id: crypto.randomUUID(),
            status: BatteryStatus.IN_STOCK
        };
        const all = db.getBatteries();
        db.saveBatteries([...all, newBattery]);
        
        // Log Initial Purchase Cost
        await BatteryCostAPI.logEvent({
            battery_id: newBattery.battery_id,
            cost_amount: newBattery.purchase_cost,
            cost_type: 'Purchase',
            date: new Date().toISOString()
        });

        return newBattery;
    },

    updateStatus: async (id: string, status: BatteryStatus) => {
        await delay(300);
        const all = db.getBatteries();
        const idx = all.findIndex(b => b.battery_id === id);
        if (idx !== -1) {
            all[idx].status = status;
            db.saveBatteries(all);
        }
    },

    // Get active batteries for a vehicle
    getByVehicle: async (vehicleId: string): Promise<Battery[]> => {
        await delay(300);
        return db.getBatteries().filter(b => b.current_vehicle_id === vehicleId && b.status === BatteryStatus.INSTALLED);
    },

    // Get full lifecycle history
    getInstallations: async (batteryId: string): Promise<BatteryInstallation[]> => {
        await delay(300);
        return db.getInstallations()
            .filter(i => i.battery_id === batteryId)
            .sort((a,b) => new Date(b.installed_at).getTime() - new Date(a.installed_at).getTime());
    },

    install: async (data: { 
        battery_id: string, 
        vehicle_id: string, 
        installed_at: string, 
        odometer: number,
        visit_id?: string,
        work_order_id?: string,
        technician_name?: string
    }) => {
        await delay(500);
        const batteries = db.getBatteries();
        const bIndex = batteries.findIndex(b => b.battery_id === data.battery_id);
        
        if (bIndex === -1) throw new Error("Battery not found");
        if (batteries[bIndex].status !== BatteryStatus.IN_STOCK) throw new Error("Battery is not in stock");

        const battery = batteries[bIndex];

        // Update Battery
        battery.status = BatteryStatus.INSTALLED;
        battery.current_vehicle_id = data.vehicle_id;
        db.saveBatteries(batteries);

        // Create Installation
        const installations = db.getInstallations();
        const newInstall: BatteryInstallation = {
            installation_id: crypto.randomUUID(),
            battery_id: data.battery_id,
            vehicle_id: data.vehicle_id,
            installed_at: data.installed_at,
            odometer_at_install: data.odometer,
            visit_id: data.visit_id,
            work_order_id: data.work_order_id,
            technician_name: data.technician_name
        };
        db.saveInstallations([...installations, newInstall]);

        // Log Replacement Cost (Using the battery's purchase value)
        await BatteryCostAPI.logEvent({
            battery_id: data.battery_id,
            vehicle_id: data.vehicle_id,
            visit_id: data.visit_id,
            work_order_id: data.work_order_id,
            cost_amount: battery.purchase_cost,
            cost_type: 'Replacement',
            date: data.installed_at
        });

        // CROSS-MODULE INTEGRATION
        // 1. If linked to Garage Visit, add as Part Usage
        if (data.visit_id) {
            try {
                await GaragePartAPI.add({
                    visit_id: data.visit_id,
                    part_id: `BAT-${battery.serial_number}`, // Mock Part ID, ideally should link to SparePart
                    quantity: 1,
                    source: 'Inventory',
                    unit_cost: battery.purchase_cost
                }, 'Pune Hub');
            } catch (e) {
                console.warn("Auto-logging to Garage Visit failed (likely Mock ID mismatch), skipping...");
            }
        }

        // 2. If linked to Work Order, add as WO Part
        if (data.work_order_id) {
            try {
                await MaintenanceAPI.addPart({
                    work_order_id: data.work_order_id,
                    part_id: `BAT-${battery.serial_number}`,
                    quantity_required: 1,
                    hub_id: 'Pune Hub'
                });
            } catch (e) {
                console.warn("Auto-logging to Work Order failed, skipping...");
            }
        }
    },

    remove: async (data: { 
        battery_id: string, 
        removed_at: string, 
        odometer: number, 
        reason: string,
        visit_id?: string,
        work_order_id?: string 
    }) => {
        await delay(500);
        const batteries = db.getBatteries();
        const bIndex = batteries.findIndex(b => b.battery_id === data.battery_id);
        
        if (bIndex === -1) throw new Error("Battery not found");
        if (batteries[bIndex].status !== BatteryStatus.INSTALLED) throw new Error("Battery is not currently installed");

        // Update Battery
        batteries[bIndex].status = BatteryStatus.IN_STOCK; // Returns to stock by default
        batteries[bIndex].current_vehicle_id = undefined;
        db.saveBatteries(batteries);

        // Update Installation Record
        const installations = db.getInstallations();
        // Find the active installation (no removed_at)
        const iIndex = installations.findIndex(i => i.battery_id === data.battery_id && !i.removed_at);
        
        if (iIndex !== -1) {
            installations[iIndex].removed_at = data.removed_at;
            installations[iIndex].odometer_at_removal = data.odometer;
            installations[iIndex].removal_reason = data.reason;
            // Optionally update reference if we want to track removal context specifically
            // For simple audit, the removal reason + date is enough, but could extend Installation type
            db.saveInstallations(installations);
        }
    }
};

export const BatteryHealthAPI = {
    getByBattery: async (batteryId: string): Promise<BatteryHealthRecord[]> => {
        await delay(300);
        return db.getHealth()
            .filter(h => h.battery_id === batteryId)
            .sort((a,b) => new Date(b.inspection_date).getTime() - new Date(a.inspection_date).getTime());
    },
    
    add: async (data: Omit<BatteryHealthRecord, 'record_id'>) => {
        await delay(400);
        const newRecord: BatteryHealthRecord = {
            ...data,
            record_id: crypto.randomUUID()
        };
        const all = db.getHealth();
        db.saveHealth([...all, newRecord]);
        return newRecord;
    }
};

export const BatteryFailureAPI = {
    getByBattery: async (batteryId: string): Promise<BatteryFailureEvent[]> => {
        await delay(300);
        return db.getFailures().filter(f => f.battery_id === batteryId);
    },

    reportFailure: async (data: Omit<BatteryFailureEvent, 'failure_id' | 'within_warranty'>) => {
        await delay(500);
        const batteries = db.getBatteries();
        const bIndex = batteries.findIndex(b => b.battery_id === data.battery_id);
        if (bIndex === -1) throw new Error("Battery not found");
        const battery = batteries[bIndex];

        // Auto-calculate warranty
        const purchaseDate = new Date(battery.purchase_date);
        const failureDate = new Date(data.failure_date);
        const expiryDate = new Date(battery.warranty_expiry_date);
        const isWarranty = failureDate <= expiryDate;

        const newFailure: BatteryFailureEvent = {
            ...data,
            failure_id: crypto.randomUUID(),
            within_warranty: isWarranty
        };

        const all = db.getFailures();
        db.saveFailures([...all, newFailure]);

        // Auto-update battery status to FAILED
        // AND perform Removal logic automatically to avoid inconsistent state
        // 1. Mark battery as Failed and remove vehicle link
        batteries[bIndex].status = BatteryStatus.FAILED;
        batteries[bIndex].current_vehicle_id = undefined;
        db.saveBatteries(batteries);

        // 2. Update Installation record
        const installations = db.getInstallations();
        const iIndex = installations.findIndex(i => i.battery_id === data.battery_id && !i.removed_at);
        if (iIndex !== -1) {
            installations[iIndex].removed_at = data.failure_date;
            installations[iIndex].odometer_at_removal = data.odometer;
            installations[iIndex].removal_reason = `Failure: ${data.failure_type}`;
            db.saveInstallations(installations);
        }

        return newFailure;
    }
};

export const BatteryIntelligenceAPI = {
    getStats: async (): Promise<BatteryIntelligence> => {
        await delay(600);
        const batteries = db.getBatteries();
        const failures = db.getFailures();
        const today = new Date();
        const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

        // Expiring Soon
        const expiring = batteries.filter(b => {
            if (b.status === BatteryStatus.FAILED || b.status === BatteryStatus.SCRAPPED) return false;
            const expiry = new Date(b.warranty_expiry_date);
            return expiry > today && expiry <= thirtyDays;
        });

        // Failures in Warranty
        const inWarrantyCount = failures.filter(f => f.within_warranty).length;

        // Brand Rates
        const brands: Record<string, { total: number, failures: number }> = {};
        
        // Count Totals
        batteries.forEach(b => {
            if (!brands[b.brand]) brands[b.brand] = { total: 0, failures: 0 };
            brands[b.brand].total++;
        });

        // Count Failures
        failures.forEach(f => {
            const b = batteries.find(bat => bat.battery_id === f.battery_id);
            if (b && brands[b.brand]) {
                brands[b.brand].failures++;
            }
        });

        const brandStats = Object.keys(brands).map(brand => ({
            brand,
            total: brands[brand].total,
            failures: brands[brand].failures,
            ratePct: brands[brand].total > 0 ? Math.round((brands[brand].failures / brands[brand].total) * 100) : 0
        })).sort((a,b) => b.ratePct - a.ratePct);

        return {
            expiringWarranties: expiring,
            failuresInWarranty: inWarrantyCount,
            brandFailureRates: brandStats
        };
    }
};
