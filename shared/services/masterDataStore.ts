// ============================================================
// Optimile ERP — Master Data Store
// ============================================================
// Central service that manages the platform-level master data:
//   - Vendor Master (writable by TMS and AMS)
//   - Customer Master (writable by TMS)
//
// Other modules (Finance, Fleet) only READ from this store.
// Changes emit events via the eventBus for cross-module sync.
// ============================================================

import {
    PlatformVendor,
    TMSVendorExtension,
    AMSVendorExtension,
    VendorStatus,
    VerificationLevel,
    EMPTY_PLATFORM_VENDOR,
    EMPTY_TMS_EXTENSION,
} from '../types/vendor';
import {
    PlatformCustomer,
    EMPTY_CUSTOMER,
} from '../types/customer';
import { erpEventBus } from './eventBus';
import { masterDataCrudApi } from './masterDataCrudApi';
import { apiClient } from './apiClient';

// ── Store State ────────────────────────────────────────────

interface MasterDataState {
    vendors: Map<string, PlatformVendor>;
    tmsVendorExtensions: Map<string, TMSVendorExtension>;
    amsVendorExtensions: Map<string, AMSVendorExtension>;
    customers: Map<string, PlatformCustomer>;
}

// ── Service ────────────────────────────────────────────────

class MasterDataStore {
    private state: MasterDataState = {
        vendors: new Map(),
        tmsVendorExtensions: new Map(),
        amsVendorExtensions: new Map(),
        customers: new Map(),
    };
    private subscribers = new Set<() => void>();
    private vendorCounter = 100;
    private customerCounter = 100;

    constructor() {
        void this.initFromBackend();
    }

    private async initFromBackend(): Promise<void> {
        try {
            const [vendorsRaw, customersRaw] = await Promise.all([
                apiClient.get<Array<Record<string, unknown>>>('/api/v1/master/vendors?size=500').catch(() => []),
                apiClient.get<Array<Record<string, unknown>>>('/api/v1/master/customers?size=500').catch(() => []),
            ]);

            const vendors = Array.isArray(vendorsRaw) ? vendorsRaw : [];
            const customers = Array.isArray(customersRaw) ? customersRaw : [];

            for (const v of vendors) {
                const id = String(v.id ?? '');
                if (!id || this.state.vendors.has(id)) continue;
                const vendor: PlatformVendor = {
                    ...EMPTY_PLATFORM_VENDOR,
                    id,
                    companyName: String(v.name ?? v.companyName ?? ''),
                    type: (v.type as PlatformVendor['type']) ?? 'Company',
                    status: (v.status as VendorStatus) ?? 'ACTIVE',
                    verificationLevel: (v.verificationLevel as VerificationLevel) ?? 'BASIC',
                    createdFrom: 'AMS',
                    contactName: String(v.contactName ?? ''),
                    phone: String(v.phone ?? ''),
                    email: String(v.email ?? ''),
                    city: String(v.city ?? ''),
                    state: String(v.state ?? ''),
                    zonesServed: Array.isArray(v.zonesServed) ? v.zonesServed as string[] : [],
                    vehicleTypes: Array.isArray(v.vehicleTypes) ? v.vehicleTypes as string[] : [],
                    fleetSize: Number(v.fleetSize ?? 0),
                    documents: [],
                    createdAt: Number(v.createdAt ?? Date.now()),
                    lastUpdatedAt: Number(v.updatedAt ?? Date.now()),
                    lastActiveAt: Number(v.updatedAt ?? Date.now()),
                    statusHistory: [],
                };
                this.state.vendors.set(id, vendor);
            }

            for (const c of customers) {
                const id = String(c.id ?? '');
                if (!id || this.state.customers.has(id)) continue;
                const customer: PlatformCustomer = {
                    ...EMPTY_CUSTOMER,
                    id,
                    name: String(c.name ?? ''),
                    tier: (c.tier as PlatformCustomer['tier']) ?? 'Standard',
                    status: (c.status as PlatformCustomer['status']) ?? 'Active',
                    gstin: String(c.gstin ?? ''),
                    pan: String(c.pan ?? ''),
                    billingAddress: String(c.billingAddress ?? ''),
                    createdAt: String(c.createdAt ?? new Date().toISOString()),
                    lastUpdatedAt: String(c.updatedAt ?? new Date().toISOString()),
                };
                this.state.customers.set(id, customer);
            }

            if (vendors.length > 0 || customers.length > 0) {
                this.notify();
            }
        } catch {
            // backend unavailable — seed data remains in place
        }
    }

    // ── Subscriptions ──────────────────────────────────────

    subscribe(cb: () => void): () => void {
        this.subscribers.add(cb);
        return () => this.subscribers.delete(cb);
    }

    private notify(): void {
        this.subscribers.forEach(cb => {
            try { cb(); } catch (e) { console.error('[MasterDataStore] subscriber error', e); }
        });
    }

    // ── Vendor — Read ──────────────────────────────────────

    getVendors(): PlatformVendor[] {
        return Array.from(this.state.vendors.values());
    }

    getVendor(id: string): PlatformVendor | undefined {
        return this.state.vendors.get(id);
    }

    getVendorsByStatus(status: VendorStatus): PlatformVendor[] {
        return this.getVendors().filter(v => v.status === status);
    }

    getActiveVendors(): PlatformVendor[] {
        return this.getVendorsByStatus('ACTIVE');
    }

    getVendorsByZone(zone: string): PlatformVendor[] {
        return this.getVendors().filter(v =>
            v.zonesServed.some(z => z.toLowerCase() === zone.toLowerCase())
        );
    }

    getVendorsByVehicleType(vehicleType: string): PlatformVendor[] {
        return this.getVendors().filter(v =>
            v.vehicleTypes.some(vt => vt.toLowerCase() === vehicleType.toLowerCase())
        );
    }

    getTMSExtension(vendorId: string): TMSVendorExtension | undefined {
        return this.state.tmsVendorExtensions.get(vendorId);
    }

    getAMSExtension(vendorId: string): AMSVendorExtension | undefined {
        return this.state.amsVendorExtensions.get(vendorId);
    }

    /**
     * Check if a vendor has an active AMS contract for a given route.
     * Used by TMS to determine rate precedence.
     */
    hasActiveAMSContract(vendorId: string): boolean {
        const ext = this.getAMSExtension(vendorId);
        return !!ext && ext.contractIds.length > 0;
    }

    // ── Vendor — Write ─────────────────────────────────────

    private nextVendorId(): string {
        this.vendorCounter++;
        return `VEN-${String(this.vendorCounter).padStart(5, '0')}`;
    }

    /**
     * Create a new vendor. Called by TMS (simplified) or AMS (full pipeline).
     */
    createVendor(
        data: Omit<PlatformVendor, 'id' | 'createdAt' | 'lastUpdatedAt' | 'lastActiveAt' | 'statusHistory'>,
        tmsExtension?: Partial<TMSVendorExtension>,
    ): PlatformVendor {
        const id = this.nextVendorId();
        const now = Date.now();
        const vendor: PlatformVendor = {
            ...EMPTY_PLATFORM_VENDOR,
            ...data,
            id,
            createdAt: now,
            lastUpdatedAt: now,
            lastActiveAt: now,
            statusHistory: [{
                from: 'PENDING_VERIFICATION' as VendorStatus,
                to: data.status,
                changedBy: 'SYSTEM',
                changedAt: now,
                reason: `Vendor created via ${data.createdFrom}`,
            }],
        };

        this.state.vendors.set(id, vendor);

        // Auto-create TMS extension if TMS-sourced
        if (data.createdFrom === 'TMS' || tmsExtension) {
            this.state.tmsVendorExtensions.set(id, {
                ...EMPTY_TMS_EXTENSION,
                vendorId: id,
                ...tmsExtension,
            });
        }

        // Persist to backend (fire-and-forget)
        masterDataCrudApi.createVendor({
            id,
            companyName: vendor.companyName,
            legalEntityName: vendor.legalEntityName,
            type: vendor.type,
            status: vendor.status,
            verificationLevel: vendor.verificationLevel,
            createdFrom: vendor.createdFrom,
            contactName: vendor.contactName,
            phone: vendor.phone,
            email: vendor.email,
            address: vendor.address,
            city: vendor.city,
            state: vendor.state,
            pincode: vendor.pincode,
            gstin: vendor.gstin,
            pan: vendor.pan,
            zonesServed: vendor.zonesServed,
            vehicleTypes: vendor.vehicleTypes,
            fleetSize: vendor.fleetSize,
        }).catch((err) => { console.error('[MasterData] Backend sync failed:', err); throw err; });

        this.notify();
        erpEventBus.emit('vendor.created', 'tms', { vendorId: id, vendor });
        return vendor;
    }

    /**
     * Update a vendor's core fields.
     */
    updateVendor(id: string, updates: Partial<PlatformVendor>): PlatformVendor | undefined {
        const existing = this.state.vendors.get(id);
        if (!existing) return undefined;

        const updated: PlatformVendor = {
            ...existing,
            ...updates,
            id, // Prevent ID change
            lastUpdatedAt: Date.now(),
        };
        this.state.vendors.set(id, updated);

        // Persist to backend (fire-and-forget)
        masterDataCrudApi.updateVendor(id, {
            companyName: updates.companyName,
            type: updates.type,
            status: updates.status,
            verificationLevel: updates.verificationLevel,
            contactName: updates.contactName,
            phone: updates.phone,
            email: updates.email,
            city: updates.city,
            state: updates.state,
            gstin: updates.gstin,
            pan: updates.pan,
        }).catch((err) => { console.error('[MasterData] Backend sync failed:', err); throw err; });

        this.notify();
        erpEventBus.emit('vendor.updated', 'tms', { vendorId: id, updates });
        return updated;
    }

    deleteVendor(id: string): boolean {
        const existed = this.state.vendors.delete(id);
        if (!existed) return false;

        this.state.tmsVendorExtensions.delete(id);
        this.state.amsVendorExtensions.delete(id);

        // Persist to backend (fire-and-forget)
        masterDataCrudApi.deleteVendor(id).catch((err) => { console.error('[MasterData] Backend sync failed:', err); throw err; });

        this.notify();
        erpEventBus.emit('vendor.deleted', 'tms', { vendorId: id });
        return true;
    }

    /**
     * Change vendor status with audit trail.
     */
    changeVendorStatus(
        id: string,
        newStatus: VendorStatus,
        changedBy: string,
        reason: string,
    ): PlatformVendor | undefined {
        const existing = this.state.vendors.get(id);
        if (!existing) return undefined;

        const updated: PlatformVendor = {
            ...existing,
            status: newStatus,
            lastUpdatedAt: Date.now(),
            statusHistory: [
                ...existing.statusHistory,
                { from: existing.status, to: newStatus, changedBy, changedAt: Date.now(), reason },
            ],
        };
        this.state.vendors.set(id, updated);
        this.notify();
        erpEventBus.emit('vendor.statusChanged', 'tms', { vendorId: id, from: existing.status, to: newStatus, changedBy });
        return updated;
    }

    /**
     * Update TMS-specific extension data for a vendor.
     */
    updateTMSExtension(vendorId: string, updates: Partial<TMSVendorExtension>): void {
        const existing = this.state.tmsVendorExtensions.get(vendorId) || { ...EMPTY_TMS_EXTENSION, vendorId };
        this.state.tmsVendorExtensions.set(vendorId, { ...existing, ...updates, vendorId });
        this.notify();
    }

    /**
     * Update AMS-specific extension data for a vendor.
     */
    updateAMSExtension(vendorId: string, updates: Partial<AMSVendorExtension>): void {
        const existing = this.state.amsVendorExtensions.get(vendorId);
        if (existing) {
            this.state.amsVendorExtensions.set(vendorId, { ...existing, ...updates, vendorId });
        } else {
            this.state.amsVendorExtensions.set(vendorId, {
                vendorId,
                vendorPortalAccess: false,
                qualifiedLaneGroups: [],
                qualifiedCommodities: [],
                slaScore: 0,
                performanceScorecard: { onTimePlacement: 0, deliverySuccess: 0, disputeRate: 0, avgResponseTime: 0 },
                contractIds: [],
                bidHistory: [],
                ...updates,
            });
        }
        this.notify();
    }

    // ── Customer — Read ────────────────────────────────────

    getCustomers(): PlatformCustomer[] {
        return Array.from(this.state.customers.values());
    }

    getCustomer(id: string): PlatformCustomer | undefined {
        return this.state.customers.get(id);
    }

    getActiveCustomers(): PlatformCustomer[] {
        return this.getCustomers().filter(c => c.status === 'Active');
    }

    /**
     * Check if a customer has exceeded their credit limit.
     * Used by TMS booking flow to block/warn.
     */
    isCustomerOverCreditLimit(id: string): boolean {
        const customer = this.state.customers.get(id);
        if (!customer) return false;
        return customer.financial.outstanding > customer.financial.creditLimit;
    }

    // ── Customer — Write ───────────────────────────────────

    private nextCustomerId(): string {
        this.customerCounter++;
        return `CUS-${String(this.customerCounter).padStart(5, '0')}`;
    }

    createCustomer(
        data: Omit<PlatformCustomer, 'id' | 'createdAt' | 'lastUpdatedAt'>,
    ): PlatformCustomer {
        const id = this.nextCustomerId();
        const now = new Date().toISOString();
        const customer: PlatformCustomer = {
            ...EMPTY_CUSTOMER,
            ...data,
            id,
            createdAt: now,
            lastUpdatedAt: now,
        };
        this.state.customers.set(id, customer);

        // Persist to backend (fire-and-forget)
        masterDataCrudApi.createCustomer({
            id,
            name: customer.name,
            legalName: customer.legalName,
            tier: customer.tier,
            status: customer.status,
            gstin: customer.gstin,
            pan: customer.pan,
            billingAddress: customer.billingAddress,
            creditLimit: customer.financial?.creditLimit,
            creditDays: customer.financial?.creditDays,
            tdsApplicable: customer.financial?.tdsApplicable,
            tdsRate: customer.financial?.tdsRate,
        }).catch((err) => { console.error('[MasterData] Backend sync failed:', err); throw err; });

        this.notify();
        erpEventBus.emit('customer.created', 'tms', { customerId: id, customer });
        return customer;
    }

    updateCustomer(id: string, updates: Partial<PlatformCustomer>): PlatformCustomer | undefined {
        const existing = this.state.customers.get(id);
        if (!existing) return undefined;

        const updated: PlatformCustomer = {
            ...existing,
            ...updates,
            id,
            lastUpdatedAt: new Date().toISOString(),
        };
        this.state.customers.set(id, updated);

        // Persist to backend (fire-and-forget)
        masterDataCrudApi.updateCustomer(id, {
            name: updates.name,
            legalName: updates.legalName,
            tier: updates.tier,
            status: updates.status,
            gstin: updates.gstin,
            pan: updates.pan,
            billingAddress: updates.billingAddress,
        }).catch((err) => { console.error('[MasterData] Backend sync failed:', err); throw err; });

        this.notify();
        erpEventBus.emit('customer.updated', 'tms', { customerId: id, updates });
        return updated;
    }

    deleteCustomer(id: string): boolean {
        const existed = this.state.customers.delete(id);
        if (!existed) return false;

        // Persist to backend (fire-and-forget)
        masterDataCrudApi.deleteCustomer(id).catch((err) => { console.error('[MasterData] Backend sync failed:', err); throw err; });

        this.notify();
        erpEventBus.emit('customer.deleted', 'tms', { customerId: id });
        return true;
    }

    /**
     * Update customer outstanding balance. Called by Finance when invoices/payments change.
     */
    updateCustomerOutstanding(id: string, newOutstanding: number): void {
        const customer = this.state.customers.get(id);
        if (!customer) return;
        const updated: PlatformCustomer = {
            ...customer,
            financial: { ...customer.financial, outstanding: newOutstanding },
            lastUpdatedAt: new Date().toISOString(),
        };
        this.state.customers.set(id, updated);

        // Emit credit limit breach alert if over limit
        if (newOutstanding > customer.financial.creditLimit) {
            erpEventBus.emit('customer.creditLimitBreached', 'finance', {
                customerId: id,
                outstanding: newOutstanding,
                creditLimit: customer.financial.creditLimit,
            });
        }
        this.notify();
    }

    // Seed data removed — vendors and customers now come from backend API.
    // SQL seeds at /docs/db-seeds/seed_vendors.sql and seed_customers.sql
}

// Singleton – shared across the entire ERP
export const masterDataStore = new MasterDataStore();

