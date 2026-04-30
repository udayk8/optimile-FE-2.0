// ============================================================
// Optimile ERP — Operational Data Context
// ============================================================
// React context that provides shared operational data to all modules.
// Wraps the app so TMS, Fleet, and Finance share the same data.
// ============================================================

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import {
    SharedClient,
    SharedVendor,
    SharedVehicle,
    CompletedTrip,
    CostBreakdown,
    CostBreakdownConfig,
    DEFAULT_COST_BREAKDOWN,
    PayableStatus,
} from './OperationalDataStore';
import { tripsApi, type TripUpdateRequest } from '../services/tripsApi';
import { masterDataApi } from '../services/masterDataApi';

// Minimal expense shape shared between TripExpenses UI and the context
export interface TripExpense {
    id: string;
    tripId: string;
    category: string;
    description: string;
    amount: number;
    quantity?: number;
    rate?: number;
    date: string;
    time: string;
    location?: { name: string; address: string };
    status: 'Pending' | 'Approved' | 'Rejected';
    rejectionReason?: string;
    submittedBy: { name: string; role: string; time: string };
    receiptUrl?: string;
    // Pre-trip advance fields
    isAdvance?: boolean;                                     // true for advance requests
    advanceType?: 'fuel' | 'driver_batta' | 'toll' | 'vendor_advance' | 'other';
    paymentStatus?: 'pending_payment' | 'paid';             // Finance tracks actual disbursement
    paidDate?: string;
    paidBy?: string;
}

interface OperationalDataContextType {
    // Data
    clients: SharedClient[];
    vendors: SharedVendor[];
    vehicles: SharedVehicle[];
    completedTrips: CompletedTrip[];
    tripsLoading: boolean;
    tripsLoadError: string | null;
    refreshTrips: () => Promise<void>;
    masterDataLoading: boolean;
    masterDataError: string | null;
    refreshMasterData: () => Promise<void>;
    costBreakdownConfig: CostBreakdownConfig;

    // Expense accessors & actions
    getTripExpenses: (tripId: string) => TripExpense[];
    addTripExpense: (tripId: string, expense: TripExpense) => void;
    updateTripExpense: (tripId: string, expenseId: string, updates: Partial<TripExpense>) => void;

    // Actions
    bookRevenue: (tripId: string) => void;
    requestAdvance: (tripId: string, percentage: number) => void;
    payAdvance: (tripId: string) => void;
    settleBalance: (tripId: string) => void;
    markPodReceived: (tripId: string, clean: boolean, remarks?: string) => void;
    markInvoiced: (tripId: string, invoiceId: string) => Promise<void>;
    receiveVendorInvoice: (tripId: string, invoiceNumber: string) => void;
    updateCostBreakdownConfig: (config: Partial<CostBreakdownConfig>) => void;

    // TMS Actions
    createTrip: (tripData: Partial<CompletedTrip>) => Promise<string>;
    assignVehicle: (tripId: string, vehicleId: string, vendorId?: string) => void;
    assignMarketHireVehicle: (tripId: string, vendorId: string, regNumber: string, driverName: string, driverPhone: string, freightAmount: number) => void;
    markDelivered: (tripId: string) => void;
    addVehicleToSharedPool: (vehicle: SharedVehicle) => void;
    updateTripStatus: (tripId: string, status: CompletedTrip['status']) => void;
    getAllPendingAdvances: () => (TripExpense & { trip: CompletedTrip })[];

    // Finance sync helpers
    applyApprovedAdvance: (tripId: string, expense: TripExpense) => void;
    updateVendorBalance: (vendorId: string, delta: number) => void;
}

const OperationalDataContext = createContext<OperationalDataContextType | null>(null);

export const useOperationalData = () => {
    const context = useContext(OperationalDataContext);
    if (!context) {
        throw new Error('useOperationalData must be used within OperationalDataProvider');
    }
    return context;
};

export const OperationalDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [clients, setClients] = useState<SharedClient[]>([]);
    const [vendors, setVendors] = useState<SharedVendor[]>([]);
    const [vehicles, setVehicles] = useState<SharedVehicle[]>([]);
    const [completedTrips, setCompletedTrips] = useState<CompletedTrip[]>([]);
    const [tripsLoading, setTripsLoading] = useState<boolean>(true);
    const [tripsLoadError, setTripsLoadError] = useState<string | null>(null);
    const [masterDataLoading, setMasterDataLoading] = useState<boolean>(true);
    const [masterDataError, setMasterDataError] = useState<string | null>(null);
    const [costBreakdownConfig, setCostBreakdownConfig] = useState<CostBreakdownConfig>(DEFAULT_COST_BREAKDOWN);
    // tripExpenses: a plain object used as a Map<tripId, TripExpense[]>
    const [tripExpensesMap, setTripExpensesMap] = useState<Record<string, TripExpense[]>>({});

    const refreshTrips = useCallback(async () => {
        setTripsLoading(true);
        setTripsLoadError(null);
        try {
            const trips = await tripsApi.listTrips();
            setCompletedTrips(trips);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load trips';
            setTripsLoadError(message);
        } finally {
            setTripsLoading(false);
        }
    }, []);

    const refreshMasterData = useCallback(async () => {
        setMasterDataLoading(true);
        setMasterDataError(null);
        try {
            const [fetchedClients, fetchedVendors, fetchedVehicles] = await Promise.all([
                masterDataApi.fetchCustomers(),
                masterDataApi.fetchVendors(),
                masterDataApi.fetchVehicles(),
            ]);
            setClients(fetchedClients);
            setVendors(fetchedVendors);
            setVehicles(fetchedVehicles);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load master data';
            setMasterDataError(message);
        } finally {
            setMasterDataLoading(false);
        }
    }, []);

    useEffect(() => {
        void refreshTrips();
        void refreshMasterData();
    }, [refreshTrips, refreshMasterData]);

    // ── Expense accessors ──────────────────────────────────

    const getTripExpenses = useCallback((tripId: string): TripExpense[] => {
        return tripExpensesMap[tripId] ?? [];
    }, [tripExpensesMap]);

    const addTripExpense = useCallback((tripId: string, expense: TripExpense) => {
        tripsApi.createExpense(tripId, {
            id: expense.id,
            category: expense.category,
            description: expense.description,
            amount: expense.amount,
            quantity: expense.quantity,
            rate: expense.rate,
            date: expense.date,
            status: expense.status,
            isAdvance: expense.isAdvance,
            advanceType: expense.advanceType,
        }).catch((err) => console.error('[Operations] Backend sync failed:', err));
        setTripExpensesMap(prev => {
            const existing = prev[tripId] ?? [];
            return { ...prev, [tripId]: [expense, ...existing] };
        });
        // Recalculate totalCost from all approved expenses for this trip
        setTripExpensesMap(prev => {
            const allExpenses = prev[tripId] ?? [];
            const approvedTotal = allExpenses
                .filter(e => e.status === 'Approved')
                .reduce((sum, e) => sum + e.amount, 0);
            // If no approved expenses yet, keep the 75% estimate
            if (approvedTotal > 0) {
                setCompletedTrips(trips => trips.map(t =>
                    t.id === tripId ? { ...t, totalCost: approvedTotal } : t
                ));
            }
            return prev;
        });
    }, []);

    const updateTripExpense = useCallback((tripId: string, expenseId: string, updates: Partial<TripExpense>) => {
        tripsApi.updateExpense(tripId, expenseId, { status: updates.status }).catch((err) => console.error('[Operations] Backend sync failed:', err));
        setTripExpensesMap(prev => {
            const existing = prev[tripId] ?? [];
            const updated = existing.map(e => e.id === expenseId ? { ...e, ...updates } : e);
            const approvedTotal = updated
                .filter(e => e.status === 'Approved')
                .reduce((sum, e) => sum + e.amount, 0);
            if (approvedTotal > 0) {
                setCompletedTrips(trips => trips.map(t =>
                    t.id === tripId ? { ...t, totalCost: approvedTotal } : t
                ));
            }
            return { ...prev, [tripId]: updated };
        });
    }, []);

    // ── Revenue & payables ─────────────────────────────────

    const bookRevenue = useCallback((tripId: string) => {
        setCompletedTrips(prev => prev.map(t =>
            t.id === tripId ? { ...t, status: 'invoiced' as const, invoiced: true } : t
        ));
    }, []);

    const requestAdvance = useCallback((tripId: string, percentage: number) => {
        const trip = completedTrips.find(t => t.id === tripId);
        if (trip) {
            const advanceAmount = trip.totalCost * (percentage / 100);
            tripsApi.requestAdvance(tripId, { advancePercentage: percentage, advanceAmount }).catch((err) => console.error('[Operations] Backend sync failed:', err));
        }
        setCompletedTrips(prev => prev.map(t => {
            if (t.id !== tripId || !t.vendorPayable) return t;
            const advanceAmount = t.totalCost * (percentage / 100);
            return {
                ...t,
                vendorPayable: {
                    ...t.vendorPayable,
                    advancePercentage: percentage,
                    advanceAmount,
                    balanceAmount: t.totalCost - advanceAmount,
                    status: 'pending_advance' as PayableStatus,
                }
            };
        }));
    }, []);

    const payAdvance = useCallback((tripId: string) => {
        tripsApi.payAdvance(tripId).catch((err) => console.error('[Operations] Backend sync failed:', err));
        setCompletedTrips(prev => prev.map(t => {
            if (t.id !== tripId || !t.vendorPayable) return t;
            return {
                ...t,
                vendorPayable: {
                    ...t.vendorPayable,
                    advancePaid: true,
                    advanceDate: new Date().toISOString().split('T')[0],
                    status: 'advance_paid' as PayableStatus,
                }
            };
        }));
        // Update vendor balance
        const trip = completedTrips.find(t => t.id === tripId);
        if (trip?.vendorId && trip?.vendorPayable) {
            setVendors(prev => prev.map(v =>
                v.id === trip.vendorId
                    ? { ...v, balance: v.balance + trip.vendorPayable!.advanceAmount }
                    : v
            ));
        }
    }, [completedTrips]);

    const settleBalance = useCallback((tripId: string) => {
        tripsApi.settleBalance(tripId).catch((err) => console.error('[Operations] Backend sync failed:', err));
        setCompletedTrips(prev => prev.map(t => {
            if (t.id !== tripId || !t.vendorPayable) return t;
            return {
                ...t,
                vendorPayable: {
                    ...t.vendorPayable,
                    balancePaid: true,
                    balanceDate: new Date().toISOString().split('T')[0],
                    status: 'fully_paid' as PayableStatus,
                }
            };
        }));
        const trip = completedTrips.find(t => t.id === tripId);
        if (trip?.vendorId && trip?.vendorPayable) {
            setVendors(prev => prev.map(v =>
                v.id === trip.vendorId
                    ? { ...v, balance: v.balance + trip.vendorPayable!.balanceAmount }
                    : v
            ));
        }
    }, [completedTrips]);

    const markPodReceived = useCallback((tripId: string, clean: boolean, remarks?: string) => {
        const podReceivedDate = new Date().toISOString().split('T')[0];
        tripsApi.markPodReceived(tripId, {
            podClean: clean,
            podRemarks: remarks,
            podReceivedDate,
        }).catch((err) => console.error('[Operations] Backend sync failed:', err));
        tripsApi.updateTrip(tripId, {
            status: 'pod_received',
            podReceivedDate,
            podVerified: clean,
        }).catch((err) => console.error('[Operations] Backend sync failed:', err));
        setCompletedTrips(prev => prev.map(t => {
            if (t.id !== tripId) return t;
            const update: Partial<CompletedTrip> = {
                podReceivedDate,
                podVerified: clean,
                status: 'pod_received' as const,
            };
            if (t.vendorPayable) {
                update.vendorPayable = {
                    ...t.vendorPayable,
                    podClean: clean,
                    podRemarks: remarks,
                    status: clean && t.vendorPayable.advancePaid ? 'pending_balance' as PayableStatus : t.vendorPayable.status,
                };
            }
            return { ...t, ...update };
        }));
    }, []);

    const markInvoiced = useCallback(async (tripId: string, invoiceId: string) => {
        const normalizedTripId = tripId.trim();
        const normalizedInvoiceId = invoiceId.trim();
        if (!normalizedTripId) {
            throw new Error('tripId is required to mark trip invoiced');
        }
        if (!normalizedInvoiceId) {
            throw new Error('invoiceId is required to mark trip invoiced');
        }

        const response = await tripsApi.markInvoiced(normalizedTripId, normalizedInvoiceId);
        const responseTripId = response.id.trim() || normalizedTripId;

        setCompletedTrips(prev => prev.map(t => {
            const matchesTrip = t.id === normalizedTripId || t.id === responseTripId;
            if (!matchesTrip) {
                return t;
            }

            // Recompute totalCost from approved expenses before updating invoice state.
            const approvedExpenses = (tripExpensesMap[t.id] ?? []).filter(e => e.status === 'Approved');
            const approvedTotal = approvedExpenses.reduce((sum, e) => sum + e.amount, 0);
            const finalCost = approvedTotal > 0 ? approvedTotal : t.totalCost;

            return {
                ...t,
                invoiced: response.invoiced,
                invoiceId: response.invoiceId ?? normalizedInvoiceId,
                status: response.status,
                totalCost: finalCost,
            };
        }));

        // Release the assigned vehicle once backend confirms invoice sync.
        const syncedTrip = completedTrips.find(t => t.id === normalizedTripId || t.id === responseTripId);
        if (syncedTrip?.vehicleId) {
            setVehicles(prev => prev.map(v =>
                v.id === syncedTrip.vehicleId ? { ...v, status: 'available' as const } : v
            ));
        }
    }, [completedTrips, tripExpensesMap]);

    const receiveVendorInvoice = useCallback((tripId: string, invoiceNumber: string) => {
        tripsApi.receiveVendorInvoice(tripId, {
            invoiceNumber,
            invoiceDate: new Date().toISOString().split('T')[0],
        }).catch((err) => console.error('[Operations] Backend sync failed:', err));
        setCompletedTrips(prev => prev.map(t => {
            if (t.id !== tripId || !t.vendorPayable) return t;
            return {
                ...t,
                vendorPayable: {
                    ...t.vendorPayable,
                    invoiceReceived: true,
                    invoiceNumber,
                    invoiceDate: new Date().toISOString().split('T')[0],
                }
            };
        }));
    }, []);

    const updateCostBreakdownConfig = useCallback((config: Partial<CostBreakdownConfig>) => {
        setCostBreakdownConfig(prev => ({ ...prev, ...config }));
    }, []);

    // ── Trip lifecycle ─────────────────────────────────────

    const syncTripUpdate = useCallback((tripId: string, updates: TripUpdateRequest) => {
        tripsApi.updateTrip(tripId, updates).catch((err) => console.error('[Operations] Backend sync failed:', err));
    }, []);

    const createTrip = useCallback(async (tripData: Partial<CompletedTrip>) => {
        const createdTrip = await tripsApi.createTrip(tripData);
        setCompletedTrips(prev => {
            const withoutStale = prev.filter(existing => existing.id !== createdTrip.id);
            return [createdTrip, ...withoutStale];
        });
        return createdTrip.id;
    }, []);

    const assignVehicle = useCallback((tripId: string, vehicleId: string, vendorId?: string) => {
        const vehicle = vehicles.find(v => v.id === vehicleId);
        const vendor = vendors.find(v => v.id === vendorId);
        const dispatchDate = new Date().toISOString().split('T')[0];
        tripsApi.assignVehicle(tripId, {
            vehicleId,
            vehicleRegNumber: vehicle?.regNumber,
            driverName: vehicle?.driverName,
            driverPhone: vehicle?.driverPhone,
        }).catch((err) => console.error('[Operations] Backend sync failed:', err));
        const trip = completedTrips.find(t => t.id === tripId);
        let tripType = trip?.tripType ?? 'own_vehicle';
        if (vendor) {
            tripType = vendor.hasContract ? 'contracted_vendor' : 'market_hire';
        } else if (vehicle && vehicle.ownershipType !== 'owned') {
            tripType = 'market_hire';
        } else {
            tripType = 'own_vehicle';
        }
        const totalCost = trip && trip.revenueAmount > 0 ? trip.revenueAmount * 0.75 : trip?.totalCost;
        syncTripUpdate(tripId, {
            status: 'in_transit',
            dispatchDate,
            vehicleId,
            vehicleRegNumber: vehicle?.regNumber || 'Unknown',
            driverName: vehicle?.driverName || 'Unknown',
            driverPhone: vehicle?.driverPhone || undefined,
            vendorId: vendor?.id,
            vendorName: vendor?.name,
            totalCost,
        });
        setCompletedTrips(prev => prev.map(t => {
            if (t.id !== tripId) return t;

            let tripType = t.tripType;
            if (vendor) {
                tripType = vendor.hasContract ? 'contracted_vendor' : 'market_hire';
            } else if (vehicle && vehicle.ownershipType !== 'owned') {
                tripType = 'market_hire';
            } else {
                tripType = 'own_vehicle';
            }

            // Estimate cost at 75% of revenue; real expenses will override this
            const totalCost = t.revenueAmount > 0 ? t.revenueAmount * 0.75 : t.totalCost;

            return {
                ...t,
                status: 'in_transit' as const,
                dispatchDate,
                vehicleId: vehicleId || t.vehicleId,
                vehicleRegNumber: vehicle?.regNumber || 'Unknown',
                driverName: vehicle?.driverName || 'Unknown',
                driverPhone: vehicle?.driverPhone || '',
                tripType,
                vendorId: vendor?.id,
                vendorName: vendor?.name,
                totalCost,
            };
        }));
        // Mark the assigned vehicle as in_transit so it no longer shows as available
        if (vehicleId) {
            setVehicles(prev => prev.map(v =>
                v.id === vehicleId ? { ...v, status: 'in_transit' as const } : v
            ));
        }
    }, [completedTrips, syncTripUpdate, vehicles, vendors]);

    // Assign a market hire / contracted vendor vehicle (not in own fleet)
    const assignMarketHireVehicle = useCallback((
        tripId: string,
        vendorId: string,
        regNumber: string,
        driverName: string,
        driverPhone: string,
        freightAmount: number
    ) => {
        const dispatchDate = new Date().toISOString().split('T')[0];
        tripsApi.assignMarketHire(tripId, {
            vendorId,
            vehicleRegNumber: regNumber,
            driverName,
            driverPhone,
            freightAmount,
        }).catch((err) => console.error('[Operations] Backend sync failed:', err));
        const vendor = vendors.find(v => v.id === vendorId);
        const tripType: CompletedTrip['tripType'] = vendor?.hasContract ? 'contracted_vendor' : 'market_hire';
        const vehicleId = `MKT-${vendorId}-${Date.now()}`;
        syncTripUpdate(tripId, {
            status: 'in_transit',
            dispatchDate,
            vehicleId,
            vehicleRegNumber: regNumber || 'Market Hire',
            driverName: driverName || 'Market Driver',
            driverPhone: driverPhone || undefined,
            vendorId,
            vendorName: vendor?.name || 'Unknown Vendor',
            totalCost: freightAmount,
        });
        setCompletedTrips(prev => prev.map(t => {
            if (t.id !== tripId) return t;
            return {
                ...t,
                status: 'in_transit' as const,
                dispatchDate,
                vehicleId,
                vehicleRegNumber: regNumber || 'Market Hire',
                driverName: driverName || 'Market Driver',
                driverPhone: driverPhone || '',
                tripType,
                vendorId,
                vendorName: vendor?.name || 'Unknown Vendor',
                totalCost: freightAmount || t.totalCost,
                vendorPayable: {
                    vendorId,
                    advancePercentage: 30,
                    status: 'pending_advance' as const,
                    advancePaid: false,
                    advanceAmount: Math.round(freightAmount * 0.3),
                    balancePaid: false,
                    balanceAmount: Math.round(freightAmount * 0.7),
                },
            };
        }));
    }, [syncTripUpdate, vendors]);

    const markDelivered = useCallback((tripId: string) => {
        const deliveredDate = new Date().toISOString().split('T')[0];
        tripsApi.markDelivered(tripId, { deliveredDate }).catch((err) => console.error('[Operations] Backend sync failed:', err));
        syncTripUpdate(tripId, { status: 'delivered', deliveredDate });
        setCompletedTrips(prev => prev.map(t =>
            t.id === tripId ? {
                ...t,
                status: 'delivered' as const,
                deliveredDate
            } : t
        ));
        // Release the vehicle back to available on delivery
        const trip = completedTrips.find(t => t.id === tripId);
        if (trip?.vehicleId) {
            setVehicles(prev => prev.map(v =>
                v.id === trip.vehicleId ? { ...v, status: 'available' as const } : v
            ));
        }
    }, [completedTrips, syncTripUpdate]);

    const addVehicleToSharedPool = useCallback((vehicle: SharedVehicle) => {
        setVehicles(prev => {
            // Avoid duplicates
            if (prev.some(v => v.id === vehicle.id)) return prev;
            return [...prev, vehicle];
        });
    }, []);

    // ── Status sync — maps TripStatusCode milestones to business status ────
    const updateTripStatus = useCallback((tripId: string, status: CompletedTrip['status']) => {
        tripsApi.setStatus(tripId, { status }).catch((err) => console.error('[Operations] Backend sync failed:', err));
        syncTripUpdate(tripId, { status });
        setCompletedTrips(prev => prev.map(t =>
            t.id === tripId ? { ...t, status } : t
        ));
        // Auto-release vehicle on delivery
        if (status === 'delivered') {
            const trip = completedTrips.find(t => t.id === tripId);
            if (trip?.vehicleId) {
                setVehicles(prev => prev.map(v =>
                    v.id === trip.vehicleId ? { ...v, status: 'available' as const } : v
                ));
            }
        }
    }, [completedTrips, syncTripUpdate]);

    // ── Finance sync: apply an approved advance to shared state ───────────
    // For vendor_advance → increases SharedVendor.balance (FinanceTMSBridge picks up the
    // vendors change and syncs it to the Finance ledger automatically).
    // For own-fleet advance types → increments the matching costBreakdown field on the trip
    // (FinanceTMSBridge picks up completedTrips change → deriveExpenses creates Finance Expense).
    const applyApprovedAdvance = useCallback((tripId: string, expense: TripExpense) => {
        const trip = completedTrips.find(t => t.id === tripId);
        if (!trip) return;

        if (expense.advanceType === 'vendor_advance' && trip.vendorId) {
            setVendors(prev => prev.map(v =>
                v.id === trip.vendorId ? { ...v, balance: v.balance + expense.amount } : v
            ));
        } else {
            // Map advance type to costBreakdown field
            const fieldMap: Record<string, keyof CostBreakdown> = {
                fuel:         'fuel',
                driver_batta: 'driver',
                toll:         'toll',
                other:        'overhead',
            };
            const field = expense.advanceType ? fieldMap[expense.advanceType] : undefined;
            if (field && trip.costBreakdown) {
                setCompletedTrips(prev => prev.map(t =>
                    t.id === tripId
                        ? { ...t, costBreakdown: { ...t.costBreakdown!, [field]: (t.costBreakdown![field] || 0) + expense.amount } }
                        : t
                ));
            }
        }
    }, [completedTrips]);

    // ── Update a vendor's running balance directly (called by Finance VendorPaymentModal) ──
    const updateVendorBalance = useCallback((vendorId: string, delta: number) => {
        setVendors(prev => prev.map(v =>
            v.id === vendorId ? { ...v, balance: Math.max(0, v.balance + delta) } : v
        ));
    }, []);

    // ── Returns all pending advance expenses across all trips ──────────────
    const getAllPendingAdvances = useCallback((): (TripExpense & { trip: CompletedTrip })[] => {
        const result: (TripExpense & { trip: CompletedTrip })[] = [];
        completedTrips.forEach(trip => {
            const expenses = tripExpensesMap[trip.id] ?? [];
            expenses
                .filter(e => e.isAdvance && e.status === 'Pending')
                .forEach(e => result.push({ ...e, trip }));
        });
        return result;
    }, [completedTrips, tripExpensesMap]);

    const value: OperationalDataContextType = {
        clients,
        vendors,
        vehicles,
        completedTrips,
        tripsLoading,
        tripsLoadError,
        refreshTrips,
        masterDataLoading,
        masterDataError,
        refreshMasterData,
        costBreakdownConfig,
        getTripExpenses,
        addTripExpense,
        updateTripExpense,
        bookRevenue,
        requestAdvance,
        payAdvance,
        settleBalance,
        markPodReceived,
        markInvoiced,
        receiveVendorInvoice,
        updateCostBreakdownConfig,
        createTrip,
        assignVehicle,
        assignMarketHireVehicle,
        markDelivered,
        addVehicleToSharedPool,
        updateTripStatus,
        getAllPendingAdvances,
        applyApprovedAdvance,
        updateVendorBalance,
    };

    return (
        <OperationalDataContext.Provider value={value}>
            {children}
        </OperationalDataContext.Provider>
    );
};
