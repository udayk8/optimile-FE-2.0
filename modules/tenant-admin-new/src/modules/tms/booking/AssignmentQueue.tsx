import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { DataTable } from "@/shared/components/common/data-table";
import { PageHeader } from "@/shared/components/common/page-header";
import { TenantSummaryCard } from "@/modules/tenant-admin/components/tenant-primitives";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { useSessionContext } from "@/shared/auth/session-context";
import { useMockStore } from "@/shared/store/mock-store";
import { computeAutoLrPlaceInventory } from "@/modules/tenant-admin/lib/auto-lr";
import { useTenantOrgUnits } from "@/modules/tenant-admin/hooks/useTenantOrgUnits";
import { useTenantAccess } from "@/modules/tenant-admin/hooks/useTenantAccess";
import { resolveManualLrScopedOrgUnits } from "@/shared/lib/manual-lr-scope";
import { getAssignmentModeLabel, getCommercialModeLabel } from "@/shared/lib/tenant-config";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { BookingStatusBadge } from "@/modules/tms/booking/components/BookingStatusBadge";
import { useBookingAdminSources } from "./hooks/useBookingAdminSources";
import { useTenantBookings } from "./hooks/useTenantBookings";
import {
  calculateMarginAmount,
  calculateMarginPercent,
  getPrimaryBookingStatus,
} from "@/modules/tms/booking/services/booking-engine";
import { normalizeRateMatchingConfig } from "@/shared/lib/rate-matching-config";
import {
  buildCustomerLookup,
  buildVendorLookup,
  buildVehicleLookup,
  calculateVendorFreightFromRateCard,
  getVendorRateCardUnitRate,
  validateVendorRateCard,
} from "@/modules/tms/booking/services/booking-selectors";

const OWN_FLEET_VENDOR = "__OWN_FLEET__";

export function AssignmentQueuePage() {
  const { tenant } = useTenantRouteContext();
  const { session, setSession } = useSessionContext();
  const access = useTenantAccess();
  const { data: bookings, assignBooking } = useTenantBookings(tenant.id);
  const { data: orgUnits } = useTenantOrgUnits(tenant.id);
  const adminSources = useBookingAdminSources(tenant.id);
  const { sendBookingVendorIndent, listBookingVendorIndents, listTenantLrs, listTenantLrRequests } = useMockStore();
  const indents = listBookingVendorIndents(tenant.id);
  const customerMap = useMemo(() => buildCustomerLookup(adminSources.customers), [adminSources.customers]);
  const vehicleMap = useMemo(() => buildVehicleLookup(adminSources.vehicles), [adminSources.vehicles]);
  const vendorMap = useMemo(() => buildVendorLookup(adminSources.vendors), [adminSources.vendors]);
  // Bookings still awaiting a vehicle: raw PENDING_ASSIGNMENT plus vendor-accepted
  // bookings whose vehicle isn't assigned yet. Anything already vehicle-assigned
  // (or further along) drops out of the assignment queue.
  const queue = bookings.filter(
    (booking) =>
      getPrimaryBookingStatus(booking.status) === "PENDING_ASSIGNMENT" && !booking.assignment?.vehicleId,
  );
  const currentUser =
    adminSources.users.find((user) => user.name === session.actorName || user.email === session.actorName) ?? null;
  const currentUserOrgUnitIds = currentUser?.orgUnitIds ?? [];
  const [assigningBookingId, setAssigningBookingId] = useState<string | null>(null);
  // Contract Vendor (auto-match + comparison) vs Manual Assignment. Default Contract.
  const [assignMethod, setAssignMethod] = useState<"CONTRACT" | "MANUAL">("CONTRACT");
  const [vendorId, setVendorId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [vendorFreight, setVendorFreight] = useState("");
  const [vendorFreightSource, setVendorFreightSource] = useState<"RATE_CARD" | "MANUAL">("MANUAL");
  const [vendorRateWarning, setVendorRateWarning] = useState("");
  const [matchedVendorRateCardId, setMatchedVendorRateCardId] = useState<string | null>(null);
  const [matchedVendorRateType, setMatchedVendorRateType] = useState<"PER_TRIP" | "PER_KM" | "PER_MT" | null>(null);
  const [buyingRateLabel, setBuyingRateLabel] = useState<string | null>(null);
  const [preferredLrNumber, setPreferredLrNumber] = useState("");
  const [selectedLrMode, setSelectedLrMode] = useState<"MANUAL" | "PRE_GENERATED" | "AUTO">("MANUAL");

  const assigningBooking = queue.find((booking) => booking.id === assigningBookingId) ?? null;
  const selectedVehicle = vehicleId ? vehicleMap.get(vehicleId) ?? null : null;
  const customerFreight = assigningBooking?.pricing.calculatedFreight ?? 0;
  const marginAmount = calculateMarginAmount(customerFreight, Number(vendorFreight || 0));
  const normalizedVendorId = vendorId === OWN_FLEET_VENDOR ? null : vendorId || null;
  const availableVehicles = adminSources.vehicles.filter((vehicle) => {
    if (!vehicle.isActive || !vendorId) {
      return false;
    }
    return vendorId === OWN_FLEET_VENDOR ? !vehicle.vendorId : vehicle.vendorId === vendorId;
  });
  const availableDrivers = adminSources.drivers.filter((driver) => {
    if (!driver.isActive || !vendorId || !selectedVehicle) {
      return false;
    }
    const driverVendorId = driver.vendorId ?? null;
    return vendorId === OWN_FLEET_VENDOR ? driverVendorId === null : driverVendorId === vendorId;
  });
  // Diagnostic: surface the exact counts and filter inputs the assignment
  // page is reading so we can tell at a glance whether the store has the
  // tenant's vendors/vehicles/drivers and which filter step is dropping
  // them. Triggers whenever the user opens the assign dialog or picks a
  // vendor. Safe to remove once the issue is confirmed fixed.
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[ASSIGNMENT SOURCES]", {
      tenantId: tenant.id,
      sessionActor: session.actorName,
      currentUserId: currentUser?.id ?? null,
      activeTenantOrgUnitId: session.activeTenantOrgUnitId ?? null,
      vendorsTotal: adminSources.vendors.length,
      vendorsActive: adminSources.vendors.filter((v) => v.status === "active").length,
      vehiclesTotal: adminSources.vehicles.length,
      vehiclesActive: adminSources.vehicles.filter((v) => v.isActive).length,
      driversTotal: adminSources.drivers.length,
      driversActive: adminSources.drivers.filter((d) => d.isActive).length,
      sampleVendor: adminSources.vendors[0] && {
        id: adminSources.vendors[0].id,
        tenantId: adminSources.vendors[0].tenantId,
        name: adminSources.vendors[0].name,
        status: adminSources.vendors[0].status,
      },
      sampleVehicle: adminSources.vehicles[0] && {
        id: adminSources.vehicles[0].id,
        tenantId: adminSources.vehicles[0].tenantId,
        vendorId: adminSources.vehicles[0].vendorId,
        isActive: adminSources.vehicles[0].isActive,
        registrationNumber: adminSources.vehicles[0].registrationNumber,
      },
      sampleDriver: adminSources.drivers[0] && {
        id: adminSources.drivers[0].id,
        tenantId: adminSources.drivers[0].tenantId,
        vendorId: adminSources.drivers[0].vendorId,
        isActive: adminSources.drivers[0].isActive,
        name: adminSources.drivers[0].name,
      },
      currentlySelectedVendorId: vendorId || null,
      availableVehiclesAfterFilter: availableVehicles.length,
      availableDriversAfterFilter: availableDrivers.length,
    });
  }, [
    tenant.id,
    session.actorName,
    session.activeTenantOrgUnitId,
    currentUser?.id,
    adminSources.vendors,
    adminSources.vehicles,
    adminSources.drivers,
    vendorId,
    availableVehicles.length,
    availableDrivers.length,
  ]);
  const marginPercent = calculateMarginPercent(customerFreight, Number(vendorFreight || 0));

  // Shared booking payload used for BOTH the auto-fill effect and the Contract
  // Vendor comparison — source/dest, vehicle type, material, weight, distance.
  const bookingMatchContext = useMemo(() => {
    if (!assigningBooking) return null;
    const customerAddresses = adminSources.customerAddressMap.get(assigningBooking.customerId) ?? [];
    const sourceAddress = customerAddresses.find((address) => address.id === assigningBooking.sourceAddressId) ?? null;
    const destinationAddress =
      customerAddresses.find((address) => address.id === assigningBooking.destinationAddressId) ?? null;
    const vehicleTypeCode = assigningBooking.vehicleTypeId
      ? adminSources.vehicleTypes.find((vehicleType) => vehicleType.id === assigningBooking.vehicleTypeId)?.typeCode ?? null
      : null;
    const materialCode =
      (assigningBooking.materialIds ?? [])
        .map((id) => adminSources.materials.find((material) => material.id === id)?.materialCode)
        .find(Boolean) ?? null;
    const distanceKm =
      assigningBooking.deliveries?.reduce((max, delivery) => Math.max(max, Number(delivery.distanceKm || 0)), 0) ??
      Number(assigningBooking.pricing.distanceKm || 0);
    const weight = Number(assigningBooking.weight || 0);
    return { sourceAddress, destinationAddress, vehicleTypeCode, materialCode, distanceKm, weight };
  }, [adminSources.customerAddressMap, adminSources.vehicleTypes, adminSources.materials, assigningBooking]);

  // Match one vendor's contract using the SAME engine (the vendor's own config).
  function matchVendorContract(vendorRecordId: string) {
    if (!assigningBooking || !bookingMatchContext) return null;
    const vendorRateCards = adminSources.vendorRateCardMap.get(vendorRecordId) ?? [];
    if (!vendorRateCards.length) return null;
    const config = normalizeRateMatchingConfig(vendorMap.get(vendorRecordId)?.rateMatchingConfig);
    const ctx = bookingMatchContext;
    const candidateRateTypes: Array<"PER_MT" | "PER_KM" | "PER_TRIP"> = [
      assigningBooking.pricing.rateType,
      "PER_MT",
      "PER_TRIP",
      "PER_KM",
    ].filter((value, index, array) => array.indexOf(value) === index) as Array<"PER_MT" | "PER_KM" | "PER_TRIP">;
    const matched =
      candidateRateTypes
        .map((rateType) =>
          validateVendorRateCard(
            {
              bookingDate: assigningBooking.pickupDate ?? null,
              rateMatchingConfig: config,
              fromCity: ctx.sourceAddress?.city ?? null,
              toCity: ctx.destinationAddress?.city ?? null,
              fromLocation: ctx.sourceAddress?.addressName ?? null,
              toLocation: ctx.destinationAddress?.addressName ?? null,
              fromPincode: ctx.sourceAddress?.pincode ?? null,
              toPincode: ctx.destinationAddress?.pincode ?? null,
              vehicleType: ctx.vehicleTypeCode,
              material: ctx.materialCode,
              rateType,
            },
            vendorRateCards,
          ),
        )
        .find(Boolean) ?? null;
    if (!matched) return null;
    const freight = calculateVendorFreightFromRateCard({
      rateCard: matched,
      weight: ctx.weight,
      distanceKm: ctx.distanceKm,
    });
    return { rateCard: matched, freight };
  }

  // Contract Vendor comparison — every vendor with a matching contract, cheapest first.
  const vendorComparison = useMemo(() => {
    if (!assigningBooking || !bookingMatchContext) return [];
    return adminSources.vendors
      .filter((vendor) => vendor.status === "active")
      .map((vendor) => {
        const match = matchVendorContract(vendor.id);
        if (!match) return null;
        return {
          vendorId: vendor.id,
          vendorName: vendor.name,
          rateType: match.rateCard.rateType,
          vendorFreight: match.freight,
          marginAmount: calculateMarginAmount(customerFreight, match.freight),
          marginPercent: calculateMarginPercent(customerFreight, match.freight),
          rateCardId: match.rateCard.id,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .sort((a, b) => a.vendorFreight - b.vendorFreight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminSources.vendors, adminSources.vendorRateCardMap, bookingMatchContext, assigningBooking, customerFreight]);

  const selectedLrConfig = useMemo(
    () =>
      adminSources.lrConfigs.find((config) => config.status === "active" && config.lrType === "MANUAL") ??
      adminSources.lrConfigs.find((config) => config.lrType === "MANUAL") ??
      null,
    [adminSources.lrConfigs],
  );
  const selectedAutoLrConfig = useMemo(
    () =>
      adminSources.lrConfigs.find((config) => config.status === "active" && config.lrType === "AUTO") ??
      adminSources.lrConfigs.find((config) => config.lrType === "AUTO") ??
      null,
    [adminSources.lrConfigs],
  );
  const selectedAssignmentLrConfig = selectedLrMode === "AUTO" ? selectedAutoLrConfig : selectedLrConfig;
  const availableLrOrgUnits = useMemo(
    () =>
      resolveManualLrScopedOrgUnits({
        orgUnits,
        assignedOrgUnitIds: currentUserOrgUnitIds,
        ownershipLevelId: selectedLrConfig?.ownershipLevelId ?? null,
        config: selectedAssignmentLrConfig,
        activeOrgUnitId: session.activeTenantOrgUnitId,
      }),
    [currentUserOrgUnitIds, orgUnits, selectedAssignmentLrConfig, session.activeTenantOrgUnitId],
  );
  const activeLrOrgUnitId =
    session.activeTenantOrgUnitId &&
    availableLrOrgUnits.some((orgUnit) => orgUnit.id === session.activeTenantOrgUnitId)
      ? session.activeTenantOrgUnitId
      : availableLrOrgUnits.length === 1
        ? availableLrOrgUnits[0].id
        : "";
  const activeLrOrgUnit = activeLrOrgUnitId
    ? availableLrOrgUnits.find((orgUnit) => orgUnit.id === activeLrOrgUnitId) ?? null
    : null;
  // Auto LR derived inventory for the active place (available = approved − generated).
  const autoLrInventory =
    selectedAutoLrConfig && activeLrOrgUnitId
      ? computeAutoLrPlaceInventory({
          config: selectedAutoLrConfig,
          placeId: activeLrOrgUnitId,
          orgUnits,
          requests: listTenantLrRequests(tenant.id).filter((request) => request.configId === selectedAutoLrConfig.id),
          generatedRecords: listTenantLrs(tenant.id).filter((record) => record.configId === selectedAutoLrConfig.id),
        })
      : null;
  const autoLrBlocked = selectedLrMode === "AUTO" && (autoLrInventory?.availableCount ?? 0) <= 0;
  const requiresActiveLrScope = availableLrOrgUnits.length > 1 && !activeLrOrgUnitId;
  const availableManualPools = useMemo(() => {
    if (!selectedLrConfig) {
      if (selectedLrMode === "AUTO") {
        return [];
      }
      return [];
    }
    const bookingCustomerId = assigningBooking?.customerId ?? null;
    const scopedPools = adminSources.lrPools.filter(
      (pool) =>
        pool.tenantId === tenant.id &&
        pool.configId === selectedLrConfig.id &&
        ["AVAILABLE", "ALLOCATED"].includes(pool.status) &&
        (!activeLrOrgUnitId || (pool.currentPlaceId ?? pool.ownerPlaceId ?? pool.ownerLevelId) === activeLrOrgUnitId),
    );
    if (selectedLrMode === "PRE_GENERATED") {
      return scopedPools.filter(
        (pool) => (pool.poolType ?? (pool.customerId ? "CUSTOMER_RESERVED" : "GENERAL")) === "CUSTOMER_RESERVED" && pool.customerId === bookingCustomerId,
      );
    }
    return scopedPools.filter(
      (pool) => (pool.poolType ?? (pool.customerId ? "CUSTOMER_RESERVED" : "GENERAL")) === "GENERAL" && !pool.customerId,
    );
  }, [activeLrOrgUnitId, adminSources.lrPools, assigningBooking?.customerId, availableLrOrgUnits, selectedLrConfig, selectedLrMode, tenant.id]);
  const canUseAutoLr = Boolean(selectedAutoLrConfig);
  const canUseManualLr = Boolean(selectedLrConfig);

  function applyBookingLrPreference() {
      if (!assigningBooking) {
        setSelectedLrMode(selectedAutoLrConfig ? "AUTO" : "MANUAL");
        return;
      }
      if (assigningBooking.lrType === "AUTO") {
        setSelectedLrMode("AUTO");
        return;
      }
      setSelectedLrMode(assigningBooking.manualLrPoolPreference === "PRE_GENERATED" ? "PRE_GENERATED" : "MANUAL");
    }

  function resetDialog() {
    setAssigningBookingId(null);
    setAssignMethod("CONTRACT");
    setVendorId("");
    setVehicleId("");
    setDriverId("");
    setVendorFreight("");
    setVendorFreightSource("MANUAL");
    setVendorRateWarning("");
      setMatchedVendorRateCardId(null);
      setMatchedVendorRateType(null);
      setBuyingRateLabel(null);
      setPreferredLrNumber("");
      applyBookingLrPreference();
  }

  useEffect(() => {
    setPreferredLrNumber((current) =>
      current && availableManualPools.some((pool) => pool.lrNumber === current)
        ? current
        : availableManualPools[0]?.lrNumber ?? "",
    );
  }, [availableManualPools]);
  useEffect(() => {
    if (assigningBookingId) {
      applyBookingLrPreference();
    }
  }, [assigningBooking, assigningBookingId, selectedAutoLrConfig]);

  useEffect(() => {
    if (!assigningBooking || !vendorId || vendorId === OWN_FLEET_VENDOR) {
      setVendorFreightSource("MANUAL");
      setVendorRateWarning("");
      setMatchedVendorRateCardId(null);
      setMatchedVendorRateType(null);
      setBuyingRateLabel(null);
      return;
    }

    // The moment a vendor is selected (Contract OR Manual mode), search that
    // vendor's contract using its config and auto-fill the buying freight.
    const match = matchVendorContract(vendorId);
    if (!match) {
      setVendorFreightSource("MANUAL");
      setVendorRateWarning("No matching vendor contract found. Enter the buying rate manually.");
      setMatchedVendorRateCardId(null);
      setMatchedVendorRateType(null);
      setBuyingRateLabel(null);
      return;
    }

    setVendorFreight(String(match.freight));
    setVendorFreightSource("RATE_CARD");
    setVendorRateWarning("");
    setMatchedVendorRateCardId(match.rateCard.id);
    setMatchedVendorRateType(match.rateCard.rateType);
    setBuyingRateLabel(
      `${match.rateCard.rateType} @ ${(getVendorRateCardUnitRate(match.rateCard) ?? 0).toLocaleString()}`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminSources.vendorRateCardMap, bookingMatchContext, assigningBooking, vendorId]);

  function submitAssignment() {
    const selectedDriver = adminSources.drivers.find((driver) => driver.id === driverId);
    if (!assigningBooking || !selectedVehicle || !selectedDriver || !vendorId || Number(vendorFreight) <= 0) {
      return;
    }
    if (!activeLrOrgUnitId) {
      return;
    }
      if (selectedLrMode !== "AUTO" && !preferredLrNumber) {
        return;
      }

    assignBooking(assigningBooking.id, {
      vendorId: normalizedVendorId,
      vendorName: vendorId === OWN_FLEET_VENDOR ? "Own Fleet" : vendorMap.get(vendorId)?.name ?? "Vendor",
      vehicleId: selectedVehicle.id,
      vehicleLabel:
        selectedVehicle.ownershipType === "OWN"
          ? `${selectedVehicle.registrationNumber} (OWN)`
          : `${selectedVehicle.registrationNumber} (Vendor: ${vendorMap.get(selectedVehicle.vendorId ?? "")?.name ?? "Vendor"})`,
      driverId: selectedDriver.id,
      driverName: selectedDriver.name,
      vendorFreight: Number(vendorFreight),
      vendorRateCardId: matchedVendorRateCardId,
      vendorRateType: matchedVendorRateType,
      vendorContractSource: vendorFreightSource,
      customerFreight,
      sellingRateLabel: `${assigningBooking.pricing.rateType} @ ${assigningBooking.pricing.enteredRate.toLocaleString()}`,
      buyingRateLabel,
      marginAmount,
      marginPercent,
      actor: session.actorName || "Dispatcher",
      orgUnitId: activeLrOrgUnitId || null,
      actorUserId: currentUser?.id ?? null,
        lrType: selectedLrMode === "AUTO" ? "AUTO" : "MANUAL",
        lrConfigId: selectedAssignmentLrConfig?.id ?? null,
        preferredLrNumber: selectedLrMode === "AUTO" ? null : preferredLrNumber,
        manualLrPoolPreference: selectedLrMode === "PRE_GENERATED" ? "PRE_GENERATED" : "GENERAL",
      });
    resetDialog();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="TMS"
        title="Assignment Queue"
        description={`${getAssignmentModeLabel(tenant.assignmentMode)} with ${getCommercialModeLabel(tenant.commercialMode)} controls before loading starts.`}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <TenantSummaryCard label="Pending" value={String(queue.length)} helper="Bookings waiting for assignment" />
        <TenantSummaryCard label="Vehicles" value={String(adminSources.vehicles.filter((vehicle) => vehicle.isActive).length)} helper="Active own and vendor vehicles" />
        <TenantSummaryCard label="Drivers" value={String(adminSources.drivers.filter((driver) => driver.isActive).length)} helper="Active driver master records" />
      </div>

      <DataTable
        title="Assignment Queue"
        description={tenant.assignmentMode === "AUTO_VENDOR_FLOW" ? "Direct-customer workflow supports faster vendor assignment while keeping selling-side freight visible." : "3PL workflow keeps vendor notification controlled until commercial review, buying-rate validation, and assignment confirmation are complete."}
        headers={["Booking", "Customer", "Service", "Commercial", "Selling Freight", "Status", "Actions"]}
        rows={queue.map((booking) => {
          const bookingIndents = indents.filter((indent) => indent.bookingId === booking.id);
          const pendingIndentCount = bookingIndents.filter((indent) => indent.status === "PENDING").length;
          const winnerIndent = bookingIndents.find((indent) => indent.isWinner);
          const hasVehicle = Boolean(booking.assignment?.vehicleId);
          return [
          <div key={`${booking.id}-booking`} className="space-y-1">
            <div>{booking.bookingId}</div>
            {(booking.destinationChangeRequests ?? []).some((request) => ["SUBMITTED", "UNDER_REVIEW", "APPROVED"].includes(request.status)) ? (
              <Badge variant="warning">EDITED BOOKING</Badge>
            ) : (booking.deliveries ?? []).some((delivery) => (delivery.revisions?.length ?? 0) > 0) ? (
              <Badge variant="accent">DESTINATION REVISED</Badge>
            ) : null}
          </div>,
          customerMap.get(booking.customerId)?.name ?? "Unknown customer",
          booking.serviceType,
          booking.commercialType,
          `Rs ${booking.pricing.calculatedFreight.toLocaleString()}`,
          <BookingStatusBadge key={`${booking.id}-status`} status={booking.status} />,
          <div key={`${booking.id}-actions`} className="flex flex-wrap items-center gap-2">
            {access.can("ASSIGNMENT_QUEUE", "ASSIGN_VEHICLE") || access.can("ASSIGNMENT_QUEUE", "ASSIGN_VENDOR") ? (
              <Button size="sm" onClick={() => setAssigningBookingId(booking.id)}>
                Assign Vehicle
              </Button>
            ) : null}
            {pendingIndentCount === 0 && !winnerIndent ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  try {
                    // Vendor assignment is Auto-LR-only, generated from the booking
                    // owner's (sender's) active place — captured here.
                    sendBookingVendorIndent(
                      booking.id,
                      session.actorName || "Dispatcher",
                      activeLrOrgUnitId || null,
                      activeLrOrgUnit?.name ?? null,
                    );
                  } catch (error) {
                    window.alert((error as Error).message);
                  }
                }}
              >
                Send Indent to Vendors
              </Button>
            ) : null}
            {pendingIndentCount > 0 && !winnerIndent ? (
              <Badge variant="accent">
                Indent sent · {pendingIndentCount} notified · Auto LR{bookingIndents[0]?.lrPlaceName ? ` @ ${bookingIndents[0].lrPlaceName}` : ""}
              </Badge>
            ) : null}
            {winnerIndent ? (
              <Badge variant={hasVehicle ? "success" : "warning"}>
                {hasVehicle
                  ? `Assigned · ${winnerIndent.vendorName}`
                  : `Accepted · ${winnerIndent.vendorName} · vehicle pending · Auto LR${winnerIndent.lrPlaceName ? ` @ ${winnerIndent.lrPlaceName}` : ""}`}
              </Badge>
            ) : null}
            <Button asChild size="sm" variant="ghost">
              <Link to={`/tenant/${tenant.id}/bookings/${booking.id}`}>View</Link>
            </Button>
          </div>,
          ];
        })}
        emptyMessage="No bookings are waiting for assignment."
      />

      <Dialog
        open={Boolean(assigningBooking)}
        onOpenChange={(open) => {
          if (!open) {
            resetDialog();
          }
        }}
        title="Assign Booking"
        description={tenant.assignmentMode === "AUTO_VENDOR_FLOW" ? "Direct assignment flow. Select vendor first; vehicle and driver stay scoped to the same ownership." : "Controlled 3PL flow. Select vendor after customer freight, vendor freight, and margin are reviewed."}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={resetDialog}>
              Cancel
            </Button>
            <Button
              onClick={submitAssignment}
              disabled={
                !vendorId ||
                !vehicleId ||
                !driverId ||
                Number(vendorFreight) <= 0 ||
                  (selectedLrMode !== "AUTO" && !preferredLrNumber) ||
                  autoLrBlocked ||
                  !activeLrOrgUnitId
                }
            >
              Assign
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <CompactField label="Assign Method">
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="assignMethod"
                    checked={assignMethod === "CONTRACT"}
                    onChange={() => {
                      setAssignMethod("CONTRACT");
                      setVendorId("");
                      setVehicleId("");
                      setDriverId("");
                      setVendorFreight("");
                    }}
                  />
                  Contract Vendor
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="assignMethod"
                    checked={assignMethod === "MANUAL"}
                    onChange={() => {
                      setAssignMethod("MANUAL");
                      setVendorId("");
                      setVehicleId("");
                      setDriverId("");
                      setVendorFreight("");
                    }}
                  />
                  Manual Assignment
                </label>
              </div>
            </CompactField>
          </div>

          {assignMethod === "CONTRACT" ? (
            <div className="md:col-span-2 space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Matching contract vendors — lowest buying freight first
              </p>
              {vendorComparison.length ? (
                <div className="overflow-x-auto rounded-xl border">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead className="bg-muted/20 text-left text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Vendor</th>
                        <th className="px-3 py-2 font-medium">Rate Type</th>
                        <th className="px-3 py-2 font-medium">Vendor Freight</th>
                        {access.can("ASSIGNMENT_QUEUE", "VIEW_MARGIN") ? (
                          <th className="px-3 py-2 font-medium">Margin</th>
                        ) : null}
                        <th className="px-3 py-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {vendorComparison.map((entry) => (
                        <tr key={entry.vendorId} className={entry.vendorId === vendorId ? "bg-primary/5" : ""}>
                          <td className="px-3 py-2 font-medium">{entry.vendorName}</td>
                          <td className="px-3 py-2">{entry.rateType}</td>
                          <td className="px-3 py-2">Rs {entry.vendorFreight.toLocaleString()}</td>
                          {access.can("ASSIGNMENT_QUEUE", "VIEW_MARGIN") ? (
                            <td className="px-3 py-2">
                              Rs {entry.marginAmount.toLocaleString()} ({entry.marginPercent}%)
                            </td>
                          ) : null}
                          <td className="px-3 py-2">
                            {entry.vendorId === vendorId ? (
                              <Button size="sm" onClick={() => undefined}>Selected</Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setVendorId(entry.vendorId);
                                  setVehicleId("");
                                  setDriverId("");
                                }}
                              >
                                Select
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  No vendor contract matches this booking. Switch to Manual Assignment to enter a buying rate.
                </div>
              )}
            </div>
          ) : (
            <CompactField label="Vendor">
              <Select
                value={vendorId}
                onChange={(event) => {
                  setVendorId(event.target.value);
                  setVehicleId("");
                  setDriverId("");
                }}
              >
                <option value="">Select vendor</option>
                <option value={OWN_FLEET_VENDOR}>Own Fleet</option>
                {adminSources.vendors.filter((vendor) => vendor.status === "active").map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </Select>
            </CompactField>
          )}
          <CompactField label="Customer Freight / Selling Rate">
            <Input value={customerFreight ? customerFreight.toLocaleString() : ""} disabled />
          </CompactField>
          <CompactField label="Vehicle">
            <Select
              value={vehicleId}
              onChange={(event) => {
                setVehicleId(event.target.value);
                setDriverId("");
              }}
              disabled={!vendorId}
            >
              <option value="">Select vehicle</option>
              {availableVehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.ownershipType === "OWN"
                    ? `${vehicle.registrationNumber} (OWN)`
                    : `${vehicle.registrationNumber} (${vendorMap.get(vehicle.vendorId ?? "")?.name ?? "Vendor"})`}
                </option>
              ))}
            </Select>
            {/* Helpful empty-state explanation. The dropdown is gated by
                vendor ownership — if the user creates a vehicle without
                linking it to the selected vendor (or as OWN), it won't
                show up under that vendor selection. We surface the
                mismatch instead of leaving the dropdown silently empty. */}
            {vendorId && availableVehicles.length === 0 ? (
              (() => {
                const tenantActiveVehicles = adminSources.vehicles.filter((v) => v.isActive);
                const ownFleetCount = tenantActiveVehicles.filter((v) => !v.vendorId).length;
                const otherVendorCount = vendorId === OWN_FLEET_VENDOR
                  ? tenantActiveVehicles.filter((v) => Boolean(v.vendorId)).length
                  : tenantActiveVehicles.filter((v) => v.vendorId && v.vendorId !== vendorId).length;
                const total = tenantActiveVehicles.length;
                if (total === 0) {
                  return (
                    <p className="mt-1 text-xs text-amber-700">
                      No active vehicles for this tenant. Add vehicles in Administration → Vehicles.
                    </p>
                  );
                }
                const selectedVendorName = vendorId === OWN_FLEET_VENDOR
                  ? "Own Fleet"
                  : vendorMap.get(vendorId)?.name ?? "the selected vendor";
                return (
                  <p className="mt-1 text-xs text-amber-700">
                    No active vehicles linked to {selectedVendorName}.
                    {" "}{ownFleetCount > 0 && vendorId !== OWN_FLEET_VENDOR ? `${ownFleetCount} OWN-fleet vehicle${ownFleetCount === 1 ? " is" : "s are"} available — switch the vendor dropdown to "Own Fleet" to use ${ownFleetCount === 1 ? "it" : "them"}. ` : ""}
                    {otherVendorCount > 0 ? `${otherVendorCount} vehicle${otherVendorCount === 1 ? " is" : "s are"} linked to other vendors. ` : ""}
                    Or edit the vehicle in Administration → Vehicles to link it to {selectedVendorName}.
                  </p>
                );
              })()
            ) : null}
          </CompactField>
          <CompactField label="Driver">
            <Select value={driverId} onChange={(event) => setDriverId(event.target.value)} disabled={!selectedVehicle}>
              <option value="">Select driver</option>
              {availableDrivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </Select>
            {selectedVehicle && availableDrivers.length === 0 ? (
              (() => {
                const matchOwnership = vendorId === OWN_FLEET_VENDOR
                  ? (d: typeof adminSources.drivers[number]) => !d.vendorId
                  : (d: typeof adminSources.drivers[number]) => d.vendorId === vendorId;
                const tenantActiveDrivers = adminSources.drivers.filter((d) => d.isActive);
                const matchingDrivers = tenantActiveDrivers.filter(matchOwnership).length;
                const selectedVendorName = vendorId === OWN_FLEET_VENDOR
                  ? "Own Fleet"
                  : vendorMap.get(vendorId)?.name ?? "the selected vendor";
                if (tenantActiveDrivers.length === 0) {
                  return (
                    <p className="mt-1 text-xs text-amber-700">
                      No active drivers for this tenant. Add drivers in Administration → Drivers.
                    </p>
                  );
                }
                if (matchingDrivers === 0) {
                  return (
                    <p className="mt-1 text-xs text-amber-700">
                      No active drivers linked to {selectedVendorName}. Add a driver under this affiliation in Administration → Drivers.
                    </p>
                  );
                }
                return null;
              })()
            ) : null}
          </CompactField>
          <CompactField label="Vendor Freight / Buying Rate">
            <Input value={vendorFreight} onChange={(event) => setVendorFreight(event.target.value)} placeholder="Enter vendor freight" />
          </CompactField>
          {access.can("ASSIGNMENT_QUEUE", "VIEW_MARGIN") ? (
            <>
              <CompactField label="Margin Amount">
                <Input value={Number.isFinite(marginAmount) ? String(marginAmount) : ""} disabled />
              </CompactField>
              <CompactField label="Margin %">
                <Input value={Number.isFinite(marginPercent) ? String(marginPercent) : ""} disabled />
              </CompactField>
            </>
          ) : null}
          {vendorRateWarning ? (
            <div className="md:col-span-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {vendorRateWarning}
            </div>
          ) : null}
          {!vendorRateWarning && buyingRateLabel ? (
            <div className="md:col-span-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Vendor contract applied automatically: {buyingRateLabel}
            </div>
            ) : null}
            <CompactField label="LR Mode">
              <Select value={selectedLrMode} onChange={(event) => setSelectedLrMode(event.target.value as "MANUAL" | "PRE_GENERATED" | "AUTO")}>
                {canUseManualLr ? <option value="MANUAL">Manual LR</option> : null}
                {canUseManualLr ? <option value="PRE_GENERATED">Pre-generated / Customer LR</option> : null}
                {canUseAutoLr ? <option value="AUTO">Auto LR</option> : null}
              </Select>
            </CompactField>
          <CompactField label="Active Place">
            <Select
              value={activeLrOrgUnitId}
              onChange={(event) =>
                setSession({
                  ...session,
                  tenantId: tenant.id,
                  activeTenantOrgUnitId: event.target.value || null,
                })
              }
            >
              <option value="">{availableLrOrgUnits.length > 1 ? "Select active LR place" : activeLrOrgUnit?.name ?? "No place"}</option>
              {availableLrOrgUnits.map((orgUnit) => (
                  <option key={orgUnit.id} value={orgUnit.id}>
                    {orgUnit.name}
                  </option>
                ))}
            </Select>
          </CompactField>
            {selectedLrMode !== "AUTO" ? (
              <>
                <CompactField label="Manual LR Selection">
                  <div className="space-y-2">
                    <Select value={preferredLrNumber} onChange={(event) => setPreferredLrNumber(event.target.value)}>
                    <option value="">
                      {requiresActiveLrScope ? "Select active place first" : "Select LR number"}
                  </option>
                  {availableManualPools.map((pool) => (
                    <option key={pool.id} value={pool.lrNumber}>
                      {pool.lrNumber}{(pool.poolType ?? (pool.customerId ? "CUSTOMER_RESERVED" : "GENERAL")) === "CUSTOMER_RESERVED" ? " • Reserved" : " • General"}
                    </option>
                  ))}
                  </Select>
                </div>
                </CompactField>
                <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Active place: {activeLrOrgUnit?.name ?? "Not selected"} | Available manual LR count: {availableManualPools.length} | Source: {selectedLrMode === "PRE_GENERATED" ? "Customer Reserved LR" : "General LR"}
                </div>
              </>
            ) : (
            <div className={`md:col-span-2 rounded-2xl border px-4 py-3 text-sm ${autoLrBlocked ? "border-rose-300 bg-rose-50 text-rose-900" : "border-sky-200 bg-sky-50 text-sky-900"}`}>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span><span className="font-medium">Auto LR Available:</span> {autoLrInventory?.availableCount ?? 0}</span>
                <span><span className="font-medium">Next LR Preview:</span> {autoLrInventory?.nextNumber ?? "—"}</span>
                {autoLrInventory ? <span className="text-slate-500">Approved {autoLrInventory.approvedCount} · Generated {autoLrInventory.generatedCount}</span> : null}
              </div>
              <p className="mt-1">
                {autoLrBlocked
                  ? `No Auto LR quota available at ${activeLrOrgUnit?.name ?? "this place"}. Request and approve Auto LR before assigning.`
                  : `LR will be generated automatically after vehicle assignment for ${activeLrOrgUnit?.name ?? "the active place"}.`}
              </p>
            </div>
          )}
            {selectedLrMode !== "AUTO" && !selectedLrConfig ? (
              <div className="md:col-span-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Manual LR configuration is missing. Configure LR before assignment.
              </div>
            ) : null}
          {selectedLrMode === "AUTO" && !selectedAutoLrConfig ? (
            <div className="md:col-span-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Auto LR configuration is missing. Configure Auto LR before assignment.
            </div>
          ) : null}
            {selectedLrMode !== "AUTO" && selectedLrConfig && !requiresActiveLrScope && availableManualPools.length === 0 ? (
              <div className="md:col-span-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium">
                  {selectedLrMode === "PRE_GENERATED"
                    ? "No customer-reserved LR available for this customer and active place."
                    : "Insufficient manual LR stock for this active place."}
                </p>
              <p className="mt-1">
                Assignment only shows LR numbers that are already available for{" "}
                <span className="font-medium">{activeLrOrgUnit?.name ?? "the selected place"}</span>.
              </p>
              <p className="mt-2">
                Use one of these flows first:
              </p>
              <ul className="mt-1 list-disc pl-5 text-xs">
                <li>Upload or create LR directly for this place from Manual LR Operations.</li>
                <li>Request LR if you are working as Operations Manager or Dispatch Supervisor.</li>
                <li>Allocate or approve LR from the regional pool if you are working as Regional Manager or Operations Head.</li>
              </ul>
              <div className="mt-3">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/tenant/${tenant.id}/lr`}>Open Manual LR Workspace</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}

function CompactField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
