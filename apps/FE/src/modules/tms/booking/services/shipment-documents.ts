import { getRateCardUnitRate } from "@/modules/tms/booking/services/booking-engine";
import { validateRateCard, type RateValidationInput } from "@/modules/tms/booking/services/booking-selectors";
import type {
  BookingDeliveryRecord,
  BookingDeliveryShipmentDocuments,
  BookingInvoiceSnapshot,
  BookingRecord,
  BookingShipmentDocuments,
} from "@/modules/tms/booking/types";
import type { TenantCustomer, TenantCustomerAddress, TenantCustomerRateCard } from "@/types/customer";

type AddressMap = Map<string, TenantCustomerAddress>;

export type ExtractedInvoiceData = Omit<BookingInvoiceSnapshot, "id" | "uploadedAt">;

export type ParsedEwayBillData = {
  fileName: string;
  ewayBillNumber: string;
  validFromDate: string | null;
  validFromTime: string | null;
  validToDate: string | null;
  validToTime: string | null;
};

function normalizeExtractedText(content: string) {
  return content.replace(/\0/g, " ").replace(/\s+/g, " ").trim();
}

async function readLooseFileText(file: File) {
  const buffer = await file.arrayBuffer();
  return normalizeExtractedText(new TextDecoder("utf-8", { fatal: false }).decode(buffer));
}

function findValue(content: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
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

function parseInvoiceNameFallback(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const parts = baseName.split("__");
  if (parts.length < 8) {
    return null;
  }
  return {
    invoiceNumber: parts[0]?.trim() ?? "",
    invoiceDate: toIsoDate(parts[1] ?? ""),
    invoiceValue: parseNumeric(parts[2] ?? ""),
    material: parts[3]?.trim() ?? "",
    quantity: parseNumeric(parts[4] ?? ""),
    quantityUOM: parts[5]?.trim().toUpperCase() ?? "",
    weight: parseNumeric(parts[6] ?? ""),
    weightUOM: parts[7]?.trim().toUpperCase() ?? "",
  };
}

function parseEwayNameFallback(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const parts = baseName.split("__");
  if (parts.length < 3) {
    return null;
  }
  const validFrom = toIsoDateTimeParts(parts[1] ?? "");
  const validTo = toIsoDateTimeParts(parts[2] ?? "");
  return {
    ewayBillNumber: parts[0]?.trim() ?? "",
    validFromDate: validFrom.date,
    validFromTime: validFrom.time,
    validToDate: validTo.date,
    validToTime: validTo.time,
  };
}

export async function parseInvoice(file: File): Promise<ExtractedInvoiceData> {
  const content = await readLooseFileText(file);
  const fileFallback = parseInvoiceNameFallback(file.name);
  const invoiceNumber =
    findValue(content, [/invoice\s*(?:number|no)[\s:.-]*([A-Z0-9/-]+)/i]) || fileFallback?.invoiceNumber || "";
  const invoiceDate =
    toIsoDate(findValue(content, [/invoice\s*date[\s:.-]*([0-9./-]+)/i])) || fileFallback?.invoiceDate || null;
  const invoiceValue =
    parseNumeric(findValue(content, [/invoice\s*value[\s:.-]*([0-9,.\s₹]+)/i, /total\s*value[\s:.-]*([0-9,.\s₹]+)/i])) ??
    fileFallback?.invoiceValue ??
    null;
  const material =
    findValue(content, [/material[\s:.-]*([A-Z0-9\s/-]+)/i, /item\s*description[\s:.-]*([A-Z0-9\s/-]+)/i]) ||
    fileFallback?.material ||
    "";
  const quantity =
    parseNumeric(findValue(content, [/quantity[\s:.-]*([0-9,.]+)/i])) ?? fileFallback?.quantity ?? null;
  const quantityUOM =
    findValue(content, [/(?:quantity\s*uom|uom)[\s:.-]*([A-Z]+)/i]).toUpperCase() ||
    fileFallback?.quantityUOM ||
    null;
  const weight =
    parseNumeric(findValue(content, [/weight[\s:.-]*([0-9,.]+)/i])) ?? fileFallback?.weight ?? null;
  const weightUOM =
    findValue(content, [/(?:weight\s*uom|weight unit)[\s:.-]*([A-Z]+)/i]).toUpperCase() ||
    fileFallback?.weightUOM ||
    null;

  return {
    fileName: file.name,
    invoiceNumber,
    invoiceValue,
    invoiceDate,
    material,
    subBrand: null,
    quantity,
    quantityUOM,
    weight,
    weightUOM,
    extractedAt: new Date().toISOString(),
  };
}

export async function parseEwayBill(file: File): Promise<ParsedEwayBillData> {
  const content = await readLooseFileText(file);
  const fileFallback = parseEwayNameFallback(file.name);
  const validFrom = toIsoDateTimeParts(
    findValue(content, [/valid\s*from[\s:.-]*([0-9./:\- ]+)/i]) || "",
  );
  const validTo = toIsoDateTimeParts(
    findValue(content, [/valid\s*to[\s:.-]*([0-9./:\- ]+)/i]) || "",
  );

  return {
    fileName: file.name,
    ewayBillNumber:
      findValue(content, [/(?:eway\s*bill|ewb)\s*(?:number|no)[\s:.-]*([A-Z0-9/-]+)/i]) ||
      fileFallback?.ewayBillNumber ||
      "",
    validFromDate: validFrom.date ?? fileFallback?.validFromDate ?? null,
    validFromTime: validFrom.time ?? fileFallback?.validFromTime ?? null,
    validToDate: validTo.date ?? fileFallback?.validToDate ?? null,
    validToTime: validTo.time ?? fileFallback?.validToTime ?? null,
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
  const finalWeight = shipmentDocuments.deliveries.reduce(
    (sum, delivery) => sum + sumDeliveryInvoiceTotals(delivery).weight,
    0,
  );
  const lastDelivery = deliveries.at(-1);
  const origin = addressMap.get(booking.sourceAddressId);
  const destination = lastDelivery ? addressMap.get(lastDelivery.destinationAddressId) : null;

  if (booking.pricing.rateType === "PER_MT" && finalWeight <= 0) {
    return {
      totalFreightRate: null,
      freightStatus: "MISSING_WEIGHT" as const,
      freightMessage: "Invoice weight is required to calculate PER_MT freight.",
      deliveryRates,
    };
  }

  const validationInput: RateValidationInput = {
    bookingDate: booking.pickupDate ?? booking.createdAt.slice(0, 10),
    customerId: booking.customerId,
    rateMatchingBasis: matchingBasis,
    lane: deriveShipmentLane(origin?.addressName, destination?.addressName),
    fromCity: origin?.city ?? null,
    toCity: destination?.city ?? null,
    fromLocation: origin?.addressName ?? null,
    toLocation: destination?.addressName ?? null,
    fromPincode: origin?.pincode ?? null,
    toPincode: destination?.pincode ?? null,
    vehicleType: vehicleTypeCode ?? null,
    rateType: booking.pricing.rateType,
    weight: booking.pricing.rateType === "PER_MT" ? finalWeight : undefined,
  };

  const matchedRateCard = validateRateCard(validationInput, rateCards);
  if (!matchedRateCard) {
    return {
      totalFreightRate: null,
      freightStatus: "NO_RATE" as const,
      freightMessage: "No rate found for selected configuration.",
      deliveryRates,
    };
  }

  const unitRate = getRateCardUnitRate(matchedRateCard) ?? 0;
  const finalRate =
    booking.pricing.rateType === "PER_MT"
      ? Number((finalWeight * unitRate).toFixed(2))
      : Number(unitRate.toFixed(2));
  for (const delivery of deliveries) {
    deliveryRates.set(delivery.id, finalRate);
  }

  return {
    totalFreightRate: finalRate,
    freightStatus: "READY" as const,
    freightMessage:
      booking.pricing.rateType === "PER_TRIP"
        ? "Freight refreshed from the latest destination rate card."
        : "Freight recalculated from cumulative actual weight.",
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
