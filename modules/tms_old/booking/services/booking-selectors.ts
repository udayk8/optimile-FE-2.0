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
import type { TenantVendorRateCard } from "@/types/vendor";
import { perKM, perMT, perTrip } from "@/modules/tms/booking/services/booking-engine";

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

function normalizeCityValue(value?: string | null) {
  const normalized = normalizeMatchValue(value)
    .replace(/[.,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const cityAliases: Record<string, string> = {
    bangalore: "bangalore",
    bengaluru: "bangalore",
    banglore: "bangalore",
    blr: "bangalore",
    delhi: "delhi",
    "new delhi": "delhi",
    ncr: "delhi",
    mumbai: "mumbai",
    bombay: "mumbai",
    chennai: "chennai",
    madras: "chennai",
    kolkata: "kolkata",
    calcutta: "kolkata",
    pune: "pune",
    poona: "pune",
  };

  return cityAliases[normalized] ?? normalized;
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

function hasMatchValue(value?: string | null) {
  return normalizeMatchValue(value) !== "";
}

export function getEffectiveRateMatchingBasis(
  preferredBasis: CustomerRateMatchingBasis,
  input: Pick<
    RateValidationInput,
    "lane" | "fromCity" | "toCity" | "fromLocation" | "toLocation" | "fromPincode" | "toPincode"
  >,
  options?: {
    allowDestinationFallback?: boolean;
  },
) {
  const allowDestinationFallback = options?.allowDestinationFallback ?? false;
  const hasCities = hasMatchValue(input.fromCity) && hasMatchValue(input.toCity);
  const hasLocations = hasMatchValue(input.fromLocation) && hasMatchValue(input.toLocation);
  const hasPincodes = hasMatchValue(input.fromPincode) && hasMatchValue(input.toPincode);
  const hasLane = hasMatchValue(input.lane);

  switch (preferredBasis) {
    case "LANE_TO_LANE":
      if (hasLane) {
        return "LANE_TO_LANE";
      }
      return allowDestinationFallback && hasCities && hasMatchValue(input.fromLocation) && !hasMatchValue(input.toLocation)
        ? "CITY_TO_CITY"
        : "LANE_TO_LANE";
    case "PINCODE_TO_PINCODE":
      if (hasPincodes) {
        return "PINCODE_TO_PINCODE";
      }
      return allowDestinationFallback && hasCities && hasMatchValue(input.fromPincode) && !hasMatchValue(input.toPincode)
        ? "CITY_TO_CITY"
        : "PINCODE_TO_PINCODE";
    case "ADDRESS_TO_ADDRESS":
      if (hasLocations) {
        return "ADDRESS_TO_ADDRESS";
      }
      return allowDestinationFallback && hasCities && hasMatchValue(input.fromLocation) && !hasMatchValue(input.toLocation)
        ? "CITY_TO_CITY"
        : "ADDRESS_TO_ADDRESS";
    case "CITY_TO_CITY":
    default:
      return "CITY_TO_CITY";
  }
}

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
    switch (input.rateMatchingBasis) {
      case "CITY_TO_CITY":
        return (
          normalizeCityValue(rateCard.fromCity ?? rateCard.fromLocation) ===
            normalizeCityValue(input.fromCity) &&
          normalizeCityValue(rateCard.toCity ?? rateCard.toLocation) === normalizeCityValue(input.toCity)
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

export type VendorRateValidationInput = {
  bookingDate?: string | null;
  fromCity?: string | null;
  toCity?: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  fromPincode?: string | null;
  toPincode?: string | null;
  vehicleType?: string | null;
  rateType: "PER_MT" | "PER_KM" | "PER_TRIP";
};

function normalizeVendorRateType(rateType?: TenantVendorRateCard["rateType"] | null) {
  if (rateType === "PER_KM") {
    return "PER_KM" as const;
  }
  if (rateType === "PER_MT") {
    return "PER_MT" as const;
  }
  return "PER_TRIP" as const;
}

export function validateVendorRateCard(
  input: VendorRateValidationInput,
  rateCards: TenantVendorRateCard[],
) {
  const filteredRateCards = rateCards.filter((rateCard) => {
    if (rateCard.status !== "active") {
      return false;
    }
    if (normalizeVendorRateType(rateCard.rateType) !== input.rateType) {
      return false;
    }
    if (
      input.vehicleType &&
      rateCard.vehicleType &&
      normalizeMatchValue(rateCard.vehicleType) !== normalizeMatchValue(input.vehicleType)
    ) {
      return false;
    }
    if (
      input.fromLocation &&
      input.toLocation &&
      normalizeMatchValue(rateCard.fromLocation) === normalizeMatchValue(input.fromLocation) &&
      normalizeMatchValue(rateCard.toLocation) === normalizeMatchValue(input.toLocation)
    ) {
      return true;
    }
    if (
      input.fromPincode &&
      input.toPincode &&
      normalizeMatchValue(rateCard.sourcePincode) === normalizeMatchValue(input.fromPincode) &&
      normalizeMatchValue(rateCard.destinationPincode) === normalizeMatchValue(input.toPincode)
    ) {
      return true;
    }
    return (
      normalizeCityValue(rateCard.fromCity ?? rateCard.fromLocation) === normalizeCityValue(input.fromCity) &&
      normalizeCityValue(rateCard.toCity ?? rateCard.toLocation) === normalizeCityValue(input.toCity)
    );
  });

  return filteredRateCards[0] ?? null;
}

export function getVendorRateCardUnitRate(rateCard?: TenantVendorRateCard | null) {
  if (!rateCard) {
    return null;
  }
  return Number(rateCard.buyingRate ?? rateCard.underloadRate ?? rateCard.rate ?? 0) || 0;
}

export function calculateVendorFreightFromRateCard(params: {
  rateCard: TenantVendorRateCard | null;
  weight: number;
  distanceKm: number;
}) {
  const { rateCard, weight, distanceKm } = params;
  if (!rateCard) {
    return 0;
  }
  const unitRate = getVendorRateCardUnitRate(rateCard) ?? 0;
  const normalizedRateType = normalizeVendorRateType(rateCard.rateType);
  if (normalizedRateType === "PER_MT") {
    return Number(perMT(unitRate, weight).toFixed(2));
  }
  if (normalizedRateType === "PER_KM") {
    return Number(perKM(unitRate, distanceKm).toFixed(2));
  }
  return Number(perTrip(unitRate).toFixed(2));
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
