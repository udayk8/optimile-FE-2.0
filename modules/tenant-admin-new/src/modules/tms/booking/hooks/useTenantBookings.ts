import { useAppStore } from "@/shared/store/useAppStore";
import type {
  BookingAssignmentInput,
  BookingInput,
  BookingVehicleReplacementInput,
  BookingVehicleReplacementVendorActionInput,
  BookingReassignmentInput,
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
    reassignBooking: (bookingId: string, input: BookingReassignmentInput) =>
      appStore.reassignBooking(bookingId, input),
    replaceBookingVehicle: (bookingId: string, input: BookingVehicleReplacementInput) =>
      appStore.replaceBookingVehicle(bookingId, input),
    actionBookingVehicleReplacement: (bookingId: string, input: BookingVehicleReplacementVendorActionInput) =>
      appStore.actionBookingVehicleReplacement(bookingId, input),
  };
}
