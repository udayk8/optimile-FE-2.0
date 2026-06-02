import { useMemo } from "react";
import { useMockStore } from "@/shared/store/mock-store";
import { useSessionContext } from "@/shared/auth/session-context";
// Import the SAME local booking page TenantAdminApp routes to (relative path,
// not the @/modules/tms alias which resolves to the standalone tms copy whose
// MockStoreProvider isn't mounted in the tenant shell — that caused a crash).
import { CreateBookingPage } from "../../tms/booking/CreateBooking";
import type { BookingRecord, BookingStatus } from "@/modules/tms/booking/types";
import type {
  CustomerAddressOption,
  CustomerBookingStatus,
  CustomerBookingView,
  CustomerDataBridge,
  CustomerMaterialOption,
  CustomerVehicleTypeOption,
} from "@customer/integration/customer-data-bridge";

// ── Internal booking lifecycle → customer-facing status ──────────────────────
// The customer never sees internal assignment sub-states; they collapse into a
// small, friendly set. (Same shared store, just a safe projection.)
const STATUS_VIEW: Record<BookingStatus, CustomerBookingStatus> = {
  DRAFT: "DRAFT",
  PENDING_RATE_APPROVAL: "PENDING_RATE_APPROVAL",
  PENDING_ASSIGNMENT: "PENDING_ASSIGNMENT",
  ACCEPTED: "PENDING_ASSIGNMENT",
  VEHICLE_ASSIGNED: "PENDING_ASSIGNMENT",
  ASSIGNED: "PENDING_ASSIGNMENT",
  LOADING_STARTED: "READY_FOR_DISPATCH",
  LOADING_COMPLETED: "READY_FOR_DISPATCH",
  DOCUMENT_PENDING: "READY_FOR_DISPATCH",
  DOCUMENT_COMPLETED: "READY_FOR_DISPATCH",
  LOADING: "READY_FOR_DISPATCH",
  LOADED: "READY_FOR_DISPATCH",
  READY_FOR_DISPATCH: "READY_FOR_DISPATCH",
  DISPATCHED: "DISPATCHED",
  IN_TRANSIT: "IN_TRANSIT",
  POD_PENDING: "IN_TRANSIT",
  ARRIVED: "IN_TRANSIT",
  DELAYED: "IN_TRANSIT_DELAYED",
  EXCEPTION: "IN_TRANSIT_EXCEPTION",
  DISPUTED: "IN_TRANSIT_EXCEPTION",
  COMPLETED: "DELIVERED",
  INVOICED: "DELIVERED",
  PAID: "DELIVERED",
  CANCELLED: "CANCELLED",
};

const STATUS_PROGRESS: Record<CustomerBookingStatus, number> = {
  DRAFT: 5,
  PENDING_RATE_APPROVAL: 12,
  PENDING_AUCTION: 18,
  PENDING_ASSIGNMENT: 24,
  READY_FOR_DISPATCH: 40,
  DISPATCHED: 55,
  IN_TRANSIT: 70,
  IN_TRANSIT_DELAYED: 62,
  IN_TRANSIT_EXCEPTION: 58,
  DELIVERED: 100,
  CANCELLED: 0,
};

function fmt(iso: string | null | undefined): string {
  if (!iso) return "-";
  // Render the stored ISO timestamp without pulling in a date library.
  return iso.slice(0, 16).replace("T", " ");
}

export function useCustomerTenantDataBridge(): CustomerDataBridge | null {
  const store = useMockStore();
  const { session } = useSessionContext();

  return useMemo<CustomerDataBridge | null>(() => {
    const tenantId = session.tenantId;
    const customerId = session.customerId;
    // Only a real CUSTOMER portal session is scoped to one customer. Internal
    // (tenant-admin) previews have no customerId → bridge stays null and the
    // dashboard shows its standalone demo data.
    if (session.loginType !== "CUSTOMER" || !tenantId || !customerId) {
      return null;
    }

    const customerName = session.customerName ?? store.getTenantCustomerById(customerId)?.name ?? "Customer";
    const tenantName = store.getTenantById(tenantId)?.name ?? null;

    const addressRecords = store.listTenantCustomerAddresses(customerId);
    const addressById = new Map(addressRecords.map((a) => [a.id, a]));
    const materials = store.listTenantMaterials(tenantId);
    const materialById = new Map(materials.map((m) => [m.id, m]));

    const cityOf = (addressId: string | null | undefined) => {
      if (!addressId) return "-";
      const a = addressById.get(addressId);
      return a ? `${a.city}` : "-";
    };
    const nameOf = (addressId: string | null | undefined) => {
      if (!addressId) return "-";
      const a = addressById.get(addressId);
      return a ? a.addressName : "-";
    };

    function toView(record: BookingRecord): CustomerBookingView {
      const status = STATUS_VIEW[record.status] ?? "PENDING_RATE_APPROVAL";
      const firstDelivery = record.deliveries?.[0] ?? null;
      const materialName = record.materialIds?.[0]
        ? materialById.get(record.materialIds[0])?.description ?? "-"
        : "-";
      const createdByPortal =
        record.createdBy === customerName ||
        record.remarks?.some((r) => /customer portal/i.test(r.message ?? ""));
      const timeline = (record.statusTimeline ?? []).map((event, index, arr) => ({
        label: event.note?.trim() || event.status,
        time: fmt(event.timestamp),
        state:
          status === "DELIVERED"
            ? ("done" as const)
            : index === arr.length - 1
              ? ("current" as const)
              : ("done" as const),
      }));
      return {
        id: record.bookingId,
        salesOrder: record.poNumber ?? record.doNumber ?? record.bookingId,
        status,
        origin: cityOf(record.sourceAddressId),
        destination: cityOf(record.destinationAddressId),
        consignee: nameOf(record.consigneeAddressId),
        vehicle: record.assignment?.vehicleLabel ?? "-",
        driver: record.assignment?.driverName ?? (status === "PENDING_ASSIGNMENT" ? "Masked until assigned" : "-"),
        driverPhone: "-",
        weight: record.weight ?? 0,
        material: materialName,
        quantity: `${record.quantity ?? 0} ${record.uom ?? ""}`.trim(),
        eta: firstDelivery?.eta ?? "-",
        bookingDate: fmt(record.createdAt),
        createdBy: createdByPortal ? "Customer" : record.createdBy?.toLowerCase().includes("ops") ? "Ops" : "ERP",
        freight: record.pricing?.calculatedFreight ?? 0,
        lrNumber: firstDelivery?.lrNumber ?? record.lrIds?.[0] ?? "-",
        progress: STATUS_PROGRESS[status] ?? 0,
        lastUpdate: fmt(record.updatedAt),
        avgSpeed: 0,
        distanceKm: record.pricing?.distanceKm ?? firstDelivery?.distanceKm ?? 0,
        consigneeLink: "Not sent",
        loadStops: (record.deliveries ?? []).map((d) => ({
          destination: d.destinationCity ?? cityOf(d.destinationAddressId),
          material: materialById.get(d.materialId)?.description ?? materialName,
          quantity: `${d.quantity ?? 0} ${d.uom ?? ""}`.trim(),
          weight: d.weight ?? 0,
          tat: "-",
          pod: d.pod ? "Captured" : "Pending",
        })),
        timeline,
      };
    }

    const bookings = store
      .listTenantBookings(tenantId)
      .filter((b) => b.customerId === customerId)
      .map(toView);

    const addresses: CustomerAddressOption[] = addressRecords.map((a) => ({
      id: a.id,
      label: a.addressName,
      city: a.city,
      usage: a.addressUsage ?? "BOTH",
    }));
    const materialOptions: CustomerMaterialOption[] = materials
      .filter((m) => m.status === "active" && (m.mappedCustomerIds.length === 0 || m.mappedCustomerIds.includes(customerId)))
      .map((m) => ({ id: m.id, label: m.description, uom: m.uom }));
    const vehicleTypes: CustomerVehicleTypeOption[] = store
      .listTenantVehicleTypes(tenantId)
      .filter((v) => v.status === "active")
      .map((v) => ({ id: v.id, label: v.typeCode }));

    return {
      tenantId,
      tenantName,
      customerId,
      customerName,
      bookings,
      getBookingById: (id) => {
        const record = store.getTenantBookingById(id);
        if (!record || record.customerId !== customerId) return null;
        return toView(record);
      },
      addresses,
      materials: materialOptions,
      vehicleTypes,
      createBooking: (input) => {
        const now = new Date().toISOString();
        const originCity = cityOf(input.originAddressId);
        const destinationCity = cityOf(input.destinationAddressId);
        const created = store.createTenantBooking({
          tenantId,
          customerId,
          modeOfTransport: "ROAD",
          numberOfDeliveries: 1,
          materialIds: [input.materialId],
          sourceAddressId: input.originAddressId,
          destinationAddressId: input.destinationAddressId,
          consignorAddressId: input.originAddressId,
          consigneeAddressId: input.destinationAddressId,
          laneKey: null,
          laneFound: false,
          poNumber: null,
          doNumber: null,
          ewayBillNumber: null,
          pickupDate: input.pickupDate,
          pickupTime: null,
          tat: null,
          serviceType: "FTL",
          commercialType: "SPOT",
          pricing: {
            rateType: "PER_TRIP",
            contractRateCardId: null,
            l1Rate: null,
            enteredRate: 0,
            calculatedFreight: 0,
            distanceKm: null,
            deviationPercent: 0,
            approvalLevel: "AUTO",
            deviationRemark: null,
            isAutoApproved: false,
          },
          chargeType: null,
          subBrand: null,
          quantity: input.quantity,
          weight: input.weight,
          uom: input.uom,
          weightUom: input.uom,
          vehicleTypeId: input.vehicleTypeId,
          lrType: "MANUAL",
          manualLrPoolPreference: "GENERAL",
          // Customer-created bookings enter the normal lifecycle at rate
          // approval so the internal Operations team picks them up.
          status: "PENDING_RATE_APPROVAL",
          opsRemark: null,
          pod: null,
          documents: [],
          expenses: [],
          deliveries: [
            {
              id: `delivery-${Math.random().toString(36).slice(2, 9)}`,
              deliveryNo: 1,
              trackingId: "",
              originCity,
              originAddressId: input.originAddressId,
              destinationCity,
              destinationAddressId: input.destinationAddressId,
              destinationAddressSource: "SAVED_ADDRESS",
              consigneeFinalizationStatus: "CONFIRMED",
              materialId: input.materialId,
              quantity: input.quantity,
              uom: input.uom,
              weight: input.weight,
              weightUom: input.uom,
              distanceKm: null,
              status: "PENDING_RATE_APPROVAL",
              lrNumber: null,
              pod: null,
            },
          ],
          assignment: null,
          remarks: [
            {
              id: `booking-remark-${Date.now()}-portal`,
              timestamp: now,
              actor: customerName,
              type: "OPS_REMARK",
              message: `Created via Customer Portal${input.specialInstructions ? ` — ${input.specialInstructions}` : ""}`,
            },
          ],
          statusTimeline: [
            { id: `booking-status-${Date.now()}-draft`, status: "DRAFT", timestamp: now, actor: customerName, note: "Booking created via Customer Portal." },
            { id: `booking-status-${Date.now()}-routed`, status: "PENDING_RATE_APPROVAL", timestamp: now, actor: "System", note: "Routed to operations for rate approval." },
          ],
          createdBy: customerName,
        });
        return created.bookingId;
      },
      // Reuse the exact internal Create Booking page, locked to this customer
      // (no customer selector). Rendered inside the tenant route subtree, so it
      // has the router/tenant/store contexts it needs.
      renderCreateBooking: (onCreated) => (
        <CreateBookingPage lockedCustomerId={customerId} createdByLabel={customerName} onAfterSubmit={onCreated} />
      ),
    };
  }, [store, session.loginType, session.tenantId, session.customerId, session.customerName]);
}
