import { useMemo } from "react";
import { useMockStore } from "@tms-booking/shared/store/mock-store";
import type {
  BookingAssignmentInput,
  BookingInput,
  BookingVehicleReplacementInput,
  BookingVehicleReplacementVendorActionInput,
  BookingReassignmentInput,
  BookingRecord,
  BookingStatusTransitionInput,
  TenantLrAllocationRequestRecord,
  TenantLrPoolRecord,
  TenantLrRecord,
  TenantLrTransferRecord,
  TenantInvoiceRecord,
} from "@/modules/tms/booking/types";

export function useAppStore(tenantId: string) {
  const store = useMockStore();

  return useMemo(() => {
    const customers = store.listTenantCustomers(tenantId);
    const vendors = store.listTenantVendors(tenantId);
    const vendorRateCards = vendors.flatMap((vendor) => store.listTenantVendorRateCards(vendor.id));
    const materials = store.listTenantMaterials(tenantId);
    const uomDefinitions = store.listTenantUOMDefinitions(tenantId);
    const uomMappings = store.listTenantUOMMappings(tenantId);
    const vehicleTypes = store.listTenantVehicleTypes(tenantId);
    const vehicles = store.listTenantVehicles(tenantId);
    const drivers = store.listTenantDrivers(tenantId);
    const lrConfigs = store.listTenantLRConfigs(tenantId);
    const lrPools = store.listTenantLrPools(tenantId);
    const lrs = store.listTenantLrs(tenantId);
    const lrRequests = store.listTenantLrRequests(tenantId);
    const lrTransfers = store.listTenantLrTransfers(tenantId);
    const auditLogs = store.platformAuditLogs.filter((item) => item.tenantId === tenantId);
    const users = store.listTenantUsers(tenantId);
    const addresses = customers.flatMap((customer) => store.listTenantCustomerAddresses(customer.id));
    const rateCards = customers.flatMap((customer) => store.listTenantCustomerRateCards(customer.id));
    const bookings = store.listTenantBookings(tenantId);
    const invoices = store.listTenantInvoices(tenantId);

    return {
      customers,
      vendors,
      vendorRateCards,
      materials,
      uomDefinitions,
      uomMappings,
      vehicleTypes,
      lrConfigs,
      lrPools,
      lrs,
      lrRequests,
      lrTransfers,
      auditLogs,
      users,
      drivers,
      vehicles,
      rateCards,
      addresses,
      bookings,
      invoices,
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
      vendorRateCardMap: new Map(
        vendors.map((vendor) => [
          vendor.id,
          vendorRateCards.filter((rateCard) => rateCard.tenantVendorId === vendor.id),
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
      reassignBooking: (bookingId: string, input: BookingReassignmentInput) =>
        store.reassignTenantBooking(bookingId, input),
      replaceBookingVehicle: (bookingId: string, input: BookingVehicleReplacementInput) =>
        store.replaceTenantBookingVehicle(bookingId, input),
      actionBookingVehicleReplacement: (bookingId: string, input: BookingVehicleReplacementVendorActionInput) =>
        store.actionTenantBookingVehicleReplacement(bookingId, input),
      createInvoice: (input: TenantInvoiceRecord) => store.createTenantInvoice(input),
      listLrPools: () => store.listTenantLrPools(tenantId),
      upsertLrPools: (records: TenantLrPoolRecord[]) =>
        store.upsertTenantLrPools(records),
      createLrs: (records: TenantLrRecord[]) => store.createTenantLrs(records),
      listLrRequests: () => store.listTenantLrRequests(tenantId),
      createLrRequest: (input: Omit<TenantLrAllocationRequestRecord, "id" | "createdAt" | "updatedAt"> & { tenantId: string }) =>
        store.createTenantLrRequest(input),
      approveLrRequest: (
        requestId: string,
        approvedCount: number,
        actor: string,
        note?: string,
      ) => store.approveTenantLrRequest(requestId, approvedCount, actor, note),
      rejectLrRequest: (requestId: string, actor: string, note?: string) =>
        store.rejectTenantLrRequest(requestId, actor, note),
      listLrTransfers: () => store.listTenantLrTransfers(tenantId),
      createLrTransfer: (input: Omit<TenantLrTransferRecord, "id" | "createdAt" | "updatedAt"> & { tenantId: string }) =>
        store.createTenantLrTransfer(input),
      completeLrTransfer: (transferId: string, actor: string, note?: string) =>
        store.completeTenantLrTransfer(transferId, actor, note),
      appendAuditLog: (input: Parameters<typeof store.appendPlatformAuditLog>[0]) =>
        store.appendPlatformAuditLog(input),
      syncLrsForBooking: (bookingId: string, status: BookingRecord["status"]) =>
        store.syncTenantLrsForBooking(bookingId, status),
    };
  }, [store, tenantId]);
}

