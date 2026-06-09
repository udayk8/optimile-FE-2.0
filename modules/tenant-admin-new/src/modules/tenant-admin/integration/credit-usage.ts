import type { BookingRecord, TenantInvoiceRecord } from "@/modules/tms/booking/types";
import type { TenantCustomer } from "@/types/customer";

/**
 * Live credit utilisation for a customer (BRD 3.5) — the single source of truth
 * shared by the finance Credit Limits screen, the indent-creation warning, and the
 * customer profile so they never disagree.
 *
 *   used = Σ(raised invoices not yet paid, at invoice total)
 *        + Σ(active un-invoiced bookings, at selling freight)
 *
 * No double counting: invoiced bookings (`isInvoiced`) are excluded from the
 * booking sum (their value is captured by the invoice); paid invoices drop out of
 * the invoice sum (which is what releases credit when the customer pays). Falls
 * back to the manually-maintained `currentOutstanding` only when nothing computes.
 */
const EXCLUDED_BOOKING_STATUSES = new Set<BookingRecord["status"]>(["DRAFT", "CANCELLED"]);

export interface CreditUsage {
  creditLimit: number;
  used: number;
  utilizationPercent: number;
  outstandingInvoices: number;
  committedBookings: number;
}

export function computeCreditUsage(
  customer: Pick<TenantCustomer, "id" | "creditLimit" | "currentOutstanding">,
  bookings: BookingRecord[],
  invoices: TenantInvoiceRecord[],
): CreditUsage {
  const creditLimit = customer.creditLimit ?? 0;

  const customerInvoices = invoices.filter((i) => i.customerId === customer.id);

  const outstandingInvoices = customerInvoices
    .filter((i) => i.paymentStatus !== "paid")
    .reduce((s, i) => s + (i.total ?? 0), 0);

  // Bookings already represented by an invoice must NOT be counted again (avoids
  // the double-count where a booking + its invoice both inflate `used`, and lets a
  // payment fully release the amount). Robust even if `isInvoiced` wasn't set.
  const invoicedBookingIds = new Set(customerInvoices.flatMap((i) => i.bookingIds ?? []));
  const committedBookings = bookings
    .filter(
      (b) =>
        b.customerId === customer.id &&
        !b.isInvoiced &&
        !invoicedBookingIds.has(b.bookingId) &&
        !EXCLUDED_BOOKING_STATUSES.has(b.status),
    )
    .reduce((s, b) => s + (b.pricing?.calculatedFreight ?? 0), 0);

  let used = outstandingInvoices + committedBookings;
  if (used === 0) used = customer.currentOutstanding ?? 0;

  const utilizationPercent = creditLimit > 0 ? Number(((used / creditLimit) * 100).toFixed(1)) : 0;
  return { creditLimit, used, utilizationPercent, outstandingInvoices, committedBookings };
}
