import { useMemo } from "react";
import { useMockStore } from "@/shared/store/mock-store";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import type { BookingRecord, BookingStatus } from "@/modules/tms/booking/types";
import type { FinanceDataBridge } from "@finance/integration/finance-data-bridge";
import type { ARInvoice, ARTrip, PodStage } from "@finance/lib/receivablesStore";

// Bookings that are "delivered enough" for a POD/invoice to exist. We never
// invent statuses — these are existing lifecycle values.
const POD_ELIGIBLE_STATUSES = new Set<BookingStatus>([
  "POD_PENDING",
  "ARRIVED",
  "DELAYED",
  "COMPLETED",
  "INVOICED",
  "PAID",
]);

function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.round((Date.now() - then) / 86400000));
}

export function useFinanceTenantDataBridge(): FinanceDataBridge {
  const store = useMockStore();
  const { tenant } = useTenantRouteContext();
  const tenantId = tenant.id;

  return useMemo<FinanceDataBridge>(() => {
    const customerName = (customerId: string) =>
      store.getTenantCustomerById(customerId)?.name ?? "Customer";

    const laneOf = (booking: BookingRecord) => {
      const d = booking.deliveries?.[0];
      const from = d?.originCity ?? "Origin";
      const to = d?.destinationCity ?? "Destination";
      return `${from} → ${to}`;
    };

    const podStageOf = (booking: BookingRecord): PodStage => {
      if (booking.invoiceId || booking.isInvoiced) return "invoiced";
      if (booking.pod?.podUploaded) return "validated";
      return "pending";
    };

    const allBookings = store.listTenantBookings(tenantId);
    const eligible = allBookings.filter((b) => POD_ELIGIBLE_STATUSES.has(b.status));

    const trips: ARTrip[] = eligible.map((b) => ({
      id: b.bookingId,
      bookingId: b.bookingId,
      client: customerName(b.customerId),
      consignee: customerName(b.customerId),
      lane: laneOf(b),
      truck: b.assignment?.vehicleLabel ?? "—",
      driver: b.assignment?.driverName ?? "—",
      vehicle: b.assignment?.vehicleLabel ?? "—",
      vendor: b.assignment?.vendorName ?? "Own fleet",
      delivered: (b.updatedAt ?? b.createdAt ?? "").slice(0, 10),
      daysPending: daysSince(b.updatedAt ?? b.createdAt),
      revenue: b.pricing?.calculatedFreight ?? 0,
      expense: 0,
      podStage: podStageOf(b),
    }));

    const invoices: ARInvoice[] = store
      .listTenantInvoices(tenantId)
      .map((inv) => {
        const firstBooking = inv.bookingIds?.[0]
          ? allBookings.find((b) => b.bookingId === inv.bookingIds[0]) ?? null
          : null;
        return {
          id: inv.invoiceId,
          tripId: inv.bookingIds?.[0],
          client: customerName(inv.customerId),
          lane: firstBooking ? laneOf(firstBooking) : "—",
          truck: firstBooking?.assignment?.vehicleLabel ?? "—",
          date: (inv.createdAt ?? "").slice(0, 10),
          terms: "Net 30",
          base: inv.subtotal,
          accessorials: [],
          contracted: inv.subtotal,
          invoiced: inv.total,
          amount: inv.total,
          variancePct: 0,
          flagged: false,
          stage: "submitted",
          bookingIds: inv.bookingIds,
        };
      });

    const findBookingByTripId = (tripId: string) =>
      allBookings.find((b) => b.bookingId === tripId) ?? store.getTenantBookingById(tripId);

    return {
      trips,
      invoices,

      uploadPod: (tripId) => {
        const b = findBookingByTripId(tripId);
        if (!b) return;
        const now = new Date().toISOString();
        store.updateTenantBooking(b.id, {
          pod: { ...(b.pod ?? {}), podUploaded: true, podUploadedAt: now },
        });
      },

      validatePod: (tripId, ok) => {
        const b = findBookingByTripId(tripId);
        if (!b) return;
        const now = new Date().toISOString();
        store.updateTenantBooking(b.id, {
          pod: ok
            ? { ...(b.pod ?? {}), podUploaded: true, podUploadedAt: b.pod?.podUploadedAt ?? now }
            : { ...(b.pod ?? {}), podUploaded: false },
        });
      },

      generateInvoice: (tripIds) => {
        const ids = [...new Set(tripIds)];
        const bookings = ids
          .map(findBookingByTripId)
          .filter((b): b is BookingRecord => Boolean(b))
          // Duplicate guard: never invoice a booking that already has an invoice.
          .filter((b) => !b.invoiceId && !b.isInvoiced);
        if (bookings.length === 0) return null;

        // One invoice = one customer (mirror the existing finance rule).
        const customerId = bookings[0].customerId;
        const sameCustomer = bookings.filter((b) => b.customerId === customerId);

        const subtotal = sameCustomer.reduce((sum, b) => sum + (b.pricing?.calculatedFreight ?? 0), 0);
        const cgst = Math.round(subtotal * 0.09);
        const sgst = Math.round(subtotal * 0.09);
        const total = subtotal + cgst + sgst;

        const count = store.listTenantInvoices(tenantId).length + 1;
        const invoiceId = `INV-${new Date().getFullYear()}-${String(count).padStart(4, "0")}`;

        store.createTenantInvoice({
          invoiceId,
          tenantId,
          customerId,
          bookingIds: sameCustomer.map((b) => b.bookingId),
          subtotal,
          cgst,
          sgst,
          total,
          createdAt: new Date().toISOString(),
        });

        // Mark each booking invoiced so it leaves Ready-to-Invoice and can't be
        // billed twice. Uses existing booking fields (invoiceId / isInvoiced).
        sameCustomer.forEach((b) =>
          store.updateTenantBooking(b.id, { invoiceId, isInvoiced: true }),
        );

        return invoiceId;
      },
    };
  }, [store, tenantId]);
}
