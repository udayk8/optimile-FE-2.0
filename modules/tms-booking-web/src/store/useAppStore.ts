import { useMemo } from "react";
import { useMockStore } from "./mock-store";
import type {
  BookingAssignmentInput,
  BookingInput,
  BookingRecord,
  BookingStatusTransitionInput,
} from "../modules/tms/booking/types";

export function useAppStore(tenantId: string) {
  const store = useMockStore();

  return useMemo(() => {
    const customers = store.listTenantCustomers(tenantId);
    const vendors = store.listTenantVendors(tenantId);
    const materials = store.listTenantMaterials(tenantId);
    const uomDefinitions = store.listTenantUOMDefinitions(tenantId);
    const uomMappings = store.listTenantUOMMappings(tenantId);
    const vehicleTypes = store.listTenantVehicleTypes(tenantId);
    const vehicles = store.listTenantVehicles(tenantId);
    const drivers = store.listTenantDrivers(tenantId);
    const lrConfigs = store.listTenantLRConfigs(tenantId);
    const users = store.listTenantUsers(tenantId);
    const addresses = customers.flatMap((customer) => store.listTenantCustomerAddresses(customer.id));
    const rateCards = customers.flatMap((customer) => store.listTenantCustomerRateCards(customer.id));
    const bookings = store.listTenantBookings(tenantId);

    return {
      customers,
      vendors,
      materials,
      uomDefinitions,
      uomMappings,
      vehicleTypes,
      lrConfigs,
      users,
      drivers,
      vehicles,
      rateCards,
      addresses,
      bookings,
      customerAddressMap: new Map(
        customers.map((customer) => [
          customer.id,
          addresses.filter((address) => address.tenantCustomerId === customer.id),
        ]),
      ),
      customerMap: new Map(customers.map((customer) => [customer.id, customer])),
      customerRateCardMap: new Map(
        customers.map((customer) => [
          customer.id,
          rateCards.filter((rateCard) => rateCard.tenantCustomerId === customer.id),
        ]),
      ),
      getCustomerById: store.getTenantCustomerById,
      getVendorById: store.getTenantVendorById,
      getVehicleById: store.getTenantVehicleById,
      getDriverById: store.getTenantDriverById,
      getBookingById: store.getTenantBookingById,
      createBooking: (
        input: Omit<BookingRecord, "id" | "bookingId" | "createdAt" | "updatedAt" | "tenantId">,
      ) =>
        store.createTenantBooking({
          tenantId,
          ...input,
        }),
      updateBooking: (bookingId: string, updates: Partial<BookingInput>) =>
        store.updateTenantBooking(bookingId, updates),
      transitionBooking: (bookingId: string, transition: BookingStatusTransitionInput) =>
        store.transitionTenantBookingStatus(bookingId, transition),
      assignBooking: (bookingId: string, input: BookingAssignmentInput) =>
        store.assignTenantBooking(bookingId, input),
    };
  }, [store, tenantId]);
}
