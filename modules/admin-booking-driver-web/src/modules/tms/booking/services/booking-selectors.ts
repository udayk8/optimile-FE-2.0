import type {
  CustomerRateMatchingBasis,
  CustomerRateType,
  TenantCustomer,
  TenantCustomerAddress,
  TenantCustomerRateCard,
} from "@/types/customer";
import type { TenantDriver, TenantVehicle } from "@/types/fleet";
import type {
  TenantLRConfig,
  TenantMaterial,
  TenantUOMDefinition,
  TenantUOMMapping,
  TenantVehicleType,
} from "@/types/master-data";
import type { TenantVendor } from "@/types/vendor";

export function getCustomerMaterials(materials: TenantMaterial[], customerId: string) {
  return materials.filter(
    (material) =>
      material.status === "active" &&
      (material.mappedCustomerIds.length === 0 || material.mappedCustomerIds.includes(customerId)),
  );
}

export function getCustomerAddresses(addresses: TenantCustomerAddress[]) {
  return addresses.filter((address) => address.status === "active");
}

export function getLaneMappedSourceAddresses(
  addresses: TenantCustomerAddress[],
  rateCards: TenantCustomerRateCard[],
) {
  const laneSourcePincodes = new Set(rateCards.map((rateCard) => rateCard.sourcePincode));
  const filtered = addresses.filter((address) => laneSourcePincodes.has(address.pincode));
  return filtered.length ? filtered : addresses;
}

export function getLaneMappedDestinationAddresses(
  addresses: TenantCustomerAddress[],
  rateCards: TenantCustomerRateCard[],
) {
  const laneDestinationPincodes = new Set(rateCards.map((rateCard) => rateCard.destinationPincode));
  const filtered = addresses.filter((address) => laneDestinationPincodes.has(address.pincode));
  return filtered.length ? filtered : addresses;
}

function normalizeRateType(rateType?: CustomerRateType | null) {
  if (rateType === "PER_KM") {
    return "PER_KM" as const;
  }
  if (rateType === "PER_TON" || rateType === "PER_MT") {
    return "PER_MT" as const;
  }
  return "PER_TRIP" as const;
}

function normalizeMatchValue(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function isRateCardEffective(rateCard: TenantCustomerRateCard, bookingDate?: string | null) {
  if (!bookingDate) {
    return true;
  }
  const targetDate = new Date(bookingDate);
  if (Number.isNaN(targetDate.getTime())) {
    return true;
  }
  const targetTime = targetDate.getTime();
  const fromTime = rateCard.effectiveFromDate ? new Date(rateCard.effectiveFromDate).getTime() : null;
  const toTime = rateCard.effectiveToDate ? new Date(rateCard.effectiveToDate).getTime() : null;
  if (fromTime != null && !Number.isNaN(fromTime) && targetTime < fromTime) {
    return false;
  }
  if (toTime != null && !Number.isNaN(toTime) && targetTime > toTime) {
    return false;
  }
  return true;
}

export type RateValidationInput = {
  bookingDate?: string | null;
  customerId: string;
  rateMatchingBasis: CustomerRateMatchingBasis;
  lane?: string | null;
  fromCity?: string | null;
  toCity?: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  fromPincode?: string | null;
  toPincode?: string | null;
  vehicleType?: string | null;
  rateType: "PER_MT" | "PER_KM" | "PER_TRIP";
  weight?: number | null;
};

export function validateRateCard(
  input: RateValidationInput,
  rateCards: TenantCustomerRateCard[],
) {
  const filteredRateCards = rateCards.filter((rateCard) => {
    if (rateCard.status !== "active") {
      return false;
    }
    if (normalizeRateType(rateCard.rateType) !== input.rateType) {
      return false;
    }
    if (
      input.vehicleType &&
      rateCard.vehicleType &&
      normalizeMatchValue(rateCard.vehicleType) !== normalizeMatchValue(input.vehicleType)
    ) {
      return false;
    }
    if (!isRateCardEffective(rateCard, input.bookingDate)) {
      return false;
    }

    switch (input.rateMatchingBasis) {
      case "CITY_TO_CITY":
        return (
          normalizeMatchValue(rateCard.fromCity ?? rateCard.fromLocation) ===
            normalizeMatchValue(input.fromCity) &&
          normalizeMatchValue(rateCard.toCity ?? rateCard.toLocation) === normalizeMatchValue(input.toCity)
        );
      case "PINCODE_TO_PINCODE":
        return (
          normalizeMatchValue(rateCard.sourcePincode) === normalizeMatchValue(input.fromPincode) &&
          normalizeMatchValue(rateCard.destinationPincode) === normalizeMatchValue(input.toPincode)
        );
      case "ADDRESS_TO_ADDRESS":
        return (
          normalizeMatchValue(rateCard.fromLocation) === normalizeMatchValue(input.fromLocation) &&
          normalizeMatchValue(rateCard.toLocation) === normalizeMatchValue(input.toLocation)
        );
      case "LANE_TO_LANE":
      default:
        return normalizeMatchValue(rateCard.lanes) === normalizeMatchValue(input.lane);
    }
  });

  return filteredRateCards[0] ?? null;
}

export function getDefaultLRType(configs: TenantLRConfig[], customerId: string) {
  return (
    configs.find((config) => config.status === "active" && config.customerId === customerId)?.lrType ??
    configs.find((config) => config.status === "active" && config.scopeType !== "CUSTOMER")?.lrType ??
    "AUTO"
  );
}

export function buildCustomerLookup(customers: TenantCustomer[]) {
  return new Map(customers.map((customer) => [customer.id, customer]));
}

export function buildAddressLookup(addresses: TenantCustomerAddress[]) {
  return new Map(addresses.map((address) => [address.id, address]));
}

export function buildMaterialLookup(materials: TenantMaterial[]) {
  return new Map(materials.map((material) => [material.id, material]));
}

export function buildVehicleTypeLookup(vehicleTypes: TenantVehicleType[]) {
  return new Map(vehicleTypes.map((vehicleType) => [vehicleType.id, vehicleType]));
}

export function buildVehicleLookup(vehicles: TenantVehicle[]) {
  return new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
}

export function buildDriverLookup(drivers: TenantDriver[]) {
  return new Map(drivers.map((driver) => [driver.id, driver]));
}

export function buildVendorLookup(vendors: TenantVendor[]) {
  return new Map(vendors.map((vendor) => [vendor.id, vendor]));
}

export function getQuantityUOMOptions(
  definitions: TenantUOMDefinition[],
  materials: TenantMaterial[],
  customer?: TenantCustomer | null,
) {
  const configured = definitions
    .filter((definition) => definition.category === "QUANTITY" && definition.status === "active")
    .map((definition) => definition.code);
  const materialUOMs = materials.map((material) => (material.quantityUOM ?? material.uom).trim().toUpperCase()).filter(Boolean);
  const customerOverrides = (customer?.uomOverrides ?? [])
    .filter((override) => (override.status ?? "active") === "active")
    .map((override) => override.quantityUOM.trim().toUpperCase());
  return Array.from(new Set([...configured, ...materialUOMs, ...customerOverrides]));
}

export function getMaterialUOMMapping(
  material: TenantMaterial | null,
  customer: TenantCustomer | null,
  mappings: TenantUOMMapping[],
) {
  const quantityUOM = (material?.quantityUOM ?? material?.uom ?? "").trim().toUpperCase();
  if (!quantityUOM) {
    return null;
  }

  const customerOverride = customer?.uomOverrides?.find(
    (override) =>
      (override.status ?? "active") === "active" &&
      override.quantityUOM.trim().toUpperCase() === quantityUOM,
  );
  if (customerOverride) {
    return {
      quantityUOM,
      weightUOM: customerOverride.weightUOM.trim().toUpperCase(),
      conversionValue: Number(customerOverride.conversionValue) || 0,
      source: "CUSTOMER" as const,
    };
  }

  if (material?.defaultWeightUOM && material.conversionValue) {
    return {
      quantityUOM,
      weightUOM: material.defaultWeightUOM.trim().toUpperCase(),
      conversionValue: Number(material.conversionValue) || 0,
      source: "MATERIAL" as const,
    };
  }

  const globalMapping = resolveCustomerUOMMapping(customer, quantityUOM, mappings);
  if (globalMapping) {
    return {
      ...globalMapping,
      source: "GLOBAL" as const,
    };
  }

  return null;
}

const weightUnitToKg: Record<string, number> = {
  KG: 1,
  MT: 1000,
  POUNDS: 0.45359237,
  LB: 0.45359237,
  LBS: 0.45359237,
};

export function convertWeightValue(value: number, fromUOM: string, toUOM: string) {
  const normalizedFrom = fromUOM.trim().toUpperCase();
  const normalizedTo = toUOM.trim().toUpperCase();
  if (!Number.isFinite(value) || value <= 0 || normalizedFrom === normalizedTo) {
    return value;
  }
  const fromFactor = weightUnitToKg[normalizedFrom];
  const toFactor = weightUnitToKg[normalizedTo];
  if (!fromFactor || !toFactor) {
    return value;
  }
  const valueInKg = value * fromFactor;
  return valueInKg / toFactor;
}

export function getWeightUOMOptions(
  definitions: TenantUOMDefinition[],
  customer?: TenantCustomer | null,
) {
  const configured = definitions
    .filter((definition) => definition.category === "WEIGHT" && definition.status === "active")
    .map((definition) => definition.code);
  const customerOverrides = (customer?.uomOverrides ?? [])
    .filter((override) => (override.status ?? "active") === "active")
    .map((override) => override.weightUOM.trim().toUpperCase());
  return Array.from(new Set([...configured, ...customerOverrides]));
}

export function resolveCustomerUOMMapping(
  customer: TenantCustomer | null,
  quantityUOM: string,
  mappings: TenantUOMMapping[],
) {
  const normalizedQuantityUOM = quantityUOM.trim().toUpperCase();
  if (!normalizedQuantityUOM) {
    return null;
  }

  const customerOverride = customer?.uomOverrides?.find(
    (override) =>
      (override.status ?? "active") === "active" &&
      override.quantityUOM.trim().toUpperCase() === normalizedQuantityUOM,
  );
  if (customerOverride) {
    return {
      quantityUOM: customerOverride.quantityUOM.trim().toUpperCase(),
      weightUOM: customerOverride.weightUOM.trim().toUpperCase(),
      conversionValue: Number(customerOverride.conversionValue) || 0,
      source: "CUSTOMER" as const,
    };
  }

  const globalMapping = mappings.find(
    (mapping) =>
      mapping.status === "active" &&
      mapping.quantityUOM.trim().toUpperCase() === normalizedQuantityUOM,
  );
  if (!globalMapping) {
    return null;
  }

  return {
    quantityUOM: globalMapping.quantityUOM.trim().toUpperCase(),
    weightUOM: globalMapping.weightUOM.trim().toUpperCase(),
    conversionValue: Number(globalMapping.conversionValue) || 0,
    source: "GLOBAL" as const,
  };
}
