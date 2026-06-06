import type {
  CustomerRateMatchingBasis,
  RateMatchingConfig,
  RateMatchingFieldKey,
  TenantCustomer,
} from "@/types/customer";

/**
 * RATE MATCHING CONFIGURATION ENGINE
 *
 * A single, reusable definition of the configurable rate-matching dimensions.
 * One customer config (an ordered set of {@link RateMatchingFieldKey}) drives
 * everything dynamically:
 *   1. Rate Card grid columns
 *   2. Add Rate form fields
 *   3. Download template headers
 *   4. Upload validation (required columns)
 *   5. Booking rate matching (with "most specific match wins" priority)
 *
 * There are intentionally NO hardcoded modes (City-to-City, Pincode-to-Pincode,
 * …). Pair dimensions are single keys that emit two columns, so "from" can never
 * exist without its "to".
 */

/** A single data column a dimension contributes (a pair emits two). */
export interface RateMatchingColumn {
  /** The dimension this column belongs to. */
  key: RateMatchingFieldKey;
  /** Header / form label, e.g. "From City". */
  label: string;
  /** Property on TenantCustomerRateCard this column reads/writes. */
  field: RateCardDimensionField;
  placeholder?: string;
}

export type RateCardDimensionField =
  | "fromCity"
  | "toCity"
  | "fromLocation"
  | "toLocation"
  | "sourcePincode"
  | "destinationPincode"
  | "vehicleType"
  | "material"
  | "serviceType"
  | "weightSlab"
  | "quantitySlab"
  | "customerGroup"
  | "uom";

export interface RateMatchingFieldDef {
  key: RateMatchingFieldKey;
  /** Option label in the multi-select, e.g. "City Pair". */
  label: string;
  /** Helper shown under the option, e.g. "From City + To City". */
  description?: string;
  /** Columns this dimension contributes to grid/form/template. */
  columns: RateMatchingColumn[];
}

/**
 * Canonical dimension catalogue. The order here is the canonical column order
 * used everywhere (grid, form, template) regardless of selection order.
 */
export const RATE_MATCHING_FIELDS: RateMatchingFieldDef[] = [
  {
    key: "CITY_PAIR",
    label: "City Pair",
    description: "From City + To City",
    columns: [
      { key: "CITY_PAIR", label: "From City", field: "fromCity", placeholder: "Bengaluru" },
      { key: "CITY_PAIR", label: "To City", field: "toCity", placeholder: "Chennai" },
    ],
  },
  {
    key: "LOCATION_PAIR",
    label: "Location Pair",
    description: "From Location + To Location",
    columns: [
      { key: "LOCATION_PAIR", label: "From Location", field: "fromLocation", placeholder: "BLR Plant" },
      { key: "LOCATION_PAIR", label: "To Location", field: "toLocation", placeholder: "CHN Depot" },
    ],
  },
  {
    key: "PINCODE_PAIR",
    label: "Pincode Pair",
    description: "From Pincode + To Pincode",
    columns: [
      { key: "PINCODE_PAIR", label: "From Pincode", field: "sourcePincode", placeholder: "560001" },
      { key: "PINCODE_PAIR", label: "To Pincode", field: "destinationPincode", placeholder: "600001" },
    ],
  },
  {
    key: "VEHICLE_TYPE",
    label: "Vehicle Type",
    columns: [{ key: "VEHICLE_TYPE", label: "Vehicle Type", field: "vehicleType", placeholder: "32FT" }],
  },
  {
    key: "MATERIAL",
    label: "Material",
    columns: [{ key: "MATERIAL", label: "Material", field: "material", placeholder: "Cement" }],
  },
  {
    key: "SERVICE_TYPE",
    label: "Service Type",
    columns: [{ key: "SERVICE_TYPE", label: "Service Type", field: "serviceType", placeholder: "FTL" }],
  },
  {
    key: "WEIGHT_SLAB",
    label: "Weight Slab",
    columns: [{ key: "WEIGHT_SLAB", label: "Weight Slab", field: "weightSlab", placeholder: "0-9 MT" }],
  },
  {
    key: "QUANTITY_SLAB",
    label: "Quantity Slab",
    columns: [{ key: "QUANTITY_SLAB", label: "Quantity Slab", field: "quantitySlab", placeholder: "0-100" }],
  },
  {
    key: "CUSTOMER_GROUP",
    label: "Customer Group",
    columns: [{ key: "CUSTOMER_GROUP", label: "Customer Group", field: "customerGroup", placeholder: "Group A" }],
  },
  {
    key: "UOM",
    label: "UOM",
    columns: [{ key: "UOM", label: "UOM", field: "uom", placeholder: "MT" }],
  },
];

const FIELD_BY_KEY = new Map<RateMatchingFieldKey, RateMatchingFieldDef>(
  RATE_MATCHING_FIELDS.map((field) => [field.key, field]),
);

/** Canonical ordering index for a dimension key. */
const FIELD_ORDER = new Map<RateMatchingFieldKey, number>(
  RATE_MATCHING_FIELDS.map((field, index) => [field.key, index]),
);

/** Fixed rate/value columns that always follow the dimension columns. */
export const RATE_VALUE_TEMPLATE_COLUMNS = ["Rate Type", "Rate"] as const;

export function getRateMatchingFieldDef(key: RateMatchingFieldKey): RateMatchingFieldDef | undefined {
  return FIELD_BY_KEY.get(key);
}

/** Derive the configurable dimensions from a legacy single-mode basis. */
export function basisToRateMatchingConfig(
  basis: CustomerRateMatchingBasis | undefined,
): RateMatchingConfig {
  switch (basis) {
    case "ADDRESS_TO_ADDRESS":
      return ["LOCATION_PAIR", "VEHICLE_TYPE"];
    case "PINCODE_TO_PINCODE":
      return ["PINCODE_PAIR", "VEHICLE_TYPE"];
    case "HYBRID":
      return ["CITY_PAIR", "LOCATION_PAIR", "PINCODE_PAIR", "VEHICLE_TYPE"];
    case "CITY_TO_CITY":
    default:
      return ["CITY_PAIR", "VEHICLE_TYPE"];
  }
}

/**
 * Normalise a config: drop unknown keys, de-duplicate, sort into canonical
 * order. Falls back to a default City Pair + Vehicle Type config when empty so
 * at least one matching parameter is always present.
 */
export function normalizeRateMatchingConfig(config: RateMatchingConfig | undefined): RateMatchingConfig {
  const seen = new Set<RateMatchingFieldKey>();
  (config ?? []).forEach((key) => {
    if (FIELD_BY_KEY.has(key)) {
      seen.add(key);
    }
  });
  if (!seen.size) {
    return ["CITY_PAIR", "VEHICLE_TYPE"];
  }
  return [...seen].sort((a, b) => (FIELD_ORDER.get(a) ?? 0) - (FIELD_ORDER.get(b) ?? 0));
}

/**
 * Project a config back to a representative legacy {@link CustomerRateMatchingBasis}.
 * Used to keep the legacy `rateMatchingBasis` field aligned for consumers that
 * still read it (LR / destination-change), while the config remains the source
 * of truth.
 */
export function rateMatchingConfigToBasis(
  config: RateMatchingConfig,
): CustomerRateMatchingBasis {
  const normalized = normalizeRateMatchingConfig(config);
  const locationDimensions = normalized.filter(
    (key) => key === "CITY_PAIR" || key === "LOCATION_PAIR" || key === "PINCODE_PAIR",
  );
  if (locationDimensions.length > 1) return "HYBRID";
  if (normalized.includes("PINCODE_PAIR")) return "PINCODE_TO_PINCODE";
  if (normalized.includes("LOCATION_PAIR")) return "ADDRESS_TO_ADDRESS";
  return "CITY_TO_CITY";
}

/**
 * Resolve the effective config for a customer: prefer the explicit config,
 * otherwise derive from the legacy basis. Always normalised.
 */
export function resolveCustomerRateMatchingConfig(
  customer: Pick<TenantCustomer, "rateMatchingConfig" | "rateMatchingBasis"> | null | undefined,
): RateMatchingConfig {
  if (customer?.rateMatchingConfig?.length) {
    return normalizeRateMatchingConfig(customer.rateMatchingConfig);
  }
  return normalizeRateMatchingConfig(basisToRateMatchingConfig(customer?.rateMatchingBasis));
}

/**
 * Resolve the effective RATE CALCULATION STRATEGY for a customer — the subset of
 * the rate card STRUCTURE that booking searches on to auto-calculate freight.
 *
 * Deliberately separate from {@link resolveCustomerRateMatchingConfig} (the
 * structure: which columns exist). The strategy is configured in the customer's
 * Preferences and may only reference dimensions present in the structure. When
 * no strategy is configured — or none of its dimensions survive the structure
 * filter — booking falls back to matching on the full structure.
 */
export function resolveCustomerRateCalculationStrategy(
  customer:
    | Pick<TenantCustomer, "rateMatchingConfig" | "rateMatchingBasis" | "rateCalculationStrategy">
    | null
    | undefined,
): RateMatchingConfig {
  const structure = resolveCustomerRateMatchingConfig(customer);
  const allowed = new Set(structure);
  const selected = (customer?.rateCalculationStrategy ?? []).filter((key) => allowed.has(key));
  if (!selected.length) {
    return structure;
  }
  // Preserve the structure's canonical column order and de-duplicate.
  return structure.filter((key) => selected.includes(key));
}

/** Flatten the config into its ordered dimension columns. */
export function getRateMatchingColumns(config: RateMatchingConfig): RateMatchingColumn[] {
  return normalizeRateMatchingConfig(config).flatMap((key) => FIELD_BY_KEY.get(key)?.columns ?? []);
}

/** Dimension column labels followed by the fixed rate/value columns. */
export function getRateCardTemplateColumns(config: RateMatchingConfig): string[] {
  return [
    ...getRateMatchingColumns(config).map((column) => column.label),
    ...RATE_VALUE_TEMPLATE_COLUMNS,
  ];
}

/**
 * Columns that MUST be present (and non-empty) for an upload to be accepted.
 * Every dimension column plus the always-mandatory rate basics.
 */
export function getRequiredUploadColumns(config: RateMatchingConfig): string[] {
  return [
    ...getRateMatchingColumns(config).map((column) => column.label),
    "Rate Type",
    "Rate",
  ];
}

/** A short human summary, e.g. "City Pair + Vehicle Type + Material". */
export function describeRateMatchingConfig(config: RateMatchingConfig): string {
  return normalizeRateMatchingConfig(config)
    .map((key) => FIELD_BY_KEY.get(key)?.label ?? key)
    .join(" + ");
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

export function normalizeRateMatchValue(value?: string | null): string {
  return value?.trim().toLowerCase() ?? "";
}

const CITY_ALIASES: Record<string, string> = {
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

export function normalizeRateCityValue(value?: string | null): string {
  const normalized = normalizeRateMatchValue(value)
    .replace(/[.,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return CITY_ALIASES[normalized] ?? normalized;
}

/** Booking-side inputs used to match a rate card across all dimensions. */
export interface RateMatchInput {
  fromCity?: string | null;
  toCity?: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  fromPincode?: string | null;
  toPincode?: string | null;
  vehicleType?: string | null;
  material?: string | null;
  serviceType?: string | null;
  weightSlab?: string | null;
  quantitySlab?: string | null;
  customerGroup?: string | null;
  uom?: string | null;
}

/**
 * The minimal rate-card shape the matching engine reads. Both
 * {@link TenantCustomerRateCard} and `TenantVendorRateCard` satisfy this, so the
 * SAME engine matches customer (selling) and vendor (buying) rate cards.
 */
export interface RateCardMatchFields {
  fromCity?: string | null;
  toCity?: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  sourcePincode?: string | null;
  destinationPincode?: string | null;
  vehicleType?: string | null;
  material?: string | null;
  serviceType?: string | null;
  weightSlab?: string | null;
  quantitySlab?: string | null;
  customerGroup?: string | null;
  uom?: string | null;
}

/** Origin→destination dimensions. At least one must positively match when the
 *  config includes any, so a row never matches on attributes (vehicle/material)
 *  alone while its city/location/pincode is unmatched. */
const LOCATION_DIMENSIONS = new Set<RateMatchingFieldKey>([
  "CITY_PAIR",
  "LOCATION_PAIR",
  "PINCODE_PAIR",
]);

type DimensionVerdict = "match" | "conflict" | "skip";

/**
 * Compare a single dimension between a rate card row and a booking input.
 *  - "skip"     : either side has no value for this dimension (no constraint)
 *  - "match"    : both sides have values and they are equal
 *  - "conflict" : both sides have values and they differ
 * A "skip" never excludes a row and never adds specificity.
 */
function matchDimension(
  key: RateMatchingFieldKey,
  rateCard: RateCardMatchFields,
  input: RateMatchInput,
): DimensionVerdict {
  const cmp = (
    rcValue: string | null | undefined,
    inValue: string | null | undefined,
    normalizer: (value?: string | null) => string,
  ): DimensionVerdict => {
    const rc = normalizer(rcValue);
    const inp = normalizer(inValue);
    if (!rc || !inp) return "skip";
    return rc === inp ? "match" : "conflict";
  };

  // A pair dimension matches only when BOTH halves match (and skips when the
  // rate card constrains neither half).
  const combine = (...verdicts: DimensionVerdict[]): DimensionVerdict => {
    if (verdicts.some((v) => v === "conflict")) return "conflict";
    if (verdicts.some((v) => v === "match")) return "match";
    return "skip";
  };

  switch (key) {
    case "CITY_PAIR":
      return combine(
        cmp(rateCard.fromCity ?? rateCard.fromLocation, input.fromCity, normalizeRateCityValue),
        cmp(rateCard.toCity ?? rateCard.toLocation, input.toCity, normalizeRateCityValue),
      );
    case "LOCATION_PAIR":
      return combine(
        cmp(rateCard.fromLocation, input.fromLocation, normalizeRateMatchValue),
        cmp(rateCard.toLocation, input.toLocation, normalizeRateMatchValue),
      );
    case "PINCODE_PAIR":
      return combine(
        cmp(rateCard.sourcePincode, input.fromPincode, normalizeRateMatchValue),
        cmp(rateCard.destinationPincode, input.toPincode, normalizeRateMatchValue),
      );
    case "VEHICLE_TYPE":
      return cmp(rateCard.vehicleType, input.vehicleType, normalizeRateMatchValue);
    case "MATERIAL":
      return cmp(rateCard.material, input.material, normalizeRateMatchValue);
    case "SERVICE_TYPE":
      return cmp(rateCard.serviceType, input.serviceType, normalizeRateMatchValue);
    case "WEIGHT_SLAB":
      return cmp(rateCard.weightSlab, input.weightSlab, normalizeRateMatchValue);
    case "QUANTITY_SLAB":
      return cmp(rateCard.quantitySlab, input.quantitySlab, normalizeRateMatchValue);
    case "CUSTOMER_GROUP":
      return cmp(rateCard.customerGroup, input.customerGroup, normalizeRateMatchValue);
    case "UOM":
      return cmp(rateCard.uom, input.uom, normalizeRateMatchValue);
    default:
      return "skip";
  }
}

/**
 * Score how well a rate card matches the booking input for a given config.
 * Returns the number of dimensions that positively match, or `null` when the
 * row is ineligible (any configured dimension conflicts, or nothing matched at
 * all — a row that constrains nothing must not act as a catch-all).
 */
export function scoreRateCardMatch(
  rateCard: RateCardMatchFields,
  input: RateMatchInput,
  config: RateMatchingConfig,
): number | null {
  const dimensions = normalizeRateMatchingConfig(config);
  let score = 0;
  let hasLocationDimension = false;
  let matchedLocationDimension = false;
  for (const key of dimensions) {
    const verdict = matchDimension(key, rateCard, input);
    if (verdict === "conflict") return null;
    if (LOCATION_DIMENSIONS.has(key)) {
      hasLocationDimension = true;
      if (verdict === "match") matchedLocationDimension = true;
    }
    if (verdict === "match") score += 1;
  }
  // A configured location must actually match — never fall back to matching on
  // attributes (vehicle/material/…) alone.
  if (hasLocationDimension && !matchedLocationDimension) return null;
  return score >= 1 ? score : null;
}

/**
 * Find the best-matching rate card for a booking input using the configured
 * dimensions. "Most specific match wins" — the row matching the most configured
 * dimensions is chosen; ties keep the earlier row (callers pass rate cards in
 * preference order). Rows are assumed pre-filtered by status/rate type. Generic
 * over the rate-card shape so customer (selling) and vendor (buying) rate cards
 * both use this engine.
 */
export function findBestRateCardMatch<T extends RateCardMatchFields>(
  rateCards: T[],
  input: RateMatchInput,
  config: RateMatchingConfig,
): T | null {
  let best: T | null = null;
  let bestScore = -1;
  rateCards.forEach((rateCard) => {
    const score = scoreRateCardMatch(rateCard, input, config);
    if (score === null) return;
    if (score > bestScore) {
      bestScore = score;
      best = rateCard;
    }
  });
  return best;
}
