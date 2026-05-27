import * as XLSX from "xlsx";
import type {
  AddressImportResult,
  AddressImportRow,
  CustomerAddressMasterEntry,
  CustomerAddressTag,
} from "@/types/customer";

export const addressTemplateColumns = [
  "Address Type",
  "Address Name",
  "Contact Code",
  "Contact Person Name",
  "Phone",
  "Email ID",
  "Address Line 1",
  "Address Line 2",
  "City",
  "State",
  "Country",
  "Pincode",
  "GSTIN",
] as const;

type AddressTemplateColumn = (typeof addressTemplateColumns)[number];
type AddressSpreadsheetRow = Record<AddressTemplateColumn, string>;

const validAddressTypes: CustomerAddressTag[] = [
  "Billing",
  "Warehouse",
  "Consignor",
  "Consignee",
];

export const customerAddressTemplateRows: AddressSpreadsheetRow[] = [
  {
    "Address Type": "Consignee",
    "Address Name": "GM Palya Bengaluru",
    "Contact Code": "",
    "Contact Person Name": "Asha Rao",
    Phone: "9876543210",
    "Email ID": "asha.rao@example.com",
    "Address Line 1": "12, Old Airport Road",
    "Address Line 2": "GM Palya",
    City: "Bengaluru",
    State: "Karnataka",
    Country: "India",
    Pincode: "560075",
    GSTIN: "",
  },
  {
    "Address Type": "Warehouse",
    "Address Name": "Mumbai Warehouse",
    "Contact Code": "ADDR-0007",
    "Contact Person Name": "Rohan Shah",
    Phone: "9988776655",
    "Email ID": "warehouse@example.com",
    "Address Line 1": "45, TTC Industrial Area",
    "Address Line 2": "",
    City: "Navi Mumbai",
    State: "Maharashtra",
    Country: "India",
    Pincode: "400705",
    GSTIN: "27AAAAA0000A1Z5",
  },
];

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : `${value ?? ""}`.trim();
}

function isValidPhoneNumber(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function validateHeaderRow(headerRow: string[]) {
  return (
    headerRow.length === addressTemplateColumns.length &&
    addressTemplateColumns.every((column, index) => headerRow[index] === column)
  );
}

function parseStructuredRows(rows: AddressSpreadsheetRow[]): AddressImportResult {
  const result: AddressImportResult = {
    validRows: [],
    invalidRows: [],
  };

  rows.forEach((row, index) => {
    const addressType = normalizeString(row["Address Type"]);
    const addressName = normalizeString(row["Address Name"]);
    const contactCode = normalizeString(row["Contact Code"]);
    const contactPersonName = normalizeString(row["Contact Person Name"]);
    const phone = normalizeString(row.Phone);
    const emailId = normalizeString(row["Email ID"]);
    const addressLine1 = normalizeString(row["Address Line 1"]);
    const addressLine2 = normalizeString(row["Address Line 2"]);
    const city = normalizeString(row.City);
    const state = normalizeString(row.State);
    const country = normalizeString(row.Country) || "India";
    const pincode = normalizeString(row.Pincode);
    const gstin = normalizeString(row.GSTIN);

    const importRow: AddressImportRow = {
      addressType,
      addressName,
      contactCode,
      contactPersonName,
      phone,
      emailId,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      pincode,
      gstin,
    };

    const errors: string[] = [];
    if (!validAddressTypes.includes(addressType as CustomerAddressTag)) {
      errors.push("Address Type must be Billing, Warehouse, Consignor, or Consignee.");
    }
    if (!contactPersonName) {
      errors.push("Contact Person Name is required.");
    }
    if (!phone) {
      errors.push("Phone is required.");
    } else if (!isValidPhoneNumber(phone)) {
      errors.push("Phone must contain 10 to 15 digits.");
    }
    if (!addressLine1) {
      errors.push("Address Line 1 is required.");
    }
    if (!city) {
      errors.push("City is required.");
    }
    if (!state) {
      errors.push("State is required.");
    }
    if (!pincode) {
      errors.push("Pincode is required.");
    } else if (!/^\d{6}$/.test(pincode)) {
      errors.push("Pincode must be a 6-digit number.");
    }
    if (emailId && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailId)) {
      errors.push("Email ID must be a valid email address.");
    }

    if (errors.length) {
      result.invalidRows.push({
        rowNumber: index + 2,
        row: importRow,
        errors,
      });
      return;
    }

    const resolvedType = addressType as CustomerAddressTag;
    const resolvedName =
      addressName || `${city || "Customer"} ${resolvedType} Address`;

    result.validRows.push({
      id: `import-address-${index + 1}`,
      type: [resolvedType],
      contactCode: contactCode || undefined,
      name: resolvedName,
      line1: addressLine1,
      line2: addressLine2 || "",
      city,
      state,
      country,
      pincode,
      gstin: gstin || undefined,
      contactPerson: contactPersonName,
      contactNumber: phone,
      emailId: emailId || undefined,
    });
  });

  return result;
}

function parseAddressWorksheet(worksheet: XLSX.WorkSheet): AddressImportResult {
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
            addressType: "",
            addressName: "",
            contactCode: "",
            contactPersonName: "",
            phone: "",
            emailId: "",
            addressLine1: "",
            addressLine2: "",
            city: "",
            state: "",
            country: "",
            pincode: "",
            gstin: "",
          },
          errors: [`Template columns must match exactly: ${addressTemplateColumns.join(", ")}`],
        },
      ],
    };
  }

  const structuredRows = rows.slice(1).map((row) => {
    const cellMap = {} as AddressSpreadsheetRow;
    addressTemplateColumns.forEach((column, index) => {
      cellMap[column] = normalizeString(row[index] ?? "");
    });
    return cellMap;
  });

  return parseStructuredRows(structuredRows);
}

export async function parseCustomerAddressFile(file: File): Promise<AddressImportResult> {
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
            addressType: "",
            addressName: "",
            contactCode: "",
            contactPersonName: "",
            phone: "",
            emailId: "",
            addressLine1: "",
            addressLine2: "",
            city: "",
            state: "",
            country: "",
            pincode: "",
            gstin: "",
          },
          errors: ["Only .xlsx and .csv files are supported."],
        },
      ],
    };
  }

  return parseAddressWorksheet(workbook.Sheets[workbook.SheetNames[0]]);
}

export function downloadCustomerAddressTemplateWorkbook() {
  const worksheet = XLSX.utils.json_to_sheet(customerAddressTemplateRows, {
    header: [...addressTemplateColumns],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Customer Addresses");
  XLSX.writeFile(workbook, "customer-address-template.xlsx");
}
