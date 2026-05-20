import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../../components/common/page-header";
import { TenantPanel } from "../../../components/tenant/tenant-primitives";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { Textarea } from "../../../components/ui/textarea";
import { useTenantPaths } from "../../../hooks/useTenantPaths";
import { useTenantRouteContext } from "../../../hooks/useTenantRouteContext";
import { useBookingAdminSources } from "./hooks/useBookingAdminSources";
import { useTenantBookings } from "./hooks/useTenantBookings";
import {
  evaluateInitialBookingStatus,
  getBookingEditability,
  getLastNonNullRate,
  getRateCardUnitRate,
  normalizeBookingId,
  perMT,
  perTrip,
  shouldRequireVehicleType,
} from "./services/booking-engine";
import {
  convertWeightValue,
  getCustomerAddresses,
  getCustomerMaterials,
  getMaterialUOMMapping,
  getWeightUOMOptions,
  validateRateCard,
} from "./services/booking-selectors";
import type {
  BookingCommercialType,
  BookingInput,
  BookingServiceType,
} from "./types";
import type { TenantCustomerRateCard } from "../../../types/customer";

type DeliveryDraft = {
  id: string;
  trackingId: string;
  originAddressId: string;
  destinationAddressId: string;
  materialId: string;
  quantity: string;
  uom: string;
  weight: string;
  weightUom: string;
  distanceKm: string;
};

type BookingDraft = {
  commercialType: BookingCommercialType;
  modeOfTransport: "ROAD";
  serviceType: BookingServiceType;
  contractRateType: "PER_TRIP" | "PER_KM" | "PER_MT";
  numberOfDeliveries: string;
  customerId: string;
  pickupDateTime: string;
  sourceAddressId: string;
  destinationAddressId: string;
  vehicleTypeId: string;
  enteredRate: string;
  deviationRemark: string;
  opsRemark: string;
  deliveries: DeliveryDraft[];
};

const initialDraft: BookingDraft = {
  commercialType: "CONTRACT",
  modeOfTransport: "ROAD",
  serviceType: "FTL",
  contractRateType: "PER_TRIP",
  numberOfDeliveries: "1",
  customerId: "",
  pickupDateTime: "",
  sourceAddressId: "",
  destinationAddressId: "",
  vehicleTypeId: "",
  enteredRate: "",
  deviationRemark: "",
  opsRemark: "",
  deliveries: [],
};

const PRICING_WEIGHT_UOM = "MT";

function areRateCardArraysEqual(
  left: Array<TenantCustomerRateCard | null>,
  right: Array<TenantCustomerRateCard | null>,
) {
  return left.length === right.length && left.every((item, index) => item?.id === right[index]?.id);
}

export function CreateBookingPage() {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  const { tenant } = useTenantRouteContext();
  const paths = useTenantPaths();
  const isEditMode = Boolean(bookingId);
  const { getBookingById, createBooking, updateBooking } = useTenantBookings(tenant.id);
  const adminSources = useBookingAdminSources(tenant.id);
  const [draft, setDraft] = useState<BookingDraft>(initialDraft);
  const [error, setError] = useState("");
  const [deliveryRateCards, setDeliveryRateCards] = useState<Array<TenantCustomerRateCard | null>>([]);
  const [matchedRateCard, setMatchedRateCard] = useState<TenantCustomerRateCard | null>(null);
  const [rateLookupPending, setRateLookupPending] = useState(false);

  const editingBooking = bookingId ? getBookingById(normalizeBookingId(bookingId)) : null;

  useEffect(() => {
    if (!editingBooking) {
      return;
    }
    setDraft({
      commercialType: editingBooking.commercialType,
      modeOfTransport: editingBooking.modeOfTransport ?? "ROAD",
      serviceType: editingBooking.serviceType,
      contractRateType: editingBooking.pricing.rateType,
      numberOfDeliveries: String(editingBooking.numberOfDeliveries ?? editingBooking.deliveries?.length ?? 1),
      customerId: editingBooking.customerId,
      pickupDateTime: toDateTimeLocal(editingBooking.pickupDate, editingBooking.pickupTime),
      sourceAddressId: editingBooking.sourceAddressId,
      destinationAddressId: editingBooking.destinationAddressId,
      vehicleTypeId: editingBooking.vehicleTypeId ?? "",
      enteredRate: String(editingBooking.pricing.enteredRate),
      deviationRemark: editingBooking.pricing.deviationRemark ?? "",
      opsRemark: editingBooking.opsRemark ?? "",
      deliveries:
        editingBooking.deliveries?.map((delivery, index) => ({
          id: delivery.id,
          trackingId: delivery.trackingId || buildDraftTrackingId(index + 1),
          originAddressId: delivery.originAddressId,
          destinationAddressId: delivery.destinationAddressId,
          materialId: delivery.materialId,
          quantity: String(delivery.quantity ?? 0),
          uom: delivery.uom ?? "",
          weight: String(delivery.weight ?? 0),
          weightUom: delivery.weightUom ?? editingBooking.weightUom ?? editingBooking.uom,
          distanceKm: delivery.distanceKm != null ? String(delivery.distanceKm) : "",
        })) ?? [],
    });
  }, [editingBooking]);

  const selectedCustomer = draft.customerId ? adminSources.customerMap.get(draft.customerId) ?? null : null;
  const customerMaterials = useMemo(
    () => (draft.customerId ? getCustomerMaterials(adminSources.materials, draft.customerId) : []),
    [adminSources.materials, draft.customerId],
  );
  const customerAddresses = useMemo(
    () => (draft.customerId ? getCustomerAddresses(adminSources.customerAddressMap.get(draft.customerId) ?? []) : []),
    [adminSources.customerAddressMap, draft.customerId],
  );
  const customerRateCards = draft.customerId ? adminSources.customerRateCardMap.get(draft.customerId) ?? [] : [];
  const weightUOMOptions = useMemo(
    () => getWeightUOMOptions(adminSources.uomDefinitions, selectedCustomer),
    [adminSources.uomDefinitions, selectedCustomer],
  );
  const selectedVehicleTypeCode =
    draft.vehicleTypeId
      ? adminSources.vehicleTypes.find((vehicleType) => vehicleType.id === draft.vehicleTypeId)?.typeCode ?? null
      : null;

  const deliveries = draft.deliveries;
  const totalQuantity = deliveries.reduce((sum, delivery) => sum + Number(delivery.quantity || 0), 0);
  const totalWeight = deliveries.reduce(
    (sum, delivery) =>
      sum + convertWeightValue(Number(delivery.weight || 0), delivery.weightUom || PRICING_WEIGHT_UOM, PRICING_WEIGHT_UOM),
    0,
  );
  const maxDistance = deliveries.reduce((max, delivery) => Math.max(max, Number(delivery.distanceKm || 0)), 0);
  const uniqueMaterialIds = Array.from(new Set(deliveries.map((delivery) => delivery.materialId).filter(Boolean)));
  const rateType = draft.commercialType === "SPOT" ? "PER_TRIP" : draft.contractRateType;
  const laneFound = Boolean(matchedRateCard);
  const baseRate = draft.commercialType === "CONTRACT" ? getRateCardUnitRate(matchedRateCard) : null;
  const numericRate = draft.commercialType === "SPOT" ? Number(draft.enteredRate || 0) : Number(baseRate || 0);
  const calculatedFreight =
    draft.commercialType === "SPOT"
      ? numericRate
      : rateType === "PER_KM"
        ? 0
        : rateType === "PER_MT"
          ? perMT(numericRate, totalWeight)
          : perTrip(numericRate);
  const deviationPercent = 0;
  const approvalLevel = null;
  const requiresVehicleType = shouldRequireVehicleType(rateType, draft.commercialType, draft.serviceType);
  const submitStatus = evaluateInitialBookingStatus(draft.commercialType, deviationPercent);
  const deliveryCount = Math.max(1, deliveries.length || Number.parseInt(draft.numberOfDeliveries || "1", 10) || 1);

  useEffect(() => {
    setDraft((current) => {
      if (current.deliveries.length) {
        return current;
      }
      return {
        ...current,
        deliveries: [createEmptyDeliveryDraft(1)],
        numberOfDeliveries: "1",
      };
    });
  }, []);

  useEffect(() => {
    if (draft.commercialType !== "CONTRACT" || !selectedCustomer || !draft.customerId || !deliveries.length) {
      setDeliveryRateCards((current) => (current.length ? [] : current));
      setMatchedRateCard((current) => (current !== null ? null : current));
      setRateLookupPending((current) => (current ? false : current));
      return;
    }

    const rootSourceAddressId = deliveries[0]?.originAddressId || draft.sourceAddressId;
    if (!rootSourceAddressId) {
      const emptyRateCards = deliveries.map(() => null);
      setDeliveryRateCards((current) => (areRateCardArraysEqual(current, emptyRateCards) ? current : emptyRateCards));
      setMatchedRateCard((current) => (current !== null ? null : current));
      setRateLookupPending((current) => (current ? false : current));
      return;
    }

    setRateLookupPending(true);
    const timer = window.setTimeout(() => {
      let cumulativeWeight = 0;
      const nextRateCards = deliveries.map((delivery) => {
        cumulativeWeight += convertWeightValue(
          Number(delivery.weight || 0),
          delivery.weightUom || PRICING_WEIGHT_UOM,
          PRICING_WEIGHT_UOM,
        );
        const source =
          customerAddresses.find(
            (address) => address.id === (delivery.originAddressId || rootSourceAddressId),
          ) ?? null;
        const destination =
          customerAddresses.find((address) => address.id === delivery.destinationAddressId) ?? null;
        if (!source || !destination) {
          return null;
        }
        return validateRateCard(
          {
            bookingDate: draft.pickupDateTime ? draft.pickupDateTime.slice(0, 10) : null,
            customerId: draft.customerId,
            rateMatchingBasis: selectedCustomer.rateMatchingBasis ?? "LANE_TO_LANE",
            lane: buildRateValidationLane(source.addressName, destination.addressName),
            fromCity: source.city,
            toCity: destination.city,
            fromLocation: source.addressName,
            toLocation: destination.addressName,
            fromPincode: source.pincode,
            toPincode: destination.pincode,
            vehicleType: selectedVehicleTypeCode,
            rateType: draft.contractRateType,
            weight: draft.contractRateType === "PER_MT" ? cumulativeWeight : null,
          },
          customerRateCards,
        );
      });
      const nextMatchedRateCard = getLastNonNullRate(nextRateCards);
      setDeliveryRateCards((current) => (areRateCardArraysEqual(current, nextRateCards) ? current : nextRateCards));
      setMatchedRateCard((current) => (current?.id === nextMatchedRateCard?.id ? current : nextMatchedRateCard));
      setRateLookupPending(false);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [
    customerAddresses,
    customerRateCards,
    deliveries,
    draft.commercialType,
    draft.contractRateType,
    draft.customerId,
    draft.pickupDateTime,
    draft.sourceAddressId,
    selectedCustomer,
    selectedVehicleTypeCode,
  ]);

  function resetForCustomer(customerId: string) {
    setDraft({
      ...initialDraft,
      customerId,
      commercialType: draft.commercialType,
      serviceType: draft.serviceType,
      modeOfTransport: draft.modeOfTransport,
      deliveries: [createEmptyDeliveryDraft(1)],
    });
    setError("");
  }

  function updateDelivery(index: number, field: keyof DeliveryDraft, value: string) {
    setDraft((current) => {
      const nextDeliveries = current.deliveries.map((delivery, deliveryIndex) => {
        if (deliveryIndex !== index) {
          return delivery;
        }

        const updatedDelivery = { ...delivery, [field]: value };
        const selectedMaterial = customerMaterials.find((material) => material.id === updatedDelivery.materialId) ?? null;

        if (field === "materialId") {
          updatedDelivery.uom = selectedMaterial?.quantityUOM ?? selectedMaterial?.uom ?? updatedDelivery.uom;
        }
        if (field === "weightUom" && delivery.weight) {
          const convertedWeight = convertWeightValue(Number(delivery.weight || 0), delivery.weightUom || "KG", value);
          updatedDelivery.weight = formatUOMWeight(convertedWeight);
        }
        if (field === "materialId" && !updatedDelivery.uom) {
          const fallbackMaterial = customerMaterials.find((material) => material.id === value);
          if (fallbackMaterial) {
            updatedDelivery.uom = fallbackMaterial.quantityUOM ?? fallbackMaterial.uom;
          }
        }

        const mapping = getMaterialUOMMapping(selectedMaterial, selectedCustomer, adminSources.uomMappings);
        if (mapping) {
          if (field === "quantity" || field === "materialId") {
            updatedDelivery.weightUom = mapping.weightUOM;
            const nextQuantity = Number(field === "quantity" ? value : updatedDelivery.quantity || 0);
            if (nextQuantity > 0) {
              updatedDelivery.weight = formatUOMWeight(nextQuantity * mapping.conversionValue);
            }
          } else if (!updatedDelivery.weightUom) {
            updatedDelivery.weightUom = mapping.weightUOM;
          }
        }

        return updatedDelivery;
      });

      return { ...current, deliveries: nextDeliveries, numberOfDeliveries: String(nextDeliveries.length) };
    });
  }

  function addDelivery() {
    setDraft((current) => {
      const nextIndex = current.deliveries.length + 1;
      const previousDelivery = current.deliveries[current.deliveries.length - 1];
      const nextDeliveries = [
        ...current.deliveries,
        {
          ...createEmptyDeliveryDraft(nextIndex),
          originAddressId: previousDelivery?.destinationAddressId ?? "",
        },
      ];
      return { ...current, deliveries: nextDeliveries, numberOfDeliveries: String(nextDeliveries.length) };
    });
  }

  function removeDelivery(index: number) {
    setDraft((current) => {
      if (current.deliveries.length === 1) {
        return current;
      }
      const nextDeliveries = current.deliveries
        .filter((_, deliveryIndex) => deliveryIndex !== index)
        .map((delivery, deliveryIndex) => ({
          ...delivery,
          trackingId: buildDraftTrackingId(deliveryIndex + 1),
        }));
      return { ...current, deliveries: nextDeliveries, numberOfDeliveries: String(nextDeliveries.length) };
    });
  }

  function validateForSubmit() {
    if (!draft.customerId) {
      return "Select customer.";
    }
    if (!draft.pickupDateTime) {
      return "Select pickup date and time.";
    }
    if (draft.commercialType === "SPOT" && (!draft.enteredRate || Number(draft.enteredRate) <= 0)) {
      return "Enter valid freight rate.";
    }
    if (draft.commercialType === "CONTRACT" && !draft.contractRateType) {
      return "Select contract rate type.";
    }
    if (requiresVehicleType && !draft.vehicleTypeId) {
      return "Vehicle type required.";
    }
    if (draft.commercialType === "CONTRACT" && !laneFound) {
      return "No rate found for selected configuration";
    }
    if (draft.commercialType === "CONTRACT" && rateType === "PER_MT" && totalWeight <= 0) {
      return "Enter delivery weight to calculate PER MT freight.";
    }
    if (!deliveries.length) {
      return "Add delivery rows.";
    }
    const incompleteDelivery = deliveries.find(
      (delivery) =>
        !delivery.originAddressId ||
        !delivery.destinationAddressId ||
        !delivery.materialId ||
        Number(delivery.quantity) <= 0 ||
        !delivery.uom ||
        Number(delivery.weight) <= 0 ||
        !delivery.weightUom,
    );
    if (incompleteDelivery) {
      return "Complete all delivery rows.";
    }
    return null;
  }

  function buildPayload(statusOverride: BookingInput["status"]): BookingInput {
    const pickupDate = draft.pickupDateTime ? draft.pickupDateTime.slice(0, 10) : null;
    const pickupTime = draft.pickupDateTime ? draft.pickupDateTime.slice(11, 16) : null;
    const firstDelivery = deliveries[0];
    const lastDelivery = deliveries[deliveries.length - 1] ?? firstDelivery;

    return {
      modeOfTransport: draft.modeOfTransport,
      numberOfDeliveries: deliveryCount,
      customerId: draft.customerId,
      materialIds: uniqueMaterialIds,
      sourceAddressId: firstDelivery?.originAddressId || draft.sourceAddressId,
      destinationAddressId: lastDelivery?.destinationAddressId || draft.destinationAddressId,
      consignorAddressId: firstDelivery?.originAddressId || draft.sourceAddressId,
      consigneeAddressId: lastDelivery?.destinationAddressId || draft.destinationAddressId,
      laneKey: matchedRateCard?.lanes ?? null,
      laneFound,
      poNumber: null,
      doNumber: null,
      ewayBillNumber: null,
      pickupDate,
      pickupTime,
      tat: null,
      serviceType: draft.serviceType,
      commercialType: draft.commercialType,
      pricing: {
        rateType,
        contractRateCardId: matchedRateCard?.id ?? null,
        l1Rate: baseRate,
        enteredRate: numericRate,
        calculatedFreight,
        distanceKm: rateType === "PER_KM" ? maxDistance : null,
        deviationPercent,
        approvalLevel,
        deviationRemark: draft.commercialType === "SPOT" ? draft.deviationRemark.trim() || null : null,
        isAutoApproved: draft.commercialType === "SPOT" || draft.commercialType === "CONTRACT",
      },
      chargeType: null,
      subBrand: null,
      quantity: totalQuantity,
      weight: Number(totalWeight.toFixed(3)),
      uom: firstDelivery?.uom || "NOS",
      weightUom: PRICING_WEIGHT_UOM,
      vehicleTypeId: draft.vehicleTypeId || null,
      lrType: editingBooking?.lrType ?? "AUTO",
      status: statusOverride,
      opsRemark: draft.opsRemark.trim() || null,
      pod: editingBooking?.pod ?? null,
      documents: editingBooking?.documents ?? [],
      expenses: editingBooking?.expenses ?? [],
      deliveries: deliveries.map((delivery, index) => ({
        id: delivery.id,
        deliveryNo: index + 1,
        trackingId: delivery.trackingId,
        originAddressId: delivery.originAddressId,
        destinationAddressId: delivery.destinationAddressId,
        materialId: delivery.materialId,
        quantity: Number(delivery.quantity || 0),
        uom: delivery.uom,
        weight: Number(delivery.weight || 0),
        weightUom: delivery.weightUom,
        distanceKm: delivery.distanceKm ? Number(delivery.distanceKm) : null,
        status: statusOverride === "DRAFT" ? "DRAFT" : submitStatus,
        lrNumber: editingBooking?.deliveries?.[index]?.lrNumber ?? null,
        pod: editingBooking?.deliveries?.[index]?.pod ?? null,
      })),
    };
  }

  function buildRemarksAndTimeline(finalStatus: BookingInput["status"]) {
    const timestamp = new Date().toISOString();
    return {
      remarks: [
        ...(draft.opsRemark.trim()
          ? [{ id: `booking-remark-${Date.now()}-ops`, timestamp, actor: "Tenant Admin", type: "OPS_REMARK" as const, message: draft.opsRemark.trim() }]
          : []),
        ...(draft.deviationRemark.trim()
          ? [{ id: `booking-remark-${Date.now()}-deviation`, timestamp, actor: "Tenant Admin", type: "RATE_DEVIATION_REMARK" as const, message: draft.deviationRemark.trim() }]
          : []),
      ],
      statusTimeline:
        finalStatus === "DRAFT"
          ? [{ id: `booking-status-${Date.now()}-draft`, status: "DRAFT" as const, timestamp, actor: "Tenant Admin", note: "Booking saved as draft." }]
          : [
              { id: `booking-status-${Date.now()}-draft`, status: "DRAFT" as const, timestamp, actor: "Tenant Admin", note: "Booking created." },
              { id: `booking-status-${Date.now()}-routed`, status: finalStatus, timestamp, actor: "System", note: finalStatus === "PENDING_RATE_APPROVAL" ? "Rate deviation routed to approval." : "Booking ready for assignment." },
            ],
    };
  }

  function persistBooking(statusOverride: BookingInput["status"], validateAll: boolean) {
    if (validateAll) {
      const validationError = validateForSubmit();
      if (validationError) {
        setError(validationError);
        return;
      }
    } else if (!draft.customerId) {
      setError("Select customer before saving draft.");
      return;
    }

    const payload = buildPayload(statusOverride);
    setError("");

    if (isEditMode && editingBooking) {
      updateBooking(editingBooking.id, payload);
      navigate(paths.booking(editingBooking.id));
      return;
    }

    const audit = buildRemarksAndTimeline(statusOverride);
    const created = createBooking({
      ...payload,
      createdBy: "Tenant Admin",
      assignment: null,
      remarks: audit.remarks,
      statusTimeline: audit.statusTimeline,
    });
    navigate(paths.booking(created.id));
  }

  if (isEditMode && editingBooking && !getBookingEditability(editingBooking.status)) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="TMS" title="Edit Booking" description="Only draft and pending bookings can be edited." />
        <TenantPanel title="Editing Locked">
          <Button asChild>
            <Link to={paths.booking(editingBooking.id)}>Back to Booking Details</Link>
          </Button>
        </TenantPanel>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-4 py-5 xl:px-6">
      <PageHeader
        eyebrow="TMS"
        title={isEditMode ? "Edit Booking" : "Create Booking"}
        description="Delivery-first booking flow with clearer pricing and sticky control summary."
      />

      {error ? <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

      <div className="sticky top-3 z-20 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Summary label="Customer" value={selectedCustomer?.name ?? "Select customer"} />
          <Summary label="Booking Type" value={draft.commercialType === "CONTRACT" ? "Contract" : "Spot"} />
          <Summary label="Total Freight" value={calculatedFreight ? `₹${calculatedFreight.toLocaleString()}` : "-"} />
          <Summary label="No. of Deliveries" value={String(deliveryCount)} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr,0.8fr]">
        <QuickStat label="Customer" value={selectedCustomer?.name ?? "Select customer"} tone="blue" />
        <QuickStat label="Commercial Type" value={draft.commercialType === "CONTRACT" ? "Contract Pricing" : "Spot Pricing"} tone="indigo" />
        <QuickStat label="Pricing State" value={laneFound || draft.commercialType === "SPOT" ? "Ready to price" : "Lane not mapped"} tone={laneFound || draft.commercialType === "SPOT" ? "emerald" : "amber"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.55fr]">
        <div className="space-y-4">
          <SectionCard title="Booking Basics">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Customer">
                <Select value={draft.customerId} onChange={(event) => resetForCustomer(event.target.value)}>
                  <option value="">Select customer</option>
                  {adminSources.customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Booking Commercial Type">
                <Select
                  value={draft.commercialType}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      commercialType: event.target.value as BookingCommercialType,
                      enteredRate: "",
                    }))
                  }
                >
                  <option value="CONTRACT">Contract</option>
                  <option value="SPOT">Spot</option>
                </Select>
              </Field>
              <Field label="Mode">
                <Input value={draft.modeOfTransport} disabled />
              </Field>
              <Field label="Service Type">
                <Select value={draft.serviceType} onChange={(event) => setDraft((current) => ({ ...current, serviceType: event.target.value as BookingServiceType }))}>
                  <option value="FTL">FTL</option>
                  <option value="PTL">PTL</option>
                </Select>
              </Field>
              {draft.customerId && draft.commercialType === "CONTRACT" ? (
                <Field label="Rate Type">
                  <Select
                    value={draft.contractRateType}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        contractRateType: event.target.value as BookingDraft["contractRateType"],
                      }))
                    }
                  >
                    <option value="PER_MT">PER_MT</option>
                    <option value="PER_KM">PER_KM</option>
                    <option value="PER_TRIP">PER_TRIP</option>
                  </Select>
                </Field>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Deliveries">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Delivery Planner</p>
                <p className="text-xs text-muted-foreground">Delivery 1 is ready. Route is captured only inside each delivery.</p>
              </div>
              <Button type="button" size="sm" onClick={addDelivery}>+ Add Delivery</Button>
            </div>
            <div className="mt-3 space-y-3">
              {deliveries.map((delivery, index) => {
                const originName = customerAddresses.find((address) => address.id === delivery.originAddressId)?.addressName ?? "Select origin";
                const destinationName = customerAddresses.find((address) => address.id === delivery.destinationAddressId)?.addressName ?? "Select destination";
                const selectedMaterial = customerMaterials.find((material) => material.id === delivery.materialId) ?? null;
                const laneLabel = deliveryRateCards[index]?.lanes ?? `${originName} → ${destinationName}`;
                const mapping = getMaterialUOMMapping(selectedMaterial, selectedCustomer, adminSources.uomMappings);

                return (
                  <div key={delivery.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">Delivery {index + 1}</p>
                        <p className="mt-1 text-sm text-slate-600">{originName} → {destinationName}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant={deliveryRateCards[index] ? "success" : "warning"}>{deliveryRateCards[index] ? "Rate matched" : "Rate open"}</Badge>
                          <Badge variant="outline">{mapping ? `${mapping.source} weight mapping` : "Manual weight"}</Badge>
                        </div>
                      </div>
                      {deliveries.length > 1 ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => removeDelivery(index)}>Remove</Button>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-3 xl:grid-cols-2">
                      <Field label="Origin">
                        <Select value={delivery.originAddressId} onChange={(event) => updateDelivery(index, "originAddressId", event.target.value)}>
                          <option value="">Select origin</option>
                          {customerAddresses.map((address) => (
                            <option key={address.id} value={address.id}>{address.addressName}</option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Destination">
                        <Select value={delivery.destinationAddressId} onChange={(event) => updateDelivery(index, "destinationAddressId", event.target.value)}>
                          <option value="">Select destination</option>
                          {customerAddresses.filter((address) => address.id !== delivery.originAddressId).map((address) => (
                            <option key={address.id} value={address.id}>{address.addressName}</option>
                          ))}
                        </Select>
                      </Field>
                    </div>

                    <div className="mt-3 grid gap-3 xl:grid-cols-[1.2fr,0.9fr,1.1fr]">
                      <Field label="Material">
                        <Select value={delivery.materialId} onChange={(event) => updateDelivery(index, "materialId", event.target.value)}>
                          <option value="">Select material</option>
                          {customerMaterials.map((material) => (
                            <option key={material.id} value={material.id}>{material.materialCode}</option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Quantity">
                        <div className="grid grid-cols-[1fr_110px] gap-2">
                          <Input value={delivery.quantity} onChange={(event) => updateDelivery(index, "quantity", event.target.value)} />
                          <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-text">
                            {delivery.uom || selectedMaterial?.quantityUOM || "UOM"}
                          </div>
                        </div>
                      </Field>
                      <Field label="Weight">
                        <div className="grid grid-cols-[1fr_120px] gap-2">
                          <Input value={delivery.weight} onChange={(event) => updateDelivery(index, "weight", event.target.value)} />
                          <Select value={delivery.weightUom} onChange={(event) => updateDelivery(index, "weightUom", event.target.value)}>
                            <option value="">Weight UOM</option>
                            {weightUOMOptions.map((uom) => (
                              <option key={uom} value={uom}>{uom}</option>
                            ))}
                          </Select>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {mapping
                            ? `Auto from 1 ${mapping.quantityUOM} = ${mapping.conversionValue} ${mapping.weightUOM}. Weight still editable.`
                            : "No mapping found. Enter weight manually or pick a mapped material."}
                        </p>
                      </Field>
                    </div>

                    <div className={`mt-3 grid gap-3 ${rateType === "PER_KM" ? "xl:grid-cols-[220px_1fr]" : ""}`}>
                      {rateType === "PER_KM" ? (
                        <Field label="Distance">
                          <Input value={delivery.distanceKm} onChange={(event) => updateDelivery(index, "distanceKm", event.target.value)} placeholder="Distance in KM" />
                        </Field>
                      ) : null}
                      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">Lane</p>
                        <p className="mt-1 text-sm text-text">{laneLabel}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Pricing">
            <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {draft.commercialType === "SPOT" ? (
                    <Field label="Spot Rate (Manual)">
                      <Input value={draft.enteredRate} onChange={(event) => setDraft((current) => ({ ...current, enteredRate: event.target.value }))} />
                    </Field>
                  ) : (
                    <Field label="Live Rate Display">
                      <Input value={baseRate != null ? String(baseRate) : ""} placeholder="No rate found" disabled />
                    </Field>
                  )}
                  <Field label="Rate Type">
                    <Input value={rateType} disabled />
                  </Field>
                  <Field label="Matched Rate">
                    <Input value={baseRate != null ? String(baseRate) : ""} placeholder="Not configured" disabled />
                  </Field>
                  <Field label={rateType === "PER_MT" ? "Vehicle Type Preference" : "Vehicle Type"}>
                    <Select value={draft.vehicleTypeId} onChange={(event) => setDraft((current) => ({ ...current, vehicleTypeId: event.target.value }))}>
                      <option value="">{rateType === "PER_MT" ? "Optional vehicle type" : "Select vehicle type"}</option>
                      {adminSources.vehicleTypes.filter((vehicleType) => vehicleType.status === "active").map((vehicleType) => (
                        <option key={vehicleType.id} value={vehicleType.id}>
                          {vehicleType.typeCode}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Pickup Date & Time">
                    <Input type="datetime-local" value={draft.pickupDateTime} onChange={(event) => setDraft((current) => ({ ...current, pickupDateTime: event.target.value }))} />
                  </Field>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">Calculated Freight</p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-text">{calculatedFreight ? `₹${calculatedFreight.toLocaleString()}` : "-"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {draft.commercialType === "SPOT"
                        ? "Manual freight entered by ops."
                        : rateType === "PER_KM"
                          ? "PER_KM pricing is a placeholder in the frontend for now."
                          : `Based on ${rateType.toLowerCase()} pricing.`}
                    </p>
                    {draft.commercialType === "CONTRACT" && !rateLookupPending && !laneFound ? (
                      <p className="mt-2 text-xs font-medium text-amber-700">No rate found for selected configuration</p>
                    ) : null}
                    {rateLookupPending ? <p className="mt-2 text-xs text-muted-foreground">Refreshing rate…</p> : null}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {draft.commercialType === "SPOT" ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Manual Freight</p>
                    <p className="mt-2 text-sm font-medium text-text">Spot Rate (Manual)</p>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-text">{numericRate ? `₹${numericRate.toLocaleString()}` : "₹0"}</p>
                    <p className="mt-2 text-sm text-muted-foreground">No rate card is used for spot bookings.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Contract Pricing</p>
                    <div className="mt-4 space-y-3">
                      <Summary label="Rate Type" value={rateType} />
                      <Summary label="Rate Matching Basis" value={selectedCustomer?.rateMatchingBasis ?? "LANE_TO_LANE"} />
                      <Summary label="Matched Rate" value={baseRate != null ? `₹${baseRate.toLocaleString()}` : "Not configured"} />
                      <Summary label="Calculated Freight" value={calculatedFreight ? `₹${calculatedFreight.toLocaleString()}` : "-"} />
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {rateLookupPending ? (
                        <>
                          <Badge variant="outline">Validating</Badge>
                          <span>Refreshing contract rate for the latest delivery.</span>
                        </>
                      ) : laneFound ? (
                        <>
                          <Badge variant="success">Rate Card Matched</Badge>
                          <span>{matchedRateCard?.lanes ?? "Latest delivery destination used for pricing."}</span>
                        </>
                      ) : (
                        <>
                          <Badge variant="warning">No Rate Card</Badge>
                          <span>No rate found for selected configuration</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>
        </div>

        <TenantPanel title="Commercial Summary" description="Live booking totals and pricing output.">
          <div className="space-y-3">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Pricing Breakdown</p>
              <div className="mt-3 grid gap-2 text-sm">
                <SignalRow label="Rate" value={numericRate ? `₹${numericRate.toLocaleString()}` : "-"} />
                <SignalRow
                  label="Basis"
                  value={
                    rateType === "PER_MT"
                      ? `${formatUOMWeight(totalWeight)} ${PRICING_WEIGHT_UOM}`
                      : rateType === "PER_KM"
                        ? `${maxDistance || 0} KM`
                        : `${deliveryCount} trip`
                  }
                />
                <SignalRow label="Freight" value={calculatedFreight ? `₹${calculatedFreight.toLocaleString()}` : "-"} />
              </div>
            </div>
            <Summary label="Booking Commercial Type" value={draft.commercialType === "CONTRACT" ? "Contract" : "Spot"} />
            <Summary label="Rate Type" value={rateType} />
            <Summary label="Deliveries" value={String(deliveryCount)} />
            <Summary label="Total Quantity" value={totalQuantity ? `${totalQuantity} ${deliveries[0]?.uom || ""}`.trim() : "-"} />
            <Summary label="Total Weight" value={totalWeight ? `${formatUOMWeight(totalWeight)} ${PRICING_WEIGHT_UOM}` : "-"} />
            <Summary label="Billing Distance" value={rateType === "PER_KM" && maxDistance ? `${maxDistance} KM` : "-"} />
            <Summary label="Final Freight" value={calculatedFreight ? `₹${calculatedFreight.toLocaleString()}` : "-"} />
            <Field label="Ops Remark">
              <Textarea value={draft.opsRemark} onChange={(event) => setDraft((current) => ({ ...current, opsRemark: event.target.value }))} className="min-h-[88px]" />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => persistBooking("DRAFT", false)}>
                Save Draft
              </Button>
              <Button onClick={() => persistBooking(submitStatus, true)}>Submit Booking</Button>
            </div>
          </div>
        </TenantPanel>
      </div>
    </div>
  );
}

function buildDraftTrackingId(index: number) {
  return `TRK-DRAFT-${String(index).padStart(2, "0")}`;
}

function createEmptyDeliveryDraft(index: number): DeliveryDraft {
  return {
    id: `draft-delivery-${index}`,
    trackingId: buildDraftTrackingId(index),
    originAddressId: "",
    destinationAddressId: "",
    materialId: "",
    quantity: "",
    uom: "",
    weight: "",
    weightUom: "",
    distanceKm: "",
  };
}

function buildRateValidationLane(fromLabel?: string | null, toLabel?: string | null) {
  const from = fromLabel?.trim();
  const to = toLabel?.trim();
  if (!from || !to) {
    return "";
  }
  return `${from}-${to}`.toUpperCase().replace(/\s+/g, "");
}

function toDateTimeLocal(date?: string | null, time?: string | null) {
  if (!date) {
    return "";
  }
  return `${date}T${time ?? "00:00"}`;
}

function formatUOMWeight(value: number) {
  if (!Number.isFinite(value)) {
    return "";
  }
  return value.toFixed(4).replace(/\.?0+$/, "");
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return <TenantPanel title={title}>{children}</TenantPanel>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</label>
      {children}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white px-3 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold text-text">{value}</span>
    </div>
  );
}

function SignalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/15 bg-white px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-text">{value}</span>
    </div>
  );
}

function QuickStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "indigo" | "emerald" | "amber";
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-text">{value}</p>
    </div>
  );
}
