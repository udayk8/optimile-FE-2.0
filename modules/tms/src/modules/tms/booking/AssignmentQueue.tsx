import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { DataTable } from "@/shared/components/common/data-table";
import { PageHeader } from "@/shared/components/common/page-header";
import { TenantSummaryCard } from "@tms-booking/modules/tenant-admin/components/tenant-primitives";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { useSessionContext } from "@tms-booking/shared/auth/session-context";
import { useTenantOrgUnits } from "@tms-booking/modules/tenant-admin/hooks/useTenantOrgUnits";
import { useTenantAccess } from "@tms-booking/modules/tenant-admin/hooks/useTenantAccess";
import { resolveManualLrScopedOrgUnits } from "@/shared/lib/manual-lr-scope";
import { getAssignmentModeLabel, getCommercialModeLabel } from "@/shared/lib/tenant-config";
import { useTenantRouteContext } from "@tms-booking/modules/tenant-admin/hooks/useTenantRouteContext";
import { BookingStatusBadge } from "@/modules/tms/booking/components/BookingStatusBadge";
import { useBookingAdminSources } from "@/modules/tms/booking/hooks/useBookingAdminSources";
import { useTenantBookings } from "@/modules/tms/booking/hooks/useTenantBookings";
import { useBookingPaths } from "@tms-booking/hooks/useBookingPaths";
import { calculateMarginAmount, calculateMarginPercent } from "@/modules/tms/booking/services/booking-engine";
import { normalizeRateMatchingConfig, scoreRateCardMatch } from "@/shared/lib/rate-matching-config";
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
  const paths = useBookingPaths();
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
    // Match strictly on the rate type chosen when the contract booking was
    // created — no cross-rate-type fallback.
    const matched = validateVendorRateCard(
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
        rateType: assigningBooking.pricing.rateType,
      },
      vendorRateCards,
    );
    if (!matched) return null;
    const freight = calculateVendorFreightFromRateCard({
      rateCard: matched,
      weight: ctx.weight,
      distanceKm: ctx.distanceKm,
    });
    return { rateCard: matched, freight };
  }

  // Contract Vendor options — EVERY matching contract (auction-won + manual) for
  // the booking lane, restricted to the rate type chosen on the booking. One row
  // per contract so the dispatcher sees all options, cheapest buying freight first.
  const vendorContractOptions = useMemo(() => {
    if (!assigningBooking || !bookingMatchContext) return [];
    const ctx = bookingMatchContext;
    const bookingRateType = assigningBooking.pricing.rateType;
    const matchInput = {
      fromCity: ctx.sourceAddress?.city ?? null,
      toCity: ctx.destinationAddress?.city ?? null,
      fromLocation: ctx.sourceAddress?.addressName ?? null,
      toLocation: ctx.destinationAddress?.addressName ?? null,
      fromPincode: ctx.sourceAddress?.pincode ?? null,
      toPincode: ctx.destinationAddress?.pincode ?? null,
      vehicleType: ctx.vehicleTypeCode,
      material: ctx.materialCode,
    };
    const rows: Array<{
      vendorId: string;
      vendorName: string;
      rateCardId: string;
      source: "Auction" | "Manual";
      rateType: "PER_MT" | "PER_KM" | "PER_TRIP";
      unitRate: number;
      vendorFreight: number;
      marginAmount: number;
      marginPercent: number;
    }> = [];
    adminSources.vendors
      .filter((vendor) => vendor.status === "active")
      .forEach((vendor) => {
        const config = normalizeRateMatchingConfig(vendor.rateMatchingConfig);
        const cards = adminSources.vendorRateCardMap.get(vendor.id) ?? [];
        cards.forEach((card) => {
          if (card.status !== "active") return;
          // Only contracts of the booking's rate type.
          if (card.rateType !== bookingRateType) return;
          // Only contracts whose lane (and configured dimensions) match.
          if (scoreRateCardMatch(card, matchInput, config) === null) return;
          const freight = calculateVendorFreightFromRateCard({
            rateCard: card,
            weight: ctx.weight,
            distanceKm: ctx.distanceKm,
          });
          rows.push({
            vendorId: vendor.id,
            vendorName: vendor.name,
            rateCardId: card.id,
            // Auction-won contracts are merged in with an `auction-` id prefix.
            source: card.id.startsWith("auction-") ? "Auction" : "Manual",
            rateType: card.rateType,
            unitRate: getVendorRateCardUnitRate(card) ?? 0,
            vendorFreight: freight,
            marginAmount: calculateMarginAmount(customerFreight, freight),
            marginPercent: calculateMarginPercent(customerFreight, freight),
          });
        });
      });
    return rows.sort((a, b) => a.vendorFreight - b.vendorFreight);
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

    // Contract mode: the dispatcher picks a specific contract row (which sets the
    // rate/freight directly), so skip the single auto-match here.
    if (assignMethod === "CONTRACT") return;

    // Manual mode: the moment a vendor is selected, search that vendor's contract
    // (booking rate type only) and auto-fill the buying freight.
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
  }, [adminSources.vendorRateCardMap, bookingMatchContext, assigningBooking, vendorId, assignMethod]);

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
              <Link to={paths.booking(booking.id)}>View</Link>
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
                (selectedLrMode !== "AUTO" && !preferredLrNumber)
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
                Matching contracts — {assigningBooking?.pricing.rateType} · auction & manual · lowest buying freight first
              </p>
              {vendorContractOptions.length ? (
                <div className="overflow-x-auto rounded-xl border">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead className="bg-muted/20 text-left text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Vendor</th>
                        <th className="px-3 py-2 font-medium">Source</th>
                        <th className="px-3 py-2 font-medium">Rate Type</th>
                        <th className="px-3 py-2 font-medium">Buying Rate</th>
                        <th className="px-3 py-2 font-medium">Vendor Freight</th>
                        {access.can("ASSIGNMENT_QUEUE", "VIEW_MARGIN") ? (
                          <th className="px-3 py-2 font-medium">Margin</th>
                        ) : null}
                        <th className="px-3 py-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {vendorContractOptions.map((entry) => (
                        <tr key={entry.rateCardId} className={entry.rateCardId === matchedVendorRateCardId ? "bg-primary/5" : ""}>
                          <td className="px-3 py-2 font-medium">{entry.vendorName}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                entry.source === "Auction" ? "bg-indigo-50 text-indigo-700" : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {entry.source}
                            </span>
                          </td>
                          <td className="px-3 py-2">{entry.rateType}</td>
                          <td className="px-3 py-2">Rs {entry.unitRate.toLocaleString()}</td>
                          <td className="px-3 py-2">Rs {entry.vendorFreight.toLocaleString()}</td>
                          {access.can("ASSIGNMENT_QUEUE", "VIEW_MARGIN") ? (
                            <td className="px-3 py-2">
                              Rs {entry.marginAmount.toLocaleString()} ({entry.marginPercent}%)
                            </td>
                          ) : null}
                          <td className="px-3 py-2">
                            {entry.rateCardId === matchedVendorRateCardId ? (
                              <Button size="sm" onClick={() => undefined}>Selected</Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setVendorId(entry.vendorId);
                                  setVehicleId("");
                                  setDriverId("");
                                  setVendorFreight(String(entry.vendorFreight));
                                  setVendorFreightSource("RATE_CARD");
                                  setVendorRateWarning("");
                                  setMatchedVendorRateCardId(entry.rateCardId);
                                  setMatchedVendorRateType(entry.rateType);
                                  setBuyingRateLabel(`${entry.rateType} @ ${entry.unitRate.toLocaleString()} · ${entry.source}`);
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
                  No {assigningBooking?.pricing.rateType} vendor contract matches this booking lane. Switch to Manual Assignment to enter a buying rate.
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
            {selectedLrMode !== "AUTO" ? (
              <>
                <CompactField label="Manual LR Selection">
                  <div className="space-y-2">
                    <Select value={preferredLrNumber} onChange={(event) => setPreferredLrNumber(event.target.value)}>
                      <option value="">Select LR number</option>
                      {availableManualPools.map((pool) => (
                        <option key={pool.id} value={pool.lrNumber}>
                          {pool.lrNumber}{(pool.poolType ?? (pool.customerId ? "CUSTOMER_RESERVED" : "GENERAL")) === "CUSTOMER_RESERVED" ? " • Reserved" : " • General"}
                        </option>
                      ))}
                    </Select>
                  </div>
                </CompactField>
                <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Available: <span className="font-semibold text-slate-900">{availableManualPools.length}</span> LR numbers · Source: {selectedLrMode === "PRE_GENERATED" ? "Customer Reserved LR" : "General LR"}
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
                  <Link to={paths.tenantLrWorkspace}>Open Manual LR Workspace</Link>
                </Button>
              </div>
            </div>
          ) : null}
          <div className="md:col-span-2 flex justify-end border-t border-slate-100 pt-2">
            <Button
              onClick={submitAssignment}
              disabled={
                !vendorId ||
                !vehicleId ||
                !driverId ||
                Number(vendorFreight) <= 0 ||
                (selectedLrMode !== "AUTO" && !preferredLrNumber)
              }
            >
              Assign Vehicle
            </Button>
          </div>
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



