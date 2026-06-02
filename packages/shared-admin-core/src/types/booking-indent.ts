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
  // Vendor-indent assignment ALWAYS uses Auto LR, generated from the booking
  // owner's place (captured when the indent is sent). The vendor never picks
  // an LR mode or number.
  lrModeForVendorAssignment?: "AUTO";
  lrPlaceId?: string | null;
  lrPlaceName?: string | null;
}
