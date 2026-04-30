// ============================================================
// Optimile ERP — Trip / Booking State Machine
// ============================================================
// Formal FSM with guard conditions for all trip status transitions.
// Emits events via erpEventBus for cross-module sync.
// ============================================================

import { erpEventBus } from './eventBus';

// ── EXTENDED TRIP STATUS ─────────────────────────────────────
// Extends the ODS `TripStatus` with intermediate operational states

export type BookingStatus =
    // Booking phase
    | 'draft'
    | 'confirmed'
    | 'vehicle_assigned'
    // Dispatch phase
    | 'dispatched'
    | 'at_loading'
    | 'loading'
    | 'in_transit'
    // Arrival phase
    | 'at_unloading'
    | 'unloading'
    | 'delivered'
    // Post-delivery
    | 'pod_pending'
    | 'pod_received'
    | 'pod_verified'
    // Financial
    | 'invoiced'
    | 'payment_received'
    // Terminal states
    | 'cancelled'
    | 'short_closed';

export type BookingAction =
    | 'confirm_booking'
    | 'assign_vehicle'
    | 'dispatch'
    | 'arrive_loading'
    | 'start_loading'
    | 'depart_loading'
    | 'arrive_unloading'
    | 'start_unloading'
    | 'mark_delivered'
    | 'upload_pod'
    | 'verify_pod'
    | 'raise_invoice'
    | 'receive_payment'
    | 'cancel'
    | 'short_close';

// ── GUARD CONDITIONS ─────────────────────────────────────────

export interface BookingContext {
    bookingId: string;
    customerId: string;
    vendorId?: string;
    vehicleId?: string;
    driverId?: string;
    driverPhone?: string;
    podUploaded: boolean;
    podClean: boolean;
    invoiceId?: string;
    hasActiveException: boolean;
    exceptionResolved: boolean;
    eWayBillGenerated: boolean;
    creditLimitOk: boolean;
    documentsValid: boolean;
    rateApproved: boolean;
    detentionHours: number;
    bookedAt?: string;
    dispatchedAt?: string;
    deliveredAt?: string;
}

interface Transition {
    from: BookingStatus[];
    to: BookingStatus;
    guard?: (ctx: BookingContext) => { allowed: boolean; reason?: string };
    sideEffects?: (ctx: BookingContext) => void;
}

const TRANSITIONS: Record<BookingAction, Transition> = {
    confirm_booking: {
        from: ['draft'],
        to: 'confirmed',
        guard: (ctx) => {
            if (!ctx.creditLimitOk) return { allowed: false, reason: 'Customer over credit limit. Clear outstanding to proceed.' };
            if (!ctx.rateApproved) return { allowed: false, reason: 'Rate requires HO approval (deviation > 5%).' };
            return { allowed: true };
        },
    },
    assign_vehicle: {
        from: ['confirmed'],
        to: 'vehicle_assigned',
        guard: (ctx) => {
            if (!ctx.vehicleId) return { allowed: false, reason: 'No vehicle selected.' };
            if (!ctx.driverId) return { allowed: false, reason: 'No driver assigned.' };
            if (!ctx.documentsValid) return { allowed: false, reason: 'Vehicle/driver documents expired. Cannot dispatch.' };
            return { allowed: true };
        },
    },
    dispatch: {
        from: ['vehicle_assigned'],
        to: 'dispatched',
        guard: (ctx) => {
            if (!ctx.eWayBillGenerated) return { allowed: false, reason: 'E-Way Bill not generated. Required for interstate movement.' };
            return { allowed: true };
        },
        sideEffects: (ctx) => {
            erpEventBus.emit('trip.dispatched', 'tms', { bookingId: ctx.bookingId, vehicleId: ctx.vehicleId });
        },
    },
    arrive_loading: {
        from: ['dispatched'],
        to: 'at_loading',
    },
    start_loading: {
        from: ['at_loading'],
        to: 'loading',
    },
    depart_loading: {
        from: ['loading'],
        to: 'in_transit',
        sideEffects: (ctx) => {
            erpEventBus.emit('trip.inTransit', 'tms', { bookingId: ctx.bookingId });
        },
    },
    arrive_unloading: {
        from: ['in_transit'],
        to: 'at_unloading',
    },
    start_unloading: {
        from: ['at_unloading'],
        to: 'unloading',
    },
    mark_delivered: {
        from: ['unloading', 'in_transit', 'at_unloading'], // Allow direct delivery from transit for simpler flows
        to: 'delivered',
        guard: (ctx) => {
            if (ctx.hasActiveException && !ctx.exceptionResolved) {
                return { allowed: false, reason: 'Active exception must be resolved before marking delivery.' };
            }
            return { allowed: true };
        },
        sideEffects: (ctx) => {
            erpEventBus.emit('trip.delivered', 'tms', { bookingId: ctx.bookingId, detentionHours: ctx.detentionHours });
        },
    },
    upload_pod: {
        from: ['delivered'],
        to: 'pod_received',
    },
    verify_pod: {
        from: ['pod_received'],
        to: 'pod_verified',
        guard: (ctx) => {
            if (!ctx.podUploaded) return { allowed: false, reason: 'POD document not uploaded.' };
            return { allowed: true };
        },
    },
    raise_invoice: {
        from: ['pod_verified', 'pod_received'], // Some clients allow invoice without POD verification
        to: 'invoiced',
        sideEffects: (ctx) => {
            erpEventBus.emit('trip.invoiced', 'finance', { bookingId: ctx.bookingId, invoiceId: ctx.invoiceId });
        },
    },
    receive_payment: {
        from: ['invoiced'],
        to: 'payment_received',
    },
    cancel: {
        from: ['draft', 'confirmed', 'vehicle_assigned'],
        to: 'cancelled',
        sideEffects: (ctx) => {
            erpEventBus.emit('trip.cancelled', 'tms', { bookingId: ctx.bookingId });
        },
    },
    short_close: {
        from: ['dispatched', 'at_loading', 'loading', 'in_transit', 'at_unloading', 'unloading'],
        to: 'short_closed',
        sideEffects: (ctx) => {
            erpEventBus.emit('trip.shortClosed', 'tms', { bookingId: ctx.bookingId });
        },
    },
};

// ── STATE MACHINE ────────────────────────────────────────────

class TripStateMachine {
    /**
     * Attempt a state transition. Returns success/failure with reason.
     */
    transition(
        currentStatus: BookingStatus,
        action: BookingAction,
        context: BookingContext
    ): { success: boolean; newStatus?: BookingStatus; reason?: string } {
        const t = TRANSITIONS[action];
        if (!t) {
            return { success: false, reason: `Unknown action: ${action}` };
        }

        if (!t.from.includes(currentStatus)) {
            return { success: false, reason: `Cannot ${action} from status '${currentStatus}'. Allowed from: ${t.from.join(', ')}` };
        }

        if (t.guard) {
            const guardResult = t.guard(context);
            if (!guardResult.allowed) {
                return { success: false, reason: guardResult.reason };
            }
        }

        // Transition allowed
        if (t.sideEffects) {
            t.sideEffects(context);
        }

        return { success: true, newStatus: t.to };
    }

    /**
     * Get all available actions from a given status.
     */
    getAvailableActions(currentStatus: BookingStatus): BookingAction[] {
        return (Object.keys(TRANSITIONS) as BookingAction[]).filter(
            action => TRANSITIONS[action].from.includes(currentStatus)
        );
    }

    /**
     * Validate a transition without executing it (dry run).
     */
    canTransition(currentStatus: BookingStatus, action: BookingAction, context: BookingContext): { allowed: boolean; reason?: string } {
        const t = TRANSITIONS[action];
        if (!t || !t.from.includes(currentStatus)) {
            return { allowed: false, reason: `Transition ${action} not available from ${currentStatus}` };
        }
        if (t.guard) {
            return t.guard(context);
        }
        return { allowed: true };
    }

    /**
     * Get status metadata for display.
     */
    getStatusMeta(status: BookingStatus): { label: string; color: string; phase: string } {
        const meta: Record<BookingStatus, { label: string; color: string; phase: string }> = {
            draft: { label: 'Draft', color: 'gray', phase: 'Booking' },
            confirmed: { label: 'Confirmed', color: 'blue', phase: 'Booking' },
            vehicle_assigned: { label: 'Vehicle Assigned', color: 'indigo', phase: 'Booking' },
            dispatched: { label: 'Dispatched', color: 'cyan', phase: 'Dispatch' },
            at_loading: { label: 'At Loading Point', color: 'yellow', phase: 'Dispatch' },
            loading: { label: 'Loading', color: 'amber', phase: 'Dispatch' },
            in_transit: { label: 'In Transit', color: 'emerald', phase: 'Transit' },
            at_unloading: { label: 'At Unloading Point', color: 'teal', phase: 'Arrival' },
            unloading: { label: 'Unloading', color: 'lime', phase: 'Arrival' },
            delivered: { label: 'Delivered', color: 'green', phase: 'Delivery' },
            pod_pending: { label: 'POD Pending', color: 'orange', phase: 'Post-Delivery' },
            pod_received: { label: 'POD Received', color: 'sky', phase: 'Post-Delivery' },
            pod_verified: { label: 'POD Verified', color: 'violet', phase: 'Post-Delivery' },
            invoiced: { label: 'Invoiced', color: 'purple', phase: 'Financial' },
            payment_received: { label: 'Payment Received', color: 'emerald', phase: 'Financial' },
            cancelled: { label: 'Cancelled', color: 'red', phase: 'Terminal' },
            short_closed: { label: 'Short Closed', color: 'rose', phase: 'Terminal' },
        };
        return meta[status] || { label: status, color: 'gray', phase: 'Unknown' };
    }

    /**
     * Get the full transition map (for documentation or flow diagrams).
     */
    getTransitionMap(): Record<BookingAction, { from: BookingStatus[]; to: BookingStatus; hasGuard: boolean }> {
        const map: any = {};
        for (const [action, t] of Object.entries(TRANSITIONS)) {
            map[action] = { from: t.from, to: t.to, hasGuard: !!t.guard };
        }
        return map;
    }
}

// ── SINGLETON EXPORT ─────────────────────────────────────────

export const tripStateMachine = new TripStateMachine();
