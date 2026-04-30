// ============================================================
// Optimile ERP — ETA Recalculation Engine
// ============================================================
// Calculates and updates Estimated Time of Arrival (ETA)
// based on current location, distance remaining, weather,
// traffic, and driving hours regulations.
// ============================================================

import { erpEventBus } from './eventBus';
import { exceptionManager } from './exceptionManager';

export interface Location {
    lat: number;
    lng: number;
    name?: string;
}

export interface ETAContext {
    tripId: string;
    bookingRef: string;
    currentLocation: Location;
    destinationLocation: Location;
    distanceRemainingKm: number;
    avgSpeedKmph: number;
    lastUpdatedAt: number;
    // External factors (mocked for now)
    weatherDelayHours?: number;
    trafficDelayHours?: number;
    // Regulatory
    drivingHoursRemainingBeforeRest?: number;
    mandatoryRestHours?: number;
}

export interface ETAResult {
    predictedArrival: number; // timestamp
    totalEstimatedHours: number;
    delayDetected: boolean;
    delayHours: number;
    reason?: string;
}

class ETAEngine {
    private tripETAs: Map<string, ETAResult> = new Map();
    private listeners: (() => void)[] = [];

    subscribe(fn: () => void): () => void {
        this.listeners.push(fn);
        return () => { this.listeners = this.listeners.filter(l => l !== fn); };
    }

    private notify() {
        this.listeners.push(() => { }); // trigger re-render
        this.listeners.forEach(fn => fn());
    }

    /**
     * Recalculate ETA for a trip.
     */
    recalculateETA(
        originalDeliveryTarget: number, // Initial committed timestamp
        ctx: ETAContext
    ): ETAResult {
        const now = Date.now();

        // 1. Base drive time calculation
        const baseDriveHours = ctx.distanceRemainingKm / (ctx.avgSpeedKmph || 40);

        // 2. Add rest periods (e.g., driver needs 8 hours rest per 12 hours driving)
        let restHours = 0;
        if (ctx.drivingHoursRemainingBeforeRest !== undefined && baseDriveHours > ctx.drivingHoursRemainingBeforeRest) {
            const remainingAfterFirstRest = baseDriveHours - ctx.drivingHoursRemainingBeforeRest;
            const numberOfRests = Math.floor(remainingAfterFirstRest / 12) + 1;
            restHours = numberOfRests * (ctx.mandatoryRestHours || 8);
        }

        // 3. Add external delays
        const weatherDelay = ctx.weatherDelayHours || 0;
        const trafficDelay = ctx.trafficDelayHours || 0;

        // 4. Calculate total expected hours from now
        const totalEstimatedHours = baseDriveHours + restHours + weatherDelay + trafficDelay;

        // 5. Calculate new ETA
        const predictedArrival = now + (totalEstimatedHours * 60 * 60 * 1000);

        // 6. Check for delay against original target
        const toleranceMs = 60 * 60 * 1000; // 1 hr tolerance
        const finalDelayMs = predictedArrival - originalDeliveryTarget;
        const delayDetected = finalDelayMs > toleranceMs;
        const delayHours = delayDetected ? finalDelayMs / (1000 * 60 * 60) : 0;

        let reason = undefined;
        if (delayDetected) {
            if (weatherDelay > 0) reason = 'Weather Delay';
            else if (trafficDelay > 0) reason = 'Heavy Traffic';
            else if (restHours > 0) reason = 'Driver Rest Required';
            else reason = 'Slower Average Speed';
        }

        const result: ETAResult = {
            predictedArrival,
            totalEstimatedHours,
            delayDetected,
            delayHours,
            reason,
        };

        const previousETA = this.tripETAs.get(ctx.tripId);
        this.tripETAs.set(ctx.tripId, result);

        // Fire events if ETA significantly changed or delay detected
        if (!previousETA || Math.abs(previousETA.predictedArrival - predictedArrival) > toleranceMs) {
            erpEventBus.emit(
                'eta.updated',
                'tms',
                { tripId: ctx.tripId, predictedArrival, delayHours: result.delayHours },

            );
        }

        if (delayDetected && (!previousETA || !previousETA.delayDetected)) {
            erpEventBus.emit(
                'eta.delayDetected',
                'tms',
                { tripId: ctx.tripId, delayHours, reason },

            );

            // Auto-raise exception for major delays
            if (delayHours > 4) {
                exceptionManager.raise({
                    tripId: ctx.tripId,
                    bookingRef: ctx.bookingRef,
                    category: 'delay',
                    severity: delayHours > 12 ? 'high' : 'medium',
                    title: `ETA Delay: ${Math.round(delayHours)}h`,
                    description: `Auto-detected delay of ${Math.round(delayHours)} hours due to ${reason || 'unknown factors'}.`,
                    raisedBy: 'system'
                });
            }
        }

        this.notify();
        return result;
    }

    getETA(tripId: string): ETAResult | undefined {
        return this.tripETAs.get(tripId);
    }
}

export const etaEngine = new ETAEngine();
