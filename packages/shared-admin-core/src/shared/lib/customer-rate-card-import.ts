import * as XLSX from "xlsx";
import type {
  CustomerRateType,
  RateCardImportResult,
  RateCardImportRow,
  RateMatchingConfig,
  TenantCustomerRateCardInput,
} from "@/types/customer";
import {
  getRateCardTemplateColumns,
  getRateMatchingColumns,
  getRequiredUploadColumns,
  normalizeRateMatchingConfig,
  RATE_VALUE_TEMPLATE_COLUMNS,
  type RateCardDimensionField,
} from "@/shared/lib/rate-matching-config";

/**
 * Customer rate-card import / export.
 *
 * Everything here is driven by the customer's {@link RateMatchingConfig}:
 * the download template, the upload's required columns and the per-row
 * validation all derive from the configured dimensions. There are no
 * hardcoded matching modes.
 */

const rateTypeAliasMap: Record<string, CustomerRateType> = {
  "PER KM": "PER_KM",
  PER_KM: "PER_KM",
  "PER TON": "PER_MT",
  PER_TON: "PER_MT",
  "PER MT": "PER_MT",
  PER_MT: "PER_MT",
  FIXED: "PER_TRIP",
  "PER TRIP": "PER_TRIP",
  PER_TRIP: "PER_TRIP",
};

/** Pincode dimension fields require a 6-digit format check. */
const PINCODE_FIELDS = new Set<RateCardDimensionField>(["sourcePincode", "destinationPincode"]);

const EMPTY_IMPORT_ROW: RateCardImportRow = {
  fromCity: "",
  toCity: "",
  fromLocation: "",
  toLocation: "",
  fromPincode: "",
  toPincode: "",
  vehicleType: "",
  material: "",
  serviceType: "",
  weightSlab: "",
  quantitySlab: "",
  customerGroup: "",
  uom: "",
  rateType: "",
  underloadRate: "",
  overloadRate: "",
  tat: "",
  effectiveFromDate: "",
  effectiveToDate: "",
  remarks: "",
};

/** Maps a rate-card dimension field to the loose import-row key it populates. */
const dimensionFieldToImportKey: Record<RateCardDimensionField, keyof RateCardImportRow> = {
  fromCity: "fromCity",
  toCity: "toCity",
  fromLocation: "fromLocation",
  toLocation: "toLocation",
  sourcePincode: "fromPincode",
  destinationPincode: "toPincode",
  vehicleType: "vehicleType",
  material: "material",
  serviceType: "serviceType",
  weightSlab: "weightSlab",
  quantitySlab: "quantitySlab",
  customerGroup: "customerGroup",
  uom: "uom",
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : `${value ?? ""}`.trim();
}

function normalizeDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const normalized = normalizeString(value);
  if (!normalized) {
    return "";
  }
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return normalized;
  }
  return parsed.toISOString().slice(0, 10);
}

/**
 * Validate and convert worksheet rows into rate-card inputs for the given
 * config. Each row is a `{ columnLabel: value }` map read by header name.
 */
function parseStructuredRows(
  rows: Record<string, string>[],
  config: RateMatchingConfig,
): RateCardImportResult {
  const result: RateCardImportResult = { validRows: [], invalidRows: [] };
  const dimensionColumns = getRateMatchingColumns(config);

  rows.forEach((row, index) => {
    const importRow: RateCardImportRow = { ...EMPTY_IMPORT_ROW };
    const dimensionValues: Partial<Record<RateCardDimensionField, string>> = {};
    const errors: string[] = [];

    // --- Configured dimension columns (all mandatory) ---
    dimensionColumns.forEach((column) => {
      const value = normalizeString(row[column.label]);
      dimensionValues[column.field] = value;
      importRow[dimensionFieldToImportKey[column.field]] = value;
      if (PINCODE_FIELDS.has(column.field)) {
        if (!/^\d{6}$/.test(value)) {
          errors.push(`${column.label} must be a 6-digit number.`);
        }
      } else if (!value) {
        errors.push(`${column.label} is required.`);
      }
    });

    // --- Fixed rate/value columns: Rate Type + a single Rate ---
    const rateTypeRaw = normalizeString(row["Rate Type"]);
    const rateRaw = normalizeString(row["Rate"]);

    importRow.rateType = rateTypeRaw;
    importRow.underloadRate = rateRaw;

    const normalizedRateType = rateTypeAliasMap[rateTypeRaw.toUpperCase()];
    if (!normalizedRateType || !["PER_KM", "PER_MT", "PER_TRIP"].includes(normalizedRateType)) {
      errors.push("Rate Type must be Per KM, Per MT, or Per Trip.");
    }

    const numericRate = Number(rateRaw);
    if (!rateRaw || Number.isNaN(numericRate) || numericRate <= 0) {
      errors.push("Rate must be a positive number.");
    }

    if (errors.length) {
      result.invalidRows.push({ rowNumber: index + 2, row: importRow, errors });
      return;
    }

    result.validRows.push({
      fromCity: dimensionValues.fromCity || undefined,
      toCity: dimensionValues.toCity || undefined,
      fromLocation: dimensionValues.fromLocation || undefined,
      toLocation: dimensionValues.toLocation || undefined,
      sourcePincode: dimensionValues.sourcePincode ?? "",
      destinationPincode: dimensionValues.destinationPincode ?? "",
      rateType: normalizedRateType,
      vehicleType: dimensionValues.vehicleType || null,
      material: dimensionValues.material || undefined,
      serviceType: dimensionValues.serviceType || undefined,
      weightSlab: dimensionValues.weightSlab || undefined,
      quantitySlab: dimensionValues.quantitySlab || undefined,
      customerGroup: dimensionValues.customerGroup || undefined,
      uom: dimensionValues.uom || undefined,
      underloadRate: numericRate,
      overloadRate: null,
      baseRate: numericRate,
      rate: numericRate,
      status: "active",
    });
  });

  return result;
}

function parseRateCardWorksheet(
  worksheet: XLSX.WorkSheet,
  config: RateMatchingConfig,
): RateCardImportResult {
  const rows = XLSX.utils.sheet_to_json<(string | number | Date)[]>(worksheet, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: false,
  });

  if (!rows.length) {
    return { validRows: [], invalidRows: [] };
  }

  const headerRow = rows[0].map((cell) => normalizeString(cell));
  const headerIndex = new Map(headerRow.map((header, index) => [header.trim().toLowerCase(), index]));

  // The uploaded file must contain this customer's configured columns. A file
  // built for a different configuration (missing columns) is rejected clearly.
  const requiredColumns = getRequiredUploadColumns(config);
  const missing = requiredColumns.filter((column) => !headerIndex.has(column.toLowerCase()));
  if (missing.length) {
    return {
      validRows: [],
      invalidRows: [
        {
          rowNumber: 1,
          row: { ...EMPTY_IMPORT_ROW },
          errors: [
            `File does not match this customer's template. Expected columns: ${requiredColumns.join(
              ", ",
            )}. Missing: ${missing.join(", ")}.`,
          ],
        },
      ],
    };
  }

  // Read every known column by header name so column order does not matter.
  const knownColumns = [
    ...getRateMatchingColumns(config).map((column) => column.label),
    ...RATE_VALUE_TEMPLATE_COLUMNS,
  ];
  const structuredRows = rows.slice(1).map((row) => {
    const cellMap: Record<string, string> = {};
    knownColumns.forEach((label) => {
      const index = headerIndex.get(label.toLowerCase());
      cellMap[label] = index != null ? normalizeString(row[index] ?? "") : "";
    });
    return cellMap;
  });

  return parseStructuredRows(structuredRows, config);
}

export async function parseRateCardFile(
  file: File,
  config?: RateMatchingConfig,
): Promise<RateCardImportResult> {
  const resolvedConfig = normalizeRateMatchingConfig(config);
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension !== "csv" && extension !== "xlsx") {
    return {
      validRows: [],
      invalidRows: [
        {
          rowNumber: 0,
          row: { ...EMPTY_IMPORT_ROW },
          errors: ["Only .xlsx and .csv files are supported."],
        },
      ],
    };
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  if (!workbook.SheetNames.length) {
    return { validRows: [], invalidRows: [] };
  }

  return parseRateCardWorksheet(workbook.Sheets[workbook.SheetNames[0]], resolvedConfig);
}

export function parseRateCardCsvText(
  csvText: string,
  config?: RateMatchingConfig,
): RateCardImportResult {
  const workbook = XLSX.read(csvText, { type: "string" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  return parseRateCardWorksheet(worksheet, normalizeRateMatchingConfig(config));
}

/**
 * Download a customer-specific template. `columns` (from
 * {@link getRateCardTemplateColumns}) controls the header; an explicit config
 * may be passed instead.
 */
export function downloadRateCardTemplateWorkbook(columnsOrConfig?: string[] | RateMatchingConfig) {
  let header: string[];
  if (Array.isArray(columnsOrConfig) && typeof columnsOrConfig[0] === "string" && columnsOrConfig.length) {
    // Heuristic: rate-matching keys are upper-snake (e.g. "CITY_PAIR"); template
    // headers are human labels (e.g. "From City"). Treat all-uppercase tokens as
    // a config, otherwise as explicit column headers.
    const looksLikeConfig = (columnsOrConfig as string[]).every((value) => /^[A-Z_]+$/.test(value));
    header = looksLikeConfig
      ? getRateCardTemplateColumns(columnsOrConfig as RateMatchingConfig)
      : (columnsOrConfig as string[]);
  } else {
    header = getRateCardTemplateColumns(normalizeRateMatchingConfig(undefined));
  }

  const sampleValues: Record<string, string> = {
    "From City": "Delhi",
    "To City": "Mumbai",
    "From Location": "Delhi Plant",
    "To Location": "Mumbai Depot",
    "From Pincode": "110037",
    "To Pincode": "400001",
    "Vehicle Type": "32FT",
    Material: "Cement",
    "Service Type": "FTL",
    "Weight Slab": "0-9 MT",
    "Quantity Slab": "0-100",
    "Customer Group": "Group A",
    UOM: "MT",
    "Rate Type": "Per Trip",
    Rate: "18000",
  };
  const exampleRow: Record<string, string> = {};
  header.forEach((column) => {
    exampleRow[column] = sampleValues[column] ?? "";
  });

  const worksheet = XLSX.utils.json_to_sheet([exampleRow], { header });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Rate Card Template");
  XLSX.writeFile(workbook, "customer-rate-card-template.xlsx");
}
