import * as XLSX from "xlsx";
import type {
  TenantVendorRateCardInput,
  VendorRateCardImportResult,
  VendorRateCardImportRow,
} from "@/types/vendor";
import type { RateMatchingConfig } from "@/types/customer";
import {
  getRateCardTemplateColumns,
  getRateMatchingColumns,
  getRequiredUploadColumns,
  normalizeRateMatchingConfig,
  RATE_VALUE_TEMPLATE_COLUMNS,
  type RateCardDimensionField,
} from "@/shared/lib/rate-matching-config";

export const vendorRateCardTemplateColumns = [
  "Lane",
  "From City",
  "To City",
  "From Location",
  "To Location",
  "From Pincode",
  "To Pincode",
  "Vehicle Type",
  "Rate Type",
  "Underload Rate",
  "Overload Rate",
  "TAT",
  "Effective From Date",
  "Effective To Date",
  "Remarks",
] as const;

const legacyVendorRateCardTemplateColumns = [
  "Contract Name",
  "Contract Code",
  "Effective From Date",
  "Effective To Date",
  "Lane",
  "From City",
  "To City",
  "From Location",
  "To Location",
  "From Pincode",
  "To Pincode",
  "Vehicle Type",
  "Rate Type",
  "Buying Rate",
  "Underload Rate",
  "Overload Rate",
  "TAT",
  "Remarks",
] as const;

type VendorRateCardTemplateColumn = (typeof vendorRateCardTemplateColumns)[number];
type VendorRateCardSpreadsheetRow = Record<string, string>;

const vendorRateTypeAliasMap: Record<string, TenantVendorRateCardInput["rateType"]> = {
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

export const vendorRateCardTemplateRows: Record<VendorRateCardTemplateColumn, string>[] = [
  {
    Lane: "BLR-DEL",
    "From City": "Bangalore",
    "To City": "Delhi",
    "From Location": "GM Palya Bengaluru, Bengaluru, Karnataka, 560070",
    "To Location": "Raja Garden, Mahatma Gandhi Rd, New Delhi, Delhi 110015",
    "From Pincode": "560070",
    "To Pincode": "110015",
    "Vehicle Type": "32FT_OPEN",
    "Rate Type": "PER_MT",
    "Underload Rate": "320",
    "Overload Rate": "300",
    TAT: "3",
    "Effective From Date": "2026-04-01",
    "Effective To Date": "2026-12-31",
    Remarks: "NT",
  },
  {
    Lane: "BLR-BOM",
    "From City": "Bangalore",
    "To City": "Mumbai",
    "From Location": "12, Old Airport Road, GM Palya, Bengaluru, Karnataka, 560075",
    "To Location": "45, TTC Industrial Area, Navi Mumbai, Maharashtra, 400705",
    "From Pincode": "560075",
    "To Pincode": "400705",
    "Vehicle Type": "TRAILER",
    "Rate Type": "PER_MT",
    "Underload Rate": "400",
    "Overload Rate": "390",
    TAT: "3",
    "Effective From Date": "2026-04-01",
    "Effective To Date": "2026-12-31",
    Remarks: "NT",
  },
];

export const vendorRateCardTemplateCsv = [
  vendorRateCardTemplateColumns.join(","),
  ...vendorRateCardTemplateRows.map((row) =>
    vendorRateCardTemplateColumns.map((column) => row[column] ?? "").join(","),
  ),
].join("\n");

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

function validateHeaderRow(headerRow: string[]) {
  const matchesPrimary =
    headerRow.length === vendorRateCardTemplateColumns.length &&
    vendorRateCardTemplateColumns.every((column, index) => headerRow[index] === column);
  const matchesLegacy =
    headerRow.length === legacyVendorRateCardTemplateColumns.length &&
    legacyVendorRateCardTemplateColumns.every((column, index) => headerRow[index] === column);
  return matchesPrimary || matchesLegacy;
}

function getRowValue(row: VendorRateCardSpreadsheetRow, column: string) {
  return normalizeString(row[column] ?? "");
}

export function parseVendorRateCardCsvText(csvText: string): VendorRateCardImportResult {
  const workbook = XLSX.read(csvText, { type: "string" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  return parseVendorRateCardWorksheet(worksheet);
}

function parseStructuredRows(rows: VendorRateCardSpreadsheetRow[]): VendorRateCardImportResult {
  const result: VendorRateCardImportResult = {
    validRows: [],
    invalidRows: [],
  };

  rows.forEach((row, index) => {
    const contractName = getRowValue(row, "Contract Name");
    const contractCode = getRowValue(row, "Contract Code");
    const effectiveFromDate = normalizeDate(getRowValue(row, "Effective From Date"));
    const effectiveToDate = normalizeDate(getRowValue(row, "Effective To Date"));
    const lane = getRowValue(row, "Lane");
    const fromCity = getRowValue(row, "From City");
    const toCity = getRowValue(row, "To City");
    const fromLocation = getRowValue(row, "From Location");
    const toLocation = getRowValue(row, "To Location");
    const sourcePincode = getRowValue(row, "From Pincode");
    const destinationPincode = getRowValue(row, "To Pincode");
    const vehicleType = getRowValue(row, "Vehicle Type");
    const rateTypeInput = getRowValue(row, "Rate Type").toUpperCase();
    const buyingRate = getRowValue(row, "Buying Rate");
    const underloadRate = getRowValue(row, "Underload Rate");
    const overloadRate = getRowValue(row, "Overload Rate");
    const tat = getRowValue(row, "TAT");
    const remarks = getRowValue(row, "Remarks");

    const importRow: VendorRateCardImportRow = {
      contractName,
      contractCode,
      effectiveFromDate,
      effectiveToDate,
      lane,
      fromCity,
      toCity,
      fromLocation,
      toLocation,
      sourcePincode,
      destinationPincode,
      rateType: getRowValue(row, "Rate Type"),
      vehicleType,
      buyingRate,
      underloadRate,
      overloadRate,
      tat,
      rate: underloadRate || buyingRate,
      remarks,
    };

    const errors: string[] = [];
    if (!lane) {
      errors.push("Lane is required.");
    }
    if (!fromCity) {
      errors.push("From City is required.");
    }
    if (!toCity) {
      errors.push("To City is required.");
    }
    if (!fromLocation) {
      errors.push("From Location is required.");
    }
    if (!toLocation) {
      errors.push("To Location is required.");
    }
    if (!/^\d{6}$/.test(sourcePincode)) {
      errors.push("From Pincode must be a 6-digit number.");
    }
    if (!/^\d{6}$/.test(destinationPincode)) {
      errors.push("To Pincode must be a 6-digit number.");
    }
    if (!vehicleType) {
      errors.push("Vehicle Type is required.");
    }
    const normalizedRateType = vendorRateTypeAliasMap[rateTypeInput];
    if (!normalizedRateType || !["PER_KM", "PER_MT", "PER_TRIP"].includes(normalizedRateType)) {
      errors.push("Rate Type must be Per KM, Per MT, or Per Trip.");
    }

    const effectiveRate = underloadRate || buyingRate;
    const numericUnderloadRate = Number(effectiveRate);
    if (!effectiveRate || Number.isNaN(numericUnderloadRate) || numericUnderloadRate <= 0) {
      errors.push("Underload Rate must be a positive number.");
    }
    const numericOverloadRate = overloadRate ? Number(overloadRate) : null;
    if (
      overloadRate &&
      (numericOverloadRate === null || Number.isNaN(numericOverloadRate) || numericOverloadRate <= 0)
    ) {
      errors.push("Overload Rate must be a valid positive number.");
    }
    if (!effectiveFromDate) {
      errors.push("Effective From Date is required.");
    }
    if (!effectiveToDate) {
      errors.push("Effective To Date is required.");
    }
    if (effectiveFromDate && effectiveToDate) {
      const fromDate = new Date(effectiveFromDate);
      const toDate = new Date(effectiveToDate);
      if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        errors.push("Effective dates must be valid dates.");
      } else if (toDate < fromDate) {
        errors.push("Effective To Date must be on or after Effective From Date.");
      }
    }

    if (errors.length) {
      result.invalidRows.push({
        rowNumber: index + 2,
        row: importRow,
        errors,
      });
      return;
    }

    result.validRows.push({
      contractName: contractName || undefined,
      contractCode: contractCode || undefined,
      effectiveFromDate,
      effectiveToDate,
      lanes: lane,
      fromCity,
      toCity,
      fromLocation,
      toLocation,
      sourcePincode,
      destinationPincode,
      rateType: normalizedRateType,
      vehicleType,
      buyingRate: numericUnderloadRate,
      underloadRate: numericUnderloadRate,
      overloadRate: numericOverloadRate,
      tat: tat || undefined,
      rate: numericUnderloadRate,
      status: "active",
      remarks: remarks || undefined,
    });
  });

  return result;
}

function parseVendorRateCardWorksheet(worksheet: XLSX.WorkSheet): VendorRateCardImportResult {
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
  if (!validateHeaderRow(headerRow)) {
    return {
      validRows: [],
      invalidRows: [
        {
          rowNumber: 1,
          row: {
            contractName: "",
            contractCode: "",
            effectiveFromDate: "",
            effectiveToDate: "",
            lane: "",
            fromCity: "",
            toCity: "",
            fromLocation: "",
            toLocation: "",
            sourcePincode: "",
            destinationPincode: "",
            rateType: "",
            vehicleType: "",
            buyingRate: "",
            underloadRate: "",
            overloadRate: "",
            tat: "",
            rate: "",
            remarks: "",
          },
          errors: [
            `Template columns must match exactly: ${vendorRateCardTemplateColumns.join(", ")}`,
          ],
        },
      ],
    };
  }

  const structuredRows = rows.slice(1).map((row) => {
    const cellMap: VendorRateCardSpreadsheetRow = {};
    headerRow.forEach((column, index) => {
      cellMap[column] = normalizeString(row[index] ?? "");
    });
    return cellMap;
  });

  return parseStructuredRows(structuredRows);
}

export async function parseVendorRateCardFile(file: File): Promise<VendorRateCardImportResult> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  if (!workbook.SheetNames.length) {
    return { validRows: [], invalidRows: [] };
  }

  if (extension !== "csv" && extension !== "xlsx") {
    return {
      validRows: [],
      invalidRows: [
        {
          rowNumber: 0,
          row: {
            contractName: "",
            contractCode: "",
            effectiveFromDate: "",
            effectiveToDate: "",
            lane: "",
            fromCity: "",
            toCity: "",
            fromLocation: "",
            toLocation: "",
            sourcePincode: "",
            destinationPincode: "",
            rateType: "",
            vehicleType: "",
            buyingRate: "",
            underloadRate: "",
            overloadRate: "",
            tat: "",
            rate: "",
            remarks: "",
          },
          errors: ["Only .xlsx and .csv files are supported."],
        },
      ],
    };
  }

  return parseVendorRateCardWorksheet(workbook.Sheets[workbook.SheetNames[0]]);
}

export function downloadVendorRateCardTemplateWorkbook() {
  const worksheet = XLSX.utils.json_to_sheet(vendorRateCardTemplateRows, {
    header: [...vendorRateCardTemplateColumns],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Vendor Rate Card Template");
  XLSX.writeFile(workbook, "vendor-rate-card-template.xlsx");
}

// ---------------------------------------------------------------------------
// CONFIG-DRIVEN vendor rate-card import / export — reuses the SAME engine
// (shared/lib/rate-matching-config) as customer rate cards. The vendor's
// `rateMatchingConfig` drives the template, required columns and validation.
// ---------------------------------------------------------------------------

const PINCODE_FIELDS = new Set<RateCardDimensionField>(["sourcePincode", "destinationPincode"]);

/** Maps an engine dimension field to the vendor rate-card input property. */
const dimensionFieldToVendorInput: Record<RateCardDimensionField, keyof TenantVendorRateCardInput> = {
  fromCity: "fromCity",
  toCity: "toCity",
  fromLocation: "fromLocation",
  toLocation: "toLocation",
  sourcePincode: "sourcePincode",
  destinationPincode: "destinationPincode",
  vehicleType: "vehicleType",
  material: "material",
  serviceType: "serviceType",
  weightSlab: "weightSlab",
  quantitySlab: "quantitySlab",
  customerGroup: "customerGroup",
  uom: "uom",
};

function parseStructuredVendorRows(
  rows: Record<string, string>[],
  config: RateMatchingConfig,
): VendorRateCardImportResult {
  const result: VendorRateCardImportResult = { validRows: [], invalidRows: [] };
  const dimensionColumns = getRateMatchingColumns(config);

  rows.forEach((row, index) => {
    const dimensionValues: Partial<Record<RateCardDimensionField, string>> = {};
    const errors: string[] = [];

    dimensionColumns.forEach((column) => {
      const value = normalizeString(row[column.label]);
      dimensionValues[column.field] = value;
      if (PINCODE_FIELDS.has(column.field)) {
        if (!/^\d{6}$/.test(value)) errors.push(`${column.label} must be a 6-digit number.`);
      } else if (!value) {
        errors.push(`${column.label} is required.`);
      }
    });

    const rateTypeRaw = normalizeString(row["Rate Type"]);
    const rateRaw = normalizeString(row["Rate"]);
    const normalizedRateType = vendorRateTypeAliasMap[rateTypeRaw.toUpperCase()];
    if (!normalizedRateType || !["PER_KM", "PER_MT", "PER_TRIP"].includes(normalizedRateType)) {
      errors.push("Rate Type must be Per KM, Per MT, or Per Trip.");
    }
    const numericRate = Number(rateRaw);
    if (!rateRaw || Number.isNaN(numericRate) || numericRate <= 0) {
      errors.push("Rate must be a positive number.");
    }

    if (errors.length) {
      result.invalidRows.push({
        rowNumber: index + 2,
        row: { ...row, rateType: rateTypeRaw, rate: rateRaw } as unknown as VendorRateCardImportRow,
        errors,
      });
      return;
    }

    const input: TenantVendorRateCardInput = {
      sourcePincode: dimensionValues.sourcePincode ?? "",
      destinationPincode: dimensionValues.destinationPincode ?? "",
      rateType: normalizedRateType,
      vehicleType: dimensionValues.vehicleType || null,
      buyingRate: numericRate,
      underloadRate: numericRate,
      overloadRate: null,
      rate: numericRate,
      status: "active",
    };
    // Apply only the configured dimension values.
    Object.entries(dimensionValues).forEach(([field, value]) => {
      if (!value) return;
      const key = dimensionFieldToVendorInput[field as RateCardDimensionField];
      (input as Record<string, unknown>)[key] = value;
    });
    result.validRows.push(input);
  });

  return result;
}

function parseVendorRateCardWorksheetConfig(
  worksheet: XLSX.WorkSheet,
  config: RateMatchingConfig,
): VendorRateCardImportResult {
  const rows = XLSX.utils.sheet_to_json<(string | number | Date)[]>(worksheet, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: false,
  });
  if (!rows.length) return { validRows: [], invalidRows: [] };

  const headerRow = rows[0].map((cell) => normalizeString(cell));
  const headerIndex = new Map(headerRow.map((header, index) => [header.trim().toLowerCase(), index]));
  const requiredColumns = getRequiredUploadColumns(config);
  const missing = requiredColumns.filter((column) => !headerIndex.has(column.toLowerCase()));
  if (missing.length) {
    return {
      validRows: [],
      invalidRows: [
        {
          rowNumber: 1,
          row: {} as VendorRateCardImportRow,
          errors: [
            `File does not match this vendor's template. Expected columns: ${requiredColumns.join(
              ", ",
            )}. Missing: ${missing.join(", ")}.`,
          ],
        },
      ],
    };
  }

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

  return parseStructuredVendorRows(structuredRows, config);
}

/** Config-driven vendor rate-card file parse (mirrors `parseRateCardFile`). */
export async function parseVendorRateCardFileConfig(
  file: File,
  config?: RateMatchingConfig,
): Promise<VendorRateCardImportResult> {
  const resolvedConfig = normalizeRateMatchingConfig(config);
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension !== "csv" && extension !== "xlsx") {
    return {
      validRows: [],
      invalidRows: [
        { rowNumber: 0, row: {} as VendorRateCardImportRow, errors: ["Only .xlsx and .csv files are supported."] },
      ],
    };
  }
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  if (!workbook.SheetNames.length) return { validRows: [], invalidRows: [] };
  return parseVendorRateCardWorksheetConfig(workbook.Sheets[workbook.SheetNames[0]], resolvedConfig);
}

/** Config-driven vendor template download (mirrors `downloadRateCardTemplateWorkbook`). */
export function downloadVendorRateCardTemplateWorkbookConfig(config?: RateMatchingConfig) {
  const header = getRateCardTemplateColumns(normalizeRateMatchingConfig(config));
  const sampleValues: Record<string, string> = {
    "From City": "Bengaluru",
    "To City": "Chennai",
    "From Location": "BLR Plant",
    "To Location": "CHN Depot",
    "From Pincode": "560001",
    "To Pincode": "600001",
    "Vehicle Type": "32FT",
    Material: "Cement",
    "Service Type": "FTL",
    "Weight Slab": "0-9 MT",
    "Quantity Slab": "0-100",
    "Customer Group": "Group A",
    UOM: "MT",
    "Rate Type": "Per Trip",
    Rate: "16000",
  };
  const exampleRow: Record<string, string> = {};
  header.forEach((column) => {
    exampleRow[column] = sampleValues[column] ?? "";
  });
  const worksheet = XLSX.utils.json_to_sheet([exampleRow], { header });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Vendor Rate Card Template");
  XLSX.writeFile(workbook, "vendor-rate-card-template.xlsx");
}
