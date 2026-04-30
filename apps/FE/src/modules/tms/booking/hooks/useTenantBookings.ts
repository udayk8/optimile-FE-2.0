import { useAppStore } from "@/store/useAppStore";
import type {
  BookingAssignmentInput,
  BookingInput,
  BookingRecord,
  BookingStatusTransitionInput,
} from "@/modules/tms/booking/types";

export function useTenantBookings(tenantId: string) {
  const appStore = useAppStore(tenantId);

  return {
    data: appStore.bookings,
    getBookingById: appStore.getBookingById,
    createBooking: (
      input: Omit<BookingRecord, "id" | "bookingId" | "createdAt" | "updatedAt" | "tenantId">,
    ) => appStore.createBooking(input),
    updateBooking: (bookingId: string, updates: Partial<BookingInput>) =>
      appStore.updateBooking(bookingId, updates),
    transitionBooking: (bookingId: string, transition: BookingStatusTransitionInput) =>
      appStore.transitionBooking(bookingId, transition),
    assignBooking: (bookingId: string, input: BookingAssignmentInput) =>
      appStore.assignBooking(bookingId, input),
  };
}
