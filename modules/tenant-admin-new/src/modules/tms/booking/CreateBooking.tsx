import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/shared/components/common/page-header";
import { BookingPageHeader } from "./components/BookingPageHeader";
import { TenantPanel } from "@/modules/tenant-admin/components/tenant-primitives";
import { useTenantAccess } from "@/modules/tenant-admin/hooks/useTenantAccess";
import { useTenantCustomers } from "@/modules/tenant-admin/hooks/useTenantCustomers";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { formatCurrency } from "@/shared/lib/format-currency";
import { cityLaneKey, contractCityLaneKey } from "@shared-utils";
import { loadStore as loadAuctionStore } from "@auction/lib/auction-store";
import { isDirectCustomerTenant } from "@/shared/lib/tenant-config";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
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
  BookingSource,
  ErpReferenceSnapshot,
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

const ERP_MOCK_DATASETS = [
  {
    customerCode: "ACC",
    salesOrderNumber: "SO-10001",
    erpReferenceNumber: "ERP-SO-10001",
    material: "CEMENT",
    quantity: "100",
    uom: "BAG",
    weight: "5",
    weightUom: "MT",
    originCity: "Bengaluru",
    destinationCity: "Chennai",
    freight: "12000",
    opsRemark: "ERP Sales Order SO-10001 — ACC Cement, Bengaluru to Chennai.",
  },
  {
    customerCode: "ULT",
    salesOrderNumber: "SO-10002",
    erpReferenceNumber: "ERP-SO-10002",
    material: "STEEL",
    quantity: "50",
    uom: "MT",
    weight: "50",
    weightUom: "MT",
    originCity: "Pune",
    destinationCity: "Mumbai",
    freight: "8500",
    opsRemark: "ERP Sales Order SO-10002 — Steel coils, Pune to Mumbai.",
  },
];

export function CreateBookingPage({
  lockedCustomerId,
  createdByLabel,
  onAfterSubmit,
  bookingSource,
}: {
  /** When set (Customer Portal embed), the customer is fixed and the selector is hidden. */
  lockedCustomerId?: string;
  /** Actor recorded as the booking creator (defaults to "Tenant Admin"). */
  createdByLabel?: string;
  /** Called after a successful create instead of navigating to the internal detail page. */
  onAfterSubmit?: (bookingId: string) => void;
  /** Booking source — ERP sets source=ERP and enables mock data generation. */
  bookingSource?: BookingSource;
} = {}) {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const { tenant } = useTenantRouteContext();
  const effectiveSource: BookingSource =
    bookingSource ?? (searchParams.get("source") === "erp" ? "ERP" : "WEB");
  const isErpBooking = effectiveSource === "ERP";
  const access = useTenantAccess();
  const isEditMode = Boolean(bookingId);
  // Customer Portal embeds this page with a fixed (logged-in) customer; such
  // sessions have no TMS role, so the locked context authorizes creation and
  // hides the customer selector. Internal flow (no lockedCustomerId) unchanged.
  const customerLocked = Boolean(lockedCustomerId) || isDirectCustomerTenant(tenant);
  const canCreateBooking = Boolean(lockedCustomerId) || access.hasFeaturePermission("TMS", "CREATE_BOOKING", "create");
  const { getBookingById, createBooking, updateBooking, sendBookingVendorIndent } = useTenantBookings(tenant.id);
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
  const [erpReference, setErpReference] = useState<ErpReferenceSnapshot>({
    erpReferenceNumber: "",
    salesOrderNumber: "",
    externalBookingNumber: null,
    integrationStatus: "MOCK",
  });

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
    if (isEditMode || editingBooking || draft.customerId) {
      return;
    }
    // Customer Portal: lock to the logged-in customer and force SPOT so the
    // booking always goes to PENDING_ASSIGNMENT (no rate deviation gate).
    if (lockedCustomerId) {
      setDraft((current) => ({ ...current, customerId: lockedCustomerId, commercialType: 'SPOT' }));
      return;
    }
    if (!isDirectCustomerTenant(tenant)) {
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
  }, [adminSources.customers, draft.customerId, editingBooking, isEditMode, tenant, lockedCustomerId]);

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
  const [useSpotContract, setUseSpotContract] = useState(true);

  // Spot-contract lane match: a SPOT booking on a lane with a live one-time
  // spot-auction contract can consume it — no manual vendor rate, indent goes
  // straight to the winning vendor.
  const spotLaneKey = useMemo(() => {
    const first = deliveries[0];
    const last = deliveries[deliveries.length - 1] ?? first;
    if (!first?.originCity || !last?.destinationCity) return "";
    return cityLaneKey(first.originCity, last.destinationCity);
  }, [deliveries]);

  const spotContractMatch = useMemo(() => {
    if (draft.commercialType !== "SPOT" || !spotLaneKey) return null;
    const today = new Date().toISOString().slice(0, 10);
    return (
      loadAuctionStore().contracts.find(
        (contract) =>
          contract.contractType === "SPOT" &&
          contract.status === "ACTIVE" &&
          !contract.consumedByBookingId &&
          // City-pair identity; legacy AAA-BBB contracts resolve via the shim.
          contractCityLaneKey(contract) === spotLaneKey &&
          contract.endDate >= today,
      ) ?? null
    );
  }, [draft.commercialType, spotLaneKey]);
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
      bookingSource: effectiveSource,
      erpReference:
        isErpBooking
          ? {
              erpReferenceNumber: erpReference.erpReferenceNumber?.trim() || null,
              salesOrderNumber: erpReference.salesOrderNumber?.trim() || null,
              externalBookingNumber: erpReference.externalBookingNumber ?? null,
              integrationStatus: "MOCK",
            }
          : null,
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
      spotContract:
        draft.commercialType === "SPOT" && useSpotContract && spotContractMatch
          ? {
              contractId: spotContractMatch.id,
              sourceAuctionId: spotContractMatch.sourceAuctionId,
              vendorId: spotContractMatch.vendorId,
              vendorName: spotContractMatch.vendorName,
              rate: spotContractMatch.contractedRate,
              rateUnit: spotContractMatch.rateUnit,
              originCity: spotContractMatch.originCity,
              destinationCity: spotContractMatch.destinationCity,
            }
          : null,
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

  function applyMockErpData() {
    const dataset = ERP_MOCK_DATASETS[Math.floor(Math.random() * ERP_MOCK_DATASETS.length)];
    setErpReference({
      erpReferenceNumber: dataset.erpReferenceNumber,
      salesOrderNumber: dataset.salesOrderNumber,
      externalBookingNumber: null,
      integrationStatus: "MOCK",
    });
    setDraft((current) => ({
      ...current,
      commercialType: "SPOT",
      enteredRate: dataset.freight,
      opsRemark: dataset.opsRemark,
      deliveries: current.deliveries.map((delivery, index) =>
        index === 0
          ? {
              ...delivery,
              originCity: dataset.originCity,
              destinationCity: dataset.destinationCity,
              weight: dataset.weight,
              weightUom: dataset.weightUom,
              quantity: dataset.quantity,
              uom: dataset.uom,
            }
          : delivery,
      ),
    }));
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
      navigate(`/tenant/${tenant.id}/bookings/${editingBooking.id}`);
      return;
    }

    const audit = buildRemarksAndTimeline(statusOverride);
    const created = createBooking({
      ...payload,
      createdBy: createdByLabel ?? "Tenant Admin",
      assignment: null,
      remarks: audit.remarks,
      statusTimeline: audit.statusTimeline,
    });
    if (lockedCustomerId) {
      try {
        sendBookingVendorIndent(created.id, createdByLabel ?? "Customer", created);
      } catch {
        // No active vendors — booking stays in PENDING_ASSIGNMENT for ops
      }
    }
    if (onAfterSubmit) {
      onAfterSubmit(created.bookingId);
      return;
    }
    navigate(`/tenant/${tenant.id}/bookings/${created.id}`);
  }

  if (!isEditMode && !canCreateBooking) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="TMS" title="Access Denied" description="You do not have permission to create bookings." />
        <TenantPanel title="Create Booking is disabled for your role">
          <Button asChild>
            <Link to={`/tenant/${tenant.id}/bookings`}>Back to Booking Dashboard</Link>
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
            <Link to={`/tenant/${tenant.id}/bookings/${editingBooking.id}`}>Back to Booking Details</Link>
          </Button>
        </TenantPanel>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-2.5 px-4 py-3 pb-28">
      <BookingPageHeader
        backTo={`/tenant/${tenant.id}/bookings`}
        backLabel="Bookings"
        title={isEditMode ? "Edit Booking" : isErpBooking ? "Create ERP Booking" : "Create Booking"}
        subtitle={isErpBooking ? "ERP-sourced booking — mock data auto-fill available." : "Fast, operations-first booking flow."}
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {/* ERP BOOKING — source banner + reference fields + mock data generator */}
      {isErpBooking && !isEditMode ? (
        <div className="rounded-xl border border-violet-300 bg-violet-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-violet-200 text-violet-800">
                  ERP
                </span>
                <p className="text-sm font-semibold text-violet-900">ERP Booking</p>
              </div>
              <p className="mt-1 text-xs text-violet-700">
                All fields are editable. The booking will be created with Source = ERP and follow the normal booking lifecycle.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={applyMockErpData}
              className="border-violet-300 bg-white text-violet-700 hover:bg-violet-100"
            >
              Generate Mock ERP Data
            </Button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="ERP Reference Number">
              <Input
                value={erpReference.erpReferenceNumber ?? ""}
                onChange={(event) => setErpReference((current) => ({ ...current, erpReferenceNumber: event.target.value }))}
                placeholder="ERP-SO-10001"
              />
            </Field>
            <Field label="Sales Order Number">
              <Input
                value={erpReference.salesOrderNumber ?? ""}
                onChange={(event) => setErpReference((current) => ({ ...current, salesOrderNumber: event.target.value }))}
                placeholder="SO-10001"
              />
            </Field>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-violet-600">
            <span className="font-semibold">Integration Status:</span>
            <span className="rounded bg-violet-100 px-2 py-0.5 font-mono text-violet-700">MOCK</span>
            <span>· No backend sync active</span>
          </div>
        </div>
      ) : null}

      {/* STEP 1 — Booking Setup */}
      <StepSection
        step={1}
        title="Booking Setup"
        summary={`${selectedCustomer?.name ?? "No customer"} · ${draft.commercialType === "CONTRACT" ? "Contract" : "Spot"} · ${draft.serviceType} · ${deliveryCount} ${deliveryCount === 1 ? "delivery" : "deliveries"}`}
        defaultOpen
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {!customerLocked ? (
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
          ) : null}
          <Field label="Commercial Type">
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
          <Field label="Service Type">
            <Select
              value={draft.serviceType}
              onChange={(event) => setDraft((current) => ({ ...current, serviceType: event.target.value as BookingServiceType }))}
            >
              <option value="FTL">FTL</option>
              <option value="PTL">PTL</option>
            </Select>
          </Field>
          <Field label="Mode">
            <Input value={draft.modeOfTransport} disabled />
          </Field>
          <Field label="No. of Deliveries">
            <Input value={String(deliveryCount)} disabled />
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
      </StepSection>

      {/* STEP 2 — Deliveries (route + material, delivery-wise) */}
      <StepSection
        step={2}
        title="Deliveries"
        summary={`${deliveries.length} ${deliveries.length === 1 ? "delivery" : "deliveries"}${totalWeight ? ` · ${totalQuantity} ${deliveries[0]?.uom || ""} · ${formatUOMWeight(totalWeight)} ${PRICING_WEIGHT_UOM}`.trimEnd() : ""}`}
        defaultOpen
        action={
          <Button type="button" size="sm" variant="outline" onClick={addDelivery}>
            + Add Delivery
          </Button>
        }
      >
        <div className="space-y-3">
          {deliveries.map((delivery, index) => {
            const originName =
              customerAddresses.find((address) => address.id === delivery.originAddressId)?.addressName ?? "Origin";
            const destinationName =
              customerAddresses.find((address) => address.id === delivery.destinationAddressId)?.addressName ??
              delivery.destinationCity ??
              "Destination";
            const selectedMaterial = customerMaterials.find((material) => material.id === delivery.materialId) ?? null;
            const mapping = getMaterialUOMMapping(selectedMaterial, selectedCustomer, adminSources.uomMappings);
            return (
              <div key={delivery.id} className="rounded-xl border border-slate-300 bg-slate-50/40 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <span className="text-gray-600">
                      {originName} → {destinationName}
                    </span>
                  </div>
                  {deliveries.length > 1 ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => removeDelivery(index)}>
                      Remove
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Origin City">
                    <Select value={delivery.originCity} onChange={(event) => handleDeliveryCityChange(index, "originCity", event.target.value)}>
                      <option value="">Select city</option>
                      {getUniqueAddressCities(
                        customerAddresses.filter((address) => isAddressSelectableForField(address, "originAddressId")),
                      ).map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
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
                        <option key={address.id} value={address.id}>
                          {formatCustomerAddressOptionLabel(address)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Destination City">
                    <Select value={delivery.destinationCity} onChange={(event) => handleDeliveryCityChange(index, "destinationCity", event.target.value)}>
                      <option value="">Select city</option>
                      {getUniqueAddressCities(
                        customerAddresses
                          .filter((address) => address.id !== delivery.originAddressId)
                          .filter((address) => isAddressSelectableForField(address, "destinationAddressId")),
                      ).map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Destination Address">
                    <div className="flex gap-2">
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
                              ? "Optional: saved address"
                              : "No addresses found"}
                        </option>
                        {getAddressesForCity(
                          customerAddresses
                            .filter((address) => address.id !== delivery.originAddressId)
                            .filter((address) => isAddressSelectableForField(address, "destinationAddressId")),
                          delivery.destinationCity,
                        ).map((address) => (
                          <option key={address.id} value={address.id}>
                            {formatCustomerAddressOptionLabel(address)}
                          </option>
                        ))}
                      </Select>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openAddressDialog(index, "destinationAddressId")}
                        disabled={!draft.customerId}
                      >
                        + Add
                      </Button>
                    </div>
                  </Field>
                  {rateType === "PER_KM" ? (
                    <Field label="Distance (KM)">
                      <Input value={delivery.distanceKm} onChange={(event) => updateDelivery(index, "distanceKm", event.target.value)} placeholder="Distance in KM" />
                    </Field>
                  ) : null}
                </div>
                {/* Material for this delivery — one material per delivery (delivery-wise). */}
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Material</p>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Field label="Material">
                      <Select value={delivery.materialId} onChange={(event) => updateDelivery(index, "materialId", event.target.value)}>
                        <option value="">Select material</option>
                        {customerMaterials.map((material) => (
                          <option key={material.id} value={material.id}>
                            {material.materialCode}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Sub Brand">
                      <Input value={selectedMaterial?.description ?? "—"} disabled />
                    </Field>
                    <Field label="Quantity">
                      <div className="grid grid-cols-[1fr_88px] gap-2">
                        <Input value={delivery.quantity} onChange={(event) => updateDelivery(index, "quantity", event.target.value)} />
                        <div className="flex items-center justify-center rounded-lg border border-gray-300 bg-gray-50 px-2 text-xs font-semibold text-gray-700">
                          {delivery.uom || selectedMaterial?.quantityUOM || "UOM"}
                        </div>
                      </div>
                    </Field>
                    <Field label="Weight">
                      <div className="grid grid-cols-[1fr_104px] gap-2">
                        <Input value={delivery.weight} onChange={(event) => updateDelivery(index, "weight", event.target.value)} />
                        <Select value={delivery.weightUom} onChange={(event) => updateDelivery(index, "weightUom", event.target.value)}>
                          <option value="">UOM</option>
                          {weightUOMOptions.map((uom) => (
                            <option key={uom} value={uom}>
                              {uom}
                            </option>
                          ))}
                        </Select>
                      </div>
                      {mapping ? (
                        <p className="mt-1 text-[11px] text-gray-400">{`Auto: 1 ${mapping.quantityUOM} = ${mapping.conversionValue} ${mapping.weightUOM}`}</p>
                      ) : null}
                    </Field>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </StepSection>

      {/* STEP 3 — Vehicle Requirement */}
      <StepSection
        step={3}
        title="Vehicle Requirement"
        summary={`${selectedVehicleTypeCode ?? (rateType === "PER_MT" ? "Any vehicle" : "No vehicle")}${draft.pickupDateTime ? ` · ${draft.pickupDateTime.replace("T", " ")}` : ""}`}
        defaultOpen
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={rateType === "PER_MT" ? "Vehicle Type (optional)" : "Vehicle Type"}>
            <Select value={draft.vehicleTypeId} onChange={(event) => setDraft((current) => ({ ...current, vehicleTypeId: event.target.value }))}>
              <option value="">{rateType === "PER_MT" ? "Optional vehicle type" : "Select vehicle type"}</option>
              {adminSources.vehicleTypes
                .filter((vehicleType) => vehicleType.status === "active")
                .map((vehicleType) => (
                  <option key={vehicleType.id} value={vehicleType.id}>
                    {vehicleType.typeCode}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Pickup Date &amp; Time">
            <Input type="datetime-local" value={draft.pickupDateTime} onChange={(event) => setDraft((current) => ({ ...current, pickupDateTime: event.target.value }))} />
          </Field>
        </div>
      </StepSection>

      {/* Spot-auction contract match — surfaced BEFORE the commercial preview
          so the dispatcher never types a manual vendor amount when a spot
          contract already covers the lane. */}
      {draft.commercialType === "SPOT" && spotContractMatch ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                ⚡ Spot contract available for {spotContractMatch.originCity} → {spotContractMatch.destinationCity}
              </p>
              <p className="mt-1 text-xs text-amber-800">
                {spotContractMatch.vendorName} @ ₹{spotContractMatch.contractedRate.toLocaleString("en-IN")}{" "}
                {spotContractMatch.rateUnit.replace("PER_", "/").toLowerCase()} — won in auction{" "}
                {spotContractMatch.sourceAuctionId}
                {spotContractMatch.awardedAt ? ` on ${new Date(spotContractMatch.awardedAt).toLocaleDateString()}` : ""}, valid till {spotContractMatch.endDate}. One-time use.
              </p>
              <p className="mt-1 text-xs text-amber-700">
                {useSpotContract
                  ? `The indent will go directly to ${spotContractMatch.vendorName} at the contract rate.`
                  : "Ignored — the booking follows the normal manual-rate flow."}
              </p>
            </div>
            <Button
              type="button"
              variant={useSpotContract ? "outline" : "default"}
              size="sm"
              onClick={() => setUseSpotContract((v) => !v)}
            >
              {useSpotContract ? "Ignore contract" : "Use spot contract"}
            </Button>
          </div>
        </div>
      ) : null}

      {/* STEP 4 — Commercial Preview (only after customer + route + material) */}
      {(() => {
        const routeReady = deliveries.some((delivery) => delivery.originAddressId && delivery.destinationCity);
        const materialReady = deliveries.some(
          (delivery) => delivery.materialId && Number(delivery.quantity) > 0 && Number(delivery.weight) > 0,
        );
        const commercialReady = Boolean(selectedCustomer) && routeReady && materialReady;
        if (!commercialReady) {
          return null;
        }
        return (
          <StepSection
            step={4}
            title="Commercial Preview"
            summary={calculatedFreight ? formatCurrency(calculatedFreight) : "—"}
            defaultOpen
          >
            <div className="space-y-2.5">
              {draft.commercialType === "SPOT" ? (
                <Field label="Spot Rate (Manual)">
                  <Input value={draft.enteredRate} onChange={(event) => setDraft((current) => ({ ...current, enteredRate: event.target.value }))} />
                </Field>
              ) : null}
              {/* Compact one-row commercial summary (no large card). */}
              <div className="flex flex-wrap items-end gap-x-8 gap-y-2 rounded-xl border border-gray-200 bg-slate-50/70 px-4 py-2.5">
                <PreviewKV label="Rate Source" value={draft.commercialType === "CONTRACT" ? "Contract rate card" : "Spot · manual"} />
                <PreviewKV label="Rate Type" value={rateType} />
                <PreviewKV
                  label="Entered Rate"
                  value={
                    draft.commercialType === "CONTRACT"
                      ? rateLookupPending
                        ? "Checking…"
                        : baseRate != null
                          ? formatCurrency(baseRate)
                          : "No rate found"
                      : numericRate
                        ? formatCurrency(numericRate)
                        : "—"
                  }
                />
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Total Freight</span>
                  <span className="text-lg font-bold text-gray-900">{calculatedFreight ? formatCurrency(calculatedFreight) : "—"}</span>
                </div>
              </div>
              <Field label="Ops Remark">
                <Textarea value={draft.opsRemark} onChange={(event) => setDraft((current) => ({ ...current, opsRemark: event.target.value }))} className="min-h-[44px]" />
              </Field>
            </div>
          </StepSection>
        );
      })()}

      {/* STEP 6 — Actions (sticky footer, always visible) */}
      <div className="sticky bottom-0 z-30 -mx-4 mt-1 flex items-center justify-between gap-3 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="text-sm text-gray-600">
          <span className="font-medium text-gray-500">Total Freight</span>{" "}
          <span className="text-base font-bold text-gray-900">{calculatedFreight ? formatCurrency(calculatedFreight) : "—"}</span>
        </div>
        <div className="flex gap-2">
          {(canCreateBooking || access.can("CREATE_BOOKING", "CREATE")) ? (
            <Button variant="outline" onClick={() => persistBooking("DRAFT", false)}>
              Save Draft
            </Button>
          ) : null}
          {(canCreateBooking || access.can("CREATE_BOOKING", "SUBMIT_BOOKING")) ? (
            <Button onClick={() => persistBooking(submitStatus, true)}>Submit Booking</Button>
          ) : null}
        </div>
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
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{addressDialogError}</div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Contact Code" helper="Auto-generated as ADDR-0001 if left blank">
              <Input value={addressDraft.contactCode} onChange={(event) => setAddressDraft((current) => ({ ...current, contactCode: event.target.value }))} placeholder="Enter or leave blank" />
            </Field>
            <Field label="Address Usage">
              <Select value={addressDraft.addressUsage} onChange={(event) => setAddressDraft((current) => ({ ...current, addressUsage: event.target.value as BookingAddressUsage }))}>
                {getBookingAddressUsageOptions(addressDialogField).map((usage) => (
                  <option key={usage} value={usage}>
                    {usage}
                  </option>
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

function StepSection({
  step,
  title,
  summary,
  action,
  defaultOpen,
  children,
}: {
  step: number;
  title: string;
  summary?: string;
  action?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <section className="overflow-hidden rounded-xl border border-slate-300 border-l-[3px] border-l-primary/70 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-primary/[0.09] to-transparent px-4 py-2">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex flex-1 items-center gap-3 text-left"
          aria-expanded={open}
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
            {step}
          </span>
          <span className="text-base font-semibold text-gray-900">{title}</span>
          {summary ? <span className="truncate text-xs font-medium text-gray-500">{summary}</span> : null}
          <span className="ml-auto text-gray-400">{open ? "▾" : "▸"}</span>
        </button>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {open ? <div className="px-4 py-4">{children}</div> : null}
    </section>
  );
}

function Field({ label, helper, children }: { label: string; helper?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</label>
      {children}
      {helper ? <p className="text-[11px] text-gray-400">{helper}</p> : null}
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function PreviewKV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <span className="truncate text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}
