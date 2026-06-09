/**
 * ERP Orders — pre-booking staging area.
 *
 * ERP Orders are NOT bookings. They hold raw ERP sales order data.
 * A Booking (with Booking ID, freight, lifecycle) is only created
 * when the user explicitly merges one or more ERP Orders.
 *
 * Flow:
 *   Import ERP Order  →  ERP Orders list  →  Merge Selected  →  Booking created
 *                                                                (normal lifecycle from here)
 */

import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Plus } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { useTenantAccess } from "@/modules/tenant-admin/hooks/useTenantAccess";
import { useErpOrders } from "./hooks/useErpOrders";
import { useTenantBookings } from "./hooks/useTenantBookings";
import { useBookingAdminSources } from "./hooks/useBookingAdminSources";
import { formatCurrency } from "@/shared/lib/format-currency";
import {
  buildCustomerLookup,
  buildMaterialLookup,
  getCustomerAddresses,
  getCustomerMaterials,
  validateRateCard,
} from "@/modules/tms/booking/services/booking-selectors";
import { evaluateInitialBookingStatus, getRateCardUnitRate, perMT, perTrip } from "@/modules/tms/booking/services/booking-engine";
import { BookingPageHeader } from "./components/BookingPageHeader";
import type { ErpOrderRecord, ErpReferenceSnapshot } from "@/modules/tms/booking/types";
import type { TenantCustomerAddress } from "@/types/customer";

// ─── Mock ERP datasets for "Generate Mock ERP Data" ──────────────────────────

const ERP_MOCK_DATASETS = [
  {
    salesOrderNumber: "SO-20001",
    erpReferenceNumber: "ERP-SO-20001",
    externalBookingNumber: "EXT-BKG-20001",
    erpCustomerCode: "ACC001",
    erpPlantCode: "PLT-BLR-01",
    sourceSystem: "SAP",
    materialCode: "CEMENT",
    quantity: "100",
    uom: "BAG",
    weight: "5",
    weightUom: "MT",
    originCity: "Bengaluru",
    destinationCity: "Chennai",
    consignorName: "ACC Cement Works, Bengaluru",
    consignorAddress: "Survey No. 12, Industrial Area, Peenya, Bengaluru – 560058",
    consignorGstin: "29AAACA1234A1Z5",
    consigneeName: "BuildMart Depot, Chennai",
    consigneeAddress: "Plot 45, SIDCO Industrial Estate, Ambattur, Chennai – 600098",
    consigneeGstin: "33AABCB5678B1Z2",
    opsRemark: "ERP SO-20001 — ACC Cement, Bengaluru to Chennai, 100 BAG / 5 MT.",
  },
  {
    salesOrderNumber: "SO-20002",
    erpReferenceNumber: "ERP-SO-20002",
    externalBookingNumber: null,
    erpCustomerCode: "ACC001",
    erpPlantCode: "PLT-BLR-01",
    sourceSystem: "SAP",
    materialCode: "CLINKER",
    quantity: "200",
    uom: "MT",
    weight: "200",
    weightUom: "MT",
    originCity: "Bengaluru",
    destinationCity: "Hyderabad",
    consignorName: "ACC Plant, Bengaluru",
    consignorAddress: "Survey No. 12, Peenya, Bengaluru – 560058",
    consignorGstin: "29AAACA1234A1Z5",
    consigneeName: "Infra Depot, Hyderabad",
    consigneeAddress: "Sy. No. 45, Patancheru, Hyderabad – 502319",
    consigneeGstin: "36AAACI9999I1Z1",
    opsRemark: "ERP SO-20002 — Clinker, Bengaluru to Hyderabad, 200 MT.",
  },
  {
    salesOrderNumber: "SO-20003",
    erpReferenceNumber: "ERP-SO-20003",
    externalBookingNumber: "EXT-BKG-20003",
    erpCustomerCode: "KAN003",
    erpPlantCode: "PLT-HYD-03",
    sourceSystem: "Oracle",
    materialCode: "CEMENT",
    quantity: "150",
    uom: "BAG",
    weight: "7.5",
    weightUom: "MT",
    originCity: "Hyderabad",
    destinationCity: "Vijayawada",
    consignorName: "Kanodia Cement Plant, Hyderabad",
    consignorAddress: "Sy. No. 220, Patancheru Industrial Area, Hyderabad – 502319",
    consignorGstin: "36AAACK3456K1Z9",
    consigneeName: "Vizag Infra Supplies",
    consigneeAddress: "Plot 22, Auto Nagar, Vijayawada – 520007",
    consigneeGstin: "37AABCV7812V1Z3",
    opsRemark: "ERP SO-20003 — Cement, Hyderabad to Vijayawada, 150 BAG / 7.5 MT.",
  },
];

// ─── ERP Order List Page ──────────────────────────────────────────────────────

export function ErpBookingListPage() {
  const navigate = useNavigate();
  const { tenant } = useTenantRouteContext();
  const access = useTenantAccess();
  const canCreate = access.hasFeaturePermission("TMS", "CREATE_BOOKING", "create");

  const { pendingOrders, mergedOrders, markAsMerged } = useErpOrders(tenant.id);
  const { createBooking } = useTenantBookings(tenant.id);
  const adminSources = useBookingAdminSources(tenant.id);

  const customerMap = useMemo(() => buildCustomerLookup(adminSources.customers), [adminSources.customers]);
  const materialMap = useMemo(() => buildMaterialLookup(adminSources.materials), [adminSources.materials]);

  // Per-row freight preview — computed once for all visible orders; reused in table cells.
  const orderFreightPreviews = useMemo(() => {
    const result = new Map<string, { rateType: string; rate: number; freight: number; breakdown: string } | null>();
    for (const order of pendingOrders) {
      const rateCards = adminSources.customerRateCardMap.get(order.customerId) ?? [];
      const vehicleTypeCode = order.vehicleTypeId
        ? adminSources.vehicleTypes.find((v) => v.id === order.vehicleTypeId)?.typeCode ?? null
        : null;
      let found = false;
      for (const rateType of ["PER_MT", "PER_TRIP"] as const) {
        const rc = validateRateCard(
          { customerId: order.customerId, rateMatchingBasis: "CITY_TO_CITY", fromCity: order.originCity, toCity: order.destinationCity, vehicleType: vehicleTypeCode, rateType, weight: order.weight },
          rateCards,
        );
        if (rc) {
          const rate = getRateCardUnitRate(rc) ?? 0;
          const freight = rateType === "PER_MT" ? perMT(rate, order.weight) : perTrip(rate);
          const breakdown =
            rateType === "PER_MT"
              ? `${order.weight} MT × ${formatCurrency(rate)}`
              : "Per Trip";
          result.set(order.id, { rateType, rate, freight, breakdown });
          found = true;
          break;
        }
      }
      if (!found) result.set(order.id, null);
    }
    return result;
  }, [pendingOrders, adminSources.customerRateCardMap, adminSources.vehicleTypes]);

  const [statusTab, setStatusTab] = useState<"PENDING" | "MERGED">("PENDING");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeFreight, setMergeFreight] = useState("");
  const [mergePickupDateTime, setMergePickupDateTime] = useState("");
  const [mergeVehicleTypeId, setMergeVehicleTypeId] = useState("");
  const [mergeError, setMergeError] = useState("");

  const displayOrders = statusTab === "PENDING" ? pendingOrders : mergedOrders;

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return displayOrders;
    return displayOrders.filter((o) => {
      const cust = customerMap.get(o.customerId);
      return `${o.salesOrderNumber} ${o.erpReferenceNumber} ${cust?.name ?? ""} ${o.originCity} ${o.destinationCity} ${o.sourceSystem}`
        .toLowerCase()
        .includes(q);
    });
  }, [displayOrders, search, customerMap]);

  const selectedOrders = useMemo(
    () => pendingOrders.filter((o) => selectedIds.includes(o.id)),
    [pendingOrders, selectedIds],
  );

  // ── Merge validation (multi-order: same customer + same origin + same destination) ──
  const mergeValidation = useMemo(() => {
    if (selectedOrders.length <= 1) return { valid: true, errors: [] as string[] };
    const first = selectedOrders[0];
    const errors: string[] = [];
    if (selectedOrders.some((o) => o.customerId !== first.customerId)) {
      errors.push("All selected orders must belong to the same customer.");
    }
    const srcCity = first.originCity.trim().toLowerCase();
    if (selectedOrders.some((o) => o.originCity.trim().toLowerCase() !== srcCity)) {
      errors.push(`Routes differ — all orders must share the same origin (${first.originCity}). Split into separate bookings.`);
    }
    const dstCity = first.destinationCity.trim().toLowerCase();
    if (selectedOrders.some((o) => o.destinationCity.trim().toLowerCase() !== dstCity)) {
      errors.push(`Routes differ — all orders must share the same destination (${first.destinationCity}). Split into separate bookings.`);
    }
    return { valid: errors.length === 0, errors };
  }, [selectedOrders]);

  // ── Contract matching — uses same validateRateCard engine as normal booking creation ──
  const contractMatch = useMemo(() => {
    if (selectedOrders.length === 0) return null;
    const first = selectedOrders[0];
    const dest = selectedOrders[selectedOrders.length - 1];
    const rateCards = adminSources.customerRateCardMap.get(first.customerId) ?? [];
    const totalWeight = selectedOrders.reduce((sum, o) => sum + o.weight, 0);
    const vehicleTypeCode = first.vehicleTypeId
      ? adminSources.vehicleTypes.find((v) => v.id === first.vehicleTypeId)?.typeCode ?? null
      : null;
    for (const rateType of ["PER_MT", "PER_TRIP", "PER_KM"] as const) {
      const rc = validateRateCard(
        { customerId: first.customerId, rateMatchingBasis: "CITY_TO_CITY", fromCity: first.originCity, toCity: dest.destinationCity, vehicleType: vehicleTypeCode, rateType, weight: totalWeight },
        rateCards,
      );
      if (rc) return { rateCard: rc, rateType };
    }
    return null;
  }, [selectedOrders, adminSources.customerRateCardMap, adminSources.vehicleTypes]);

  // ── Freight preview from matched contract ──
  const contractFreight = useMemo(() => {
    if (!contractMatch) return null;
    const rate = getRateCardUnitRate(contractMatch.rateCard);
    if (!rate) return null;
    const totalWeight = selectedOrders.reduce((sum, o) => sum + o.weight, 0);
    if (contractMatch.rateType === "PER_MT") return perMT(rate, totalWeight);
    if (contractMatch.rateType === "PER_TRIP") return perTrip(rate);
    return null;
  }, [contractMatch, selectedOrders]);

  function toggleSelect(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  function toggleSelectAll() {
    const visiblePendingIds = filteredOrders
      .filter((o) => o.status === "PENDING")
      .map((o) => o.id);
    const allSelected = visiblePendingIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((current) => current.filter((id) => !visiblePendingIds.includes(id)));
    } else {
      setSelectedIds((current) => Array.from(new Set([...current, ...visiblePendingIds])));
    }
  }

  function openMergeDialog() {
    if (selectedIds.length === 0) return;
    // Pre-fill freight from matched contract rate; user can still override.
    setMergeFreight(contractFreight != null ? String(Math.round(contractFreight)) : "");
    setMergePickupDateTime("");
    setMergeVehicleTypeId(selectedOrders[0]?.vehicleTypeId ?? "");
    setMergeError("");
    setMergeDialogOpen(true);
  }

  function executeMerge() {
    if (!mergeFreight || Number(mergeFreight) <= 0) {
      setMergeError("Enter a total freight amount for the merged booking.");
      return;
    }
    if (!mergePickupDateTime) {
      setMergeError("Select a pickup date and time.");
      return;
    }
    if (selectedOrders.length === 0) {
      setMergeError("No orders selected.");
      return;
    }

    const firstOrder = selectedOrders[0];
    const freight = Number(mergeFreight);
    const pickupDate = mergePickupDateTime.slice(0, 10);
    const pickupTime = mergePickupDateTime.slice(11, 16);
    const status = evaluateInitialBookingStatus("SPOT", 0);
    const now = new Date().toISOString();

    // Build a delivery record for each ERP order; trackingId = SO number for reconciliation.
    const deliveries = selectedOrders.map((order, index) => {
      const srcId = order.originAddressId ?? firstOrder.originAddressId ?? "";
      const dstId = order.destinationAddressId ?? "";
      return {
        id: `erp-delivery-${Date.now()}-${index}`,
        deliveryNo: index + 1,
        trackingId: order.salesOrderNumber, // SO number kept for ERP reconciliation
        originCity: order.originCity,
        originAddressId: srcId,
        destinationCity: order.destinationCity,
        destinationAddressId: dstId,
        destinationAddressSource: dstId ? ("SAVED_ADDRESS" as const) : ("FROM_INVOICE_LATER" as const),
        consigneeFinalizationStatus: dstId ? ("CONFIRMED" as const) : ("PENDING" as const),
        materialId: order.materialId ?? "",
        quantity: order.quantity,
        uom: order.uom,
        weight: order.weight,
        weightUom: order.weightUom,
        distanceKm: null,
        status,
        lrNumber: null,
        pod: null,
      };
    });

    const sourceAddressId = firstOrder.originAddressId ?? "";
    const destinationAddressId =
      selectedOrders[selectedOrders.length - 1]?.destinationAddressId ?? "";

    // Summarise ERP references from all merged orders.
    const erpRef: ErpReferenceSnapshot = {
      erpReferenceNumber: selectedOrders.map((o) => o.erpReferenceNumber).join(", "),
      salesOrderNumber: selectedOrders.map((o) => o.salesOrderNumber).join(", "),
      externalBookingNumber: selectedOrders
        .map((o) => o.externalBookingNumber)
        .filter(Boolean)
        .join(", ") || null,
      erpCustomerCode: firstOrder.erpCustomerCode ?? null,
      erpPlantCode: firstOrder.erpPlantCode ?? null,
      sourceSystem: firstOrder.sourceSystem ?? null,
      integrationStatus: "MOCK",
      consignorName: firstOrder.consignorName ?? null,
      consignorAddress: firstOrder.consignorAddress ?? null,
      consignorGstin: firstOrder.consignorGstin ?? null,
      consigneeName: selectedOrders[selectedOrders.length - 1]?.consigneeName ?? null,
      consigneeAddress: selectedOrders[selectedOrders.length - 1]?.consigneeAddress ?? null,
      consigneeGstin: selectedOrders[selectedOrders.length - 1]?.consigneeGstin ?? null,
    };

    const totalWeight = selectedOrders.reduce((sum, o) => sum + o.weight, 0);
    const totalQty = selectedOrders.reduce((sum, o) => sum + o.quantity, 0);
    const uniqueMaterialIds = Array.from(
      new Set(selectedOrders.map((o) => o.materialId).filter(Boolean) as string[]),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const created = createBooking({
      bookingSource: "ERP",
      erpReference: erpRef,
      customerId: firstOrder.customerId,
      materialIds: uniqueMaterialIds,
      sourceAddressId,
      destinationAddressId,
      consignorAddressId: sourceAddressId,
      consigneeAddressId: destinationAddressId,
      laneKey: null,
      laneFound: false,
      modeOfTransport: "ROAD",
      numberOfDeliveries: selectedOrders.length,
      serviceType: "FTL",
      commercialType: contractMatch ? "CONTRACT" : "SPOT",
      pricing: {
        rateType: contractMatch?.rateType ?? "PER_TRIP",
        contractRateCardId: contractMatch?.rateCard.id ?? null,
        l1Rate: contractMatch ? (getRateCardUnitRate(contractMatch.rateCard) ?? null) : null,
        enteredRate: freight,
        calculatedFreight: freight,
        distanceKm: null,
        deviationPercent: 0,
        approvalLevel: contractMatch ? "AUTO" : null,
        deviationRemark: null,
        isAutoApproved: true,
      },
      quantity: totalQty,
      weight: totalWeight,
      uom: firstOrder.uom,
      weightUom: firstOrder.weightUom,
      vehicleTypeId: mergeVehicleTypeId || firstOrder.vehicleTypeId || null,
      pickupDate,
      pickupTime,
      tat: null,
      lrType: "MANUAL",
      manualLrPoolPreference: "GENERAL",
      poNumber: null,
      doNumber: null,
      ewayBillNumber: null,
      chargeType: null,
      subBrand: null,
      spotContract: null,
      status,
      opsRemark: `Merged from ERP orders: ${selectedOrders.map((o) => o.salesOrderNumber).join(", ")}`,
      pod: null,
      isInvoiced: false,
      invoiceId: null,
      lrIds: [],
      documents: [],
      expenses: [],
      assignment: null,
      deliveries,
      createdBy: "ERP System",
      remarks: [
        {
          id: `erp-merge-remark-${Date.now()}`,
          timestamp: now,
          actor: "ERP System",
          type: "OPS_REMARK" as const,
          message: `Booking created by merging ERP orders: ${selectedOrders.map((o) => o.salesOrderNumber).join(", ")}.`,
        },
      ],
      statusTimeline: [
        {
          id: `erp-status-${Date.now()}-draft`,
          status: "DRAFT" as const,
          timestamp: now,
          actor: "ERP System",
          note: "ERP merged booking created.",
        },
        {
          id: `erp-status-${Date.now()}-submit`,
          status,
          timestamp: now,
          actor: "System",
          note: "ERP booking ready for assignment.",
        },
      ],
    } as any);

    markAsMerged(selectedIds, created.id, created.bookingId);
    setSelectedIds([]);
    setMergeDialogOpen(false);
    navigate(`/tenant/${tenant.id}/bookings/${created.id}`);
  }

  const allVisibleSelected =
    filteredOrders.filter((o) => o.status === "PENDING").length > 0 &&
    filteredOrders.filter((o) => o.status === "PENDING").every((o) => selectedIds.includes(o.id));

  return (
    <div className="space-y-2">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-[14px] font-semibold text-slate-900">ERP Orders</h1>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Pre-booking staging area for ERP sales orders. Select orders and merge to create a booking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length === 0 ? (
            <Button size="sm" disabled aria-disabled="true" variant="outline">
              Select orders to create a booking
            </Button>
          ) : selectedIds.length === 1 ? (
            <Button
              size="sm"
              onClick={openMergeDialog}
              disabled={!mergeValidation.valid}
              title={mergeValidation.errors[0]}
            >
              Create Booking →
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={openMergeDialog}
              disabled={!mergeValidation.valid}
              title={mergeValidation.errors[0]}
            >
              Merge &amp; Create Booking ({selectedIds.length} orders) →
            </Button>
          )}
          {canCreate ? (
            <Button asChild size="sm" variant="outline">
              <Link to={`/tenant/${tenant.id}/bookings/erp/create`}>
                <Plus className="size-4" />
                Import ERP Order
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm w-fit">
        {(["PENDING", "MERGED"] as const).map((tab) => {
          const count = tab === "PENDING" ? pendingOrders.length : mergedOrders.length;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => { setStatusTab(tab); setSelectedIds([]); setSearch(""); }}
              className={`rounded-md px-3 py-1 text-[12px] font-semibold transition ${
                statusTab === tab
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab === "PENDING" ? "Pending" : "Merged"}
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                statusTab === tab ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search SO number, ERP ref, customer, city…"
          className="h-8 min-w-[220px] flex-1 text-[12px]"
        />
        {search ? (
          <Button size="sm" variant="ghost" onClick={() => setSearch("")} className="h-8 text-[12px]">
            Clear
          </Button>
        ) : null}
        {statusTab === "PENDING" && filteredOrders.length > 0 ? (
          <span className="text-[11px] text-slate-500 pl-1">
            {selectedIds.length} of {filteredOrders.filter((o) => o.status === "PENDING").length} selected
          </span>
        ) : null}
      </div>

      {/* ── Booking Preview Panel — shown when orders are selected ── */}
      {selectedOrders.length > 0 ? (
        <div className={`rounded-xl border p-4 shadow-sm ${
          mergeValidation.valid ? (contractMatch ? "border-emerald-300 bg-emerald-50/60" : "border-amber-300 bg-amber-50/60") : "border-red-300 bg-red-50/60"
        }`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className={`text-[13px] font-semibold ${mergeValidation.valid ? (contractMatch ? "text-emerald-800" : "text-amber-800") : "text-red-800"}`}>
              {!mergeValidation.valid
                ? "⛔ Cannot merge — route conflict"
                : contractMatch
                  ? "✓ Contract found — booking preview"
                  : "⚠ No matching contract found"}
            </p>
            {selectedOrders.length > 1 ? (
              <span className="text-[11px] text-slate-500">{selectedOrders.length} orders selected</span>
            ) : null}
          </div>

          {/* Merge validation errors */}
          {mergeValidation.errors.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {mergeValidation.errors.map((err, i) => (
                <li key={i} className="text-[12px] font-medium text-red-700">• {err}</li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              {/* Customer + Route summary */}
              <PreviewKV label="Customer" value={customerMap.get(selectedOrders[0].customerId)?.name ?? "—"} />
              <PreviewKV
                label="Route"
                value={`${selectedOrders[0].originCity} → ${selectedOrders[selectedOrders.length - 1].destinationCity}`}
              />
              <PreviewKV
                label="Total Quantity"
                value={`${selectedOrders.reduce((s, o) => s + o.quantity, 0).toLocaleString()} ${selectedOrders[0].uom}`}
              />
              <PreviewKV
                label="Total Weight"
                value={`${selectedOrders.reduce((s, o) => s + o.weight, 0)} ${selectedOrders[0].weightUom}`}
              />

              {contractMatch ? (
                <>
                  <PreviewKV label="Rate Type" value={contractMatch.rateType.replace("PER_", "Per ")} />
                  <PreviewKV
                    label="Contract Rate"
                    value={
                      getRateCardUnitRate(contractMatch.rateCard) != null
                        ? `${formatCurrency(getRateCardUnitRate(contractMatch.rateCard)!)}${contractMatch.rateType === "PER_MT" ? "/MT" : contractMatch.rateType === "PER_KM" ? "/KM" : ""}`
                        : "—"
                    }
                  />
                  {contractMatch.rateCard.underloadRate != null ? (
                    <PreviewKV label="Underload Rate" value={formatCurrency(contractMatch.rateCard.underloadRate)} />
                  ) : null}
                  {contractMatch.rateCard.overloadRate != null ? (
                    <PreviewKV label="Overload Rate" value={formatCurrency(contractMatch.rateCard.overloadRate)} />
                  ) : null}
                  <div className="sm:col-span-2 lg:col-span-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Estimated Freight</p>
                    <p className="mt-0.5 text-lg font-bold text-emerald-700">
                      {contractFreight != null ? formatCurrency(contractFreight) : "—"}
                    </p>
                  </div>
                </>
              ) : (
                <div className="sm:col-span-2 lg:col-span-4 mt-1">
                  <p className="text-[12px] text-amber-800">
                    No rate card matches this customer + route + vehicle type combination.
                    You can still create the booking by entering a manual freight amount,
                    or resolve the contract first.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button asChild size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100">
                      <Link to={`/tenant/${tenant.id}/customers/${selectedOrders[0].customerId}`}>
                        View Rate Cards
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* Orders table */}
      <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="hidden lg:grid items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 lg:grid-cols-[32px_120px_130px_120px_minmax(0,1fr)_90px_70px_70px_90px_90px_80px]">
          {statusTab === "PENDING" ? (
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAll}
              className="size-3.5 accent-violet-600"
            />
          ) : <div />}
          <span>Sales Order</span>
          <span>ERP Ref</span>
          <span>Customer</span>
          <span>Route</span>
          <span>Material</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Weight</span>
          <span>Source Sys.</span>
          <span className="text-right text-emerald-700">Est. Freight</span>
          <span>Status</span>
        </div>

        {filteredOrders.length ? (
          <div className="divide-y divide-slate-100">
            {filteredOrders.map((order) => {
              const cust = customerMap.get(order.customerId);
              const mat = order.materialId ? materialMap.get(order.materialId) : null;
              const isSelected = selectedIds.includes(order.id);
              return (
                <div
                  key={order.id}
                  className={`grid items-center gap-2 px-3 py-2.5 text-[12px] transition hover:bg-slate-50/80 lg:grid-cols-[32px_120px_130px_120px_minmax(0,1fr)_90px_70px_70px_90px_90px_80px] ${
                    isSelected ? "bg-violet-50/60 border-l-2 border-l-violet-400" : ""
                  }`}
                >
                  {/* Checkbox */}
                  {statusTab === "PENDING" ? (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(order.id)}
                      className="size-3.5 accent-violet-600"
                    />
                  ) : <div />}

                  {/* Sales Order Number */}
                  <div>
                    <p className="font-semibold text-slate-900 truncate">{order.salesOrderNumber}</p>
                    {order.externalBookingNumber ? (
                      <p className="text-[10.5px] text-slate-400 truncate">{order.externalBookingNumber}</p>
                    ) : null}
                  </div>

                  {/* ERP Reference */}
                  <div>
                    <p className="text-slate-700 truncate">{order.erpReferenceNumber}</p>
                    {order.erpCustomerCode ? (
                      <p className="text-[10.5px] text-slate-400">Code: {order.erpCustomerCode}</p>
                    ) : null}
                  </div>

                  {/* Customer */}
                  <p className="text-slate-700 truncate">{cust?.name ?? order.customerId}</p>

                  {/* Route */}
                  <div>
                    <p className="truncate text-slate-700">
                      <span className="text-slate-500">{order.originCity}</span>
                      <span className="mx-1 text-slate-400">→</span>
                      <span className="text-slate-500">{order.destinationCity}</span>
                    </p>
                    {order.consignorName ? (
                      <p className="text-[10.5px] text-slate-400 truncate">{order.consignorName}</p>
                    ) : null}
                  </div>

                  {/* Material */}
                  <p className="text-slate-700 truncate">{mat?.materialCode ?? order.materialId ?? "—"}</p>

                  {/* Qty */}
                  <p className="text-right text-slate-700">
                    {order.quantity.toLocaleString()} {order.uom}
                  </p>

                  {/* Weight */}
                  <p className="text-right text-slate-700">
                    {order.weight} {order.weightUom}
                  </p>

                  {/* Source System */}
                  <div>
                    <p className="text-slate-700">{order.sourceSystem}</p>
                    <p className="text-[10.5px] font-mono text-slate-400">{order.integrationStatus}</p>
                  </div>

                  {/* Est. Freight — contract preview per order */}
                  {(() => {
                    const preview = order.status === "PENDING" ? orderFreightPreviews.get(order.id) : null;
                    if (!preview) {
                      return (
                        <div className="text-right">
                          <p className="text-[10.5px] text-slate-400">—</p>
                        </div>
                      );
                    }
                    return (
                      <div className="text-right">
                        <p className="font-semibold text-emerald-700">{formatCurrency(preview.freight)}</p>
                        <p className="text-[10px] text-slate-400 truncate">{preview.breakdown}</p>
                      </div>
                    );
                  })()}

                  {/* Status */}
                  {order.status === "PENDING" ? (
                    <span className="inline-flex rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                      PENDING
                    </span>
                  ) : (
                    <div>
                      <span className="inline-flex rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                        MERGED
                      </span>
                      {order.mergedBookingDisplayId ? (
                        <p className="mt-0.5 text-[10px] text-slate-500 truncate">
                          <Link
                            to={`/tenant/${tenant.id}/bookings/${order.mergedBookingId}`}
                            className="text-sky-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {order.mergedBookingDisplayId}
                          </Link>
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-12 text-center">
            <p className="text-[13px] font-semibold text-slate-800">
              {statusTab === "PENDING" && pendingOrders.length === 0
                ? "No pending ERP orders"
                : "No results for this search"}
            </p>
            <p className="mt-1 text-[12px] text-slate-500">
              {statusTab === "PENDING" && pendingOrders.length === 0
                ? 'Use "Import ERP Order" to add sales order data.'
                : "Try clearing the search."}
            </p>
            {statusTab === "PENDING" && pendingOrders.length === 0 && canCreate ? (
              <Button asChild size="sm" className="mt-4">
                <Link to={`/tenant/${tenant.id}/bookings/erp/create`}>
                  <Plus className="size-4" />
                  Import ERP Order
                </Link>
              </Button>
            ) : null}
          </div>
        )}
      </div>

      {/* Merge instruction banner */}
      {statusTab === "PENDING" && pendingOrders.length > 0 && selectedIds.length === 0 ? (
        <div className="rounded-lg border border-violet-200 bg-violet-50/60 px-4 py-2.5 text-[12px] text-violet-700">
          <span className="font-semibold">How to create a booking:</span> Select one or more ERP orders using the
          checkboxes, then click <span className="font-semibold">Merge Selected Orders</span>. Each selected order
          becomes one delivery inside a single booking. The Booking ID and lifecycle (Assignment, LR, POD, Finance)
          only start after merge.
        </div>
      ) : null}

      {/* ── Merge Dialog ── */}
      <Dialog
        open={mergeDialogOpen}
        onOpenChange={(open) => {
          setMergeDialogOpen(open);
          if (!open) setMergeError("");
        }}
        title={
          selectedOrders.length === 1
            ? `Create Booking from ${selectedOrders[0]?.salesOrderNumber ?? "ERP Order"}`
            : `Merge ${selectedOrders.length} ERP Orders into a Booking`
        }
        description={
          selectedOrders.length === 1
            ? "This ERP order becomes 1 delivery. Set freight and pickup time."
            : "Each selected ERP order becomes one delivery inside a single booking."
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={executeMerge}>
              {selectedOrders.length === 1 ? "Create Booking" : `Merge & Create Booking`}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {mergeError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
              {mergeError}
            </div>
          ) : null}

          {/* Contract preview inside dialog */}
          <div className={`rounded-lg border px-3 py-2 text-[12px] ${contractMatch ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            {contractMatch ? (
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span className="text-emerald-700 font-semibold">✓ Contract Found</span>
                <span className="text-slate-600">Rate: <span className="font-semibold">{contractMatch.rateType.replace("PER_", "Per ")}</span></span>
                <span className="text-slate-600">
                  {getRateCardUnitRate(contractMatch.rateCard) != null
                    ? `${formatCurrency(getRateCardUnitRate(contractMatch.rateCard)!)}${contractMatch.rateType === "PER_MT" ? "/MT" : ""}`
                    : "—"}
                </span>
                {contractFreight != null ? (
                  <span className="font-semibold text-emerald-700">Estimated: {formatCurrency(contractFreight)}</span>
                ) : null}
              </div>
            ) : (
              <span className="text-amber-800 font-semibold">⚠ No matching contract — enter freight manually below.</span>
            )}
          </div>

          {/* Orders being merged */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
              {selectedOrders.length === 1 ? "ERP Order" : `Orders being merged (${selectedOrders.length})`}
            </p>
            <div className="max-h-[160px] overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
              {selectedOrders.map((order, index) => {
                const cust = customerMap.get(order.customerId);
                const mat = order.materialId ? materialMap.get(order.materialId) : null;
                return (
                  <div key={order.id} className="flex items-center gap-3 px-3 py-2 text-[12px]">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{order.salesOrderNumber}</p>
                      <p className="truncate text-slate-500">
                        {order.originCity} → {order.destinationCity} ·{" "}
                        {mat?.materialCode ?? "—"} · {order.quantity} {order.uom} / {order.weight} {order.weightUom}
                      </p>
                    </div>
                    <p className="shrink-0 text-[10.5px] text-slate-400">{cust?.name ?? "—"}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Booking details */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Total Freight (₹) *
              </label>
              <Input
                value={mergeFreight}
                onChange={(e) => setMergeFreight(e.target.value)}
                placeholder="e.g. 35000"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Pickup Date &amp; Time *
              </label>
              <Input
                type="datetime-local"
                value={mergePickupDateTime}
                onChange={(e) => setMergePickupDateTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Vehicle Type (optional)
              </label>
              <Select
                value={mergeVehicleTypeId}
                onChange={(e) => setMergeVehicleTypeId(e.target.value)}
              >
                <option value="">Auto / as per orders</option>
                {adminSources.vehicleTypes
                  .filter((v) => v.status === "active")
                  .map((v) => (
                    <option key={v.id} value={v.id}>{v.typeCode}</option>
                  ))}
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600 space-y-0.5">
            <p><span className="font-semibold">Booking ID</span> will be auto-generated on merge.</p>
            <p><span className="font-semibold">Assignment, LR, POD, and Finance</span> start after booking is created.</p>
            <p>Total weight: <span className="font-semibold">{selectedOrders.reduce((s, o) => s + o.weight, 0)} MT</span> across {selectedOrders.length} {selectedOrders.length === 1 ? "delivery" : "deliveries"}.</p>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

// ─── ERP Order draft type ─────────────────────────────────────────────────────

type ErpOrderDraft = {
  customerId: string;
  salesOrderNumber: string;
  erpReferenceNumber: string;
  externalBookingNumber: string;
  erpCustomerCode: string;
  erpPlantCode: string;
  sourceSystem: string;
  materialId: string;
  quantity: string;
  uom: string;
  weight: string;
  weightUom: string;
  vehicleTypeId: string;
  originCity: string;
  originAddressId: string;
  destinationCity: string;
  destinationAddressId: string;
  consignorName: string;
  consignorAddress: string;
  consignorGstin: string;
  consigneeName: string;
  consigneeAddress: string;
  consigneeGstin: string;
  opsRemark: string;
};

const emptyDraft: ErpOrderDraft = {
  customerId: "",
  salesOrderNumber: "",
  erpReferenceNumber: "",
  externalBookingNumber: "",
  erpCustomerCode: "",
  erpPlantCode: "",
  sourceSystem: "SAP",
  materialId: "",
  quantity: "",
  uom: "",
  weight: "",
  weightUom: "MT",
  vehicleTypeId: "",
  originCity: "",
  originAddressId: "",
  destinationCity: "",
  destinationAddressId: "",
  consignorName: "",
  consignorAddress: "",
  consignorGstin: "",
  consigneeName: "",
  consigneeAddress: "",
  consigneeGstin: "",
  opsRemark: "",
};

// ─── Create ERP Order Page ────────────────────────────────────────────────────

export function CreateErpBookingPage() {
  const navigate = useNavigate();
  const { tenant } = useTenantRouteContext();
  const { createOrder } = useErpOrders(tenant.id);
  const adminSources = useBookingAdminSources(tenant.id);

  const [draft, setDraft] = useState<ErpOrderDraft>(emptyDraft);
  const [error, setError] = useState("");
  const [mockDatasetIndex, setMockDatasetIndex] = useState(0);

  const set = (field: keyof ErpOrderDraft, value: string) =>
    setDraft((d) => ({ ...d, [field]: value }));

  const customerMaterials = useMemo(
    () => (draft.customerId ? getCustomerMaterials(adminSources.materials, draft.customerId) : []),
    [adminSources.materials, draft.customerId],
  );

  const customerAddresses: TenantCustomerAddress[] = useMemo(
    () =>
      draft.customerId
        ? getCustomerAddresses(adminSources.customerAddressMap.get(draft.customerId) ?? [])
        : [],
    [adminSources.customerAddressMap, draft.customerId],
  );

  const originAddresses = customerAddresses.filter(
    (a) => !draft.originCity || a.city?.trim().toLowerCase() === draft.originCity.trim().toLowerCase(),
  );
  const destinationAddresses = customerAddresses.filter(
    (a) =>
      !draft.destinationCity ||
      a.city?.trim().toLowerCase() === draft.destinationCity.trim().toLowerCase(),
  );
  const originCities = Array.from(new Set(customerAddresses.map((a) => a.city).filter(Boolean))).sort();
  const destinationCities = Array.from(
    new Set(customerAddresses.map((a) => a.city).filter(Boolean)),
  ).sort();

  const selectedMaterial = customerMaterials.find((m) => m.id === draft.materialId);

  // Customer rate cards — used to drive mock data generation.
  const customerRateCards = useMemo(
    () => (draft.customerId ? adminSources.customerRateCardMap.get(draft.customerId) ?? [] : []),
    [adminSources.customerRateCardMap, draft.customerId],
  );

  function applyMockData() {
    if (!draft.customerId) {
      setError("Select a customer first — mock data is generated from the customer's rate cards and addresses.");
      return;
    }

    // Pick an active rate card with a valid route.
    const activeRateCards = customerRateCards.filter(
      (rc) => rc.status === "active" && (rc.fromCity || rc.fromLocation) && (rc.toCity || rc.toLocation),
    );

    if (activeRateCards.length === 0) {
      setError("No active rate cards found for this customer. Add a rate card to enable mock ERP data generation.");
      return;
    }

    // Cycle through rate cards across repeated clicks.
    const chosenRc = activeRateCards[mockDatasetIndex % activeRateCards.length];
    setMockDatasetIndex((i) => i + 1);

    const fromCity = (chosenRc.fromCity ?? chosenRc.fromLocation ?? "").trim();
    const toCity = (chosenRc.toCity ?? chosenRc.toLocation ?? "").trim();

    // Find matching addresses from customer master.
    const originAddrs = customerAddresses.filter(
      (a) => a.city?.trim().toLowerCase() === fromCity.toLowerCase(),
    );
    const destAddrs = customerAddresses.filter(
      (a) => a.city?.trim().toLowerCase() === toCity.toLowerCase(),
    );

    // Auto-select: first address for each city (or null if none).
    const originAddr = originAddrs[0] ?? null;
    const destAddr = destAddrs[0] ?? null;

    // Vehicle type from rate card.
    const vehicleTypeFromRc = chosenRc.vehicleType
      ? adminSources.vehicleTypes.find((v) => v.typeCode === chosenRc.vehicleType) ?? null
      : null;

    // Material — first customer material, or match rate card if it has material info.
    const mat = customerMaterials[0] ?? null;

    // Generate unique SO/ERP ref numbers.
    const soSuffix = String(Date.now()).slice(-5);
    const soNum = `SO-${soSuffix}`;
    const erpRef = `ERP-SO-${soSuffix}`;

    // Weight/qty appropriate for rate type.
    const weight = "5";
    const quantity = mat ? "100" : "1";
    const uom = mat?.quantityUOM ?? mat?.uom ?? "BAG";

    const rateLabel = chosenRc.rateType === "PER_MT"
      ? `${weight} MT × ${formatCurrency(chosenRc.rate)}/MT`
      : `Per Trip: ${formatCurrency(chosenRc.rate)}`;

    const consignorName = originAddr?.addressName ?? `${fromCity} Plant`;
    const consignorAddr = [originAddr?.addressLine1, originAddr?.city, originAddr?.state, originAddr?.pincode].filter(Boolean).join(", ");
    const consigneeName = destAddr?.addressName ?? `${toCity} Depot`;
    const consigneeAddr = [destAddr?.addressLine1, destAddr?.city, destAddr?.state, destAddr?.pincode].filter(Boolean).join(", ");

    setDraft((d) => ({
      ...d,
      salesOrderNumber: soNum,
      erpReferenceNumber: erpRef,
      externalBookingNumber: `EXT-${soNum}`,
      erpCustomerCode: `ERP-${draft.customerId.slice(-4).toUpperCase()}`,
      erpPlantCode: `PLT-${fromCity.slice(0, 3).toUpperCase()}-01`,
      sourceSystem: d.sourceSystem || "SAP",
      materialId: mat?.id ?? d.materialId,
      quantity,
      uom,
      weight,
      weightUom: "MT",
      vehicleTypeId: vehicleTypeFromRc?.id ?? d.vehicleTypeId,
      originCity: fromCity,
      originAddressId: originAddr?.id ?? "",
      destinationCity: toCity,
      destinationAddressId: destAddr?.id ?? "",
      consignorName,
      consignorAddress: consignorAddr,
      consignorGstin: (originAddr as any)?.gstin ?? "",
      consigneeName,
      consigneeAddress: consigneeAddr,
      consigneeGstin: (destAddr as any)?.gstin ?? "",
      opsRemark: `ERP ${soNum} — ${fromCity} to ${toCity} · ${rateLabel}`,
    }));
    setError("");
  }

  function validate(): string | null {
    if (!draft.customerId) return "Select a customer.";
    if (!draft.salesOrderNumber.trim()) return "Sales Order Number is required.";
    if (!draft.erpReferenceNumber.trim()) return "ERP Reference Number is required.";
    if (!draft.materialId) return "Select a material.";
    if (!draft.quantity || Number(draft.quantity) <= 0) return "Enter a valid quantity.";
    if (!draft.uom.trim()) return "Enter a UOM.";
    if (!draft.weight || Number(draft.weight) <= 0) return "Enter a valid weight.";
    if (!draft.originCity.trim()) return "Enter an origin city.";
    if (!draft.destinationCity.trim()) return "Enter a destination city.";
    return null;
  }

  function handleSubmit() {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");

    createOrder({
      tenantId: tenant.id,
      salesOrderNumber: draft.salesOrderNumber.trim(),
      erpReferenceNumber: draft.erpReferenceNumber.trim(),
      externalBookingNumber: draft.externalBookingNumber.trim() || null,
      erpCustomerCode: draft.erpCustomerCode.trim() || null,
      erpPlantCode: draft.erpPlantCode.trim() || null,
      sourceSystem: draft.sourceSystem,
      integrationStatus: "MOCK",
      customerId: draft.customerId,
      materialId: draft.materialId || null,
      quantity: Number(draft.quantity),
      uom: draft.uom.trim(),
      weight: Number(draft.weight),
      weightUom: draft.weightUom,
      vehicleTypeId: draft.vehicleTypeId || null,
      originCity: draft.originCity.trim(),
      originAddressId: draft.originAddressId || null,
      destinationCity: draft.destinationCity.trim(),
      destinationAddressId: draft.destinationAddressId || null,
      consignorName: draft.consignorName.trim() || null,
      consignorAddress: draft.consignorAddress.trim() || null,
      consignorGstin: draft.consignorGstin.trim() || null,
      consigneeName: draft.consigneeName.trim() || null,
      consigneeAddress: draft.consigneeAddress.trim() || null,
      consigneeGstin: draft.consigneeGstin.trim() || null,
      opsRemark: draft.opsRemark.trim() || null,
      pickupDateTime: null,
      createdBy: "Tenant Admin",
    });

    navigate(`/tenant/${tenant.id}/bookings/erp`);
  }

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-3 px-4 py-3 pb-28">
      <BookingPageHeader
        backTo={`/tenant/${tenant.id}/bookings/erp`}
        backLabel="ERP Orders"
        title="Import ERP Order"
        subtitle="Add an ERP sales order to the staging area. No booking is created yet — merge orders to create a booking."
      />

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-violet-300 bg-violet-50 px-4 py-3">
        <span className="mt-0.5 inline-flex shrink-0 rounded bg-violet-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-800">
          ERP ORDER
        </span>
        <div className="flex-1">
          <p className="text-[12px] font-semibold text-violet-900">
            This creates an ERP Order, not a Booking.
          </p>
          <p className="mt-0.5 text-[11px] text-violet-700">
            No Booking ID, freight, or assignment will be generated here. To create a booking, go to
            ERP Orders, select one or more orders, and click <span className="font-semibold">Merge Selected Orders</span>.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={applyMockData}
          disabled={!draft.customerId}
          className="shrink-0 border-violet-300 bg-white text-violet-700 hover:bg-violet-100 disabled:opacity-50"
          title={!draft.customerId ? "Select a customer first" : "Fill with mock ERP data"}
        >
          Generate Mock ERP Data
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {/* Section 1 — ERP Information */}
      <Section title="ERP Information" step={1}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Customer *">
            <Select
              value={draft.customerId}
              onChange={(e) => {
                set("customerId", e.target.value);
                set("materialId", "");
                set("originAddressId", "");
                set("destinationAddressId", "");
              }}
            >
              <option value="">Select customer</option>
              {adminSources.customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="ERP Reference Number *">
            <Input value={draft.erpReferenceNumber} onChange={(e) => set("erpReferenceNumber", e.target.value)} placeholder="ERP-SO-10001" />
          </Field>
          <Field label="Sales Order Number *">
            <Input value={draft.salesOrderNumber} onChange={(e) => set("salesOrderNumber", e.target.value)} placeholder="SO-10001" />
          </Field>
          <Field label="External Booking Number">
            <Input value={draft.externalBookingNumber} onChange={(e) => set("externalBookingNumber", e.target.value)} placeholder="EXT-BKG-10001" />
          </Field>
          <Field label="ERP Customer Code">
            <Input value={draft.erpCustomerCode} onChange={(e) => set("erpCustomerCode", e.target.value)} placeholder="ACC001" />
          </Field>
          <Field label="ERP Plant Code">
            <Input value={draft.erpPlantCode} onChange={(e) => set("erpPlantCode", e.target.value)} placeholder="PLT-BLR-01" />
          </Field>
          <Field label="Source System">
            <Select value={draft.sourceSystem} onChange={(e) => set("sourceSystem", e.target.value)}>
              <option value="SAP">SAP</option>
              <option value="Oracle">Oracle</option>
              <option value="Tally">Tally</option>
              <option value="Zoho">Zoho</option>
              <option value="Other">Other</option>
            </Select>
          </Field>
          <Field label="Integration Status">
            <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] font-mono text-slate-600">
              MOCK · No backend sync
            </div>
          </Field>
        </div>
      </Section>

      {/* Section 2 — Shipment Information */}
      <Section title="Shipment Information" step={2}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Material *">
            <Select
              value={draft.materialId}
              onChange={(e) => {
                set("materialId", e.target.value);
                const mat = customerMaterials.find((m) => m.id === e.target.value);
                if (mat?.quantityUOM && !draft.uom) set("uom", mat.quantityUOM);
              }}
            >
              <option value="">{draft.customerId ? "Select material" : "Select customer first"}</option>
              {customerMaterials.map((m) => (
                <option key={m.id} value={m.id}>{m.materialCode}</option>
              ))}
            </Select>
            {selectedMaterial?.description ? (
              <p className="mt-1 text-[10.5px] text-slate-500">{selectedMaterial.description}</p>
            ) : null}
          </Field>
          <Field label="Quantity *">
            <div className="flex gap-2">
              <Input value={draft.quantity} onChange={(e) => set("quantity", e.target.value)} placeholder="100" className="flex-1" />
              <Input value={draft.uom} onChange={(e) => set("uom", e.target.value)} placeholder="BAG" className="w-20" />
            </div>
          </Field>
          <Field label="Weight *">
            <div className="flex gap-2">
              <Input value={draft.weight} onChange={(e) => set("weight", e.target.value)} placeholder="5" className="flex-1" />
              <Select value={draft.weightUom} onChange={(e) => set("weightUom", e.target.value)} className="w-24">
                <option value="MT">MT</option>
                <option value="KG">KG</option>
                <option value="TON">TON</option>
              </Select>
            </div>
          </Field>
          <Field label="Vehicle Type">
            <Select value={draft.vehicleTypeId} onChange={(e) => set("vehicleTypeId", e.target.value)}>
              <option value="">Any vehicle</option>
              {adminSources.vehicleTypes.filter((v) => v.status === "active").map((v) => (
                <option key={v.id} value={v.id}>{v.typeCode}</option>
              ))}
            </Select>
          </Field>
          <Field label="Ops Remark" className="sm:col-span-2 xl:col-span-4">
            <Textarea
              value={draft.opsRemark}
              onChange={(e) => set("opsRemark", e.target.value)}
              className="min-h-[40px] text-[12px]"
              placeholder="Optional remark…"
            />
          </Field>
        </div>
      </Section>

      {/* Section 3 — Route */}
      <Section title="Route" step={3}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Origin City *">
            <Input
              list="origin-cities-erp"
              value={draft.originCity}
              onChange={(e) => { set("originCity", e.target.value); set("originAddressId", ""); }}
              placeholder="Bengaluru"
            />
            <datalist id="origin-cities-erp">
              {originCities.map((c) => <option key={c} value={c} />)}
            </datalist>
          </Field>
          <Field label="Origin Address">
            <Select value={draft.originAddressId} onChange={(e) => set("originAddressId", e.target.value)} disabled={!draft.customerId}>
              <option value="">{draft.customerId ? (originAddresses.length ? "Select origin address (optional)" : "No addresses for this city") : "Select customer first"}</option>
              {originAddresses.map((a) => (
                <option key={a.id} value={a.id}>{a.addressName ?? [a.addressLine1, a.city].filter(Boolean).join(", ")}</option>
              ))}
            </Select>
          </Field>
          <Field label="Destination City *">
            <Input
              list="dest-cities-erp"
              value={draft.destinationCity}
              onChange={(e) => { set("destinationCity", e.target.value); set("destinationAddressId", ""); }}
              placeholder="Chennai"
            />
            <datalist id="dest-cities-erp">
              {destinationCities.map((c) => <option key={c} value={c} />)}
            </datalist>
          </Field>
          <Field label="Destination Address">
            <Select value={draft.destinationAddressId} onChange={(e) => set("destinationAddressId", e.target.value)} disabled={!draft.customerId}>
              <option value="">{draft.customerId ? (destinationAddresses.length ? "Select destination address (optional)" : "No addresses for this city") : "Select customer first"}</option>
              {destinationAddresses.map((a) => (
                <option key={a.id} value={a.id}>{a.addressName ?? [a.addressLine1, a.city].filter(Boolean).join(", ")}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>

      {/* Section 4 — Consignor */}
      <Section title="Consignor" step={4}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Consignor Name">
            <Input value={draft.consignorName} onChange={(e) => set("consignorName", e.target.value)} placeholder="ACC Cement Works, Bengaluru" />
          </Field>
          <Field label="Consignor Address">
            <Input value={draft.consignorAddress} onChange={(e) => set("consignorAddress", e.target.value)} placeholder="Survey No. 12, Peenya…" />
          </Field>
          <Field label="Consignor GSTIN">
            <Input value={draft.consignorGstin} onChange={(e) => set("consignorGstin", e.target.value)} placeholder="29AAACA1234A1Z5" />
          </Field>
        </div>
      </Section>

      {/* Section 5 — Consignee */}
      <Section title="Consignee" step={5}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Consignee Name">
            <Input value={draft.consigneeName} onChange={(e) => set("consigneeName", e.target.value)} placeholder="BuildMart Depot, Chennai" />
          </Field>
          <Field label="Consignee Address">
            <Input value={draft.consigneeAddress} onChange={(e) => set("consigneeAddress", e.target.value)} placeholder="Plot 45, Ambattur…" />
          </Field>
          <Field label="Consignee GSTIN">
            <Input value={draft.consigneeGstin} onChange={(e) => set("consigneeGstin", e.target.value)} placeholder="33AABCB5678B1Z2" />
          </Field>
        </div>
      </Section>

      {/* Sticky footer */}
      <div className="sticky bottom-0 z-30 -mx-4 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="text-[12px] text-slate-500">
          No booking created yet — merge orders to generate a Booking ID.
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/tenant/${tenant.id}/bookings/erp`}>Cancel</Link>
          </Button>
          <Button onClick={handleSubmit}>
            Save ERP Order
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-300 border-l-[3px] border-l-violet-500/70 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-violet-500/[0.06] to-transparent px-4 py-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">{step}</span>
        <span className="text-[13px] font-semibold text-slate-900">{title}</span>
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function PreviewKV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-[12px] font-semibold text-slate-900">{value}</p>
    </div>
  );
}
