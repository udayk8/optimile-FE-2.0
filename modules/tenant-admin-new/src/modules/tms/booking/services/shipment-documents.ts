import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { getRateCardUnitRate } from "@/modules/tms/booking/services/booking-engine";
import {
  getEffectiveRateMatchingBasis,
  validateRateCard,
  type RateValidationInput,
} from "@/modules/tms/booking/services/booking-selectors";
import type {
  BookingAddressComparisonResult,
  BookingConsigneeSnapshot,
  BookingDeliveryRecord,
  BookingDeliveryShipmentDocuments,
  BookingInvoiceSnapshot,
  BookingRecord,
  BookingShipmentDocuments,
} from "@/modules/tms/booking/types";
import type { TenantCustomer, TenantCustomerAddress, TenantCustomerRateCard } from "@/types/customer";

type AddressMap = Map<string, TenantCustomerAddress>;

type PdfTextItem = {
  str: string;
  x: number;
  y: number;
};

type ExtractedDocumentText = {
  textItems: PdfTextItem[];
  lines: string[];
  extractedText: string;
  normalizedText: string;
};

type ParseDebugSnapshot = {
  kind: "invoice" | "ewayBill";
  textItems: PdfTextItem[];
  lines: string[];
  extractedText: string;
  normalizedText: string;
  parsedData: Record<string, string | number | null | undefined>;
};

export type ExtractedInvoiceData = Omit<BookingInvoiceSnapshot, "id" | "uploadedAt">;

export type ParsedEwayBillData = {
  fileName: string;
  ewayBillNumber: string;
  validFromDate: string | null;
  validFromTime: string | null;
  validToDate: string | null;
  validToTime: string | null;
};

let lastDocumentParseDebug: ParseDebugSnapshot | null = null;

GlobalWorkerOptions.workerSrc = pdfWorker;

function normalizeExtractedText(content: string) {
  return content
    .replace(/\0/g, " ")
    .replace(/â‚¹/g, "₹")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

async function readLooseFileText(file: File) {
  const buffer = await file.arrayBuffer();
  const extractedText = normalizeExtractedText(new TextDecoder("utf-8", { fatal: false }).decode(buffer));
  return {
    textItems: [] as PdfTextItem[],
    lines: extractedText ? extractedText.split("\n") : [],
    extractedText,
    normalizedText: extractedText.replace(/\s+/g, " ").trim(),
  };
}

function buildLinesFromTextItems(textItems: PdfTextItem[]) {
  if (!textItems.length) {
    return [];
  }

  const sorted = [...textItems].sort((left, right) => {
    if (Math.abs(left.y - right.y) > 2) {
      return right.y - left.y;
    }
    return left.x - right.x;
  });

  const rows: PdfTextItem[][] = [];
  for (const item of sorted) {
    const currentRow = rows.at(-1);
    if (!currentRow) {
      rows.push([item]);
      continue;
    }
    if (Math.abs(currentRow[0].y - item.y) <= 2) {
      currentRow.push(item);
      continue;
    }
    rows.push([item]);
  }

  return rows.map((row) =>
    normalizeExtractedText(
      row
        .sort((left, right) => left.x - right.x)
        .map((item) => item.str)
        .join(" "),
    ),
  );
}

async function extractPdfText(file: File, maxPages = 2): Promise<ExtractedDocumentText> {
  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: buffer }).promise;
  const pageCount = Math.min(pdf.numPages, maxPages);
  const textItems: PdfTextItem[] = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    for (const item of textContent.items) {
      if (!("str" in item) || !item.str.trim()) {
        continue;
      }
      textItems.push({
        str: item.str,
        x: item.transform[4] ?? 0,
        y: item.transform[5] ?? 0,
      });
    }
  }

  const lines = buildLinesFromTextItems(textItems).filter(Boolean);
  const extractedText = normalizeExtractedText(lines.join("\n"));
  const normalizedText = normalizeExtractedText(extractedText).replace(/\s+/g, " ").trim();

  return {
    textItems,
    lines,
    extractedText,
    normalizedText,
  };
}

async function readDocumentText(file: File) {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return extractPdfText(file);
  }
  return readLooseFileText(file);
}

function findValue(content: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[2]) {
      return match[2].trim();
    }
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return "";
}

function findLineValue(lines: string[], patterns: RegExp[]) {
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match?.[2]) {
        return match[2].trim();
      }
      if (match?.[1]) {
        return match[1].trim();
      }
    }
  }
  return "";
}

function toIsoDate(value: string) {
  const normalized = value.trim().replace(/\./g, "/").replace(/-/g, "/");
  const parts = normalized.split("/");
  if (parts.length === 3) {
    const [first, second, third] = parts;
    if (first.length === 4) {
      return `${first}-${second.padStart(2, "0")}-${third.padStart(2, "0")}`;
    }
    return `${third}-${second.padStart(2, "0")}-${first.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  return "";
}

function toIsoDateTimeParts(value: string) {
  const match = value.trim().match(
    /(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}|\d{4}[\/.-]\d{1,2}[\/.-]\d{1,2})(?:\s+|T)?(\d{1,2}:\d{2})?/,
  );
  if (!match) {
    return { date: null, time: null };
  }
  return {
    date: toIsoDate(match[1]) || null,
    time: match[2] ?? null,
  };
}

function parseNumeric(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  return cleaned ? Number(cleaned) : null;
}

function normalizeUnit(value: string) {
  const normalized = value.trim().toUpperCase();
  return normalized || null;
}

function logParseDebug(snapshot: ParseDebugSnapshot) {
  lastDocumentParseDebug = snapshot;
  console.log("TEXT ITEMS:", snapshot.textItems);
  console.log("FULL_PDF_TEXT:", snapshot.extractedText);
  console.log("PARSED_DATA:", snapshot.parsedData);
}

function buildKeywordPattern(...labels: string[]) {
  const source = labels.join("|");
  return new RegExp(`(?:${source})\\s*[:#-]?\\s*([A-Z0-9./ -]+)`, "i");
}

function extractInvoiceNumber(lines: string[], normalizedText: string) {
  return (
    findLineValue(lines, [
      buildKeywordPattern("Invoice\\s*No\\.", "Invoice\\s*No", "Invoice\\s*Number", "Inv\\s*No", "Invoice\\s*#"),
    ]) ||
    findValue(normalizedText, [
      buildKeywordPattern("Invoice\\s*No\\.", "Invoice\\s*No", "Invoice\\s*Number", "Inv\\s*No", "Invoice\\s*#"),
    ])
  );
}

function extractInvoiceDate(lines: string[], normalizedText: string) {
  const rawValue =
    findLineValue(lines, [
      /(?:Invoice\s*Date|Date)\s*[:#-]?\s*(\d{2}[/-]\d{2}[/-]\d{4}|\d{4}[/-]\d{2}[/-]\d{2})/i,
    ]) ||
    findValue(normalizedText, [
      /(?:Invoice\s*Date|Date)\s*[:#-]?\s*(\d{2}[/-]\d{2}[/-]\d{4}|\d{4}[/-]\d{2}[/-]\d{2})/i,
    ]);
  return rawValue ? toIsoDate(rawValue) || null : null;
}

function extractInvoiceValue(lines: string[], normalizedText: string) {
  return (
    parseNumeric(
      findLineValue(lines, [
        /Bill\s+Amount\s+Including\s+GST\s*:\s*(?:Rs|₹)\s*([0-9][\d,.]*)/i,
        /(?:Invoice\s*Value|Invoice\s*Amount|Total\s*Value|Grand\s*Total)\s*[:#-]?\s*(?:₹|RS\.?|INR)?\s*([0-9][\d,.]*)/i,
      ]),
    ) ??
    parseNumeric(
      findValue(normalizedText, [
        /Bill\s+Amount\s+Including\s+GST\s*:\s*(?:Rs|₹)\s*([0-9][\d,.]*)/i,
        /(?:Invoice\s*Value|Invoice\s*Amount|Total\s*Value|Grand\s*Total)\s*[:#-]?\s*(?:₹|RS\.?|INR)?\s*([0-9][\d,.]*)/i,
      ]),
    )
  );
}

function getInvoiceTableRow(lines: string[]) {
  const productRow =
    lines.find((line) => /^\s*1\s+/.test(line) && /Cement/i.test(line)) ??
    lines.find((line) => /^\s*\d+\s+/.test(line) && /\b\d{8}\b/.test(line));
  console.log("ROW FOUND:", productRow ?? "");
  return productRow?.trim() ?? "";
}

function extractMaterial(tableRow: string, normalizedText: string) {
  const tokens = tableRow.split(/\s+/).filter(Boolean);
  const hsnIndex = tokens.findIndex((token) => /^\d{8}$/.test(token));
  if (hsnIndex > 1) {
    return tokens.slice(1, hsnIndex).join(" ").trim();
  }

  return findValue(normalizedText, [
    /Description\s+of\s+Goods\s*[:#-]?\s*(.+?)(?=\s+\d{6,8}\s+\d|$)/i,
  ]);
}

function extractShippingDetailsBlock(lines: string[]) {
  const startIndex = lines.findIndex((line) => /shipping\s+details|ship\s*to/i.test(line));
  if (startIndex < 0) {
    return [];
  }

  const block: string[] = [];
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      if (block.length) {
        break;
      }
      continue;
    }
    if (
      block.length > 0 &&
      /invoice|material|description|qty|weight|amount|value|tax|bill\s+amount|bank/i.test(line)
    ) {
      break;
    }
    block.push(line);
  }

  return block;
}

function extractLabeledBlockValue(block: string[], labelPattern: RegExp) {
  const line = block.find((entry) => labelPattern.test(entry));
  if (!line) {
    return "";
  }
  return line.replace(labelPattern, "").trim();
}

function extractRightColumnValue(line: string, label: string) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(escapedLabel, "gi");
  const matches = Array.from(line.matchAll(pattern));
  if (!matches.length) {
    return "";
  }
  const lastMatch = matches[matches.length - 1];
  const start = (lastMatch.index ?? 0) + lastMatch[0].length;
  return line.slice(start).trim();
}

function extractShippingFieldFromMergedLine(lines: string[], label: string) {
  for (const line of lines) {
    const value = extractRightColumnValue(line, label);
    if (value) {
      return value;
    }
  }
  return "";
}

function extractShippingAddressFromMergedLines(lines: string[]) {
  const addressStartIndex = lines.findIndex((line) => /&\s*Address\s*:/i.test(line));
  if (addressStartIndex < 0) {
    return "";
  }

  const addressLines: string[] = [];
  for (let index = addressStartIndex; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      if (addressLines.length) {
        break;
      }
      continue;
    }

    if (/^state\s+name\s*:|^pin\s+code\s*:|^gstin\s+no\.?\s*:|^aadhar\s+no\.?\s*:|^pan\s+no\.?\s*:/i.test(line)) {
      break;
    }

    if (index === addressStartIndex) {
      const value = extractRightColumnValue(line, "& Address :");
      if (value) {
        addressLines.push(value);
      }
      continue;
    }

    const continuation = line.startsWith(":") ? line.slice(1).trim() : line;
    if (continuation) {
      addressLines.push(continuation);
    }
  }

  return addressLines.join(", ").replace(/\s+,/g, ",").trim();
}

function extractDestinationCity(lines: string[], normalizedText: string) {
  const directLine =
    findLineValue(lines, [/(?:Destination)\s*:\s*(?:[A-Z]{2,}\s*-\s*)?([A-Za-z][A-Za-z\s.-]{2,})/i]) ||
    findValue(normalizedText, [/(?:Destination)\s*:\s*(?:[A-Z]{2,}\s*-\s*)?([A-Za-z][A-Za-z\s.-]{2,})/i]);
  return directLine.replace(/\s{2,}/g, " ").trim();
}

function extractConsigneeName(lines: string[], normalizedText: string) {
  const shippingBlock = extractShippingDetailsBlock(lines);
  const shippingValue = extractLabeledBlockValue(
    shippingBlock,
    /^(?:shipping\s+details\s+)?consignee\s*:\s*/i,
  );
  const mergedValue = extractShippingFieldFromMergedLine(shippingBlock, "Consignee :");
  return (
    shippingValue ||
    mergedValue ||
    findLineValue(lines, [
      /(?:Consignee|Ship\s*To|Buyer(?:'s)?\s*Name)\s*[:#-]?\s*([A-Z0-9&.,()\/ -]{3,})/i,
    ]) ||
    findValue(normalizedText, [
      /(?:Consignee|Ship\s*To|Buyer(?:'s)?\s*Name)\s*[:#-]?\s*([A-Z0-9&.,()\/ -]{3,})/i,
    ])
  );
}

function extractConsigneeAddress(lines: string[], normalizedText: string) {
  const shippingBlock = extractShippingDetailsBlock(lines);
  const mergedAddress = extractShippingAddressFromMergedLines(shippingBlock);
  if (mergedAddress) {
    return mergedAddress;
  }
  const addressStart = shippingBlock.findIndex((line) => /^address\s*:/i.test(line));
  if (addressStart >= 0) {
    const addressLines: string[] = [];
    for (let index = addressStart; index < shippingBlock.length; index += 1) {
      const line = shippingBlock[index];
      if (index === addressStart) {
        addressLines.push(line.replace(/^address\s*:\s*/i, "").trim());
        continue;
      }
      if (/^state\s+name\s*:|^pin\s+code\s*:|^gstin\s+no\.?\s*:|^aadhar\s+no\.?\s*:|^pan\s+no\.?\s*:/i.test(line)) {
        break;
      }
      addressLines.push(line.trim());
    }
    const address = addressLines.filter(Boolean).join(", ").replace(/\s+,/g, ",").trim();
    if (address) {
      return address;
    }
  }

  return (
    findLineValue(lines, [
      /(?:Consignee\s*Address|Ship\s*To\s*Address|Delivery\s*Address)\s*[:#-]?\s*(.+)/i,
    ]) ||
    findValue(normalizedText, [
      /(?:Consignee\s*Address|Ship\s*To\s*Address|Delivery\s*Address)\s*[:#-]?\s*(.+?)(?=(?:GSTIN|Invoice|Qty|Amount|Value)\b|$)/i,
    ])
  );
}

function extractConsigneeCity(lines: string[], normalizedText: string) {
  const shippingBlock = extractShippingDetailsBlock(lines);
  const addressValue = extractConsigneeAddress(lines, normalizedText);
  const destinationCity = extractDestinationCity(lines, normalizedText);
  const explicitCity = extractLabeledBlockValue(
    shippingBlock,
    /^(?:consignee\s+city|ship\s*to\s*city|city)\s*:\s*/i,
  );
  if (explicitCity) {
    return explicitCity;
  }
  if (destinationCity) {
    return destinationCity;
  }
  const cityFromAddress = addressValue
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1);
  const stateLine = extractLabeledBlockValue(shippingBlock, /^state\s+name\s*:\s*/i);
  if (cityFromAddress && normalizeAddressText(cityFromAddress) !== normalizeAddressText(stateLine)) {
    return cityFromAddress;
  }
  return (
    findLineValue(lines, [
      /(?:Consignee\s*City|Ship\s*To\s*City|City)\s*[:#-]?\s*([A-Z][A-Z .-]{2,})/i,
    ]) ||
    findValue(normalizedText, [
      /(?:Consignee\s*City|Ship\s*To\s*City)\s*[:#-]?\s*([A-Z][A-Z .-]{2,})/i,
    ])
  );
}

function extractConsigneePincode(lines: string[], normalizedText: string) {
  const shippingBlock = extractShippingDetailsBlock(lines);
  const pincodeFromBlock =
    extractLabeledBlockValue(shippingBlock, /^pin\s+code\s*:\s*/i) ||
    extractShippingFieldFromMergedLine(shippingBlock, "Pin Code :");
  return (
    pincodeFromBlock.match(/\d{6}/)?.[0] ||
    findLineValue(lines, [/(?:PIN|Pincode|Postal\s*Code)\s*[:#-]?\s*(\d{6})/i]) ||
    findValue(normalizedText, [/(?:PIN|Pincode|Postal\s*Code)\s*[:#-]?\s*(\d{6})/i]) ||
    normalizedText.match(/\b(\d{6})\b/)?.[1] ||
    ""
  );
}

function extractConsigneeGstin(lines: string[], normalizedText: string) {
  const shippingBlock = extractShippingDetailsBlock(lines);
  const gstinFromBlock =
    extractLabeledBlockValue(shippingBlock, /^gstin\s+no\.?\s*:\s*/i) ||
    extractShippingFieldFromMergedLine(shippingBlock, "GSTIN No. :");
  return (
    gstinFromBlock.match(/[0-9A-Z]{15}/i)?.[0] ||
    findLineValue(lines, [/(?:GSTIN|GST\s*No\.?)\s*[:#-]?\s*([0-9A-Z]{15})/i]) ||
    findValue(normalizedText, [/(?:GSTIN|GST\s*No\.?)\s*[:#-]?\s*([0-9A-Z]{15})/i])
  );
}

function normalizeAddressText(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(road|rd|street|st|nagar|area|building|floor|near|opp|opposite)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getImportantTokens(value?: string | null) {
  return normalizeAddressText(value)
    .split(" ")
    .filter((token) => token.length > 2);
}

export function compareAddressSimilarity(
  savedAddress: TenantCustomerAddress | null,
  invoiceConsignee: BookingConsigneeSnapshot | null,
): BookingAddressComparisonResult {
  if (!savedAddress || !invoiceConsignee) {
    return {
      matchStatus: "DIFFERENT",
      confidence: 0,
      reasons: ["Address comparison requires both saved and invoice addresses."],
    };
  }

  const reasons: string[] = [];
  let score = 0;
  let checks = 0;

  const cityMatch =
    normalizeAddressText(savedAddress.city) !== "" &&
    normalizeAddressText(savedAddress.city) === normalizeAddressText(invoiceConsignee.city);
  checks += 1;
  if (cityMatch) {
    score += 0.35;
  } else {
    reasons.push("City is different.");
  }

  const pincodeMatch =
    (savedAddress.pincode ?? "").trim() !== "" &&
    savedAddress.pincode.trim() === (invoiceConsignee.pincode ?? "").trim();
  checks += 1;
  if (pincodeMatch) {
    score += 0.3;
  } else if (invoiceConsignee.pincode.trim()) {
    reasons.push("Pincode is different.");
  }

  const savedTokens = new Set(
    getImportantTokens(
      [savedAddress.addressName, savedAddress.addressLine1, savedAddress.addressLine2].filter(Boolean).join(" "),
    ),
  );
  const invoiceTokens = new Set(
    getImportantTokens([invoiceConsignee.name, invoiceConsignee.addressLine].filter(Boolean).join(" ")),
  );
  const intersection = Array.from(savedTokens).filter((token) => invoiceTokens.has(token)).length;
  const union = new Set([...savedTokens, ...invoiceTokens]).size;
  const tokenScore = union ? intersection / union : 0;
  checks += 1;
  score += tokenScore * 0.35;
  if (tokenScore < 0.25) {
    reasons.push("Important address tokens have low overlap.");
  }

  const confidence = Number(Math.max(0, Math.min(1, score)).toFixed(2));
  const matchStatus =
    confidence >= 0.8
      ? "MATCH"
      : confidence >= 0.5
        ? "POSSIBLE_MATCH"
        : "DIFFERENT";

  return {
    matchStatus,
    confidence,
    reasons: reasons.length ? reasons : ["Address signals are consistent."],
  };
}

function extractQuantity(tableRow: string, lines: string[], normalizedText: string) {
  const tokens = tableRow.split(/\s+/).filter(Boolean);
  const hsnIndex = tokens.findIndex((token) => /^\d{8}$/.test(token));
  console.log("TOKENS:", tokens);
  console.log("HSN INDEX:", hsnIndex);
  if (hsnIndex >= 0 && tokens[hsnIndex + 2]) {
    const quantity = Number(tokens[hsnIndex + 2]);
    console.log("QUANTITY:", Number.isFinite(quantity) ? quantity : null);
    return {
      quantity: Number.isFinite(quantity) ? quantity : null,
      quantityUOM: "BAG",
    };
  }

  const explicitLine = findLineValue(lines, [/(?:Qty\s*Bag)\s*[:#=-]?\s*([0-9]+(?:\.[0-9]+)?)/i]);
  if (explicitLine) {
    return {
      quantity: parseNumeric(explicitLine),
      quantityUOM: "BAG",
    };
  }

  const textMatch = normalizedText.match(/(?:Qty\s*Bag)\s*[:#=-]?\s*([0-9]+(?:\.[0-9]+)?)/i);
  return {
    quantity: textMatch?.[1] ? parseNumeric(textMatch[1]) : null,
    quantityUOM: textMatch ? "BAG" : null,
  };
}

function extractWeight(tableRow: string, lines: string[], normalizedText: string) {
  const tokens = tableRow.split(/\s+/).filter(Boolean);
  const hsnIndex = tokens.findIndex((token) => /^\d{8}$/.test(token));
  if (hsnIndex >= 0 && tokens[hsnIndex + 1]) {
    const weight = Number(tokens[hsnIndex + 1]);
    console.log("WEIGHT:", Number.isFinite(weight) ? weight : null);
    return {
      weight: Number.isFinite(weight) ? weight : null,
      weightUOM: "MT",
    };
  }

  const explicitLine = findLineValue(lines, [/(?:Qty\s*\(?MT\)?|Net\s*Weight|Gross\s*Weight)\s*[:#=-]?\s*([0-9]+(?:\.[0-9]+)?)/i]);
  if (explicitLine) {
    return {
      weight: parseNumeric(explicitLine),
      weightUOM: "MT",
    };
  }

  const textMatch = normalizedText.match(/(?:Qty\s*\(?MT\)?|Net\s*Weight|Gross\s*Weight)\s*[:#=-]?\s*([0-9]+(?:\.[0-9]+)?)/i);
  return {
    weight: textMatch?.[1] ? parseNumeric(textMatch[1]) : null,
    weightUOM: textMatch ? "MT" : null,
  };
}

function ensureParsed(fields: Record<string, string | number | null | undefined>, label: string) {
  const hasParsedValue = Object.values(fields).some((value) => {
    if (typeof value === "number") {
      return Number.isFinite(value);
    }
    return Boolean(value);
  });

  if (!hasParsedValue) {
    throw new Error(`Unable to parse ${label} PDF.`);
  }
}

export function getLastDocumentParseDebug() {
  return lastDocumentParseDebug;
}

export async function parseInvoice(file: File): Promise<ExtractedInvoiceData> {
  const { textItems, lines, extractedText, normalizedText } = await readDocumentText(file);
  const invoiceTableRow = getInvoiceTableRow(lines);
  const { quantity, quantityUOM } = extractQuantity(invoiceTableRow, lines, normalizedText);
  const { weight, weightUOM } = extractWeight(invoiceTableRow, lines, normalizedText);

  const parsedData = {
    invoiceNumber: extractInvoiceNumber(lines, normalizedText),
    invoiceDate: extractInvoiceDate(lines, normalizedText),
    invoiceValue: extractInvoiceValue(lines, normalizedText),
    material: extractMaterial(invoiceTableRow, normalizedText),
    consigneeName: extractConsigneeName(lines, normalizedText),
    consigneeAddress: extractConsigneeAddress(lines, normalizedText),
    consigneeCity: extractConsigneeCity(lines, normalizedText),
    consigneePincode: extractConsigneePincode(lines, normalizedText),
    consigneeGstin: extractConsigneeGstin(lines, normalizedText),
    quantity,
    quantityUOM,
    weight,
    weightUOM,
  };

  logParseDebug({
    kind: "invoice",
    textItems,
    lines,
    extractedText,
    normalizedText,
    parsedData,
  });
  ensureParsed(parsedData, "invoice");

  return {
    fileName: file.name,
    invoiceNumber: parsedData.invoiceNumber ?? "",
    invoiceValue: parsedData.invoiceValue ?? null,
    invoiceDate: parsedData.invoiceDate ?? null,
    material: parsedData.material ?? "",
    subBrand: null,
    quantity: parsedData.quantity ?? null,
    quantityUOM: parsedData.quantityUOM ?? null,
    weight: parsedData.weight ?? null,
    weightUOM: parsedData.weightUOM ?? null,
    consigneeName: parsedData.consigneeName ?? null,
    consigneeAddress: parsedData.consigneeAddress ?? null,
    consigneeCity: parsedData.consigneeCity ?? null,
    consigneePincode: parsedData.consigneePincode ?? null,
    consigneeGstin: parsedData.consigneeGstin ?? null,
    extractedAt: new Date().toISOString(),
  };
}

export async function parseEwayBill(file: File): Promise<ParsedEwayBillData> {
  const { textItems, lines, extractedText, normalizedText } = await readDocumentText(file);
  const validFromRaw =
    findLineValue(lines, [/Valid\s*From\s*[:\-]?\s*(\d{2}[-/]\d{2}[-/]\d{4}(?:\s+\d{1,2}:\d{2})?)/i]) ||
    findValue(normalizedText, [/Valid\s*From\s*[:\-]?\s*(\d{2}[-/]\d{2}[-/]\d{4}(?:\s+\d{1,2}:\d{2})?)/i]);
  const validToRaw =
    findLineValue(lines, [/Valid\s*To\s*[:\-]?\s*(\d{2}[-/]\d{2}[-/]\d{4}(?:\s+\d{1,2}:\d{2})?)/i]) ||
    findValue(normalizedText, [/Valid\s*To\s*[:\-]?\s*(\d{2}[-/]\d{2}[-/]\d{4}(?:\s+\d{1,2}:\d{2})?)/i]);

  const validFrom = validFromRaw ? toIsoDateTimeParts(validFromRaw) : { date: null, time: null };
  const validTo = validToRaw ? toIsoDateTimeParts(validToRaw) : { date: null, time: null };
  const parsedData = {
    ewayBillNumber:
      findLineValue(lines, [
        /E[- ]?Way Bill No\.?\s*[:\-]?\s*(\d{10,15})/i,
        /EWB\s*No\.?\s*[:\-]?\s*(\d+)/i,
      ]) ||
      findValue(normalizedText, [
        /E[- ]?Way Bill No\.?\s*[:\-]?\s*(\d{10,15})/i,
        /EWB\s*No\.?\s*[:\-]?\s*(\d+)/i,
      ]),
    validFromDate: validFrom.date,
    validFromTime: validFrom.time,
    validToDate: validTo.date,
    validToTime: validTo.time,
  };

  logParseDebug({
    kind: "ewayBill",
    textItems,
    lines,
    extractedText,
    normalizedText,
    parsedData,
  });
  ensureParsed(parsedData, "ewayBill");

  return {
    fileName: file.name,
    ewayBillNumber: parsedData.ewayBillNumber ?? "",
    validFromDate: parsedData.validFromDate ?? null,
    validFromTime: parsedData.validFromTime ?? null,
    validToDate: parsedData.validToDate ?? null,
    validToTime: parsedData.validToTime ?? null,
  };
}

export async function extractInvoiceData(file: File): Promise<ExtractedInvoiceData> {
  return parseInvoice(file);
}

export function ensureShipmentDocuments(
  booking: Pick<BookingRecord, "deliveries" | "shipmentDocuments">,
): BookingShipmentDocuments {
  const existing = booking.shipmentDocuments;
  const deliveries = booking.deliveries ?? [];
  const deliveryDocuments = deliveries.map((delivery) => {
    const existingDelivery = existing?.deliveries.find((item) => item.deliveryId === delivery.id);
    return (
      existingDelivery ?? {
        deliveryId: delivery.id,
        invoices: [],
        actuals: {
          material: "",
          subBrand: null,
          quantity: delivery.quantity ?? null,
          quantityUOM: delivery.uom ?? null,
          weight: delivery.weight ?? null,
          weightUOM: delivery.weightUom ?? null,
        },
        ewayBill: null,
        freightRate: null,
        freightMessage: null,
        extractedConsignee: null,
        finalConsigneeChoice: null,
      }
    );
  });

  return {
    deliveries: deliveryDocuments,
    totalFreightRate: existing?.totalFreightRate ?? null,
    freightStatus: existing?.freightStatus ?? "PENDING",
    freightMessage: existing?.freightMessage ?? null,
    submittedAt: existing?.submittedAt ?? null,
    lr: existing?.lr ?? null,
  };
}

export function sumDeliveryInvoiceTotals(deliveryDocuments: BookingDeliveryShipmentDocuments) {
  return deliveryDocuments.invoices.reduce(
    (totals, invoice) => ({
      invoiceValue: totals.invoiceValue + (Number(invoice.invoiceValue) || 0),
      quantity: totals.quantity + (Number(invoice.quantity) || 0),
      weight: totals.weight + (Number(invoice.weight) || 0),
    }),
    { invoiceValue: 0, quantity: 0, weight: 0 },
  );
}

export function aggregateDeliveryInvoiceActuals(deliveryDocuments: BookingDeliveryShipmentDocuments) {
  const totals = sumDeliveryInvoiceTotals(deliveryDocuments);
  const firstMaterialInvoice = deliveryDocuments.invoices.find((invoice) => invoice.material.trim());
  const firstQuantityUomInvoice = deliveryDocuments.invoices.find((invoice) => invoice.quantityUOM);
  const firstWeightUomInvoice = deliveryDocuments.invoices.find((invoice) => invoice.weightUOM);

  return {
    ...deliveryDocuments,
    actuals: {
      material: firstMaterialInvoice?.material ?? "",
      subBrand: firstMaterialInvoice?.subBrand ?? null,
      quantity: totals.quantity > 0 ? totals.quantity : null,
      quantityUOM: firstQuantityUomInvoice?.quantityUOM ?? deliveryDocuments.actuals.quantityUOM ?? null,
      weight: totals.weight > 0 ? totals.weight : null,
      weightUOM: firstWeightUomInvoice?.weightUOM ?? deliveryDocuments.actuals.weightUOM ?? null,
    },
  };
}

export function getPrimaryInvoiceConsignee(invoices: BookingInvoiceSnapshot[]) {
  for (const invoice of invoices) {
    const snapshot = {
      name: invoice.consigneeName?.trim() ?? "",
      addressLine: invoice.consigneeAddress?.trim() ?? "",
      city: invoice.consigneeCity?.trim() ?? "",
      pincode: invoice.consigneePincode?.trim() ?? "",
      gstin: invoice.consigneeGstin?.trim() ?? null,
    };
    if (snapshot.name || snapshot.addressLine || snapshot.city || snapshot.pincode) {
      return snapshot;
    }
  }
  return null;
}

export function getDeliveryActualWeight(deliveryDocuments: BookingDeliveryShipmentDocuments) {
  const actualWeight = Number(deliveryDocuments.actuals.weight) || 0;
  if (actualWeight > 0) {
    return actualWeight;
  }
  return sumDeliveryInvoiceTotals(deliveryDocuments).weight;
}

export function getDeliveryActualQuantity(deliveryDocuments: BookingDeliveryShipmentDocuments) {
  const actualQuantity = Number(deliveryDocuments.actuals.quantity) || 0;
  if (actualQuantity > 0) {
    return actualQuantity;
  }
  return sumDeliveryInvoiceTotals(deliveryDocuments).quantity;
}

export function deriveShipmentLane(fromLocation?: string | null, toLocation?: string | null) {
  if (!fromLocation?.trim() || !toLocation?.trim()) {
    return "";
  }
  return `${fromLocation.trim()}-${toLocation.trim()}`.toUpperCase().replace(/\s+/g, "");
}

type ShipmentFreightCalculationInput = {
  booking: BookingRecord;
  customer: TenantCustomer | null;
  addressMap: AddressMap;
  rateCards: TenantCustomerRateCard[];
  shipmentDocuments: BookingShipmentDocuments;
  vehicleTypeCode?: string | null;
};

export function calculateShipmentDocumentFreight({
  booking,
  customer,
  addressMap,
  rateCards,
  shipmentDocuments,
  vehicleTypeCode,
}: ShipmentFreightCalculationInput) {
  if (booking.commercialType !== "CONTRACT") {
    return {
      totalFreightRate: booking.pricing.calculatedFreight,
      freightStatus: "READY" as const,
      freightMessage: "Spot booking keeps the existing freight value.",
      deliveryRates: new Map<string, number>(),
    };
  }

  if (booking.pricing.rateType === "PER_KM") {
    return {
      totalFreightRate: null,
      freightStatus: "PLACEHOLDER" as const,
      freightMessage: "PER_KM freight recalculation is not implemented yet.",
      deliveryRates: new Map<string, number>(),
    };
  }

  const deliveries = booking.deliveries ?? [];
  if (!deliveries.length || !customer) {
    return {
      totalFreightRate: null,
      freightStatus: "NO_RATE" as const,
      freightMessage: "Customer configuration or deliveries are missing.",
      deliveryRates: new Map<string, number>(),
    };
  }

  const deliveryRates = new Map<string, number>();
  const matchingBasis = customer.rateMatchingBasis ?? "LANE_TO_LANE";
  const buildValidationInput = (
    delivery: BookingDeliveryRecord,
    deliveryDocuments: BookingDeliveryShipmentDocuments | null | undefined,
    weight?: number,
  ) => {
    const origin = addressMap.get(delivery.originAddressId || booking.sourceAddressId) ?? null;
    const selectedAddressId =
      deliveryDocuments?.finalConsigneeChoice?.mode === "USE_SAVED_ADDRESS"
        ? deliveryDocuments.finalConsigneeChoice.selectedAddressId ?? delivery.destinationAddressId
        : delivery.destinationAddressId;
    const selectedDestination = selectedAddressId ? addressMap.get(selectedAddressId) ?? null : null;
    const invoiceConsignee = deliveryDocuments?.extractedConsignee ?? getPrimaryInvoiceConsignee(deliveryDocuments?.invoices ?? []);
    const primaryDestination = invoiceConsignee ?? selectedDestination;

    const input: RateValidationInput = {
      bookingDate: booking.pickupDate ?? booking.createdAt.slice(0, 10),
      customerId: booking.customerId,
      rateMatchingBasis: "CITY_TO_CITY",
      lane:
        origin && selectedDestination
          ? deriveShipmentLane(origin.addressName, selectedDestination.addressName)
          : null,
      fromCity: origin?.city ?? delivery.originCity ?? null,
      toCity:
        "city" in (primaryDestination ?? {})
          ? (primaryDestination?.city ?? delivery.destinationCity ?? null)
          : delivery.destinationCity ?? null,
      fromLocation: origin?.addressName ?? null,
      toLocation:
        invoiceConsignee?.addressLine ??
        ("addressName" in (selectedDestination ?? {}) ? selectedDestination?.addressName ?? null : null),
      fromPincode: origin?.pincode ?? null,
      toPincode:
        invoiceConsignee?.pincode ??
        ("pincode" in (selectedDestination ?? {}) ? selectedDestination?.pincode ?? null : null),
      vehicleType: vehicleTypeCode ?? null,
      rateType: booking.pricing.rateType,
      weight: booking.pricing.rateType === "PER_MT" ? weight : undefined,
    };
    input.rateMatchingBasis = getEffectiveRateMatchingBasis(matchingBasis, input, {
      allowDestinationFallback: !input.toLocation && !input.toPincode,
    });
    return input;
  };

  if (booking.pricing.rateType === "PER_MT") {
    let totalFreight = 0;

    for (const delivery of deliveries) {
      const deliveryDocuments =
        shipmentDocuments.deliveries.find((item) => item.deliveryId === delivery.id) ?? null;
      const deliveryWeight = getDeliveryActualWeight(deliveryDocuments ?? ensureShipmentDocuments({ deliveries: [delivery] }).deliveries[0]);
      if (deliveryWeight <= 0) {
        return {
          totalFreightRate: null,
          freightStatus: "MISSING_WEIGHT" as const,
          freightMessage: `Invoice weight is required for ${delivery.trackingId}.`,
          deliveryRates,
        };
      }

      const validationInput = buildValidationInput(delivery, deliveryDocuments, deliveryWeight);
      const matchedRateCard = validateRateCard(validationInput, rateCards);
      if (!matchedRateCard) {
        return {
          totalFreightRate: null,
          freightStatus: "NO_RATE" as const,
          freightMessage: `No rate found for ${delivery.trackingId}.`,
          deliveryRates,
        };
      }

      const unitRate = getRateCardUnitRate(matchedRateCard) ?? 0;
      const deliveryFreight = Number((deliveryWeight * unitRate).toFixed(2));
      deliveryRates.set(delivery.id, deliveryFreight);
      totalFreight += deliveryFreight;
    }

    return {
      totalFreightRate: Number(totalFreight.toFixed(2)),
      freightStatus: "READY" as const,
      freightMessage: "Freight recalculated delivery-wise from invoice weight and first invoice consignee.",
      deliveryRates,
    };
  }

  const lastDelivery = deliveries.at(-1);
  if (!lastDelivery) {
    return {
      totalFreightRate: null,
      freightStatus: "NO_RATE" as const,
      freightMessage: "No deliveries available for freight calculation.",
      deliveryRates,
    };
  }
  const lastDeliveryDocuments =
    shipmentDocuments.deliveries.find((delivery) => delivery.deliveryId === lastDelivery.id) ?? null;
  const validationInput = buildValidationInput(lastDelivery, lastDeliveryDocuments);
  const matchedRateCard = validateRateCard(validationInput, rateCards);
  if (!matchedRateCard) {
    return {
      totalFreightRate: null,
      freightStatus: "NO_RATE" as const,
      freightMessage: "No rate found for the final delivery route.",
      deliveryRates,
    };
  }

  const unitRate = getRateCardUnitRate(matchedRateCard) ?? 0;
  return {
    totalFreightRate: Number(unitRate.toFixed(2)),
    freightStatus: "READY" as const,
    freightMessage: "Freight refreshed from source to the last delivery route.",
    deliveryRates,
  };
}

export function buildInvoiceDocumentSnapshots(
  bookingId: string,
  delivery: BookingDeliveryRecord,
  deliveryDocuments: BookingDeliveryShipmentDocuments,
  actor = "Ops",
) {
  const timestamp = new Date().toISOString();
  const invoiceDocuments = deliveryDocuments.invoices.map((invoice, index) => ({
    id: `${bookingId}-${delivery.id}-invoice-${index + 1}`,
    type: "INVOICE" as const,
    fileName: invoice.fileName,
    uploadedAt: invoice.uploadedAt || timestamp,
    uploadedBy: actor,
    deliveryId: delivery.id,
  }));
  const ewayDocument = deliveryDocuments.ewayBill
    ? [
        {
          id: `${bookingId}-${delivery.id}-eway`,
          type: "EWAY_BILL" as const,
          fileName: deliveryDocuments.ewayBill.fileName,
          uploadedAt: deliveryDocuments.ewayBill.uploadedAt || timestamp,
          uploadedBy: actor,
          deliveryId: delivery.id,
        },
      ]
    : [];
  return [...invoiceDocuments, ...ewayDocument];
}
