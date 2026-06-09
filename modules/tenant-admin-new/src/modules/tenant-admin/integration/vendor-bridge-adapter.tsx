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
import type { TenantDataBridge, VendorInvoiceSubmitPayload } from "@vendor/integration/tenant-data-bridge";
import type {
  ComplianceDocument as VendorComplianceDocument,
  Driver as VendorDriver,
  Indent as VendorIndent,
  Invoice as VendorInvoice,
  Dispute as VendorDispute,
  LaneDetails as VendorLaneDetails,
  Trip as VendorTrip,
  Vehicle as VendorVehicle,
} from "@vendor/types";

// Vendor has 2h from when an indent is sent to accept/reject it. After that the
// indent lapses and disappears from the vendor portal (tenant assigns manually).
const INDENT_SLA_MS = 2 * 60 * 60 * 1000;

// ── Booking status → Vendor Portal trip status ───────────────────────────────
// A booking carries a vendor only from VEHICLE_ASSIGNED onward (assignment time).
// Granular map so the vendor sees the booking walk through Assigned → Loading →
// In Transit → Destination instead of jumping straight to IN_TRANSIT.
const VENDOR_TRIP_STATUS: Record<string, VendorTrip["status"]> = {
  VEHICLE_ASSIGNED: "ASSIGNED",
  ASSIGNED: "ASSIGNED",
  LOADING_STARTED: "LOADING_STARTED",
  LOADING: "LOADING_STARTED",
  LOADING_COMPLETED: "LOADING_COMPLETED",
  LOADED: "LOADING_COMPLETED",
  // Vendor portal has no document states — keep these in the assignment bucket
  // until dispatch.
  DOCUMENT_PENDING: "LOADING_COMPLETED",
  DOCUMENT_COMPLETED: "LOADING_COMPLETED",
  READY_FOR_DISPATCH: "LOADING_COMPLETED",
  DISPATCHED: "IN_TRANSIT",
  IN_TRANSIT: "IN_TRANSIT",
  DELAYED: "IN_TRANSIT",
  ARRIVED: "DESTINATION_REACHED",
};
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
    getTenantVendorById,
    listTenantVendorInvoices,
    vendorSubmitInvoice,
    vendorRespondToInvoiceDispute,
    vendorCreateInvoiceResubmission,
  } = useMockStore();

  const isVendorSession = session.loginType === "VENDOR" && Boolean(session.vendorId);
  const tenantId = session.tenantId ?? "";
  const vendorId = session.vendorId ?? null;
  const vendorName = session.vendorName ?? null;
  const tenantName = (tenantId ? getTenantById(tenantId)?.name : null) ?? null;
  const tenantCode = (tenantId ? getTenantById(tenantId)?.code : null) ?? null;

  // Pull the raw shared collections (re-runs when the store changes).
  const vehicleTypes = isVendorSession ? listTenantVehicleTypes(tenantId) : [];
  const tenantVehicles = isVendorSession ? listTenantVehicles(tenantId) : [];
  const tenantDrivers = isVendorSession ? listTenantDrivers(tenantId) : [];
  const tenantBookings = isVendorSession ? listTenantBookings(tenantId) : [];
  const tenantCustomers = isVendorSession ? listTenantCustomers(tenantId) : [];
  const vendorIndents = isVendorSession ? listBookingVendorIndents(tenantId) : [];
  const allVendorInvoices = isVendorSession ? listTenantVendorInvoices(tenantId) : [];

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
    // SLA = 2h from when the indent was sent. Once it lapses the indent
    // disappears from the vendor portal entirely; the booking falls back to the
    // tenant team to assign a vehicle manually.
    const now = Date.now();
    const myPendingIndents = vendorIndents.filter(
      (i) =>
        i.vendorId === vendorId &&
        i.status === "PENDING" &&
        Date.parse(i.sentAt) + INDENT_SLA_MS > now,
    );
    const bookingIndents: VendorIndent[] = myPendingIndents
      .map((indent) => {
        const booking = bookingById.get(indent.bookingId);
        if (!booking) return null;
        return toVendorIndent(booking, customerNameById.get(booking.customerId) ?? "Customer", vtLabel(booking), indent.sentAt);
      })
      .filter((value): value is VendorIndent => value !== null);

    const bookingTrips: VendorTrip[] = [];

    // 2) Accepted (vehicle pending) — won by this vendor, no vehicle yet → status ACCEPTED.
    const myAcceptedIndents = vendorIndents.filter((i) => i.vendorId === vendorId && i.isWinner);
    for (const indent of myAcceptedIndents) {
      const booking = bookingById.get(indent.bookingId);
      if (booking && !booking.assignment?.vehicleId) {
        bookingTrips.push(toVendorTrip(booking, vtLabel(booking), "ACCEPTED", false, indent.buyingRate ?? 0));
      }
    }

    // 3) Assigned Trips — bookings already assigned to this vendor (direct or via indent).
    for (const booking of tenantBookings.filter((b) => b.assignment?.vendorId === vendorId)) {
      const status = booking.status as string;
      if (status === "EXCEPTION") bookingTrips.push(toVendorTrip(booking, vtLabel(booking), "IN_TRANSIT", true));
      else if (status === "POD_PENDING") bookingTrips.push(toVendorTrip(booking, vtLabel(booking), "POD_PENDING"));
      else if (COMPLETED_STATUSES.has(status)) bookingTrips.push(toVendorTrip(booking, vtLabel(booking), "COMPLETED"));
      else if (status === "CANCELLED") bookingTrips.push(toVendorTrip(booking, vtLabel(booking), "CANCELLED"));
      else if (VENDOR_TRIP_STATUS[status])
        bookingTrips.push(toVendorTrip(booking, vtLabel(booking), VENDOR_TRIP_STATUS[status]));
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

    const doAssign = (booking: BookingRecord, vehicle: TenantVehicle, driver: TenantDriver) => {
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
          // Buying rate from the won indent — never the customer/selling freight,
          // so the tenant's margin (customerFreight − vendorFreight) stays correct.
          vendorFreight: booking.assignment?.vendorFreight ?? wonIndent?.buyingRate ?? 0,
          customerFreight: booking.pricing?.calculatedFreight ?? null,
          actor: vendorName ?? "Vendor",
          lrType: "AUTO",
          orgUnitId: lrPlaceId,
        });
      } catch (error) {
        window.alert((error as Error).message);
      }
    };

    const assignVehicle = (bookingRef: string, vehicleId: string, driverId: string) => {
      const booking = tenantBookings.find((b) => b.bookingId === bookingRef || b.id === bookingRef);
      const vehicle = tenantVehicles.find((v) => v.id === vehicleId);
      const driver = tenantDrivers.find((d) => d.id === driverId);
      if (!booking || !vehicle || !driver) return;
      doAssign(booking, vehicle, driver);
    };

    // Like assignVehicle, but takes the full vendor-shaped vehicle/driver so a
    // local demo (mock) pick — whose id doesn't exist in tenant master data —
    // gets auto-onboarded to the tenant first, then assigned.
    const assignVehicleResolved = (
      bookingRef: string,
      vendorVehicle: VendorVehicle,
      vendorDriver: VendorDriver,
    ) => {
      const booking = tenantBookings.find((b) => b.bookingId === bookingRef || b.id === bookingRef);
      if (!booking) return;
      try {
        const vehicle =
          tenantVehicles.find((v) => v.id === vendorVehicle.id) ??
          tenantVehicles.find((v) => v.registrationNumber === vendorVehicle.registrationNumber) ??
          createTenantVehicle({
            tenantId,
            ...toTenantVehicleInput(vendorVehicle, resolveTypeId(vendorVehicle.vehicleType), vendorId, vendorName),
          });
        const driver =
          tenantDrivers.find((d) => d.id === vendorDriver.id) ??
          tenantDrivers.find((d) => d.licenseNumber && d.licenseNumber === vendorDriver.licenseNumber) ??
          createTenantDriver({ tenantId, ...toTenantDriverInput(vendorDriver, vendorId, vendorName) });
        doAssign(booking, vehicle, driver);
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
      // 3PL rule: the vendor only ever sees their OWN buying rate — never the
      // customer/selling freight or margin. Use the assigned vendor freight, or
      // the buying rate captured on this vendor's indent; never calculatedFreight.
      const myIndent = vendorIndents.find(
        (indent) => indent.bookingId === booking.id && indent.vendorId === vendorId,
      );
      const vendorBuyingRate = a?.vendorFreight ?? myIndent?.buyingRate ?? 0;
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
        freight: vendorBuyingRate,
        lrNumbers,
        documents,
      };
    };

    // ── Vendor (AP) invoices — this vendor's slice of the shared collection ──
    const myInvoiceRecords = allVendorInvoices.filter((r) => r.vendorId === vendorId);
    const vendorInvoices: VendorInvoice[] = myInvoiceRecords.map((r) => ({
      id: r.id,
      invoiceNumber: r.invoiceNumber,
      invoiceDate: r.invoiceDate,
      vendorGstin: r.vendorGstin,
      customerGstin: r.customerGstin,
      billingPeriod: r.billingPeriod ?? { from: r.invoiceDate, to: r.invoiceDate },
      paymentDueDate: r.paymentDueDate,
      lineItems: r.lineItems,
      subtotal: r.subtotal,
      gstAmount: r.gstAmount,
      grandTotal: r.grandTotal,
      status: r.status,
      closeReason: r.closeReason,
      supersedesInvoiceId: r.supersedesInvoiceId,
      supersededByInvoiceId: r.supersededByInvoiceId,
      pdfUrl: r.pdfUrl,
      tripReferences: r.tripReferences,
      createdAt: r.createdAt,
      statusUpdatedAt: r.statusUpdatedAt ?? r.createdAt,
    }));
    const vendorDisputes: VendorDispute[] = myInvoiceRecords
      .filter((r) => r.dispute)
      .map((r) => ({
        id: `DSP-${r.id}`,
        invoiceId: r.id,
        invoiceNumber: r.invoiceNumber,
        invoiceAmount: r.grandTotal,
        reason: r.dispute!.reason,
        status: r.dispute!.status,
        raisedAt: r.dispute!.raisedAt,
        updatedAt: r.dispute!.messages.at(-1)?.createdAt ?? r.dispute!.raisedAt,
        responseDueAt: r.dispute!.responseDueAt,
        messages: r.dispute!.messages,
      }));

    const vendorRec = vendorId ? getTenantVendorById(vendorId) : null;

    // Invoice-document profile the vendor PDF reads — sourced entirely from the
    // tenant-configured vendor master record (company, GST/PAN, address, bank,
    // terms, logo). Nothing is hardcoded in the portal.
    const invoiceProfile = vendorRec
      ? {
          companyName: vendorRec.name,
          companyInfo: {
            tradingName: vendorRec.name,
            legalName: vendorRec.legalName ?? vendorRec.name,
            registeredAddress: parseVendorAddress(vendorRec.address),
            gstin: vendorRec.gstin ?? vendorRec.gstNumber ?? "",
            pan: vendorRec.pan ?? "",
            primaryContact: {
              name: vendorRec.contactPerson ?? "",
              phone: vendorRec.phone ?? vendorRec.contactNumber ?? "",
              email: vendorRec.email ?? "",
            },
            serviceRegions: vendorRec.serviceableLocations ?? [],
            supportedVehicleTypes: vendorRec.supportedVehicleTypes ?? [],
          },
          bank: {
            bankName: vendorRec.bankName ?? "",
            branch: vendorRec.branch ?? "",
            accountNumber: vendorRec.accountNumber ?? "",
            ifscCode: vendorRec.ifscCode ?? "",
            accountType: vendorRec.accountType ?? "CURRENT",
          },
          terms: vendorRec.invoiceTerms ?? [],
          logoUrl: vendorRec.logoUrl,
          status: vendorRec.status,
        }
      : null;

    const submitInvoice = (payload: VendorInvoiceSubmitPayload) => {
      if (!vendorId) return;
      const now = new Date().toISOString();
      vendorSubmitInvoice({
        id: payload.invoiceNumber,
        tenantId,
        vendorId,
        vendorName: vendorName ?? "Vendor",
        invoiceNumber: payload.invoiceNumber,
        invoiceDate: payload.invoiceDate,
        paymentDueDate: payload.paymentDueDate,
        vendorGstin: vendorRec?.gstin ?? vendorRec?.gstNumber ?? "—",
        customerGstin: "27AABCU9603R1ZM",
        lineItems: payload.lineItems,
        subtotal: payload.subtotal,
        gstAmount: payload.gstAmount,
        grandTotal: payload.grandTotal,
        status: "PENDING",
        pdfUrl: `/invoices/${payload.invoiceNumber}.pdf`,
        tripReferences: payload.tripReferences,
        billingPeriod: payload.billingPeriod,
        createdAt: now,
        statusUpdatedAt: now,
      });
    };

    return {
      tenantId,
      tenantName,
      tenantCode,
      vendorId,
      vendorName,
      invoiceProfile,
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
      assignVehicleResolved,
      getBookingDetail,
      vendorInvoices,
      vendorDisputes,
      submitInvoice,
      respondToInvoiceDispute: (invoiceId: string, message: string) => vendorRespondToInvoiceDispute(invoiceId, message),
      createResubmissionInvoice: (oldInvoiceId: string, lineItems, invoiceNumber?: string) =>
        vendorCreateInvoiceResubmission(oldInvoiceId, lineItems, invoiceNumber),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isVendorSession,
    tenantId,
    tenantName,
    tenantCode,
    vendorId,
    vendorName,
    tenantVehicles,
    tenantDrivers,
    tenantBookings,
    tenantCustomers,
    vehicleTypes,
    vendorIndents,
    allVendorInvoices,
  ]);
}

// ── Mapping helpers ──────────────────────────────────────────────────────────
// The vendor master stores address as a single comma-delimited string; the
// invoice PDF wants {street, city, state, pincode}. Best-effort split: pincode
// is the 6-digit token, state/city are the last two remaining parts.
function parseVendorAddress(address?: string): { street: string; city: string; state: string; pincode: string } {
  const raw = (address ?? "").trim();
  const pincode = raw.match(/\b(\d{6})\b/)?.[1] ?? "";
  const parts = raw
    .split(",")
    .map((part) => part.replace(/\b\d{6}\b/, "").trim())
    .filter(Boolean);
  const state = parts.at(-1) ?? "";
  const city = parts.length >= 2 ? parts.at(-2)! : "";
  const street = parts.length > 2 ? parts.slice(0, -2).join(", ") : parts[0] ?? raw;
  return { street, city, state, pincode };
}

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

function toVendorIndent(
  booking: BookingRecord,
  customerName: string,
  vehicleTypeLabel: string,
  sentAt: string,
): VendorIndent {
  return {
    id: booking.bookingId,
    contractId: booking.id,
    contractReference: customerName,
    laneDetails: laneOf(booking),
    loadDetails: { commodity: "Cargo", weightKg: (booking.weight ?? 0) * 1000, volumeCbm: 0 },
    vehicleTypeRequired: vehicleTypeLabel,
    reportingDateTime: booking.pickupDate ?? booking.createdAt,
    // SLA to respond = 2h from when the indent was sent to the vendor.
    slaDeadline: new Date(Date.parse(sentAt) + INDENT_SLA_MS).toISOString(),
    status: "PENDING",
    createdAt: sentAt,
  };
}

function toVendorTrip(
  booking: BookingRecord,
  vehicleTypeLabel: string,
  status: VendorTrip["status"],
  exceptionFlag = false,
  // The vendor only ever sees their BUYING rate — never the customer/selling
  // freight or margin (3PL keeps selling price private). Before a vehicle is
  // assigned, fall back to the buying rate captured on the vendor's indent.
  buyingRateFallback = 0,
): VendorTrip {
  const assignment = booking.assignment ?? null;
  // Driver-submitted expenses approved on the booking — surfaced to the vendor.
  const approvedExpenseItems = (booking.expenses ?? []).filter((expense) => expense.status === "Approved");
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
    freightRate: assignment?.vendorFreight ?? buyingRateFallback ?? 0,
    isInvoiced: booking.isInvoiced ?? false,
    createdAt: booking.createdAt,
    expenses: approvedExpenseItems.map((expense) => ({
      id: expense.id,
      label: expense.label,
      amount: expense.amount,
      expenseType: expense.expenseType,
      paymentMode: expense.paymentMode,
      paidBy: expense.paidBy,
      status: expense.status,
      dateTime: expense.dateTime,
    })),
    approvedExpenses: approvedExpenseItems.reduce((sum, expense) => sum + (expense.amount || 0), 0),
    advance: booking.shipmentDocuments?.lr?.advance ?? 0,
  };
}
