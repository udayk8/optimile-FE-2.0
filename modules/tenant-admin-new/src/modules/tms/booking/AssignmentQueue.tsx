import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
import { updateContract as updateAuctionContract } from "@auction/lib/auction-store";
import { useTenantBookings } from "./hooks/useTenantBookings";
import {
  calculateMarginAmount,
  calculateMarginPercent,
  getPrimaryBookingStatus,
} from "@/modules/tms/booking/services/booking-engine";
import { normalizeRateMatchingConfig, scoreRateCardMatch } from "@/shared/lib/rate-matching-config";
import {
  buildAddressLookup,
  buildCustomerLookup,
  buildVendorLookup,
  buildVehicleLookup,
  calculateVendorFreightFromRateCard,
  getVendorRateCardUnitRate,
  validateVendorRateCard,
} from "@/modules/tms/booking/services/booking-selectors";

const OWN_FLEET_VENDOR = "__OWN_FLEET__";
const QUEUE_PAGE_SIZE = 8;

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
  const [vendorFreightSource, setVendorFreightSource] = useState<"RATE_CARD" | "MANUAL" | "SPOT_AUCTION">("MANUAL");
  const [vendorRateWarning, setVendorRateWarning] = useState("");
  const [matchedVendorRateCardId, setMatchedVendorRateCardId] = useState<string | null>(null);
  const [matchedVendorRateType, setMatchedVendorRateType] = useState<"PER_TRIP" | "PER_KM" | "PER_MT" | null>(null);
  const [buyingRateLabel, setBuyingRateLabel] = useState<string | null>(null);
  // Reason required when bypassing the default L1/lowest contract (manual assign).
  const [manualReason, setManualReason] = useState("");
  const [preferredLrNumber, setPreferredLrNumber] = useState("");
  const [selectedLrMode, setSelectedLrMode] = useState<"MANUAL" | "PRE_GENERATED" | "AUTO">("MANUAL");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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
  const addressMap = useMemo(
    () => buildAddressLookup(Array.from(adminSources.customerAddressMap.values()).flat()),
    [adminSources.customerAddressMap],
  );
  const filteredQueue = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return queue;
    return queue.filter((b) => {
      const cust = customerMap.get(b.customerId);
      return `${b.bookingId} ${cust?.name ?? ""}`.toLowerCase().includes(q);
    });
  }, [queue, search, customerMap]);
  const totalQueuePages = Math.max(1, Math.ceil(filteredQueue.length / QUEUE_PAGE_SIZE));
  const pagedQueue = filteredQueue.slice((currentPage - 1) * QUEUE_PAGE_SIZE, currentPage * QUEUE_PAGE_SIZE);

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
    // Completed bookings already fulfilled by this vendor on the contract lane —
    // context for how much of an L1/L2/L3 allocation share is used up.
    const norm = (value?: string | null) => (value ?? "").trim().toLowerCase();
    const completedOnLane = (vendorId: string, fromCity?: string, toCity?: string) =>
      bookings.filter((b) => {
        if (getPrimaryBookingStatus(b.status) !== "COMPLETED") return false;
        if ((b.assignment?.vendorId ?? null) !== vendorId) return false;
        const addrs = adminSources.customerAddressMap.get(b.customerId) ?? [];
        const src = addrs.find((a) => a.id === b.sourceAddressId)?.city;
        const dst = addrs.find((a) => a.id === b.destinationAddressId)?.city;
        return norm(src) === norm(fromCity) && norm(dst) === norm(toCity);
      }).length;
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
      allocationRank?: "L1" | "L2" | "L3";
      volumeAllocationPercent?: number;
      completed: number;
      nextInLine: boolean;
    }> = [];
    adminSources.vendors
      .filter((vendor) => vendor.status === "active")
      .forEach((vendor) => {
        const config = normalizeRateMatchingConfig(vendor.rateMatchingConfig);
        const cards = adminSources.vendorRateCardMap.get(vendor.id) ?? [];
        cards.forEach((card) => {
          if (card.status !== "active") return;
          if (card.rateType !== bookingRateType) return;
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
            source: card.id.startsWith("auction-") ? "Auction" : "Manual",
            rateType: card.rateType,
            unitRate: getVendorRateCardUnitRate(card) ?? 0,
            vendorFreight: freight,
            marginAmount: calculateMarginAmount(customerFreight, freight),
            marginPercent: calculateMarginPercent(customerFreight, freight),
            allocationRank: card.allocationRank,
            volumeAllocationPercent: card.volumeAllocationPercent,
            completed: completedOnLane(vendor.id, card.fromCity, card.toCity),
            nextInLine: false,
          });
        });
      });
    // Soft order: honor the auction allocation split — L1 → L2 → L3 first
    // (cheapest within a rank), then unranked (manual/bulk) by freight.
    const rankWeight = (rank?: string) => (rank === "L1" ? 1 : rank === "L2" ? 2 : rank === "L3" ? 3 : 99);
    rows.sort(
      (a, b) => rankWeight(a.allocationRank) - rankWeight(b.allocationRank) || a.vendorFreight - b.vendorFreight,
    );
    // Flag the first ranked (L1) row as the next vendor in line per allocation.
    const firstRanked = rows.findIndex((row) => row.allocationRank);
    if (firstRanked !== -1) rows[firstRanked].nextInLine = true;
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminSources.vendors, adminSources.vendorRateCardMap, adminSources.customerAddressMap, bookings, bookingMatchContext, assigningBooking, customerFreight]);

  // Default contract = the L1 / lowest-rate match (first after the soft-order
  // sort). Contract-based assignment shows ONLY this one; choosing another vendor
  // requires switching to Manual Assignment (with a reason).
  const defaultContract = vendorContractOptions[0] ?? null;

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
      setManualReason("");
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

  // Contract mode: auto-apply the default L1/lowest contract (only one shown).
  useEffect(() => {
    if (assignMethod !== "CONTRACT" || !assigningBooking) return;
    if (!defaultContract) {
      setVendorFreightSource("MANUAL");
      setMatchedVendorRateCardId(null);
      setMatchedVendorRateType(null);
      setBuyingRateLabel(null);
      setVendorRateWarning(`No ${assigningBooking.pricing.rateType} vendor contract matches this booking lane. Switch to Manual Assignment.`);
      return;
    }
    setVendorId(defaultContract.vendorId);
    setVendorFreight(String(defaultContract.vendorFreight));
    setVendorFreightSource("RATE_CARD");
    setVendorRateWarning("");
    setMatchedVendorRateCardId(defaultContract.rateCardId);
    setMatchedVendorRateType(defaultContract.rateType);
    setBuyingRateLabel(`${defaultContract.rateType} @ ${defaultContract.unitRate.toLocaleString()} · ${defaultContract.source}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignMethod, defaultContract?.rateCardId, assigningBookingId]);

  // Spot-contract bookings arrive with the winning vendor + locked rate from
  // the one-time spot contract — prefill both so no manual amount is typed.
  useEffect(() => {
    const spot = assigningBooking?.spotContract;
    if (!spot) return;
    setVendorId(spot.vendorId);
    setVendorFreight(String(spot.rate));
    setVendorFreightSource("SPOT_AUCTION");
    setBuyingRateLabel(`${spot.rateUnit} @ ${spot.rate.toLocaleString()} (Spot contract ${spot.contractId})`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assigningBooking?.id]);

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
    // Manual assignment bypasses the default L1/lowest contract — reason required.
    if (assignMethod === "MANUAL" && !manualReason.trim()) {
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
        manualAssignmentReason: assignMethod === "MANUAL" ? manualReason.trim() : null,
      });
    // One-time spot contract consumed by this booking — mark it Used so it is
    // never offered to another booking and the vendor sees it spent.
    const spot = assigningBooking.spotContract;
    if (spot && vendorFreightSource === "SPOT_AUCTION") {
      updateAuctionContract(spot.contractId, (contract) => ({
        ...contract,
        status: "USED",
        consumedByBookingId: assigningBooking.bookingId,
      }));
    }
    resetDialog();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-[14px] font-semibold text-slate-900">Booking Assignment</h1>
        <span className="text-[12px] text-slate-500">{filteredQueue.length} pending</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
        <Input
          value={search}
          onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }}
          placeholder="Search booking or customer"
          className="h-8 min-w-[180px] flex-1 text-[12px]"
        />
        {search ? (
          <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setCurrentPage(1); }} className="h-8 text-[12px]">Clear</Button>
        ) : null}
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-2 shadow-sm">
        <div className="space-y-1.5">
          {pagedQueue.length ? (
            pagedQueue.map((booking) => {
              const bookingIndents = indents.filter((indent) => indent.bookingId === booking.id);
              const pendingIndentCount = bookingIndents.filter((indent) => indent.status === "PENDING").length;
              const winnerIndent = bookingIndents.find((indent) => indent.isWinner);
              const hasVehicle = Boolean(booking.assignment?.vehicleId);
              const customerName = customerMap.get(booking.customerId)?.name ?? "—";
              const srcAddr = addressMap.get(booking.sourceAddressId);
              const dstAddr = addressMap.get(booking.destinationAddressId);
              const origin = srcAddr?.city ?? srcAddr?.addressName ?? "—";
              const dest = dstAddr?.city ?? dstAddr?.addressName ?? "—";
              return (
                <div
                  key={booking.id}
                  className="grid items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] lg:grid-cols-[130px_minmax(0,1.3fr)_minmax(0,0.9fr)_110px_auto]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{booking.bookingId}</p>
                    <p className="mt-0.5 truncate text-[10.5px] text-slate-500">{new Date(booking.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{customerName}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">{origin} → {dest}</p>
                    <p className="mt-0.5 text-[10.5px] text-slate-400">Rs {booking.pricing.calculatedFreight.toLocaleString()}</p>
                  </div>
                  <div className="min-w-0 text-[11px] text-slate-600">
                    {winnerIndent ? (
                      <Badge variant={hasVehicle ? "success" : "warning"}>
                        {hasVehicle ? "Assigned" : "Vendor accepted"}
                      </Badge>
                    ) : pendingIndentCount > 0 ? (
                      <Badge variant="accent">{pendingIndentCount} notified</Badge>
                    ) : <span className="text-slate-400">No indent sent</span>}
                  </div>
                  <div><BookingStatusBadge status={booking.status} /></div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(access.can("ASSIGNMENT_QUEUE", "ASSIGN_VEHICLE") || access.can("ASSIGNMENT_QUEUE", "ASSIGN_VENDOR")) ? (
                      <Button size="sm" onClick={() => setAssigningBookingId(booking.id)}>Assign</Button>
                    ) : null}
                    {pendingIndentCount === 0 && !winnerIndent ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          try {
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
                        Indent
                      </Button>
                    ) : null}
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/tenant/${tenant.id}/bookings/${booking.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-md border border-dashed bg-slate-50/40 px-4 py-8 text-center">
              <p className="text-[13px] font-semibold text-slate-800">No bookings pending assignment</p>
            </div>
          )}
        </div>

        {totalQueuePages > 1 ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-[12px]">
            <p className="text-slate-600">
              {(currentPage - 1) * QUEUE_PAGE_SIZE + 1}–{Math.min(currentPage * QUEUE_PAGE_SIZE, filteredQueue.length)} of {filteredQueue.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="size-4" />Previous
              </Button>
              <Button variant="outline" size="sm" disabled={currentPage === totalQueuePages} onClick={() => setCurrentPage((p) => Math.min(totalQueuePages, p + 1))}>
                Next<ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

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
                (assignMethod === "MANUAL" && !manualReason.trim()) ||
                autoLrBlocked
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
                Recommended contract — lowest rate (L1) · {assigningBooking?.pricing.rateType}
              </p>
              {defaultContract ? (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold">{defaultContract.vendorName}</span>
                      <span
                        className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          defaultContract.source === "Auction" ? "bg-indigo-50 text-indigo-700" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {defaultContract.source}
                      </span>
                      {defaultContract.allocationRank ? (
                        <span className="ml-2 text-xs font-medium text-muted-foreground">
                          {defaultContract.allocationRank} · {defaultContract.volumeAllocationPercent ?? 100}%
                        </span>
                      ) : null}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Rs {defaultContract.vendorFreight.toLocaleString()}</span>
                      <span className="ml-1 text-muted-foreground">
                        ({defaultContract.rateType} @ {defaultContract.unitRate.toLocaleString()})
                      </span>
                    </div>
                  </div>
                  {access.can("ASSIGNMENT_QUEUE", "VIEW_MARGIN") ? (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Margin Rs {defaultContract.marginAmount.toLocaleString()} ({defaultContract.marginPercent}%)
                    </div>
                  ) : null}
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Lowest-rate contract auto-selected. To use a different vendor, switch to Manual Assignment.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  No {assigningBooking?.pricing.rateType} vendor contract matches this booking lane. Switch to Manual Assignment to enter a buying rate.
                </div>
              )}
            </div>
          ) : (
            <>
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
              <div className="md:col-span-2">
                <CompactField label="Reason for manual assignment *">
                  <textarea
                    value={manualReason}
                    onChange={(event) => setManualReason(event.target.value)}
                    rows={2}
                    placeholder="Why are you not using the recommended L1 / lowest-rate contract?"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </CompactField>
              </div>
            </>
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
                <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Available: <span className="font-semibold text-slate-900">{availableManualPools.length}</span> LR numbers · Source: {selectedLrMode === "PRE_GENERATED" ? "Customer Reserved LR" : "General LR"}
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
          <div className="md:col-span-2 flex justify-end pt-2 border-t border-slate-100">
            <Button
              onClick={submitAssignment}
              disabled={
                !vendorId ||
                !vehicleId ||
                !driverId ||
                Number(vendorFreight) <= 0 ||
                (selectedLrMode !== "AUTO" && !preferredLrNumber) ||
                (assignMethod === "MANUAL" && !manualReason.trim()) ||
                autoLrBlocked
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
