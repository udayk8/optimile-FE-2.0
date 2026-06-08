import { useMemo } from "react";
import { useMockStore } from "@/shared/store/mock-store";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import type { BookingRecord, BookingExpenseRecord, BookingStatus } from "@/modules/tms/booking/types";
import { areAllDeliveryPodsCaptured, perTrip, perMT, perKM } from "@/modules/tms/booking/services/booking-engine";
import { calculateVendorFreightFromRateCard, getVendorRateCardUnitRate } from "@/modules/tms/booking/services/booking-selectors";
import { readVendorContracts, type VendorContract } from "@shared-utils";
import { AR_TOLERANCE_PCT } from "@finance/data/mock";
import type { FinanceDataBridge, RateCardDescriptor } from "@finance/integration/finance-data-bridge";
import type { ARInvoice, ARTrip, LedgerExpense, PodStage } from "@finance/lib/receivablesStore";
import type { VendorBill } from "@finance/lib/payablesStore";

// Coerce any rate-type spelling to the three the finance descriptor uses.
function normRateType(v?: string | null): "PER_TRIP" | "PER_KM" | "PER_MT" {
  const s = (v ?? "").toUpperCase();
  if (s.includes("KM")) return "PER_KM";
  if (s.includes("MT") || s.includes("TON")) return "PER_MT";
  return "PER_TRIP";
}

// Freight from a unit rate by rate-type, reusing the booking module's own maths.
function freightFor(
  rate: number,
  rateType: "PER_TRIP" | "PER_KM" | "PER_MT",
  weight: number,
  distanceKm: number,
): number {
  if (rateType === "PER_MT") return Number(perMT(rate, weight).toFixed(2));
  if (rateType === "PER_KM") return Number(perKM(rate, distanceKm).toFixed(2));
  return Number(perTrip(rate).toFixed(2));
}

// Single source for 18% GST (CGST 9% + SGST 9%) so every invoice builder here
// rounds identically. Returns the combined tax on a subtotal.
const gst18 = (subtotal: number) => 2 * Math.round(subtotal * 0.09);

// Project one booking expense into the finance LedgerExpense shape so the finance
// team sees every charge line (not just rolled-up totals). Read-only in finance.
function mapExpense(e: BookingExpenseRecord): LedgerExpense {
  return {
    type: e.expenseType ?? e.label,
    amount: e.amount ?? 0,
    paymentMode: e.paymentMode ?? undefined,
    paidBy: e.paidBy ?? undefined,
    status: (e.status ?? "Pending") as LedgerExpense["status"],
    billReceipt: e.billReceiptFile ?? null,
    date: e.dateTime ?? e.createdAt,
    notes: e.notes ?? undefined,
  };
}

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
      // Mirror the booking module's own "POD uploaded" signal, which is at the
      // DELIVERY level (its badge + pendingPodDeliveries key off delivery.pod).
      // The booking-level `pod` is only a best-effort copy, so checking it alone
      // misses genuinely-uploaded PODs and strands them in Pending POD.
      const podDone =
        Boolean(booking.pod?.podUploaded) ||
        areAllDeliveryPodsCaptured(booking.deliveries) ||
        booking.status === "COMPLETED";
      return podDone ? "validated" : "pending";
    };

    // Booking-wise expenses, read straight off the booking (no duplication in
    // Finance). Only "Approved" expenses are billable; "Pending" is shown for
    // visibility; "Rejected" (and anything else) is excluded from both.
    const sumExpenses = (booking: BookingRecord, status: "Approved" | "Pending") =>
      (booking.expenses ?? [])
        .filter((expense) => (expense.status ?? "Pending") === status)
        .reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const approvedExpensesOf = (booking: BookingRecord) => sumExpenses(booking, "Approved");

    // Master-data lookups for the rich booking detail the finance team needs.
    const materialName = (materialId?: string | null) => {
      if (!materialId) return undefined;
      const m = store.listTenantMaterials(tenantId).find((x) => x.id === materialId);
      return m?.description ?? m?.materialCode ?? undefined;
    };
    const addressLabel = (customerId: string, addressId?: string | null) => {
      if (!addressId) return undefined;
      const a = store.listTenantCustomerAddresses(customerId).find((x) => x.id === addressId);
      return a?.fullAddress ?? a?.addressName ?? undefined;
    };
    const consigneeNameOf = (b: BookingRecord) => {
      if (b.pod?.consigneeName) return b.pod.consigneeName;
      const d = b.deliveries?.[0];
      if (d?.contactPerson) return d.contactPerson;
      const a = store.listTenantCustomerAddresses(b.customerId).find((x) => x.id === b.consigneeAddressId);
      return a?.consigneeName ?? a?.contactPerson ?? undefined;
    };

    const weightOf = (b: BookingRecord) => b.weight ?? b.deliveries?.[0]?.weight ?? 0;
    const distanceOf = (b: BookingRecord) =>
      b.pricing?.distanceKm ?? b.deliveries?.[0]?.distanceKm ?? 0;

    // Vendor-won (auction) contracts — read once. A vendor "wins" a lane via an
    // auction; that award becomes a VendorContract with createdFrom AUCTION_WIN
    // carrying the allocation rank (L1/L2/L3) + volume split. Used to surface the
    // won contract behind the AP 3-way-match baseline.
    const wonContracts: VendorContract[] = (() => {
      try {
        return readVendorContracts().filter((c) => c.tenantId === tenantId || !c.tenantId);
      } catch {
        return [];
      }
    })();
    const cityEq = (x?: string | null, y?: string | null) =>
      (x ?? "").trim().toLowerCase() === (y ?? "").trim().toLowerCase();
    const wonById = (contractId?: string | null) =>
      contractId ? wonContracts.find((c) => c.contractId === contractId) : undefined;
    const wonByVendorLane = (vendorId?: string | null, vendorName?: string | null, from?: string, to?: string, vehicleType?: string | null) =>
      wonContracts.find(
        (c) =>
          c.createdFrom === "AUCTION_WIN" &&
          (cityEq(c.vendorId, vendorId) || cityEq(c.vendorName, vendorName)) &&
          cityEq(c.originCity, from) &&
          cityEq(c.destinationCity, to) &&
          (!vehicleType || !c.vehicleType || cityEq(c.vehicleType, vehicleType)),
      );
    // Award provenance fields from a won contract (only when it's an auction win).
    const awardFields = (won?: VendorContract): Partial<RateCardDescriptor> =>
      won && won.createdFrom === "AUCTION_WIN"
        ? {
            awarded: true,
            allocationRank: won.allocationRank,
            volumeAllocationPercent: won.volumeAllocationPercent,
            validFrom: won.startDate,
            validTo: won.endDate,
          }
        : {};

    // AP baseline: the INDEPENDENT contracted/awarded vendor freight behind a
    // booking (never the negotiated `vendorFreight`) so the 3-way match can show
    // real variance. Spot → the auction-won rate; contract → the matched vendor
    // rate card; manual/own-fleet → null (no contract to compare against).
    const resolveVendorContract = (
      b: BookingRecord,
    ): { contracted: number | null; rateCard?: RateCardDescriptor } => {
      if (b.spotContract) {
        const rt = normRateType(b.spotContract.rateUnit);
        const won = wonById(b.spotContract.contractId);
        return {
          contracted: freightFor(b.spotContract.rate, rt, weightOf(b), distanceOf(b)),
          rateCard: {
            source: "SPOT",
            rateCardId: b.spotContract.contractId,
            lane: `${b.spotContract.originCity} → ${b.spotContract.destinationCity}`,
            rate: b.spotContract.rate,
            rateType: rt,
            sourceAuctionId: b.spotContract.sourceAuctionId,
            awarded: true,
            ...awardFields(won),
          },
        };
      }
      const a = b.assignment;
      if (a?.vendorRateCardId && a.vendorId) {
        const card = store
          .listTenantVendorRateCards(a.vendorId)
          .find((c) => c.id === a.vendorRateCardId);
        if (card) {
          const rt = normRateType(card.rateType);
          // Best-effort: was this lane won by the vendor at auction? If so, surface
          // the win (rank/volume/validity) alongside the rate-card baseline.
          const won = wonByVendorLane(a.vendorId, a.vendorName, card.fromCity ?? undefined, card.toCity ?? undefined, card.vehicleType);
          return {
            contracted: calculateVendorFreightFromRateCard({
              rateCard: card,
              weight: weightOf(b),
              distanceKm: distanceOf(b),
            }),
            rateCard: {
              source: "CONTRACT",
              rateCardId: card.id,
              lane: `${card.fromCity ?? laneOf(b).split(" → ")[0]} → ${card.toCity ?? laneOf(b).split(" → ")[1]}`,
              vehicleType: card.vehicleType ?? undefined,
              rate: getVendorRateCardUnitRate(card) ?? 0,
              rateType: rt,
              validFrom: card.effectiveFromDate,
              validTo: card.effectiveToDate,
              ...awardFields(won),
            },
          };
        }
      }
      return { contracted: null };
    };

    // AR baseline: the customer rate card behind a booking, so a customer invoice
    // deviating from contract (or carrying accessorials) shows a real variance.
    // Prefer the REAL stored TenantCustomerRateCard (its own from/to city, vehicle
    // type, rate, validity) — the same card the tenant configures — so finance
    // shows the rate card exactly as stored. Fall back to the booking's L1 rate
    // only when no card is linked; null when there's no contracted rate at all.
    const resolveCustomerContract = (
      b: BookingRecord,
    ): { contracted: number | null; rateCard?: RateCardDescriptor } => {
      const p = b.pricing;
      const source: RateCardDescriptor["source"] = b.commercialType === "SPOT" ? "SPOT" : "CONTRACT";
      if (p?.contractRateCardId) {
        const card = store
          .listTenantCustomerRateCards(b.customerId)
          .find((c) => c.id === p.contractRateCardId);
        if (card) {
          const rt = normRateType(card.rateType);
          return {
            contracted: freightFor(card.rate, rt, weightOf(b), distanceOf(b)),
            rateCard: {
              source,
              rateCardId: card.id,
              lane: `${card.fromCity ?? laneOf(b).split(" → ")[0]} → ${card.toCity ?? laneOf(b).split(" → ")[1]}`,
              vehicleType: card.vehicleType ?? undefined,
              rate: card.rate,
              rateType: rt,
              validFrom: card.effectiveFromDate,
              validTo: card.effectiveToDate,
            },
          };
        }
      }
      if (p?.l1Rate && p.l1Rate > 0) {
        const rt = normRateType(p.rateType);
        return {
          contracted: freightFor(p.l1Rate, rt, weightOf(b), distanceOf(b)),
          rateCard: {
            source,
            rateCardId: p.contractRateCardId ?? undefined,
            lane: laneOf(b),
            rate: p.l1Rate,
            rateType: rt,
          },
        };
      }
      return { contracted: null };
    };

    const allBookings = store.listTenantBookings(tenantId);
    const eligible = allBookings.filter((b) => POD_ELIGIBLE_STATUSES.has(b.status));

    // One booking → the receivables ARTrip shape. Reused for AR trips AND for the
    // payables vendor bills' linkedBookings (full per-booking detail).
    const bookingToTrip = (b: BookingRecord): ARTrip => {
      const approvedExpenses = approvedExpensesOf(b);
      const pendingExpenses = sumExpenses(b, "Pending");
      const d = b.deliveries?.[0];
      return {
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
        // expense (legacy field) carries the billable/approved amount.
        expense: approvedExpenses,
        approvedExpenses,
        pendingExpenses,
        podStage: podStageOf(b),
        // Rich booking detail for the finance views.
        expenseItems: (b.expenses ?? []).map(mapExpense),
        qty: b.quantity ?? d?.quantity ?? undefined,
        weight: b.weight ?? d?.weight ?? undefined,
        uom: b.uom ?? d?.uom ?? undefined,
        weightUom: b.weightUom ?? d?.weightUom ?? undefined,
        commodity: materialName(d?.materialId ?? b.materialIds?.[0]) ?? b.subBrand ?? undefined,
        pickupAddress: addressLabel(b.customerId, b.sourceAddressId ?? d?.originAddressId),
        dropAddress: addressLabel(b.customerId, b.destinationAddressId ?? d?.destinationAddressId),
        consigneeName: consigneeNameOf(b),
        commercialType: b.commercialType ?? undefined,
        rateType: b.pricing?.rateType ?? undefined,
        buyingFreight: b.assignment?.vendorFreight ?? undefined,
        margin: b.assignment?.marginAmount ?? undefined,
      };
    };

    const trips: ARTrip[] = eligible.map(bookingToTrip);

    const invoices: ARInvoice[] = store
      .listTenantInvoices(tenantId)
      .map((inv) => {
        const invBookings = (inv.bookingIds ?? [])
          .map((bid) => allBookings.find((b) => b.bookingId === bid))
          .filter((b): b is BookingRecord => Boolean(b));
        const firstBooking = invBookings[0] ?? null;
        // Every expense across the invoice's bookings (all statuses) so the finance
        // team sees each charge; the UI bills only the Approved ones.
        const expenseItems: LedgerExpense[] = invBookings.flatMap((b) =>
          (b.expenses ?? []).map(mapExpense),
        );
        // Recompute billed amounts LIVE from the bookings so the invoice total
        // tracks expense approvals (the stored subtotal/total is frozen at
        // generation). Rule: only APPROVED expenses bill into the total.
        const freightTotal = invBookings.reduce((s, b) => s + (b.pricing?.calculatedFreight ?? 0), 0);
        const base = freightTotal || inv.subtotal;
        const approvedExpenseTotal = invBookings.reduce(
          (s, b) => s + (b.expenses ?? [])
            .filter((e) => (e.status ?? "Pending") === "Approved")
            .reduce((x, e) => x + (e.amount || 0), 0),
          0,
        );
        const subtotalLive = base + approvedExpenseTotal;          // freight + approved expenses
        const totalLive = subtotalLive + gst18(subtotalLive);      // + 18% GST (CGST+SGST)
        // Independent contracted total = Σ customer rate-card L1 freight (fallback
        // to the booking's own freight when there's no L1 rate). Real variance vs
        // the live invoiced amount surfaces deviation + accessorials.
        const arContracts = invBookings.map(resolveCustomerContract);
        const contractedTotal =
          invBookings.reduce(
            (s, b, i) => s + (arContracts[i].contracted ?? (b.pricing?.calculatedFreight ?? 0)),
            0,
          ) || base;
        const variancePct = contractedTotal
          ? Number((((subtotalLive - contractedTotal) / contractedTotal) * 100).toFixed(2))
          : 0;
        // 3PL profit rollup: sum selling (customer freight) and buying (vendor
        // freight) over ASSIGNED bookings only; margin = selling − buying. Left
        // undefined when no booking on the invoice has a vendor assigned yet.
        const assignedBookings = invBookings.filter((b) => b.assignment?.vendorFreight != null);
        const sellingFreight = assignedBookings.length
          ? assignedBookings.reduce((s, b) => s + (b.pricing?.calculatedFreight ?? 0), 0)
          : undefined;
        const buyingFreight = assignedBookings.length
          ? assignedBookings.reduce((s, b) => s + (b.assignment?.vendorFreight ?? 0), 0)
          : undefined;
        const margin =
          sellingFreight != null && buyingFreight != null
            ? Number((sellingFreight - buyingFreight).toFixed(2))
            : undefined;
        return {
          id: inv.invoiceId,
          tripId: inv.bookingIds?.[0],
          client: customerName(inv.customerId),
          lane: firstBooking ? laneOf(firstBooking) : "—",
          truck: firstBooking?.assignment?.vehicleLabel ?? "—",
          date: (inv.createdAt ?? "").slice(0, 10),
          terms: "Net 30",
          base,
          accessorials: [],
          contracted: contractedTotal,
          invoiced: subtotalLive,
          amount: totalLive,
          variancePct,
          flagged: Math.abs(variancePct) > AR_TOLERANCE_PCT,
          stage: "submitted",
          bookingIds: inv.bookingIds,
          expenseItems,
          commercialType: firstBooking?.commercialType ?? undefined,
          rateCard: arContracts.find((c) => c.rateCard)?.rateCard,
          sellingFreight,
          buyingFreight,
          margin,
          // One drop per booking so multi-booking invoices resolve every trip.
          drops: invBookings.length > 1
            ? invBookings.map((b) => ({ trip: b.bookingId, lane: laneOf(b), amount: b.pricing?.calculatedFreight ?? 0 }))
            : undefined,
        };
      });

    const findBookingByTripId = (tripId: string) =>
      allBookings.find((b) => b.bookingId === tripId) ?? store.getTenantBookingById(tripId);

    /* ---------- Accounts payable: REAL vendor bills from shared invoices --------
       Each vendor-submitted invoice (shared collection) becomes a VendorBill.
       Linked bookings come from the invoice line items (→ full booking detail).
       The 3-way-match baseline is the INDEPENDENT contracted/awarded rate
       (spot win or vendor rate card via resolveVendorContract) — never the
       negotiated vendorFreight — so a bill off-contract shows real variance. */
    // POD for AP must be a genuine POD signal (delivery-level capture or the
    // booking's own POD flag), NOT merely status === COMPLETED.
    const podConfirmedForAp = (b: BookingRecord) =>
      Boolean(b.invoiceId || b.isInvoiced || b.pod?.podUploaded) ||
      areAllDeliveryPodsCaptured(b.deliveries);
    const bookingForTripRef = (ref: string) =>
      allBookings.find((b) => b.bookingId === ref || b.id === ref);
    // BillStage from invoice status: only PENDING/DISPUTED stay in the match queue.
    const stageForStatus = (s: string): VendorBill["stage"] =>
      s === "PENDING" ? "pending" : s === "DISPUTED" ? "disputed" : s === "APPROVED" ? "scheduled" : "paid";

    const vendorBills: VendorBill[] = store.listTenantVendorInvoices(tenantId).map((inv) => {
      const linkedRecords = inv.lineItems
        .map((li) => bookingForTripRef(li.tripId))
        .filter((b): b is BookingRecord => Boolean(b));
      const apContracts = linkedRecords.map(resolveVendorContract);
      const contractRate = linkedRecords.length
        ? linkedRecords.reduce(
            (s, b, i) => s + (apContracts[i].contracted ?? (b.assignment?.vendorFreight ?? 0)),
            0,
          )
        : inv.subtotal;
      return {
        id: inv.id,
        vendorId: inv.vendorId,
        vendor: inv.vendorName,
        trip: inv.lineItems[0]?.tripId ?? inv.invoiceNumber,
        lane: linkedRecords[0] ? laneOf(linkedRecords[0]) : "—",
        contractRate,
        billed: inv.subtotal,                                   // freight billed (ex-GST) vs contract freight
        pod: linkedRecords.length ? linkedRecords.every(podConfirmedForAp) : true,
        terms: "Net 30",
        due: (inv.paymentDueDate ?? "").slice(0, 10),
        stage: stageForStatus(inv.status),
        commercialType: linkedRecords[0]?.commercialType ?? undefined,
        rateCard: apContracts.find((c) => c.rateCard)?.rateCard,
        linkedBookings: linkedRecords.map(bookingToTrip),
        vendorGstin: inv.vendorGstin,
        customerGstin: inv.customerGstin,
        pdfUrl: inv.pdfUrl,
        subtotal: inv.subtotal,
        gst: inv.gstAmount,
        total: inv.grandTotal,
        billingPeriod: inv.billingPeriod,
        dispute: inv.dispute,
      };
    });

    return {
      trips,
      vendorBills,
      // Finance-driven lifecycle — writes back to the shared collection so the
      // vendor portal's tabs reflect the decision.
      approveVendorBill: (id: string) => store.financeApproveVendorInvoice(id),
      disputeVendorBill: (id: string, reason: string) => store.financeDisputeVendorInvoice(id, reason),
      requestVendorResubmission: (id: string, message?: string) => store.financeRequestVendorResubmission(id, message),
      rejectVendorBill: (id: string, reason?: string) => store.financeRejectVendorInvoice(id, reason),
      replyToVendorDispute: (id: string, message: string) => store.financeReplyToInvoiceDispute(id, message),
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

        // Total Invoice Amount = Booking Freight + Approved Expenses (only).
        const freightTotal = sameCustomer.reduce((sum, b) => sum + (b.pricing?.calculatedFreight ?? 0), 0);
        const approvedExpenseTotal = sameCustomer.reduce((sum, b) => sum + approvedExpensesOf(b), 0);
        const subtotal = freightTotal + approvedExpenseTotal;
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
