import type {
  TenantVendorRateCardInput,
  VendorRateCardImportResult,
  VendorRateCardImportRow,
} from "@/types/vendor";

export const vendorRateCardTemplateCsv = [
  "sourcePincode,destinationPincode,rateType,vehicleType,rate",
  "110001,400001,PER_MT,,250",
  "110001,400001,PER_TRIP,32FT_OPEN,18000",
  "560001,600001,PER_TRIP,TRAILER,32000",
].join("\n");

export function parseVendorRateCardCsvText(csvText: string): VendorRateCardImportResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return { validRows: [], invalidRows: [] };
  }

  const [, ...dataLines] = lines;
  const result: VendorRateCardImportResult = {
    validRows: [],
    invalidRows: [],
  };

  dataLines.forEach((line, index) => {
    const [sourcePincode = "", destinationPincode = "", rateType = "", vehicleType = "", rate = ""] =
      line.split(",").map((item) => item.trim());

    const row: VendorRateCardImportRow = {
      sourcePincode,
      destinationPincode,
      rateType,
      vehicleType,
      rate,
    };

    const errors: string[] = [];

    if (!/^\d{6}$/.test(sourcePincode)) {
      errors.push("Source pincode must be a 6-digit number.");
    }
    if (!/^\d{6}$/.test(destinationPincode)) {
      errors.push("Destination pincode must be a 6-digit number.");
    }
    if (rateType !== "PER_MT" && rateType !== "PER_TRIP") {
      errors.push("Rate type must be PER_MT or PER_TRIP.");
    }
    if (rateType === "PER_TRIP" && !vehicleType) {
      errors.push("Vehicle type is required for PER_TRIP.");
    }

    const numericRate = Number(rate);
    if (!rate || Number.isNaN(numericRate) || numericRate <= 0) {
      errors.push("Rate must be a positive number.");
    }

    if (errors.length) {
      result.invalidRows.push({
        rowNumber: index + 2,
        row,
        errors,
      });
      return;
    }

    result.validRows.push({
      sourcePincode,
      destinationPincode,
      rateType: rateType as TenantVendorRateCardInput["rateType"],
      vehicleType: vehicleType || null,
      rate: numericRate,
      status: "active",
    });
  });

  return result;
}
