import ExcelJS from "exceljs";
import type {
  CustomerRateType,
  RateCardImportResult,
  RateCardImportRow,
  TenantCustomerRateCardInput,
} from "../types/customer";

export const rateCardTemplateColumns = [
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

type RateCardTemplateColumn = (typeof rateCardTemplateColumns)[number];
type RateCardSpreadsheetRow = Record<RateCardTemplateColumn, string>;

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

export const customerRateCardTemplateRows: RateCardSpreadsheetRow[] = [
  {
    Lane: "DEL-BOM",
    "From City": "Delhi",
    "To City": "Mumbai",
    "From Location": "Delhi",
    "To Location": "Mumbai",
    "From Pincode": "110037",
    "To Pincode": "400001",
    "Vehicle Type": "32FT_OPEN",
    "Rate Type": "Per Trip",
    "Underload Rate": "18000",
    "Overload Rate": "",
    TAT: "2 days",
    "Effective From Date": "2026-04-01",
    "Effective To Date": "2026-12-31",
    Remarks: "Primary west corridor",
  },
  {
    Lane: "BLR-CHE",
    "From City": "Bangalore",
    "To City": "Chennai",
    "From Location": "Bangalore",
    "To Location": "Chennai",
    "From Pincode": "560037",
    "To Pincode": "600001",
    "Vehicle Type": "TRAILER",
    "Rate Type": "Per MT",
    "Underload Rate": "72",
    "Overload Rate": "78",
    TAT: "1 day",
    "Effective From Date": "2026-04-01",
    "Effective To Date": "2026-12-31",
    Remarks: "",
  },
];

export const customerRateCardTemplateCsv = [
  rateCardTemplateColumns.join(","),
  ...customerRateCardTemplateRows.map((row) =>
    rateCardTemplateColumns.map((column) => row[column] ?? "").join(","),
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
  return (
    headerRow.length === rateCardTemplateColumns.length &&
    rateCardTemplateColumns.every((column, index) => headerRow[index] === column)
  );
}

function parseStructuredRows(rows: RateCardSpreadsheetRow[]): RateCardImportResult {
  const result: RateCardImportResult = {
    validRows: [],
    invalidRows: [],
  };

  rows.forEach((row, index) => {
    const lane = normalizeString(row.Lane);
    const fromCity = normalizeString(row["From City"]);
    const toCity = normalizeString(row["To City"]);
    const fromLocation = normalizeString(row["From Location"]);
    const toLocation = normalizeString(row["To Location"]);
    const fromPincode = normalizeString(row["From Pincode"]);
    const toPincode = normalizeString(row["To Pincode"]);
    const vehicleType = normalizeString(row["Vehicle Type"]);
    const rateTypeInput = normalizeString(row["Rate Type"]).toUpperCase();
    const underloadRate = normalizeString(row["Underload Rate"]);
    const overloadRate = normalizeString(row["Overload Rate"]);
    const tat = normalizeString(row.TAT);
    const effectiveFromDate = normalizeDate(row["Effective From Date"]);
    const effectiveToDate = normalizeDate(row["Effective To Date"]);
    const remarks = normalizeString(row.Remarks);

    const importRow: RateCardImportRow = {
      lane,
      fromCity,
      toCity,
      fromLocation,
      toLocation,
      fromPincode,
      toPincode,
      vehicleType,
      rateType: normalizeString(row["Rate Type"]),
      underloadRate,
      overloadRate,
      tat,
      effectiveFromDate,
      effectiveToDate,
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
    if (!/^\d{6}$/.test(fromPincode)) {
      errors.push("From Pincode must be a 6-digit number.");
    }
    if (!/^\d{6}$/.test(toPincode)) {
      errors.push("To Pincode must be a 6-digit number.");
    }
    if (!vehicleType) {
      errors.push("Vehicle Type is required.");
    }
    const normalizedRateType = rateTypeAliasMap[rateTypeInput];
    if (!normalizedRateType || !["PER_KM", "PER_MT", "PER_TRIP"].includes(normalizedRateType)) {
      errors.push("Rate Type must be Per KM, Per MT, or Per Trip.");
    }

    const numericUnderloadRate = Number(underloadRate);
    if (!underloadRate || Number.isNaN(numericUnderloadRate) || numericUnderloadRate <= 0) {
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
      lanes: lane,
      fromCity,
      toCity,
      fromLocation,
      toLocation,
      sourcePincode: fromPincode,
      destinationPincode: toPincode,
      rateType: normalizedRateType,
      vehicleType,
      underloadRate: numericUnderloadRate,
      overloadRate: numericOverloadRate,
      tat: tat || undefined,
      baseRate: numericUnderloadRate,
      rate: numericUnderloadRate,
      effectiveFromDate,
      effectiveToDate,
      remarks: remarks || undefined,
      status: "active",
    });
  });

  return result;
}

export function parseRateCardCsvText(csvText: string): RateCardImportResult {
  const rows = csvText
    .split(/\r?\n/)
    .filter((row) => row.trim().length > 0)
    .map((row) => row.split(",").map((cell) => cell.trim()));

  return parseRateCardWorksheet(rows);
}

function parseRateCardWorksheet(rows: unknown[][]): RateCardImportResult {
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
            lane: "",
            fromCity: "",
            toCity: "",
            fromLocation: "",
            toLocation: "",
            fromPincode: "",
            toPincode: "",
            vehicleType: "",
            rateType: "",
            underloadRate: "",
            overloadRate: "",
            tat: "",
            effectiveFromDate: "",
            effectiveToDate: "",
            remarks: "",
          },
          errors: [
            `Template columns must match exactly: ${rateCardTemplateColumns.join(", ")}`,
          ],
        },
      ],
    };
  }

  const structuredRows = rows.slice(1).map((row) => {
    const cellMap = {} as RateCardSpreadsheetRow;
    rateCardTemplateColumns.forEach((column, index) => {
      cellMap[column] = normalizeString(row[index] ?? "");
    });
    return cellMap;
  });

  return parseStructuredRows(structuredRows);
}

export async function parseRateCardFile(file: File): Promise<RateCardImportResult> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();
  if (extension !== "csv" && extension !== "xlsx") {
    return {
      validRows: [],
      invalidRows: [
        {
          rowNumber: 0,
          row: {
            lane: "",
            fromCity: "",
            toCity: "",
            fromLocation: "",
            toLocation: "",
            fromPincode: "",
            toPincode: "",
            vehicleType: "",
            rateType: "",
            underloadRate: "",
            overloadRate: "",
            tat: "",
            effectiveFromDate: "",
            effectiveToDate: "",
            remarks: "",
          },
          errors: ["Only .xlsx and .csv files are supported."],
        },
      ],
    };
  }

  if (extension === "csv") {
    return parseRateCardCsvText(await file.text());
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { validRows: [], invalidRows: [] };
  }

  const rows: unknown[][] = [];
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    rows.push((row.values as unknown[]).slice(1));
  });

  return parseRateCardWorksheet(rows);
}

export async function downloadRateCardTemplateWorkbook() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Rate Card Template");
  worksheet.addRow([...rateCardTemplateColumns]);
  customerRateCardTemplateRows.forEach((row) => {
    worksheet.addRow(rateCardTemplateColumns.map((column) => row[column] ?? ""));
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "customer-rate-card-template.xlsx";
  anchor.click();
  URL.revokeObjectURL(url);
}
