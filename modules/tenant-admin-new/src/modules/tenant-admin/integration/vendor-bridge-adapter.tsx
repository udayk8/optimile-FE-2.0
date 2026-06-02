import { useMemo } from "react";
import { useMockStore } from "@/shared/store/mock-store";
import { useSessionContext } from "@/shared/auth/session-context";
import type {
  ComplianceStatus,
  FleetComplianceDocument,
  TenantDriver,
  TenantVehicle,
  VehicleFuelType,
} from "@/types/fleet";
import type { BookingRecord } from "@/modules/tms/booking/types";
import type { TenantDataBridge } from "@vendor/integration/tenant-data-bridge";
import type {
  ComplianceDocument as VendorComplianceDocument,
  Driver as VendorDriver,
  Indent as VendorIndent,
  LaneDetails as VendorLaneDetails,
  Trip as VendorTrip,
  Vehicle as VendorVehicle,
} from "@vendor/types";

// ── Booking status → Vendor Portal bucket ────────────────────────────────────
// A booking carries a vendor only from VEHICLE_ASSIGNED onward (assignment time).
const INDENT_STATUSES = new Set<string>(["VEHICLE_ASSIGNED", "ACCEPTED", "ASSIGNED"]);
const ACTIVE_STATUSES = new Set<string>([
  "LOADING_STARTED",
  "LOADING_COMPLETED",
  "LOADING",
  "LOADED",
  "DOCUMENT_PENDING",
  "DOCUMENT_COMPLETED",
  "READY_FOR_DISPATCH",
  "DISPATCHED",
  "IN_TRANSIT",
  "ARRIVED",
  "DELAYED",
]);
const COMPLETED_STATUSES = new Set<string>(["COMPLETED", "INVOICED", "PAID"]);

const FUEL_MAP: Record<string, VehicleFuelType> = {
  diesel: "DIESEL",
  petrol: "PETROL",
  cng: "CNG",
  lng: "LNG",
  ev: "ELECTRIC",
  electric: "ELECTRIC",
};

function mapFuelToTenant(fuel?: string): VehicleFuelType {
  return FUEL_MAP[(fuel ?? "").trim().toLowerCase()] ?? "DIESEL";
}

function mapFuelToVendor(fuel: VehicleFuelType): string {
  if (fuel === "ELECTRIC") return "EV";
  return fuel.charAt(0) + fuel.slice(1).toLowerCase();
}

function toVendorDocs(docs?: FleetComplianceDocument[]): VendorComplianceDocument[] {
  return (docs ?? []).map((doc) => ({
    id: doc.id,
    type: doc.type,
    referenceNo: doc.referenceNo,
    fileName: doc.fileName,
    fileUrl: doc.fileUrl,
    expiryDate: doc.expiryDate,
    status: doc.status,
    uploadedAt: doc.uploadedAt,
  }));
}

function toFleetDocs(docs?: VendorComplianceDocument[]): FleetComplianceDocument[] {
  return (docs ?? []).map((doc) => ({
    id: doc.id,
    type: doc.type,
    referenceNo: doc.referenceNo ?? "",
    fileName: doc.fileName,
    fileUrl: doc.fileUrl,
    expiryDate: doc.expiryDate,
    status: doc.status,
    uploadedAt: doc.uploadedAt,
  }));
}

function docByType(docs: VendorComplianceDocument[] | undefined, type: string) {
  const found = (docs ?? []).find((doc) => doc.type === type);
  return { number: found?.referenceNo ?? "", expiry: found?.expiryDate ?? "" };
}

function mapGenderToVendor(gender?: string): VendorDriver["gender"] {
  if (gender === "MALE") return "Male";
  if (gender === "FEMALE") return "Female";
  if (gender === "OTHER") return "Other";
  return undefined;
}

function mapGenderToTenant(gender?: VendorDriver["gender"]): TenantDriver["gender"] {
  if (gender === "Male") return "MALE";
  if (gender === "Female") return "FEMALE";
  if (gender === "Other") return "OTHER";
  return "";
}

// ── Adapter hook ─────────────────────────────────────────────────────────────
// Returns the bridge value for a VENDOR session, else null (internal users keep
// the existing app.store-backed embedded view; standalone keeps app.store too).
export function useVendorTenantDataBridge(): TenantDataBridge | null {
  const { session } = useSessionContext();
  const {
    listTenantVehicles,
    createTenantVehicle,
    updateTenantVehicle,
    listTenantDrivers,
    createTenantDriver,
    updateTenantDriver,
    listTenantVehicleTypes,
    listTenantBookings,
    listTenantCustomers,
    listTenantCustomerAddresses,
    listTenantLrs,
    listBookingVendorIndents,
    respondBookingVendorIndent,
    assignTenantBooking,
    getTenantById,
  } = useMockStore();

  const isVendorSession = session.loginType === "VENDOR" && Boolean(session.vendorId);
  const tenantId = session.tenantId ?? "";
  const vendorId = session.vendorId ?? null;
  const vendorName = session.vendorName ?? null;
  const tenantName = (tenantId ? getTenantById(tenantId)?.name : null) ?? null;

  // Pull the raw shared collections (re-runs when the store changes).
  const vehicleTypes = isVendorSession ? listTenantVehicleTypes(tenantId) : [];
  const tenantVehicles = isVendorSession ? listTenantVehicles(tenantId) : [];
  const tenantDrivers = isVendorSession ? listTenantDrivers(tenantId) : [];
  const tenantBookings = isVendorSession ? listTenantBookings(tenantId) : [];
  const tenantCustomers = isVendorSession ? listTenantCustomers(tenantId) : [];
  const vendorIndents = isVendorSession ? listBookingVendorIndents(tenantId) : [];

  return useMemo<TenantDataBridge | null>(() => {
    if (!isVendorSession) return null;

    const typeLabelById = new Map(vehicleTypes.map((vt) => [vt.id, vt.typeCode]));
    const typeIdByLabel = new Map(vehicleTypes.map((vt) => [vt.typeCode.trim().toLowerCase(), vt.id]));
    const fallbackTypeId = vehicleTypes[0]?.id ?? "";
    const customerNameById = new Map(tenantCustomers.map((c) => [c.id, c.name]));
    const vehicleTypeOptions = vehicleTypes.map((vt) => vt.typeCode);

    // ── Fleet (vendor-scoped) ──
    const vehicles: VendorVehicle[] = tenantVehicles
      .filter((vehicle) => vehicle.vendorId === vendorId)
      .map((vehicle) => toVendorVehicle(vehicle, typeLabelById.get(vehicle.vehicleTypeId) ?? vehicle.vehicleTypeId));

    const drivers: VendorDriver[] = tenantDrivers
      .filter((driver) => driver.vendorId === vendorId)
      .map(toVendorDriver);

    const resolveTypeId = (label: string) =>
      typeIdByLabel.get((label ?? "").trim().toLowerCase()) ?? fallbackTypeId;

    const addVehicle = (vehicle: VendorVehicle) => {
      try {
        createTenantVehicle({
          tenantId,
          ...toTenantVehicleInput(vehicle, resolveTypeId(vehicle.vehicleType), vendorId, vendorName),
        });
      } catch (error) {
        window.alert(`Unable to add vehicle: ${(error as Error).message}`);
      }
    };

    const updateVehicle = (vehicle: VendorVehicle) => {
      try {
        updateTenantVehicle(vehicle.id, toTenantVehicleInput(vehicle, resolveTypeId(vehicle.vehicleType), vendorId, vendorName));
      } catch (error) {
        window.alert(`Unable to update vehicle: ${(error as Error).message}`);
      }
    };

    const addDriver = (driver: VendorDriver) => {
      try {
        createTenantDriver({ tenantId, ...toTenantDriverInput(driver, vendorId, vendorName) });
      } catch (error) {
        window.alert(`Unable to add driver: ${(error as Error).message}`);
      }
    };

    const updateDriver = (driver: VendorDriver) => {
      try {
        updateTenantDriver(driver.id, toTenantDriverInput(driver, vendorId, vendorName));
      } catch (error) {
        window.alert(`Unable to update driver: ${(error as Error).message}`);
      }
    };

    // ── Bookings ──
    const bookingById = new Map(tenantBookings.map((b) => [b.id, b]));
    const vtLabel = (booking: BookingRecord) =>
      booking.vehicleTypeId ? typeLabelById.get(booking.vehicleTypeId) ?? "—" : "—";

    // 1) Incoming Indents — PENDING indents addressed to this vendor.
    const myPendingIndents = vendorIndents.filter((i) => i.vendorId === vendorId && i.status === "PENDING");
    const bookingIndents: VendorIndent[] = myPendingIndents
      .map((indent) => {
        const booking = bookingById.get(indent.bookingId);
        if (!booking) return null;
        return toVendorIndent(booking, customerNameById.get(booking.customerId) ?? "Customer", vtLabel(booking));
      })
      .filter((value): value is VendorIndent => value !== null);

    const bookingTrips: VendorTrip[] = [];

    // 2) Accepted (vehicle pending) — won by this vendor, no vehicle yet → status ACCEPTED.
    const myAcceptedIndents = vendorIndents.filter((i) => i.vendorId === vendorId && i.isWinner);
    for (const indent of myAcceptedIndents) {
      const booking = bookingById.get(indent.bookingId);
      if (booking && !booking.assignment?.vehicleId) {
        bookingTrips.push(toVendorTrip(booking, vtLabel(booking), "ACCEPTED"));
      }
    }

    // 3) Assigned Trips — bookings already assigned to this vendor (direct or via indent).
    for (const booking of tenantBookings.filter((b) => b.assignment?.vendorId === vendorId)) {
      const status = booking.status as string;
      if (status === "EXCEPTION") bookingTrips.push(toVendorTrip(booking, vtLabel(booking), "IN_TRANSIT", true));
      else if (status === "POD_PENDING") bookingTrips.push(toVendorTrip(booking, vtLabel(booking), "POD_PENDING"));
      else if (COMPLETED_STATUSES.has(status)) bookingTrips.push(toVendorTrip(booking, vtLabel(booking), "COMPLETED"));
      else if (status === "CANCELLED") bookingTrips.push(toVendorTrip(booking, vtLabel(booking), "CANCELLED"));
      else if (status === "VEHICLE_ASSIGNED" || ACTIVE_STATUSES.has(status))
        bookingTrips.push(toVendorTrip(booking, vtLabel(booking), "IN_TRANSIT"));
    }

    const findMyPendingIndent = (bookingRef: string) =>
      vendorIndents.find(
        (i) => i.vendorId === vendorId && i.status === "PENDING" && (i.bookingRef === bookingRef || i.bookingId === bookingRef),
      );

    const acceptBooking = (bookingRef: string) => {
      const indent = findMyPendingIndent(bookingRef);
      if (!indent) return;
      try {
        respondBookingVendorIndent(indent.id, "ACCEPT");
      } catch (error) {
        window.alert((error as Error).message);
      }
    };

    const declineBooking = (bookingRef: string) => {
      const indent = findMyPendingIndent(bookingRef);
      if (!indent) return;
      try {
        respondBookingVendorIndent(indent.id, "REJECT", "Declined by vendor");
      } catch (error) {
        window.alert((error as Error).message);
      }
    };

    const assignVehicle = (bookingRef: string, vehicleId: string, driverId: string) => {
      const booking = tenantBookings.find((b) => b.bookingId === bookingRef || b.id === bookingRef);
      const vehicle = tenantVehicles.find((v) => v.id === vehicleId);
      const driver = tenantDrivers.find((d) => d.id === driverId);
      if (!booking || !vehicle || !driver) return;
      // Vendor assignment is ALWAYS Auto LR, generated from the booking owner's
      // place (captured on the winning indent at send time). The vendor never
      // chooses an LR mode/number or touches internal LR inventory.
      const wonIndent = vendorIndents.find(
        (indent) => indent.bookingId === booking.id && indent.vendorId === vendorId && indent.isWinner,
      );
      const lrPlaceId = wonIndent?.lrPlaceId ?? null;
      try {
        assignTenantBooking(booking.id, {
          vendorId,
          vendorName: vendorName ?? "Vendor",
          vehicleId: vehicle.id,
          vehicleLabel: vehicle.registrationNumber,
          driverId: driver.id,
          driverName: driver.name,
          vendorFreight: booking.assignment?.vendorFreight ?? booking.pricing?.calculatedFreight ?? 0,
          customerFreight: booking.pricing?.calculatedFreight ?? null,
          actor: vendorName ?? "Vendor",
          lrType: "AUTO",
          orgUnitId: lrPlaceId,
        });
      } catch (error) {
        window.alert((error as Error).message);
      }
    };

    const getBookingDetail = (bookingRef: string) => {
      const booking = tenantBookings.find((b) => b.bookingId === bookingRef || b.id === bookingRef);
      if (!booking) return null;
      const addresses = listTenantCustomerAddresses(booking.customerId);
      const toParty = (addressId?: string | null) => {
        const a = addresses.find((x) => x.id === addressId);
        if (!a) return null;
        return {
          name: a.consigneeName || a.contactPersonName || a.contactPerson || a.addressName,
          address: a.fullAddress || [a.addressLine1, a.addressLine2].filter(Boolean).join(", "),
          contact: a.contactPersonName || a.contactPerson,
          phone: a.phone || a.contactNumber,
        };
      };
      const lrs = listTenantLrs(tenantId);
      const lrNumbers = Array.from(
        new Set(
          [
            ...(booking.lrIds ?? []).map((id) => lrs.find((l) => l.id === id)?.lrNumber),
            ...(booking.deliveries ?? []).map((d) => d.lrNumber),
          ].filter((n): n is string => Boolean(n)),
        ),
      );
      const documents = [
        ...lrNumbers.map((lr, i) => ({ id: `lr-${i}`, title: `LR ${lr}`, fileName: `lr-${lr}.pdf`, url: `/docs/lr-${lr}.pdf` })),
        ...(booking.documents ?? []).map((d) => ({ id: d.id, title: d.type, fileName: d.fileName, url: `/docs/${d.fileName}` })),
      ];
      const lane = laneOf(booking);
      const a = booking.assignment ?? null;
      return {
        bookingRef: booking.bookingId,
        customerName: customerNameById.get(booking.customerId) ?? "Customer",
        origin: lane.origin.city || lane.origin.name,
        destination: lane.destination.city || lane.destination.name,
        consignor: toParty(booking.consignorAddressId),
        consignee: toParty(booking.consigneeAddressId),
        qty: `${booking.quantity ?? ""} ${booking.uom ?? ""}`.trim(),
        weight: `${booking.weight ?? ""} ${booking.weightUom ?? "MT"}`.trim(),
        pickup: booking.pickupDate ?? "",
        vehicle: a?.vehicleLabel ?? "—",
        driver: a?.driverName ?? "—",
        status: booking.status,
        freight: a?.vendorFreight ?? booking.pricing?.calculatedFreight ?? 0,
        lrNumbers,
        documents,
      };
    };

    return {
      tenantId,
      tenantName,
      vendorId,
      vendorName,
      vehicles,
      drivers,
      addVehicle,
      updateVehicle,
      addDriver,
      updateDriver,
      vehicleTypeOptions,
      bookingIndents,
      bookingTrips,
      acceptBooking,
      declineBooking,
      assignVehicle,
      getBookingDetail,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isVendorSession,
    tenantId,
    tenantName,
    vendorId,
    vendorName,
    tenantVehicles,
    tenantDrivers,
    tenantBookings,
    tenantCustomers,
    vehicleTypes,
    vendorIndents,
  ]);
}

// ── Mapping helpers ──────────────────────────────────────────────────────────
function toVendorVehicle(vehicle: TenantVehicle, typeLabel: string): VendorVehicle {
  return {
    id: vehicle.id,
    registrationNumber: vehicle.registrationNumber,
    vehicleType: typeLabel,
    manufacturer: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    fuelType: mapFuelToVendor(vehicle.fuelType),
    engineNumber: vehicle.engineNumber,
    chassisNumber: vehicle.chassisNo,
    capacityKg: vehicle.capacityKg,
    baseLocation: vehicle.baseLocation ?? "",
    operationalStatus: vehicle.operationalStatus ?? (vehicle.isActive ? "ACTIVE" : "INACTIVE"),
    complianceStatus: (vehicle.complianceStatus ?? "PENDING_DOCS") as ComplianceStatus,
    complianceDocuments: toVendorDocs(vehicle.complianceDocuments),
    blackoutDates: [],
  };
}

function toTenantVehicleInput(
  vehicle: VendorVehicle,
  vehicleTypeId: string,
  vendorId: string | null,
  vendorName: string | null,
) {
  const docs = vehicle.complianceDocuments;
  return {
    registrationNumber: vehicle.registrationNumber,
    make: vehicle.manufacturer ?? "",
    model: vehicle.model ?? "",
    year: vehicle.year ?? "",
    vehicleTypeId,
    fuelType: mapFuelToTenant(vehicle.fuelType),
    ownershipType: "VENDOR" as const,
    vendorId,
    chassisNo: vehicle.chassisNumber,
    insurance: docByType(docs, "Insurance"),
    fitness: docByType(docs, "FC"),
    puc: docByType(docs, "PUC"),
    permit: { type: docByType(docs, "NationalPermit").number, expiry: docByType(docs, "NationalPermit").expiry },
    odometer: "",
    engineNumber: vehicle.engineNumber,
    capacityKg: vehicle.capacityKg,
    baseLocation: vehicle.baseLocation,
    operationalStatus: vehicle.operationalStatus,
    complianceStatus: vehicle.complianceStatus,
    complianceDocuments: toFleetDocs(docs),
    isActive: vehicle.operationalStatus === "ACTIVE",
    vendorName: vendorName ?? undefined,
    source: "VENDOR_PORTAL" as const,
    createdByLoginType: "VENDOR" as const,
    createdByVendorId: vendorId,
  };
}

function toVendorDriver(driver: TenantDriver): VendorDriver {
  const licenseClass =
    driver.licenseClasses && driver.licenseClasses.length
      ? driver.licenseClasses
      : driver.licenseType
        ? [driver.licenseType]
        : [];
  return {
    id: driver.id,
    name: driver.name,
    mobile: driver.phone,
    licenseNumber: driver.licenseNumber,
    licenseExpiry: driver.licenseExpiry,
    licenseClass,
    complianceStatus: (driver.complianceStatus ?? "PENDING_DOCS") as ComplianceStatus,
    currentStatus: driver.currentStatus ?? (driver.isActive ? "ACTIVE" : "INACTIVE"),
    complianceDocuments: toVendorDocs(driver.complianceDocuments),
    dateOfBirth: driver.dob,
    gender: mapGenderToVendor(driver.gender),
    email: driver.email,
    baseLocation: driver.baseLocation,
    aadhaarMasked: driver.aadhaarMasked,
    dlValidTillDate: driver.licenseExpiry,
    dlVerified: Boolean(driver.licenseNumber),
  };
}

function toTenantDriverInput(driver: VendorDriver, vendorId: string | null, vendorName: string | null) {
  const medical = docByType(driver.complianceDocuments, "MedicalCertificate");
  return {
    name: driver.name,
    dob: driver.dateOfBirth ?? "",
    photoUrl: null,
    phone: driver.mobile,
    address: driver.baseLocation ?? "",
    bloodGroup: "",
    licenseNumber: driver.licenseNumber,
    licenseType: driver.licenseClass?.[0] ?? "",
    licenseExpiry: driver.licenseExpiry,
    medicalExpiry: medical.expiry,
    drugTestStatus: "CLEAR" as const,
    endorsements: [],
    assignedVehicleId: null,
    vendorId,
    email: driver.email,
    gender: mapGenderToTenant(driver.gender),
    baseLocation: driver.baseLocation,
    aadhaarMasked: driver.aadhaarMasked,
    licenseClasses: driver.licenseClass,
    currentStatus: driver.currentStatus,
    complianceStatus: driver.complianceStatus,
    complianceDocuments: toFleetDocs(driver.complianceDocuments),
    mobile: driver.mobile,
    isActive: driver.currentStatus !== "INACTIVE" && driver.currentStatus !== "BLOCKED",
    vendorName: vendorName ?? undefined,
    source: "VENDOR_PORTAL" as const,
    createdByLoginType: "VENDOR" as const,
    createdByVendorId: vendorId,
  };
}

function laneOf(booking: BookingRecord): VendorLaneDetails {
  const deliveries = booking.deliveries ?? [];
  const first = deliveries[0];
  const last = deliveries[deliveries.length - 1];
  const originCity = first?.originCity ?? "";
  const destinationCity = last?.destinationCity ?? first?.destinationCity ?? "";
  return {
    origin: { name: originCity || "Origin", city: originCity, state: "" },
    destination: { name: destinationCity || "Destination", city: destinationCity, state: "" },
    distanceKm: booking.pricing?.distanceKm ?? first?.distanceKm ?? undefined,
  };
}

function toVendorIndent(booking: BookingRecord, customerName: string, vehicleTypeLabel: string): VendorIndent {
  return {
    id: booking.bookingId,
    contractId: booking.id,
    contractReference: customerName,
    laneDetails: laneOf(booking),
    loadDetails: { commodity: "Cargo", weightKg: (booking.weight ?? 0) * 1000, volumeCbm: 0 },
    vehicleTypeRequired: vehicleTypeLabel,
    reportingDateTime: booking.pickupDate ?? booking.createdAt,
    slaDeadline: booking.pickupDate ?? booking.createdAt,
    status: "PENDING",
    createdAt: booking.createdAt,
  };
}

function toVendorTrip(
  booking: BookingRecord,
  vehicleTypeLabel: string,
  status: VendorTrip["status"],
  exceptionFlag = false,
): VendorTrip {
  const assignment = booking.assignment ?? null;
  return {
    id: booking.bookingId,
    contractId: booking.id,
    indentId: booking.bookingId,
    laneDetails: laneOf(booking),
    assignedVehicle: {
      id: assignment?.vehicleId ?? "",
      registrationNumber: assignment?.vehicleLabel ?? "—",
      type: vehicleTypeLabel,
    },
    assignedDriver: { id: assignment?.driverId ?? "", name: assignment?.driverName ?? "—", mobile: "" },
    status,
    slaFlag: status === "IN_TRANSIT" ? "ON_TIME" : undefined,
    exceptionFlag,
    freightRate: assignment?.vendorFreight ?? 0,
    expenseSummary: { total: 0, approved: 0, pending: 0 },
    isInvoiced: booking.isInvoiced ?? false,
    createdAt: booking.createdAt,
  };
}
