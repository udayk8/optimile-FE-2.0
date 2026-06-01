// A vendor indent / assignment request sent for a booking. One record per
// (booking, vendor). First vendor to accept wins; the rest are CLOSED.
export type BookingVendorIndentStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CLOSED" | "CANCELLED";

export interface BookingVendorIndent {
  id: string;
  tenantId: string;
  bookingId: string; // BookingRecord.id (internal id)
  bookingRef: string; // BookingRecord.bookingId (human reference)
  vendorId: string;
  vendorName: string;
  status: BookingVendorIndentStatus;
  isWinner: boolean;
  sentAt: string;
  respondedAt?: string | null;
  rejectedReason?: string | null;
}
