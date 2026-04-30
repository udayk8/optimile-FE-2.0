// ============================================================
// Optimile ERP — Exception Management Service
// ============================================================
// Formal exception lifecycle: raise → assign → resolve → close
// SLA tracking, auto-escalation, replacement vehicle flow
// ============================================================

import { erpEventBus } from './eventBus';

// ── EXCEPTION TYPES ──────────────────────────────────────────

export type ExceptionCategory =
    | 'vehicle_breakdown'
    | 'accident'
    | 'route_deviation'
    | 'delay'
    | 'cargo_damage'
    | 'cargo_shortage'
    | 'documentation_issue'
    | 'driver_issue'
    | 'loading_issue'
    | 'unloading_issue'
    | 'customer_complaint'
    | 'rate_dispute'
    | 'eway_bill_issue'
    | 'other';

export type ExceptionSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ExceptionStatus =
    | 'raised'
    | 'acknowledged'
    | 'in_progress'
    | 'awaiting_input'
    | 'escalated'
    | 'resolved'
    | 'closed'
    | 'auto_closed';

export type EscalationLevel = 1 | 2 | 3; // L1=Ops, L2=Manager, L3=Head

// ── EXCEPTION RECORD ─────────────────────────────────────────

export interface ExceptionTimelineEntry {
    timestamp: number;
    action: string;
    by: string;
    notes: string;
    previousStatus?: ExceptionStatus;
    newStatus?: ExceptionStatus;
}

export interface TripException {
    id: string;
    tripId: string;
    bookingRef: string;

    // Classification
    category: ExceptionCategory;
    severity: ExceptionSeverity;
    title: string;
    description: string;

    // Source
    raisedBy: string; // User ID or 'system'
    raisedAt: number; // timestamp

    // Assignment
    assignedTo?: string;
    assignedAt?: number;

    // SLA
    slaHours: number; // hours to resolve
    slaDueAt: number; // timestamp
    slaBreached: boolean;

    // Escalation
    escalationLevel: EscalationLevel;
    escalatedAt?: number;
    escalatedTo?: string;

    // Resolution
    status: ExceptionStatus;
    resolution?: string;
    resolvedAt?: number;
    resolvedBy?: string;

    // Impact
    delayHours: number;
    costImpact: number; // ₹ additional cost
    requiresReplacementVehicle: boolean;
    replacementVehicleId?: string;

    // Timeline
    timeline: ExceptionTimelineEntry[];

    // Attachments
    attachmentUrls: string[];
}

// ── SLA CONFIGURATION ────────────────────────────────────────

const SLA_HOURS: Record<ExceptionSeverity, number> = {
    low: 48,
    medium: 24,
    high: 8,
    critical: 2,
};

const AUTO_ESCALATION_HOURS: Record<ExceptionSeverity, number> = {
    low: 36,
    medium: 12,
    high: 4,
    critical: 1,
};

const ESCALATION_MAP: Record<EscalationLevel, string> = {
    1: 'Operations Team',
    2: 'Operations Manager',
    3: 'Operations Head / VP',
};

// ── EXCEPTION MANAGER ────────────────────────────────────────

class ExceptionManager {
    private exceptions: TripException[] = [];
    private listeners: (() => void)[] = [];
    private escalationTimer: ReturnType<typeof setInterval> | null = null;

    constructor() {
        // Check for SLA breaches every minute (in prod, this would be a background service)
        this.escalationTimer = setInterval(() => this.checkEscalations(), 60_000);
    }

    subscribe(fn: () => void): () => void {
        this.listeners.push(fn);
        return () => { this.listeners = this.listeners.filter(l => l !== fn); };
    }

    private notify() {
        this.listeners.forEach(fn => fn());
    }

    // ── CRUD ───────────────────────────────────────────────────

    raise(input: {
        tripId: string;
        bookingRef: string;
        category: ExceptionCategory;
        severity: ExceptionSeverity;
        title: string;
        description: string;
        raisedBy: string;
        requiresReplacementVehicle?: boolean;
        attachmentUrls?: string[];
    }): TripException {
        const now = Date.now();
        const slaHours = SLA_HOURS[input.severity];

        const exception: TripException = {
            id: `EXC-${String(this.exceptions.length + 1).padStart(4, '0')}`,
            tripId: input.tripId,
            bookingRef: input.bookingRef,
            category: input.category,
            severity: input.severity,
            title: input.title,
            description: input.description,
            raisedBy: input.raisedBy,
            raisedAt: now,
            slaHours,
            slaDueAt: now + slaHours * 60 * 60 * 1000,
            slaBreached: false,
            escalationLevel: 1,
            status: 'raised',
            delayHours: 0,
            costImpact: 0,
            requiresReplacementVehicle: input.requiresReplacementVehicle || false,
            timeline: [{
                timestamp: now,
                action: 'Exception Raised',
                by: input.raisedBy,
                notes: input.description,
                newStatus: 'raised',
            }],
            attachmentUrls: input.attachmentUrls || [],
        };

        this.exceptions.push(exception);

        erpEventBus.emit(
            'exception.raised',
            'tms',
            { exceptionId: exception.id, tripId: input.tripId, severity: input.severity }
        );

        this.notify();
        return exception;
    }

    acknowledge(exceptionId: string, assignedTo: string): boolean {
        const exc = this.exceptions.find(e => e.id === exceptionId);
        if (!exc || exc.status !== 'raised') return false;

        const now = Date.now();
        exc.status = 'acknowledged';
        exc.assignedTo = assignedTo;
        exc.assignedAt = now;
        exc.timeline.push({
            timestamp: now,
            action: 'Acknowledged & Assigned',
            by: assignedTo,
            notes: `Assigned to ${assignedTo}`,
            previousStatus: 'raised',
            newStatus: 'acknowledged',
        });

        this.notify();
        return true;
    }

    updateProgress(exceptionId: string, by: string, notes: string, newStatus?: 'in_progress' | 'awaiting_input'): boolean {
        const exc = this.exceptions.find(e => e.id === exceptionId);
        if (!exc || ['resolved', 'closed', 'auto_closed'].includes(exc.status)) return false;

        const now = Date.now();
        const prevStatus = exc.status;
        if (newStatus) exc.status = newStatus;
        exc.timeline.push({
            timestamp: now,
            action: 'Progress Update',
            by,
            notes,
            previousStatus: prevStatus,
            newStatus: exc.status,
        });

        this.notify();
        return true;
    }

    forceEscalate(exceptionId: string, by: string): boolean {
        const exc = this.exceptions.find(e => e.id === exceptionId);
        if (!exc || ['resolved', 'closed', 'auto_closed'].includes(exc.status)) return false;

        const newLevel = Math.min(exc.escalationLevel + 1, 3) as EscalationLevel;
        if (newLevel === exc.escalationLevel) return false;

        const now = Date.now();
        exc.escalationLevel = newLevel;
        exc.escalatedAt = now;
        exc.escalatedTo = ESCALATION_MAP[newLevel];
        exc.status = 'escalated';

        exc.timeline.push({
            timestamp: now,
            action: `Manually Escalated to L${newLevel}`,
            by,
            notes: `Escalated to ${ESCALATION_MAP[newLevel]} via Control Tower`,
            newStatus: 'escalated',
        });

        erpEventBus.emit(
            'exception.escalated',
            'tms',
            { exceptionId: exc.id, tripId: exc.tripId, level: newLevel },

        );

        this.notify();
        return true;
    }

    resolve(exceptionId: string, by: string, resolution: string, delayHours: number, costImpact: number): boolean {
        const exc = this.exceptions.find(e => e.id === exceptionId);
        if (!exc || ['resolved', 'closed', 'auto_closed'].includes(exc.status)) return false;

        const now = Date.now();
        exc.status = 'resolved';
        exc.resolvedAt = now;
        exc.resolvedBy = by;
        exc.resolution = resolution;
        exc.delayHours = delayHours;
        exc.costImpact = costImpact;
        exc.timeline.push({
            timestamp: now,
            action: 'Resolved',
            by,
            notes: resolution,
            newStatus: 'resolved',
        });

        erpEventBus.emit(
            'exception.resolved',
            'tms',
            { exceptionId: exc.id, tripId: exc.tripId, delayHours, costImpact },

        );

        this.notify();
        return true;
    }

    close(exceptionId: string, by: string): boolean {
        const exc = this.exceptions.find(e => e.id === exceptionId);
        if (!exc || exc.status !== 'resolved') return false;

        exc.status = 'closed';
        exc.timeline.push({
            timestamp: Date.now(),
            action: 'Closed',
            by,
            notes: 'Exception closed after resolution verification.',
            previousStatus: 'resolved',
            newStatus: 'closed',
        });

        this.notify();
        return true;
    }

    assignReplacementVehicle(exceptionId: string, vehicleId: string, by: string): boolean {
        const exc = this.exceptions.find(e => e.id === exceptionId);
        if (!exc || !exc.requiresReplacementVehicle) return false;

        exc.replacementVehicleId = vehicleId;
        exc.timeline.push({
            timestamp: Date.now(),
            action: 'Replacement Vehicle Assigned',
            by,
            notes: `Vehicle ${vehicleId} assigned as replacement`,
        });

        erpEventBus.emit(
            'exception.replacementAssigned',
            'tms',
            { exceptionId: exc.id, tripId: exc.tripId, vehicleId },

        );

        this.notify();
        return true;
    }

    // ── QUERIES ────────────────────────────────────────────────

    getAll(): TripException[] {
        return [...this.exceptions];
    }

    getByTrip(tripId: string): TripException[] {
        return this.exceptions.filter(e => e.tripId === tripId);
    }

    getActive(): TripException[] {
        return this.exceptions.filter(e => !['resolved', 'closed', 'auto_closed'].includes(e.status));
    }

    getSLABreached(): TripException[] {
        return this.exceptions.filter(e => e.slaBreached && !['resolved', 'closed', 'auto_closed'].includes(e.status));
    }

    getById(id: string): TripException | undefined {
        return this.exceptions.find(e => e.id === id);
    }

    getStats(): {
        total: number;
        active: number;
        breached: number;
        byCategory: Record<string, number>;
        bySeverity: Record<string, number>;
        avgResolutionHours: number;
    } {
        const resolved = this.exceptions.filter(e => e.resolvedAt);
        const avgHours = resolved.length > 0
            ? resolved.reduce((s, e) => s + (e.resolvedAt! - e.raisedAt) / (1000 * 60 * 60), 0) / resolved.length
            : 0;

        const byCategory: Record<string, number> = {};
        const bySeverity: Record<string, number> = {};
        this.exceptions.forEach(e => {
            byCategory[e.category] = (byCategory[e.category] || 0) + 1;
            bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;
        });

        return {
            total: this.exceptions.length,
            active: this.getActive().length,
            breached: this.getSLABreached().length,
            byCategory,
            bySeverity,
            avgResolutionHours: Math.round(avgHours * 10) / 10,
        };
    }

    // ── ESCALATION ENGINE ──────────────────────────────────────

    private checkEscalations(): void {
        const now = Date.now();
        let changed = false;

        this.exceptions.forEach(exc => {
            if (['resolved', 'closed', 'auto_closed'].includes(exc.status)) return;

            // Check SLA breach
            if (!exc.slaBreached && now > exc.slaDueAt) {
                exc.slaBreached = true;
                exc.timeline.push({
                    timestamp: now,
                    action: '⚠️ SLA BREACHED',
                    by: 'system',
                    notes: `SLA of ${exc.slaHours}h exceeded. Automatic escalation triggered.`,
                });

                erpEventBus.emit(
                    'exception.slaBreached',
                    'tms',
                    { exceptionId: exc.id, tripId: exc.tripId, severity: exc.severity },

                );
                changed = true;
            }

            // Auto-escalation
            const autoEscalateAfterMs = AUTO_ESCALATION_HOURS[exc.severity] * 60 * 60 * 1000;
            const timeSinceRaised = now - exc.raisedAt;

            if (exc.escalationLevel < 3 && timeSinceRaised > autoEscalateAfterMs * exc.escalationLevel) {
                const newLevel = Math.min(exc.escalationLevel + 1, 3) as EscalationLevel;
                if (newLevel !== exc.escalationLevel) {
                    exc.escalationLevel = newLevel;
                    exc.escalatedAt = now;
                    exc.escalatedTo = ESCALATION_MAP[newLevel];
                    exc.status = 'escalated';
                    exc.timeline.push({
                        timestamp: now,
                        action: `Escalated to L${newLevel}`,
                        by: 'system',
                        notes: `Auto-escalated to ${ESCALATION_MAP[newLevel]}. Time elapsed: ${Math.round(timeSinceRaised / (1000 * 60 * 60))}h.`,
                        newStatus: 'escalated',
                    });

                    erpEventBus.emit(
                        'exception.escalated',
                        'tms',
                        { exceptionId: exc.id, tripId: exc.tripId, level: newLevel },
                    );
                    changed = true;
                }
            }
        });

        if (changed) this.notify();
    }

    /**
     * Get the category display metadata.
     */
    getCategoryMeta(cat: ExceptionCategory): { label: string; icon: string; color: string } {
        const map: Record<ExceptionCategory, { label: string; icon: string; color: string }> = {
            vehicle_breakdown: { label: 'Vehicle Breakdown', icon: '🔧', color: 'red' },
            accident: { label: 'Accident', icon: '🚨', color: 'red' },
            route_deviation: { label: 'Route Deviation', icon: '🗺️', color: 'orange' },
            delay: { label: 'Delay', icon: '⏱️', color: 'amber' },
            cargo_damage: { label: 'Cargo Damage', icon: '📦', color: 'red' },
            cargo_shortage: { label: 'Cargo Shortage', icon: '📉', color: 'orange' },
            documentation_issue: { label: 'Documentation Issue', icon: '📋', color: 'yellow' },
            driver_issue: { label: 'Driver Issue', icon: '🧑', color: 'orange' },
            loading_issue: { label: 'Loading Issue', icon: '⬆️', color: 'amber' },
            unloading_issue: { label: 'Unloading Issue', icon: '⬇️', color: 'amber' },
            customer_complaint: { label: 'Customer Complaint', icon: '💬', color: 'blue' },
            rate_dispute: { label: 'Rate Dispute', icon: '₹', color: 'purple' },
            eway_bill_issue: { label: 'E-Way Bill Issue', icon: '🧾', color: 'yellow' },
            other: { label: 'Other', icon: '❓', color: 'gray' },
        };
        return map[cat] || { label: cat, icon: '❓', color: 'gray' };
    }

    destroy() {
        if (this.escalationTimer) clearInterval(this.escalationTimer);
    }
}

// ── SINGLETON EXPORT ─────────────────────────────────────────

export const exceptionManager = new ExceptionManager();
