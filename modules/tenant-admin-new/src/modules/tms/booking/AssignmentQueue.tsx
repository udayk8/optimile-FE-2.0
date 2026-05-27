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
import { useTenantOrgUnits } from "@/modules/tenant-admin/hooks/useTenantOrgUnits";
import { useTenantAccess } from "@/modules/tenant-admin/hooks/useTenantAccess";
import { resolveManualLrScopedOrgUnits } from "@/shared/lib/manual-lr-scope";
import { getAssignmentModeLabel, getCommercialModeLabel } from "@/shared/lib/tenant-config";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { BookingStatusBadge } from "@/modules/tms/booking/components/BookingStatusBadge";
import { useBookingAdminSources } from "./hooks/useBookingAdminSources";
import { useTenantBookings } from "./hooks/useTenantBookings";
import { calculateMarginAmount, calculateMarginPercent } from "@/modules/tms/booking/services/booking-engine";
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
  const customerMap = useMemo(() => buildCustomerLookup(adminSources.customers), [adminSources.customers]);
  const vehicleMap = useMemo(() => buildVehicleLookup(adminSources.vehicles), [adminSources.vehicles]);
  const vendorMap = useMemo(() => buildVendorLookup(adminSources.vendors), [adminSources.vendors]);
  const queue = bookings.filter((booking) => booking.status === "PENDING_ASSIGNMENT");
  const currentUser =
    adminSources.users.find((user) => user.name === session.actorName || user.email === session.actorName) ?? null;
  const currentUserOrgUnitIds = currentUser?.orgUnitIds ?? [];
  const [assigningBookingId, setAssigningBookingId] = useState<string | null>(null);
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
  const marginPercent = calculateMarginPercent(customerFreight, Number(vendorFreight || 0));
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

    const vendorRateCards = adminSources.vendorRateCardMap.get(vendorId) ?? [];
    const customerAddresses = adminSources.customerAddressMap.get(assigningBooking.customerId) ?? [];
    const sourceAddress = customerAddresses.find((address) => address.id === assigningBooking.sourceAddressId) ?? null;
    const destinationAddress = customerAddresses.find((address) => address.id === assigningBooking.destinationAddressId) ?? null;
    const vehicleTypeCode =
      assigningBooking.vehicleTypeId
        ? adminSources.vehicleTypes.find((vehicleType) => vehicleType.id === assigningBooking.vehicleTypeId)?.typeCode ?? null
        : null;
    const bookingDistance =
      assigningBooking.deliveries?.reduce((max, delivery) => Math.max(max, Number(delivery.distanceKm || 0)), 0) ??
      Number(assigningBooking.pricing.distanceKm || 0);
    const bookingWeight = Number(assigningBooking.weight || 0);
    const candidateRateTypes: Array<"PER_MT" | "PER_KM" | "PER_TRIP"> = [
      assigningBooking.pricing.rateType,
      "PER_MT",
      "PER_TRIP",
      "PER_KM",
    ].filter((value, index, array) => array.indexOf(value) === index) as Array<"PER_MT" | "PER_KM" | "PER_TRIP">;

    const matchedRateCard =
      candidateRateTypes
        .map((rateType) =>
          validateVendorRateCard(
            {
              bookingDate: assigningBooking.pickupDate ?? null,
              fromCity: sourceAddress?.city ?? null,
              toCity: destinationAddress?.city ?? null,
              fromLocation: sourceAddress?.addressName ?? null,
              toLocation: destinationAddress?.addressName ?? null,
              fromPincode: sourceAddress?.pincode ?? null,
              toPincode: destinationAddress?.pincode ?? null,
              vehicleType: vehicleTypeCode,
              rateType,
            },
            vendorRateCards,
          ),
        )
        .find(Boolean) ?? null;

    if (!matchedRateCard) {
      setVendorFreightSource("MANUAL");
      setVendorRateWarning("No vendor contract found. Manual buying rate entered.");
      setMatchedVendorRateCardId(null);
      setMatchedVendorRateType(null);
      setBuyingRateLabel(null);
      return;
    }

    const calculatedVendorFreight = calculateVendorFreightFromRateCard({
      rateCard: matchedRateCard,
      weight: bookingWeight,
      distanceKm: bookingDistance,
    });

    setVendorFreight(String(calculatedVendorFreight));
    setVendorFreightSource("RATE_CARD");
    setVendorRateWarning("");
    setMatchedVendorRateCardId(matchedRateCard.id);
    setMatchedVendorRateType(matchedRateCard.rateType);
    setBuyingRateLabel(
      `${matchedRateCard.rateType} @ ${(getVendorRateCardUnitRate(matchedRateCard) ?? 0).toLocaleString()}`,
    );
  }, [adminSources.customerAddressMap, adminSources.vendorRateCardMap, adminSources.vehicleTypes, assigningBooking, vendorId]);

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
        rows={queue.map((booking) => [
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
          <div key={`${booking.id}-actions`} className="flex flex-wrap gap-2">
            {access.can("ASSIGNMENT_QUEUE", "ASSIGN_VEHICLE") || access.can("ASSIGNMENT_QUEUE", "ASSIGN_VENDOR") ? (
              <Button size="sm" onClick={() => setAssigningBookingId(booking.id)}>
                Assign
              </Button>
            ) : null}
            <Button asChild size="sm" variant="ghost">
              <Link to={`/tenant/${tenant.id}/bookings/${booking.id}`}>View</Link>
            </Button>
          </div>,
        ])}
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
                  !activeLrOrgUnitId
                }
            >
              Assign
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
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
            <div className="md:col-span-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              Auto LR will be generated during assignment for <span className="font-medium">{activeLrOrgUnit?.name ?? "the active place"}</span>.
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
