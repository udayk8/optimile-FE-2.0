import { MOCK_TYRES } from '../tyre-intelligence/mockData';
import { Tyre, TyreStatus } from '../tyre-intelligence/types';

export interface TyreHealthStatus {
  vehicleId: string;
  overall: 'Healthy' | 'Warning' | 'Critical';
  criticalCount: number;
  warnings: string[];
  tyres: Tyre[];
}

/**
 * Tyre API Service Layer
 * Provides cross-module access to tyre data for dispatch and other fleet operations
 */
export const TyreAPI = {
  /**
   * Get all tyres fitted on a specific vehicle
   */
  getTyresForVehicle: async (vehicleId: string): Promise<Tyre[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return MOCK_TYRES.filter(t => t.position?.vehicleId === vehicleId);
  },

  /**
   * Get comprehensive tyre health status for a vehicle
   * Used by dispatch to validate vehicle readiness
   */
  getTyreHealth: async (vehicleId: string): Promise<TyreHealthStatus> => {
    const tyres = await TyreAPI.getTyresForVehicle(vehicleId);

    // If no tyres found, vehicle might not be in tyre system yet
    if (tyres.length === 0) {
      return {
        vehicleId,
        overall: 'Healthy',
        criticalCount: 0,
        warnings: [],
        tyres: []
      };
    }

    // Identify critical tyres based on multiple criteria
    const criticalTyres = tyres.filter(t => {
      // Low tread depth (less than 3mm is critical)
      if (t.treadDepthMm && t.treadDepthMm < 3) return true;

      // Near end of life (95% of expected life)
      if (t.totalKm > (t.expectedLifeKm * 0.95)) return true;

      // Awaiting maintenance decision
      if (t.status === TyreStatus.AWAITING_DECISION) return true;

      return false;
    });

    // Build warning messages
    const warnings: string[] = [];

    const lowTreadTyres = tyres.filter(t => t.treadDepthMm && t.treadDepthMm < 3);
    if (lowTreadTyres.length > 0) {
      warnings.push(`${lowTreadTyres.length} tyre(s) with low tread depth (<3mm)`);
    }

    const nearEOLTyres = tyres.filter(t => t.totalKm > t.expectedLifeKm * 0.95);
    if (nearEOLTyres.length > 0) {
      warnings.push(`${nearEOLTyres.length} tyre(s) near end of life (>95% usage)`);
    }

    const awaitingDecisionTyres = tyres.filter(t => t.status === TyreStatus.AWAITING_DECISION);
    if (awaitingDecisionTyres.length > 0) {
      warnings.push(`${awaitingDecisionTyres.length} tyre(s) awaiting maintenance decision`);
    }

    // Determine overall health status
    let overall: 'Healthy' | 'Warning' | 'Critical';
    if (criticalTyres.length > 2) {
      overall = 'Critical';
    } else if (criticalTyres.length > 0) {
      overall = 'Warning';
    } else {
      overall = 'Healthy';
    }

    return {
      vehicleId,
      overall,
      criticalCount: criticalTyres.length,
      warnings,
      tyres
    };
  },

  /**
   * Get quick health status for multiple vehicles (bulk operation)
   * Used for vehicle dropdowns to show health indicators
   */
  getBulkTyreHealth: async (vehicleIds: string[]): Promise<Record<string, 'Healthy' | 'Warning' | 'Critical'>> => {
    const healthMap: Record<string, 'Healthy' | 'Warning' | 'Critical'> = {};

    // Process in parallel for better performance
    await Promise.all(
      vehicleIds.map(async (vehicleId) => {
        const health = await TyreAPI.getTyreHealth(vehicleId);
        healthMap[vehicleId] = health.overall;
      })
    );

    return healthMap;
  },

  /**
   * Check if vehicle has any critical tyre issues
   * Quick boolean check for validation workflows
   */
  hasCriticalIssues: async (vehicleId: string): Promise<boolean> => {
    const health = await TyreAPI.getTyreHealth(vehicleId);
    return health.overall === 'Critical';
  }
};
