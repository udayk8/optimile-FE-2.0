import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/shared/components/common/page-header";
import { TenantPanel } from "@tms-booking/modules/tenant-admin/components/tenant-primitives";
import { useTenantAccess } from "@tms-booking/modules/tenant-admin/hooks/useTenantAccess";
import { useTenantCustomers } from "@tms-booking/modules/tenant-admin/hooks/useTenantCustomers";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { formatCurrency } from "@/shared/lib/format-currency";
import { isDirectCustomerTenant } from "@/shared/lib/tenant-config";
import { useTenantRouteContext } from "@tms-booking/modules/tenant-admin/hooks/useTenantRouteContext";
import { useBookingAdminSources } from "@/modules/tms/booking/hooks/useBookingAdminSources";
import { useTenantBookings } from "@/modules/tms/booking/hooks/useTenantBookings";
import { useBookingPaths } from "@tms-booking/hooks/useBookingPaths";
import {
  evaluateInitialBookingStatus,
  getBookingEditability,
  getLastNonNullRate,
  getRateCardUnitRate,
  normalizeBookingId,
  perMT,
  perTrip,
  shouldRequireVehicleType,
} from "@/modules/tms/booking/services/booking-engine";
import {
  convertWeightValue,
  getCustomerAddresses,
  getEffectiveRateMatchingBasis,
  getCustomerMaterials,
  getMaterialUOMMapping,
  getWeightUOMOptions,
  validateRateCard,
} from "@/modules/tms/booking/services/booking-selectors";
import type {
  BookingCommercialType,
  BookingInput,
  BookingServiceType,
} from "@/modules/tms/booking/types";
import type {
  CustomerAddressTag,
  TenantCustomerAddress,
  TenantCustomerAddressInput,
  TenantCustomerRateCard,
} from "@/types/customer";

type DeliveryDraft = {
  id: string;
  trackingId: string;
  originCity: string;
  originAddressId: string;
  destinationCity: string;
  destinationAddressId: string;
  destinationAddressSource: "SAVED_ADDRESS" | "FROM_INVOICE_LATER";
  consigneeFinalizationStatus: "PENDING" | "CONFIRMED";
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

type AddressFieldTarget = "originAddressId" | "destinationAddressId";

type BookingAddressUsage = "ORIGIN" | "DESTINATION" | "BOTH";

type BookingAddressDraft = {
  contactCode: string;
  contactPersonName: string;
  phone: string;
  email: string;
  addressName: string;
  addressLine1: string;
  addressLine2: string;
  pincode: string;
  country: string;
  state: string;
  city: string;
  gstin: string;
  addressUsage: BookingAddressUsage;
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

export function CreateBookingPage() {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  const { tenant } = useTenantRouteContext();
  const paths = useBookingPaths();
  const access = useTenantAccess();
  const isEditMode = Boolean(bookingId);
  const canCreateBooking = access.hasFeaturePermission("TMS", "CREATE_BOOKING", "create");
  const { getBookingById, createBooking, updateBooking } = useTenantBookings(tenant.id);
  const { createAddress } = useTenantCustomers(tenant.id);
  const adminSources = useBookingAdminSources(tenant.id);
  const [draft, setDraft] = useState<BookingDraft>(initialDraft);
  const [error, setError] = useState("");
  const [deliveryRateCards, setDeliveryRateCards] = useState<Array<TenantCustomerRateCard | null>>([]);
  const [matchedRateCard, setMatchedRateCard] = useState<TenantCustomerRateCard | null>(null);
  const [rateLookupPending, setRateLookupPending] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [addressDialogField, setAddressDialogField] = useState<AddressFieldTarget>("destinationAddressId");
  const [addressDialogDeliveryIndex, setAddressDialogDeliveryIndex] = useState(0);
  const [addressDraft, setAddressDraft] = useState<BookingAddressDraft>(() =>
    createInitialBookingAddressDraft("destinationAddressId"),
  );
  const [addressDialogError, setAddressDialogError] = useState("");
  const [addressSavePending, setAddressSavePending] = useState(false);

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
          originCity:
            (adminSources.customerAddressMap.get(editingBooking.customerId) ?? []).find(
              (address) => address.id === delivery.originAddressId,
            )?.city ?? "",
          originAddressId: delivery.originAddressId,
          destinationCity:
            delivery.destinationCity ??
            (adminSources.customerAddressMap.get(editingBooking.customerId) ?? []).find(
              (address) => address.id === delivery.destinationAddressId,
            )?.city ?? "",
          destinationAddressId: delivery.destinationAddressId,
          destinationAddressSource: delivery.destinationAddressSource ?? "SAVED_ADDRESS",
          consigneeFinalizationStatus: delivery.consigneeFinalizationStatus ?? (delivery.destinationAddressId ? "CONFIRMED" : "PENDING"),
          materialId: delivery.materialId,
          quantity: String(delivery.quantity ?? 0),
          uom: delivery.uom ?? "",
          weight: String(delivery.weight ?? 0),
          weightUom: delivery.weightUom ?? editingBooking.weightUom ?? editingBooking.uom,
          distanceKm: delivery.distanceKm != null ? String(delivery.distanceKm) : "",
        })) ?? [],
    });
  }, [adminSources.customerAddressMap, editingBooking]);

  useEffect(() => {
    if (isEditMode || editingBooking || draft.customerId || !isDirectCustomerTenant(tenant)) {
      return;
    }
    const selfCustomer =
      adminSources.customers.find(
        (customer) =>
          customer.tenantId === tenant.id &&
          customer.id === `tenant-customer-self-${tenant.code.trim().toLowerCase()}` &&
          customer.code?.trim().toUpperCase() === tenant.code.trim().toUpperCase(),
      ) ?? null;
    if (!selfCustomer) {
      return;
    }
    setDraft((current) => ({
      ...current,
      customerId: selfCustomer.id,
    }));
  }, [adminSources.customers, draft.customerId, editingBooking, isEditMode, tenant]);

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
      setDeliveryRateCards([]);
      setMatchedRateCard(null);
      setRateLookupPending(false);
      return;
    }

    const preferredRateBasis = selectedCustomer.rateMatchingBasis ?? "LANE_TO_LANE";
    const hasMinimumRateInputs = deliveries.some((delivery) => {
      if (!delivery.originCity || !delivery.destinationCity) {
        return false;
      }
      if (preferredRateBasis === "CITY_TO_CITY") {
        return true;
      }
      return Boolean(delivery.originAddressId);
    });
    if (!hasMinimumRateInputs) {
      setDeliveryRateCards(deliveries.map(() => null));
      setMatchedRateCard(null);
      setRateLookupPending(false);
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
        const source = customerAddresses.find((address) => address.id === delivery.originAddressId) ?? null;
        const destination =
          customerAddresses.find((address) => address.id === delivery.destinationAddressId) ?? null;
        const validationInput = {
          bookingDate: draft.pickupDateTime ? draft.pickupDateTime.slice(0, 10) : null,
          customerId: draft.customerId,
          rateMatchingBasis: "CITY_TO_CITY" as const,
          lane: source && destination ? buildRateValidationLane(source.addressName, destination.addressName) : null,
          fromCity: source?.city ?? delivery.originCity,
          toCity: destination?.city ?? delivery.destinationCity,
          fromLocation: source?.addressName ?? null,
          toLocation: destination?.addressName ?? null,
          fromPincode: source?.pincode ?? null,
          toPincode: destination?.pincode ?? null,
          vehicleType: selectedVehicleTypeCode,
          rateType: draft.contractRateType,
          weight: draft.contractRateType === "PER_MT" ? cumulativeWeight : null,
        };
        const effectiveRateBasis = getEffectiveRateMatchingBasis(
          preferredRateBasis,
          validationInput,
          {
            allowDestinationFallback: !delivery.destinationAddressId,
          },
        );
        const requiresAddressedOrigin = effectiveRateBasis !== "CITY_TO_CITY" && !source;
        if (!delivery.originCity || !delivery.destinationCity || requiresAddressedOrigin) {
          return null;
        }
        return validateRateCard(
          {
            ...validationInput,
            rateMatchingBasis: effectiveRateBasis,
          },
          customerRateCards,
        );
      });
      setDeliveryRateCards(nextRateCards);
      setMatchedRateCard(getLastNonNullRate(nextRateCards));
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

  function handleAddressSelect(index: number, field: AddressFieldTarget, value: string) {
    setError("");
    updateDelivery(index, field, value);
    if (field === "destinationAddressId") {
      updateDelivery(index, "destinationAddressSource", value ? "SAVED_ADDRESS" : "FROM_INVOICE_LATER");
      updateDelivery(index, "consigneeFinalizationStatus", value ? "CONFIRMED" : "PENDING");
    }
  }

  function handleDeliveryCityChange(index: number, field: "originCity" | "destinationCity", value: string) {
    setError("");
    setDraft((current) => {
      const nextDeliveries = current.deliveries.map((delivery, deliveryIndex) => {
        if (deliveryIndex !== index) {
          return delivery;
        }

        if (field === "originCity") {
          return {
            ...delivery,
            originCity: value,
            originAddressId: "",
          };
        }

        return {
          ...delivery,
          destinationCity: value,
          destinationAddressId: "",
          destinationAddressSource: "FROM_INVOICE_LATER" as const,
          consigneeFinalizationStatus: "PENDING" as const,
        };
      });

      return { ...current, deliveries: nextDeliveries, numberOfDeliveries: String(nextDeliveries.length) };
    });
  }

  function openAddressDialog(index: number, field: AddressFieldTarget) {
    if (!draft.customerId) {
      setError("Please select customer before adding address.");
      return;
    }
    const delivery = draft.deliveries[index];
    setAddressDialogDeliveryIndex(index);
    setAddressDialogField(field);
    setAddressDraft({
      ...createInitialBookingAddressDraft(field),
      city: field === "destinationAddressId" ? delivery?.destinationCity ?? "" : delivery?.originCity ?? "",
    });
    setAddressDialogError("");
    setAddressDialogOpen(true);
  }

  async function saveAddressFromBooking() {
    if (!draft.customerId) {
      setAddressDialogError("Please select customer before adding address.");
      return;
    }

    const validationError = validateBookingAddressDraft(addressDraft);
    if (validationError) {
      setAddressDialogError(validationError);
      return;
    }

    const payload = buildBookingCustomerAddressPayload(draft.customerId, addressDraft);
    setAddressSavePending(true);
    try {
      const created = createAddress(draft.customerId, payload);
      updateDelivery(addressDialogDeliveryIndex, "destinationCity", created.city);
      updateDelivery(addressDialogDeliveryIndex, addressDialogField, created.id);
      updateDelivery(addressDialogDeliveryIndex, "destinationAddressSource", "SAVED_ADDRESS");
      updateDelivery(addressDialogDeliveryIndex, "consigneeFinalizationStatus", "CONFIRMED");
      setAddressDialogOpen(false);
      setAddressDialogError("");
      setError("");
    } catch (saveError) {
      setAddressDialogError(
        saveError instanceof Error ? saveError.message : "Address could not be saved.",
      );
    } finally {
      setAddressSavePending(false);
    }
  }

  function addDelivery() {
    setDraft((current) => {
      const nextIndex = current.deliveries.length + 1;
      const previousDelivery = current.deliveries[current.deliveries.length - 1];
      const nextDeliveries = [
        ...current.deliveries,
        {
          ...createEmptyDeliveryDraft(nextIndex),
          originCity: previousDelivery?.destinationCity ?? "",
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
        !delivery.destinationCity ||
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
      lrType: editingBooking?.lrType === "AUTO" ? "AUTO" : "MANUAL",
      manualLrPoolPreference: editingBooking?.manualLrPoolPreference ?? "GENERAL",
      status: statusOverride,
      opsRemark: draft.opsRemark.trim() || null,
      pod: editingBooking?.pod ?? null,
      documents: editingBooking?.documents ?? [],
      expenses: editingBooking?.expenses ?? [],
      deliveries: deliveries.map((delivery, index) => ({
        id: delivery.id,
        deliveryNo: index + 1,
        trackingId: delivery.trackingId,
        originCity: delivery.originCity || null,
        originAddressId: delivery.originAddressId,
        destinationCity: delivery.destinationCity || null,
        destinationAddressId: delivery.destinationAddressId,
        destinationAddressSource: delivery.destinationAddressId ? "SAVED_ADDRESS" : "FROM_INVOICE_LATER",
        consigneeFinalizationStatus: delivery.destinationAddressId ? "CONFIRMED" : "PENDING",
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

  if (!isEditMode && !canCreateBooking) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="TMS" title="Access Denied" description="You do not have permission to create bookings." />
        <TenantPanel title="Create Booking is disabled for your role">
          <Button asChild>
            <Link to={paths.bookings}>Back to Booking Dashboard</Link>
          </Button>
        </TenantPanel>
      </div>
    );
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

      {error ? <div className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 px-4 py-3 text-sm text-red-700 shadow-sm">{error}</div> : null}

      <div className="sticky top-3 z-20 rounded-[28px] border border-white/80 bg-white/85 px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Summary label="Customer" value={selectedCustomer?.name ?? "Select customer"} />
          <Summary label="Booking Type" value={draft.commercialType === "CONTRACT" ? "Contract" : "Spot"} />
          <Summary label="Total Freight" value={calculatedFreight ? formatCurrency(calculatedFreight) : "-"} />
          <Summary label="No. of Deliveries" value={String(deliveryCount)} />
        </div>
      </div>

      <div className="workspace-hero fancy-grid grid gap-4 px-5 py-5 xl:grid-cols-[1.1fr,0.9fr,0.8fr]">
        <QuickStat label="Customer" value={selectedCustomer?.name ?? "Select customer"} tone="blue" />
        <QuickStat label="Commercial Type" value={draft.commercialType === "CONTRACT" ? "Contract Pricing" : "Spot Pricing"} tone="indigo" />
        <QuickStat
          label="Pricing State"
          value={
            draft.commercialType === "SPOT"
              ? "Ready to price"
              : laneFound
                ? "Ready to price"
                : "Lane not mapped"
          }
          tone={draft.commercialType === "SPOT" || laneFound ? "emerald" : "amber"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.55fr]">
        <div className="space-y-4">
          {isDirectCustomerTenant(tenant) ? (
            <div className="rounded-2xl border border-sky-200/70 bg-sky-50/70 px-4 py-3 text-sm text-sky-900">
              This direct-customer tenant uses its own customer context by default. Booking, finance, LR, and vendor flows remain unchanged.
            </div>
          ) : null}
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
                const destinationName =
                  customerAddresses.find((address) => address.id === delivery.destinationAddressId)?.addressName ??
                  delivery.destinationCity ??
                  "Select destination";
                const selectedMaterial = customerMaterials.find((material) => material.id === delivery.materialId) ?? null;
                const laneLabel = deliveryRateCards[index]?.lanes ?? `${originName} â†’ ${destinationName}`;
                const mapping = getMaterialUOMMapping(selectedMaterial, selectedCustomer, adminSources.uomMappings);
                const selectedOriginAddress = customerAddresses.find((address) => address.id === delivery.originAddressId) ?? null;
                const selectedDestinationAddress = customerAddresses.find((address) => address.id === delivery.destinationAddressId) ?? null;
                const preferredRateBasis = selectedCustomer?.rateMatchingBasis ?? "LANE_TO_LANE";
                const effectiveRateBasis =
                  selectedOriginAddress && delivery.destinationCity
                    ? getEffectiveRateMatchingBasis(preferredRateBasis, {
                        lane: selectedDestinationAddress
                          ? buildRateValidationLane(selectedOriginAddress.addressName, selectedDestinationAddress.addressName)
                          : null,
                        fromCity: selectedOriginAddress.city,
                        toCity: selectedDestinationAddress?.city ?? delivery.destinationCity,
                        fromLocation: selectedOriginAddress.addressName,
                        toLocation: selectedDestinationAddress?.addressName ?? null,
                        fromPincode: selectedOriginAddress.pincode,
                        toPincode: selectedDestinationAddress?.pincode ?? null,
                      }, {
                        allowDestinationFallback: !selectedDestinationAddress,
                      })
                    : preferredRateBasis;
                const isRateBasisFallbackActive =
                  preferredRateBasis !== "CITY_TO_CITY" &&
                  effectiveRateBasis === "CITY_TO_CITY" &&
                  !selectedDestinationAddress;

                return (
                  <div key={delivery.id} className="rounded-[26px] border border-white/80 bg-white/90 p-4 shadow-[0_16px_42px_rgba(15,23,42,0.06)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">Delivery {index + 1}</p>
                        <p className="mt-1 text-sm text-slate-600">{originName} â†’ {destinationName}</p>
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
                      <Field label="Origin City">
                        <Select value={delivery.originCity} onChange={(event) => handleDeliveryCityChange(index, "originCity", event.target.value)}>
                          <option value="">Select city</option>
                          {getUniqueAddressCities(
                            customerAddresses.filter((address) => isAddressSelectableForField(address, "originAddressId")),
                          ).map((city) => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Origin Address">
                        <Select
                          value={delivery.originAddressId}
                          onChange={(event) => handleAddressSelect(index, "originAddressId", event.target.value)}
                          disabled={!delivery.originCity}
                        >
                          <option value="">
                            {!delivery.originCity
                              ? "Select city first"
                              : getAddressesForCity(
                                    customerAddresses.filter((address) => isAddressSelectableForField(address, "originAddressId")),
                                    delivery.originCity,
                                  ).length
                                ? "Select origin address"
                                : "No addresses found for this city"}
                          </option>
                          {getAddressesForCity(
                            customerAddresses.filter((address) => isAddressSelectableForField(address, "originAddressId")),
                            delivery.originCity,
                          ).map((address) => (
                            <option key={address.id} value={address.id}>{formatCustomerAddressOptionLabel(address)}</option>
                          ))}
                        </Select>
                      </Field>
                    </div>

                    <div className="mt-3 grid gap-3 xl:grid-cols-2">
                      <Field label="Destination City">
                        <Select value={delivery.destinationCity} onChange={(event) => handleDeliveryCityChange(index, "destinationCity", event.target.value)}>
                          <option value="">Select city</option>
                          {getUniqueAddressCities(
                            customerAddresses
                              .filter((address) => address.id !== delivery.originAddressId)
                              .filter((address) => isAddressSelectableForField(address, "destinationAddressId")),
                          ).map((city) => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                        </Select>
                      </Field>
                      <Field
                        label="Destination Address"
                        helper={
                          isRateBasisFallbackActive
                            ? "Optional for now. Pricing uses city-to-city until the final consignee address is confirmed."
                            : "Optional. Pick an existing customer address now, or confirm the exact consignee from invoice later."
                        }
                      >
                        <Select
                          value={delivery.destinationAddressId}
                          onChange={(event) => handleAddressSelect(index, "destinationAddressId", event.target.value)}
                          disabled={!delivery.destinationCity}
                        >
                          <option value="">
                            {!delivery.destinationCity
                              ? "Select city first"
                              : getAddressesForCity(
                                    customerAddresses
                                      .filter((address) => address.id !== delivery.originAddressId)
                                      .filter((address) => isAddressSelectableForField(address, "destinationAddressId")),
                                    delivery.destinationCity,
                                  ).length
                                ? "Optional: select saved destination address"
                                : "No addresses found for this city"}
                          </option>
                          {getAddressesForCity(
                            customerAddresses
                              .filter((address) => address.id !== delivery.originAddressId)
                              .filter((address) => isAddressSelectableForField(address, "destinationAddressId")),
                            delivery.destinationCity,
                          ).map((address) => (
                            <option key={address.id} value={address.id}>{formatCustomerAddressOptionLabel(address)}</option>
                          ))}
                        </Select>
                        <div className="flex items-center justify-between gap-3">
                          {!draft.customerId ? <p className="text-xs text-amber-700">Please select customer before adding address.</p> : <span />}
                          <Button type="button" size="sm" variant="outline" onClick={() => openAddressDialog(index, "destinationAddressId")} disabled={!draft.customerId}>
                            + Add Address
                          </Button>
                        </div>
                        {!delivery.destinationAddressId ? (
                          <p className="text-xs text-muted-foreground">
                            Exact consignee address can be finalized from invoice during document upload.
                          </p>
                        ) : null}
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
                          <div className="flex items-center justify-center rounded-2xl border border-border/70 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
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
                      <div className="rounded-2xl border border-dashed border-border/80 bg-slate-50/70 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Lane</p>
                        <p className="mt-1 text-sm text-slate-700">{laneLabel}</p>
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
                      <Input
                        value={baseRate != null ? String(baseRate) : ""}
                        placeholder="No rate found"
                        disabled
                      />
                    </Field>
                  )}
                  <Field label="Rate Type">
                    <Input value={rateType} disabled />
                  </Field>
                  <Field label="Matched Rate">
                    <Input
                      value={baseRate != null ? String(baseRate) : ""}
                      placeholder="Not configured"
                      disabled
                    />
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
                  <div className="rounded-[24px] border border-white/80 bg-white/85 px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Calculated Freight</p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{calculatedFreight ? formatCurrency(calculatedFreight) : "-"}</p>
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
                    {rateLookupPending ? <p className="mt-2 text-xs text-muted-foreground">Refreshing rateâ€¦</p> : null}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {draft.commercialType === "SPOT" ? (
                  <div className="rounded-[28px] border border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-sky-50 p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Manual Freight</p>
                    <p className="mt-2 text-sm font-medium text-slate-700">Spot Rate (Manual)</p>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{numericRate ? formatCurrency(numericRate) : formatCurrency(0)}</p>
                    <p className="mt-2 text-sm text-slate-600">No rate card is used for spot bookings.</p>
                  </div>
                ) : (
                  <div className="rounded-[28px] border border-white/80 bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Contract Pricing</p>
                    <div className="mt-4 space-y-3">
                      <Summary label="Rate Type" value={rateType} />
                      <Summary
                        label="Rate Matching Basis"
                        value={
                          selectedCustomer
                            ? effectiveRateBasisLabel(
                                selectedCustomer.rateMatchingBasis ?? "LANE_TO_LANE",
                                deliveries[deliveries.length - 1],
                                customerAddresses,
                              )
                            : "LANE_TO_LANE"
                        }
                      />
                      <Summary
                        label="Matched Rate"
                        value={baseRate != null ? formatCurrency(baseRate) : "Not configured"}
                      />
                      <Summary
                        label="Calculated Freight"
                        value={calculatedFreight ? formatCurrency(calculatedFreight) : "-"}
                      />
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
            <div className="rounded-[24px] border border-white/80 bg-gradient-to-br from-cyan-500 via-blue-600 to-violet-600 p-4 text-white shadow-[0_24px_56px_rgba(79,70,229,0.34)]">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Pricing Breakdown</p>
              <div className="mt-3 grid gap-2 text-sm">
                <SignalRow label="Rate" value={numericRate ? formatCurrency(numericRate) : "-"} />
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
                <SignalRow label="Freight" value={calculatedFreight ? formatCurrency(calculatedFreight) : "-"} />
              </div>
            </div>
            <Summary label="Booking Commercial Type" value={draft.commercialType === "CONTRACT" ? "Contract" : "Spot"} />
            <Summary label="Rate Type" value={rateType} />
            <Summary label="Deliveries" value={String(deliveryCount)} />
            <Summary label="Total Quantity" value={totalQuantity ? `${totalQuantity} ${deliveries[0]?.uom || ""}`.trim() : "-"} />
            <Summary label="Total Weight" value={totalWeight ? `${formatUOMWeight(totalWeight)} ${PRICING_WEIGHT_UOM}` : "-"} />
            <Summary label="Billing Distance" value={rateType === "PER_KM" && maxDistance ? `${maxDistance} KM` : "-"} />
            <Summary label="Final Freight" value={calculatedFreight ? formatCurrency(calculatedFreight) : "-"} />
            <Field label="Ops Remark">
              <Textarea value={draft.opsRemark} onChange={(event) => setDraft((current) => ({ ...current, opsRemark: event.target.value }))} className="min-h-[88px]" />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              {access.can("CREATE_BOOKING", "CREATE") ? (
                <Button variant="outline" onClick={() => persistBooking("DRAFT", false)}>
                  Save Draft
                </Button>
              ) : null}
              {access.can("CREATE_BOOKING", "SUBMIT_BOOKING") ? (
                <Button onClick={() => persistBooking(submitStatus, true)}>Submit Booking</Button>
              ) : null}
            </div>
          </div>
        </TenantPanel>
      </div>

      <Dialog
        open={addressDialogOpen}
        onOpenChange={(open) => {
          setAddressDialogOpen(open);
          if (!open) {
            setAddressDialogError("");
            setAddressSavePending(false);
          }
        }}
        title={addressDialogField === "originAddressId" ? "Add Origin Address" : "Add Destination Address"}
        description="The new address will be saved under the selected customer and immediately reused in booking and customer administration."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAddressDraft(createInitialBookingAddressDraft(addressDialogField))}>
              Clear / Reset
            </Button>
            <Button onClick={() => void saveAddressFromBooking()} disabled={addressSavePending}>
              {addressSavePending ? "Saving..." : "Save Address"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          {addressDialogError ? (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {addressDialogError}
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Contact Code" helper="Auto-generated as ADDR-0001 if left blank">
              <Input value={addressDraft.contactCode} onChange={(event) => setAddressDraft((current) => ({ ...current, contactCode: event.target.value }))} placeholder="Enter or leave blank" />
            </Field>
            <Field label="Address Usage">
              <Select value={addressDraft.addressUsage} onChange={(event) => setAddressDraft((current) => ({ ...current, addressUsage: event.target.value as BookingAddressUsage }))}>
                {getBookingAddressUsageOptions(addressDialogField).map((usage) => (
                  <option key={usage} value={usage}>{usage}</option>
                ))}
              </Select>
            </Field>
            <Field label="Contact person name*">
              <Input value={addressDraft.contactPersonName} onChange={(event) => setAddressDraft((current) => ({ ...current, contactPersonName: event.target.value }))} />
            </Field>
            <Field label="Phone*">
              <Input value={addressDraft.phone} onChange={(event) => setAddressDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="+91 9876543210" />
            </Field>
            <Field label="Email ID">
              <Input value={addressDraft.email} onChange={(event) => setAddressDraft((current) => ({ ...current, email: event.target.value }))} />
            </Field>
            <Field label="Address Name">
              <Input value={addressDraft.addressName} onChange={(event) => setAddressDraft((current) => ({ ...current, addressName: event.target.value }))} placeholder="Bangalore Warehouse" />
            </Field>
          </div>
          <div className="grid gap-4">
            <Field label="Address Line 1*">
              <Input value={addressDraft.addressLine1} onChange={(event) => setAddressDraft((current) => ({ ...current, addressLine1: event.target.value }))} />
            </Field>
            <Field label="Address Line 2">
              <Input value={addressDraft.addressLine2} onChange={(event) => setAddressDraft((current) => ({ ...current, addressLine2: event.target.value }))} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            <Field label="Pincode*">
              <Input value={addressDraft.pincode} onChange={(event) => setAddressDraft((current) => ({ ...current, pincode: event.target.value }))} />
            </Field>
            <Field label="Country">
              <Input value={addressDraft.country} onChange={(event) => setAddressDraft((current) => ({ ...current, country: event.target.value }))} />
            </Field>
            <Field label="State*">
              <Input value={addressDraft.state} onChange={(event) => setAddressDraft((current) => ({ ...current, state: event.target.value }))} />
            </Field>
            <Field label="City*">
              <Input value={addressDraft.city} onChange={(event) => setAddressDraft((current) => ({ ...current, city: event.target.value }))} />
            </Field>
            <Field label="GSTIN">
              <Input value={addressDraft.gstin} onChange={(event) => setAddressDraft((current) => ({ ...current, gstin: event.target.value }))} />
            </Field>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function createInitialBookingAddressDraft(field: AddressFieldTarget): BookingAddressDraft {
  return {
    contactCode: "",
    contactPersonName: "",
    phone: "",
    email: "",
    addressName: "",
    addressLine1: "",
    addressLine2: "",
    pincode: "",
    country: "India",
    state: "",
    city: "",
    gstin: "",
    addressUsage: field === "originAddressId" ? "ORIGIN" : "DESTINATION",
  };
}

function getBookingAddressUsageOptions(field: AddressFieldTarget): BookingAddressUsage[] {
  return field === "originAddressId" ? ["BOTH", "ORIGIN"] : ["BOTH", "DESTINATION"];
}

function getAddressUsage(address: TenantCustomerAddress): BookingAddressUsage {
  return address.addressUsage ?? "BOTH";
}

function isAddressSelectableForField(address: TenantCustomerAddress, field: AddressFieldTarget) {
  const usage = getAddressUsage(address);
  if (usage === "BOTH") {
    return true;
  }
  return field === "originAddressId" ? usage === "ORIGIN" : usage === "DESTINATION";
}

function formatCustomerAddressOptionLabel(address: TenantCustomerAddress) {
  const fullAddress = [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.pincode,
  ]
    .filter(Boolean)
    .join(", ");
  const parts = [
    address.addressName,
    fullAddress,
  ].filter(Boolean);
  return parts.join(" | ");
}

function getUniqueAddressCities(addresses: TenantCustomerAddress[]) {
  return Array.from(
    new Set(
      addresses
        .map((address) => address.city?.trim())
        .filter((city): city is string => Boolean(city)),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function getAddressesForCity(addresses: TenantCustomerAddress[], city: string) {
  const normalizedCity = city.trim().toLowerCase();
  if (!normalizedCity) {
    return [];
  }
  return addresses.filter((address) => address.city.trim().toLowerCase() === normalizedCity);
}

function validateBookingAddressDraft(draft: BookingAddressDraft) {
  if (!draft.contactPersonName.trim()) {
    return "Contact person name is required.";
  }
  if (!isValidIndianMobileNumber(draft.phone)) {
    return "Phone must be a valid Indian mobile number.";
  }
  if (draft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
    return "Email ID must be a valid email address.";
  }
  if (!draft.addressLine1.trim()) {
    return "Address Line 1 is required.";
  }
  if (!/^\d{6}$/.test(draft.pincode.trim())) {
    return "Pincode must be a 6-digit number.";
  }
  if (!draft.state.trim()) {
    return "State is required.";
  }
  if (!draft.city.trim()) {
    return "City is required.";
  }
  if (draft.gstin.trim() && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/i.test(draft.gstin.trim())) {
    return "GSTIN must be valid if entered.";
  }
  return null;
}

function isValidIndianMobileNumber(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  const normalized = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(normalized);
}

function buildBookingCustomerAddressPayload(
  customerId: string,
  draft: BookingAddressDraft,
): TenantCustomerAddressInput {
  const addressType =
    draft.addressUsage === "ORIGIN"
      ? "consignor"
      : draft.addressUsage === "DESTINATION"
        ? "consignee"
        : "both";
  const addressTypes: CustomerAddressTag[] =
    draft.addressUsage === "ORIGIN"
      ? ["Consignor"]
      : draft.addressUsage === "DESTINATION"
        ? ["Consignee"]
        : ["Consignor", "Consignee"];

  return {
    customerId,
    addressCode: undefined,
    addressType,
    addressTypes,
    addressUsage: draft.addressUsage,
    addressName: resolveBookingAddressName(draft),
    contactCode: draft.contactCode.trim() || undefined,
    gstin: draft.gstin.trim() || undefined,
    contactPersonName: draft.contactPersonName.trim(),
    contactPerson: draft.contactPersonName.trim(),
    phone: draft.phone.trim(),
    contactNumber: draft.phone.trim(),
    email: draft.email.trim() || undefined,
    emailId: draft.email.trim() || undefined,
    addressLine1: draft.addressLine1.trim(),
    addressLine2: draft.addressLine2.trim() || undefined,
    city: draft.city.trim(),
    state: draft.state.trim(),
    country: draft.country.trim() || "India",
    pincode: draft.pincode.trim(),
    isDefault: false,
    status: "active",
  };
}

function resolveBookingAddressName(draft: BookingAddressDraft) {
  const explicitName = draft.addressName.trim();
  if (explicitName) {
    return explicitName;
  }
  return `${draft.city.trim() || "Customer"} ${draft.addressUsage === "DESTINATION" ? "Destination" : draft.addressUsage === "ORIGIN" ? "Origin" : "Address"}`;
}

function buildDraftTrackingId(index: number) {
  return `TRK-DRAFT-${String(index).padStart(2, "0")}`;
}

function createEmptyDeliveryDraft(index: number): DeliveryDraft {
  return {
    id: `draft-delivery-${index}`,
    trackingId: buildDraftTrackingId(index),
    originCity: "",
    originAddressId: "",
    destinationCity: "",
    destinationAddressId: "",
    destinationAddressSource: "FROM_INVOICE_LATER",
    consigneeFinalizationStatus: "PENDING",
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

function formatRateMatchingBasisLabel(
  value: "LANE_TO_LANE" | "CITY_TO_CITY" | "PINCODE_TO_PINCODE" | "ADDRESS_TO_ADDRESS",
) {
  return value
    .split("_TO_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" to ");
}

function effectiveRateBasisLabel(
  preferredBasis: "LANE_TO_LANE" | "CITY_TO_CITY" | "PINCODE_TO_PINCODE" | "ADDRESS_TO_ADDRESS",
  delivery: DeliveryDraft | undefined,
  customerAddresses: TenantCustomerAddress[],
) {
  if (!delivery) {
    return formatRateMatchingBasisLabel(preferredBasis);
  }
  const origin = customerAddresses.find((address) => address.id === delivery.originAddressId) ?? null;
  const destination = customerAddresses.find((address) => address.id === delivery.destinationAddressId) ?? null;
  const effectiveBasis =
    origin && delivery.destinationCity
      ? getEffectiveRateMatchingBasis(preferredBasis, {
          lane: destination ? buildRateValidationLane(origin.addressName, destination.addressName) : null,
          fromCity: origin.city,
          toCity: destination?.city ?? delivery.destinationCity,
          fromLocation: origin.addressName,
          toLocation: destination?.addressName ?? null,
          fromPincode: origin.pincode,
          toPincode: destination?.pincode ?? null,
        }, {
          allowDestinationFallback: !destination,
        })
      : preferredBasis;
  if (effectiveBasis === preferredBasis) {
    return formatRateMatchingBasisLabel(preferredBasis);
  }
  return `${formatRateMatchingBasisLabel(preferredBasis)} -> ${formatRateMatchingBasisLabel(effectiveBasis)}`;
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

function Field({ label, helper, children }: { label: string; helper?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-600">{label}</label>
      {children}
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/55 bg-white/80 px-3 py-3 last:border-b">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold">{value}</span>
    </div>
  );
}

function SignalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-sm">
      <span className="text-white/75">{label}</span>
      <span className="font-medium text-white">{value}</span>
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
  const toneClass =
    tone === "blue"
      ? "from-blue-100 via-sky-100 to-cyan-100 text-blue-700"
      : tone === "indigo"
        ? "from-indigo-100 via-violet-100 to-fuchsia-100 text-indigo-700"
        : tone === "emerald"
          ? "from-emerald-100 via-green-100 to-lime-100 text-emerald-700"
          : "from-amber-100 via-orange-100 to-yellow-100 text-amber-700";

  return (
    <div className={`rounded-[24px] border border-white/80 bg-gradient-to-br ${toneClass} p-4 shadow-sm`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-current/70">{label}</p>
      <p className="mt-2 text-base font-semibold tracking-[-0.02em] text-slate-950">{value}</p>
    </div>
  );
}


