// ============================================================
// Optimile ERP — AMS Contract Store
// ============================================================
// Provides contract rate lookup for cross-module use (TMS booking,
// Finance ledger). Calls GET /api/v1/ams/contracts/rates.
// Falls back to null with error log if backend unavailable.
// ============================================================

import { apiClient } from './apiClient';

export interface ContractRate {
    id: string;
    clientId: string;
    vendorId?: string;
    origin: string;
    destination: string;
    vehicleType: string;
    ratePerTrip: number;
    validUntil: string;
}

export const amsContractStore = {
    async getContractRate(clientId: string, origin: string, destination: string, vehicleType: string): Promise<ContractRate | null> {
        try {
            const qs = new URLSearchParams({ clientId, origin, destination, vehicleType });
            const data = await apiClient.get<ContractRate>(`/api/v1/ams/contracts/rates?${qs}`);
            return data ?? null;
        } catch (err) {
            console.error('amsContractStore: Failed to fetch contract rate', { clientId, origin, destination, vehicleType }, err);
            return null;
        }
    }
};
