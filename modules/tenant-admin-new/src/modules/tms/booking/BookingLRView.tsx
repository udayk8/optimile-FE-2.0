import { jsPDF } from "jspdf";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/shared/components/common/page-header";
import { BookingPageHeader } from "./components/BookingPageHeader";
import { TenantEmptyState, TenantPanel } from "@/modules/tenant-admin/components/tenant-primitives";
import { Button } from "@/shared/components/ui/button";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { useBookingAdminSources } from "./hooks/useBookingAdminSources";
import { useTenantLrs } from "./hooks/useTenantLrs";
import { useTenantBookings } from "./hooks/useTenantBookings";
import { normalizeBookingId } from "@/modules/tms/booking/services/booking-engine";
import {
  ensureShipmentDocuments,
  getDeliveryActualQuantity,
  getDeliveryActualWeight,
  sumDeliveryInvoiceTotals,
} from "@/modules/tms/booking/services/shipment-documents";
import {
  buildAddressLookup,
  buildCustomerLookup,
  buildDriverLookup,
  buildMaterialLookup,
  buildVehicleLookup,
  buildVendorLookup,
} from "@/modules/tms/booking/services/booking-selectors";
import { formatCurrency } from "@/shared/lib/format-currency";

const lrTerms = [
  {
    title: "1. Contract of Carriage",
    body: "The terms and conditions printed on the overleaf of the Consignment Note and/or the Forwarding Note completed on behalf of the consignor at the time of booking form an integral part of the contract of carriage.",
  },
  {
    title: "2. Carrier's Declaration",
    body: "The carrier declares that the nature, contents, quality, condition, and value of the consignment are unknown to them. The consignment is booked and accepted based on the 'Said to Contain' declaration by the consignor or their lawful assignee.",
  },
  {
    title: "3. Liability for False Declarations",
    body: "The consignor shall be liable for all consequential damages, losses, or expenses caused to the carrier due to false declarations, including injury to persons, damage to equipment, other goods, or detention costs.",
  },
  {
    title: "4. Delivery Condition",
    body: "The carrier undertakes to deliver the consignment in the same condition as received, subject to natural deterioration caused by weather, route, or environmental conditions.",
  },
  {
    title: "5. Detention or Seizure",
    body: "If the vehicle is detained or seized en route due to improper documentation, prohibited goods, or contraband, the carrier shall not be liable. The consignor or consignee shall bear all resulting consequences.",
  },
  {
    title: "6. Wrong Delivery",
    body: "The carrier shall not be liable for alleged wrong delivery once goods are delivered against the Way Bill to an authorised or entitled individual.",
  },
  {
    title: "7. Route Deviations",
    body: "The carrier reserves the right to change the usual or customary route and move goods via alternate routes without assigning any reason.",
  },
  {
    title: "8. Re-Booking",
    body: "The carrier does not undertake the obligation to re-book goods from the destination point.",
  },
  {
    title: "9. Claims Procedure",
    body: "Claims shall not be entertained unless a Certificate of Facts is issued by the carrier's booking or delivery office based on a joint survey assessment.",
  },
  {
    title: "10. Exclusion of Liability",
    body: "The carrier shall not be responsible for non-delivery, deterioration, loss, or damage caused by acts of God, government actions, consignor negligence, or improper packing.",
  },
  {
    title: "11. Jurisdiction",
    body: "All claims and disputes shall fall exclusively under the jurisdiction of competent courts in Uttar Pradesh.",
  },
  {
    title: "12. Timely Delivery",
    body: "The carrier does not guarantee exact delivery timelines due to route adjustments, adverse weather, breakdowns, or operational disruptions.",
  },
  {
    title: "13. Goods Declaration",
    body: "The sender represents that all goods are accurately declared in terms of quantity, nature, and value. Any misdeclaration renders the sender liable for penalties or refusal of service.",
  },
  {
    title: "14. Prohibited Goods",
    body: "The carrier will not transport hazardous, illegal, or restricted goods. Inspection rights are reserved, and all resulting costs shall be borne by the sender.",
  },
  {
    title: "15. Insurance",
    body: "Insurance is optional and must be explicitly requested in writing before transit begins. The sender indemnifies the carrier against claims when insurance is not opted for.",
  },
  {
    title: "16. Freight Charges",
    body: "All freight charges and ancillary costs must be paid as agreed. The carrier reserves the right to withhold goods until dues are settled.",
  },
  {
    title: "17. Unclaimed Goods",
    body: "Goods unclaimed for 30 days after delivery may be deemed abandoned and disposed of in accordance with applicable laws. Disposal costs shall be recovered from the sender.",
  },
  {
    title: "18. Acceptance of Terms",
    body: "By utilising the carrier's services or accepting the consignment note, the sender acknowledges and agrees to these terms and conditions.",
  },
];

type DeliveryPreview = {
  deliveryId: string;
  lrNumber: string;
  fileName: string;
  bookingCode: string;
  bookingDate: string;
  bookingTime: string;
  bookingDateShort: string;
  companyName: string;
  companyAddressLines: string[];
  companyPhone: string;
  companyGstin: string;
  vehicleNumber: string;
  consignmentNumber: string;
  fromLocation: string;
  fromCode: string;
  toLocation: string;
  toCode: string;
  serviceType: string;
  consignorCode: string;
  consigneeCode: string;
  consignorName: string;
  consignorAddress: string;
  consignorCity: string;
  consignorPincode: string;
  consignorPhone: string;
  consignorGstin: string;
  consigneeName: string;
  consigneeAddress: string;
  consigneeCity: string;
  consigneePincode: string;
  consigneePhone: string;
  consigneeGstin: string;
  paymentType: "PAID" | "TO_PAY" | "CREDIT" | "UNKNOWN";
  declaredWeight: string;
  truckNumber: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceValue: string;
  volume: string;
  packageCount: string;
  packageType: "CTN" | "G/B" | "W/B" | "BAG" | "PALLET" | "OTHER";
  saidToContain: string;
  riskType: "CARRIER" | "OWNER" | "UNKNOWN";
  policyNumber: string;
  policyValidityDate: string;
  interstateDocumentName: string;
  cNoteNumber: string;
  remarks: string;
  preparedBy: string;
  preparerId: string;
  supportContact: string;
};

function joinAddress(parts: Array<string | null | undefined>) {
  const normalizedParts: string[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const value = part?.trim();
    if (!value) {
      continue;
    }

    const key = value.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalizedParts.push(value);
  }

  return normalizedParts.join(", ");
}

function cleanDisplayText(value: string | null | undefined) {
  return (value ?? "").replace(/[¹â‚¹]+/g, "").replace(/\s+/g, " ").trim();
}

function formatLrCurrency(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "";
  }
  return cleanDisplayText(formatCurrency(value));
}

function resolveCity(address?: { city?: string | null; addressName?: string | null } | null) {
  return cleanDisplayText(address?.city || address?.addressName || "");
}

function resolveCode(record: unknown, fallback = "") {
  if (!record || typeof record !== "object") {
    return fallback;
  }
  const candidate = (record as { addressCode?: string; code?: string; pincode?: string }).addressCode
    ?? (record as { addressCode?: string; code?: string; pincode?: string }).code
    ?? (record as { addressCode?: string; code?: string; pincode?: string }).pincode
    ?? fallback;
  return cleanDisplayText(candidate);
}

function formatShortDate(value: string | null | undefined) {
  if (!value) {
    return "__/__/__";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "__/__/__";
  }
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function formatTime24(value: string | null | undefined) {
  if (!value) {
    return "--:--";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function resolvePaymentType(value: string | null | undefined): DeliveryPreview["paymentType"] {
  const normalized = cleanDisplayText(value).toUpperCase();
  if (normalized.includes("PAID")) {
    return "PAID";
  }
  if (normalized.includes("CREDIT")) {
    return "CREDIT";
  }
  if (normalized.includes("TO PAY") || normalized.includes("TOPAY") || normalized.includes("TO_PAY")) {
    return "TO_PAY";
  }
  return "UNKNOWN";
}

function inferPackageType(value: string | null | undefined) {
  const normalized = cleanDisplayText(value).toUpperCase();
  if (normalized.includes("CTN") || normalized.includes("CARTON")) return "CTN";
  if (normalized.includes("G/B")) return "G/B";
  if (normalized.includes("W/B")) return "W/B";
  if (normalized.includes("BAG")) return "BAG";
  if (normalized.includes("BUNDLE")) return "OTHER";
  if (normalized.includes("PALLET")) return "PALLET";
  return "OTHER";
}

function drawCheckbox(pdf: jsPDF, x: number, y: number, checked: boolean, label: string, size = 10) {
  pdf.rect(x, y, size, size);
  if (checked) {
    pdf.setLineWidth(1.2);
    pdf.line(x + 2, y + size / 2, x + size / 2 - 1, y + size - 2);
    pdf.line(x + size / 2 - 1, y + size - 2, x + size - 2, y + 2);
    pdf.setLineWidth(0.6);
  }
  pdf.text(label, x + size + 6, y + size - 1);
}

function toPlainCurrency(value: number) {
  return formatLrCurrency(value);
}

function CheckRow({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block h-5 w-5 border border-slate-500">{checked ? "✓" : ""}</span>
      <span>{label}</span>
    </div>
  );
}

function LrField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-semibold">{label}</span>
      <span className="ml-2">{value || "-"}</span>
    </div>
  );
}

function LrCell({ label, value }: { label: string; value: string }) {
  return (
    <>
      <div className="border-r border-b p-3 font-semibold">{label}</div>
      <div className="border-b p-3">{value || "-"}</div>
    </>
  );
}

function LrMiniField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border p-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em]">{label}</p>
      <p className="mt-1">{value || "-"}</p>
    </div>
  );
}

function renderCompanyNameLines(name: string) {
  const parts = cleanDisplayText(name).split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return ["-"];
  }
  if (parts.length <= 2) {
    return [parts.join(" ")];
  }
  const midpoint = Math.ceil(parts.length / 2);
  return [parts.slice(0, midpoint).join(" "), parts.slice(midpoint).join(" ")];
}

function getCompanyInitials(name: string) {
  const parts = cleanDisplayText(name).split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "--";
  }
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "--";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("en-IN");
}

function drawReferencePdf(pdf: jsPDF, preview: DeliveryPreview) {
  const pageWidth = 595;
  const pageHeight = 842;
  const left = 18;
  const right = pageWidth - 18;
  pdf.setPage(1);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.rect(left, 18, right - left, pageHeight - 36);

  pdf.rect(left, 18, 96, 120);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.text(getCompanyInitials(preview.companyName), left + 48, 54, { align: "center" });
  const companyNameLines = renderCompanyNameLines(preview.companyName);
  pdf.setFontSize(companyNameLines.length > 1 ? 12 : 14);
  let companyNameY = 84;
  companyNameLines.forEach((line) => {
    pdf.text(line, left + 48, companyNameY, { align: "center", maxWidth: 80 });
    companyNameY += 16;
  });

  pdf.rect(left + 96, 18, 100, 120);
  pdf.setFontSize(9);
  pdf.text("COMPANY DETAILS", left + 115, 34);
  pdf.setFont("helvetica", "normal");
  let companyY = 54;
  preview.companyAddressLines.slice(0, 4).forEach((line) => {
    pdf.text(line, left + 106, companyY, { maxWidth: 84 });
    companyY += 12;
  });

  const topX = left + 196;
  pdf.rect(topX, 18, 52, 120);
  pdf.rect(topX + 52, 18, 52, 120);
  pdf.rect(topX + 104, 18, 104, 120);
  pdf.rect(topX + 208, 18, 62, 120);
  pdf.rect(topX + 270, 18, 133, 120);
  pdf.setFont("helvetica", "bold");
  pdf.text("FROM", topX + 18, 30);
  pdf.text("TO", topX + 74, 30);
  pdf.text("BOOKING DATE & TIME", topX + 118, 30);
  pdf.text("SERVICE", topX + 228, 30);
  pdf.text("CONSIGNMENT NUMBER", topX + 287, 30);
  pdf.setFont("helvetica", "normal");
  pdf.text("CITY", topX + 6, 56);
  pdf.text(preview.fromLocation || "-", topX + 6, 70, { maxWidth: 40 });
  pdf.text("CODE", topX + 6, 98);
  pdf.text(preview.fromCode || "-", topX + 6, 112, { maxWidth: 40 });
  pdf.text("CITY", topX + 58, 56);
  pdf.text(preview.toLocation || "-", topX + 58, 70, { maxWidth: 40 });
  pdf.text("CODE", topX + 58, 98);
  pdf.text(preview.toCode || "-", topX + 58, 112, { maxWidth: 40 });
  pdf.text(preview.bookingDateShort, topX + 118, 66);
  pdf.text(preview.bookingTime, topX + 118, 102);
  drawCheckbox(pdf, topX + 212, 50, preview.serviceType === "FTL", "FTL");
  drawCheckbox(pdf, topX + 212, 74, false, "FTL EXPRESS");
  drawCheckbox(pdf, topX + 212, 98, preview.serviceType !== "FTL", "OTHERS");
  pdf.text(preview.consignmentNumber || "-", topX + 278, 66, { maxWidth: 116 });

  const detailsTop = 138;
  pdf.rect(left, detailsTop, 238, 150);
  pdf.rect(left + 238, detailsTop, 238, 150);
  pdf.rect(left + 476, detailsTop, 101, 150);
  pdf.setFont("helvetica", "bold");
  pdf.text("CONSIGNOR", left + 6, detailsTop + 28, { angle: 90 });
  pdf.text("CONSIGNEE", left + 244, detailsTop + 28, { angle: 90 });
  pdf.text("PAYMENT TYPE", left + 496, detailsTop + 12);
  pdf.text("DECLARED WEIGHT", left + 490, detailsTop + 88);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Consignor Code: ${preview.consignorCode || "-"}`, left + 20, detailsTop + 18);
  pdf.text(`Name  ${preview.consignorName || "-"}`, left + 20, detailsTop + 46);
  pdf.text(`Address  ${preview.consignorAddress || "-"}`, left + 20, detailsTop + 74, { maxWidth: 205 });
  pdf.text(`City  ${preview.consignorCity || "-"}`, left + 20, detailsTop + 102);
  pdf.text(`Pin  ${preview.consignorPincode || "-"}`, left + 20, detailsTop + 126);
  pdf.text(`Phone  ${preview.consignorPhone || "-"}`, left + 108, detailsTop + 126);
  pdf.text(`GSTIN  ${preview.consignorGstin || "-"}`, left + 20, detailsTop + 148, { maxWidth: 205 });
  pdf.text(`Consignee Code: ${preview.consigneeCode || "-"}`, left + 258, detailsTop + 18);
  pdf.text(`Name  ${preview.consigneeName || "-"}`, left + 258, detailsTop + 46);
  pdf.text(`Address  ${preview.consigneeAddress || "-"}`, left + 258, detailsTop + 74, { maxWidth: 205 });
  pdf.text(`City  ${preview.consigneeCity || "-"}`, left + 258, detailsTop + 102);
  pdf.text(`Pin  ${preview.consigneePincode || "-"}`, left + 258, detailsTop + 126);
  pdf.text(`Phone  ${preview.consigneePhone || "-"}`, left + 346, detailsTop + 126);
  pdf.text(`GSTIN  ${preview.consigneeGstin || "-"}`, left + 258, detailsTop + 148, { maxWidth: 205 });
  drawCheckbox(pdf, left + 486, detailsTop + 22, preview.paymentType === "PAID", "PAID");
  drawCheckbox(pdf, left + 486, detailsTop + 46, preview.paymentType === "TO_PAY", "TO PAY");
  drawCheckbox(pdf, left + 486, detailsTop + 70, preview.paymentType === "CREDIT", "CREDIT");
  pdf.text(preview.declaredWeight || "-", left + 486, detailsTop + 118);

  const pkgTop = 288;
  pdf.rect(left, pkgTop, 577, 292);
  pdf.text("PACKAGE INFORMATION", left + 210, pkgTop + 12);
  pdf.line(left + 52, pkgTop, left + 52, pkgTop + 292);
  pdf.line(left + 240, pkgTop, left + 240, pkgTop + 292);
  pdf.line(left + 520, pkgTop, left + 520, pkgTop + 292);
  pdf.line(left, pkgTop + 78, left + 577, pkgTop + 78);
  pdf.line(left, pkgTop + 156, left + 577, pkgTop + 156);
  pdf.line(left, pkgTop + 234, left + 577, pkgTop + 234);
  pdf.text("Invoice No.", left + 12, pkgTop + 46);
  pdf.text("Invoice Date", left + 12, pkgTop + 124);
  pdf.text("Invoice Value", left + 12, pkgTop + 202);
  pdf.text("(in Rs)", left + 16, pkgTop + 214);
  pdf.text("Volume", left + 14, pkgTop + 280);
  pdf.text("(inch x inch x inch)", left + 4, pkgTop + 292);
  pdf.text(preview.invoiceNumber || "-", left + 60, pkgTop + 46, { maxWidth: 172 });
  pdf.text(preview.invoiceDate || "-", left + 60, pkgTop + 124);
  pdf.text(preview.invoiceValue || "-", left + 60, pkgTop + 202);
  pdf.text(preview.volume || "-", left + 60, pkgTop + 280);
  pdf.text("TRUCK NO.", left + 535, pkgTop + 12);
  pdf.text(preview.truckNumber || "-", left + 528, pkgTop + 36, { maxWidth: 42 });
  pdf.line(left + 520, pkgTop + 52, left + 577, pkgTop + 52);
  pdf.text(`# of Pkgs  ${preview.packageCount || "-"}`, left + 246, pkgTop + 272);
  pdf.text("PACKING TYPE", left + 246, pkgTop + 28);
  drawCheckbox(pdf, left + 246, pkgTop + 42, preview.packageType === "CTN", "CTN");
  drawCheckbox(pdf, left + 246, pkgTop + 58, preview.packageType === "G/B", "G/B");
  drawCheckbox(pdf, left + 246, pkgTop + 74, preview.packageType === "W/B", "W/B");
  drawCheckbox(pdf, left + 246, pkgTop + 90, preview.packageType === "BAG", "BAG");
  drawCheckbox(pdf, left + 246, pkgTop + 106, preview.packageType === "PALLET", "PALLET");
  drawCheckbox(pdf, left + 246, pkgTop + 122, preview.packageType === "OTHER", "OTHER");
  pdf.text("Said to Contain", left + 330, pkgTop + 28);
  pdf.text(preview.saidToContain || "-", left + 330, pkgTop + 48, { maxWidth: 80 });
  pdf.text("PAYMENT TYPE", left + 416, pkgTop + 28);
  drawCheckbox(pdf, left + 418, pkgTop + 42, preview.riskType === "CARRIER", "Carrier's Risk");
  drawCheckbox(pdf, left + 418, pkgTop + 66, preview.riskType === "OWNER", "Owner's Risk");
  pdf.text(`Policy Number ${preview.policyNumber}`, left + 418, pkgTop + 98);
  pdf.text(`Validity ${preview.policyValidityDate}`, left + 418, pkgTop + 118);
  pdf.text("Interstate Documents", left + 508, pkgTop + 28);
  pdf.text(preview.interstateDocumentName || "-", left + 526, pkgTop + 60, { maxWidth: 42 });
  pdf.text("C/NO :", left + 246, pkgTop + 176);
  pdf.line(left + 246, pkgTop + 188, left + 518, pkgTop + 188);
  pdf.text("Please cross the box, if you had any issues with the delivery and then write your remarks below", left + 270, pkgTop + 216, { maxWidth: 240 });
  pdf.text(preview.remarks || "", left + 246, pkgTop + 244, { maxWidth: 270 });
  pdf.text("Company Seal with Name & Signature", left + 246, pkgTop + 284);
  pdf.text("Consignor Signature with Seal", left + 486, pkgTop + 228, { maxWidth: 82 });
  pdf.text(`Prepared By  ${preview.preparedBy || "-"}`, left + 486, pkgTop + 248, { maxWidth: 82 });
  pdf.text(`ID: ${preview.preparerId || "-"}`, left + 486, pkgTop + 266, { maxWidth: 82 });
  pdf.text(`Name / Sign`, left + 486, pkgTop + 284, { maxWidth: 82 });

  pdf.text("File Copy", left + 16, pageHeight - 22);
  pdf.text("GSTIN", left + 148, pageHeight - 22);
  pdf.text(`For any query, reach us at ${preview.supportContact || "-"}`, left + 420, pageHeight - 22);

  pdf.addPage([pageWidth, pageHeight], "portrait");
  pdf.rect(left, 18, right - left, pageHeight - 36);
  pdf.line(pageWidth / 2, 18, pageWidth / 2, pageHeight - 18);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(preview.companyName || "-", 120, 42);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  let y = 64;
  preview.companyAddressLines.forEach((line) => {
    pdf.text(line, 100, y, { maxWidth: 160, align: "center" });
    y += 12;
  });
  pdf.setFont("helvetica", "bold");
  pdf.text("DECLARATION-", 26, 170);
  pdf.setFont("helvetica", "normal");
  pdf.text("1. The consignment entrusted by the consignor is strictly on a SAID TO CONTAIN BASIS.", 26, 190, { maxWidth: 230 });
  pdf.text("2. The customer undertakes that the cargo contains none of the banned commodities.", 26, 235, { maxWidth: 230 });
  pdf.text("3. Any weight discrepancy may lead to differential charges from the parties.", 26, 290, { maxWidth: 230 });
  pdf.setFont("helvetica", "bold");
  pdf.text("STATUTORY PAYMENT-", 26, 360);
  pdf.setFont("helvetica", "normal");
  pdf.text("1. The consignors are solely responsible for government, statutory body, etc. payments.", 26, 380, { maxWidth: 230 });
  pdf.text("2. If the consignment is held up by statutory authority, the carrier is not responsible for losses.", 26, 430, { maxWidth: 230 });
  pdf.setFont("helvetica", "bold");
  pdf.text("LIABILITIES:", 315, 42);
  pdf.setFont("helvetica", "normal");
  pdf.text("1. No claim for loss or damage will be entertained until all charges are paid.", 315, 64, { maxWidth: 240 });
  pdf.text("2. Disputes shall be subject to the jurisdiction of the courts at Gurgaon.", 315, 112, { maxWidth: 240 });
  pdf.text("3. The carrier is not liable for delay, mis-delivery, non-delivery, or force-majeure losses.", 315, 160, { maxWidth: 240 });
  pdf.text("4. The carrier will endeavor to provide expeditious delivery but no strict delivery guarantee is given.", 315, 235, { maxWidth: 240 });
  pdf.setFont("helvetica", "bold");
  pdf.text("LIABILITIES:", 315, 360);
  pdf.setFont("helvetica", "normal");
  pdf.text("1. The carrier is not liable for loss or damage caused by act of God, consignor fault, bad packing, or official action.", 315, 382, { maxWidth: 240 });
}

export function BookingLRViewPage() {
  const { bookingId } = useParams();
  const { tenant } = useTenantRouteContext();
  const { getBookingById } = useTenantBookings(tenant.id);
  const { data: lrs } = useTenantLrs(tenant.id);
  const adminSources = useBookingAdminSources(tenant.id);

  const booking = bookingId ? getBookingById(normalizeBookingId(bookingId)) : null;
  const customerMap = useMemo(() => buildCustomerLookup(adminSources.customers), [adminSources.customers]);
  const addressMap = useMemo(
    () => buildAddressLookup(Array.from(adminSources.customerAddressMap.values()).flat()),
    [adminSources.customerAddressMap],
  );
  const driverMap = useMemo(() => buildDriverLookup(adminSources.drivers), [adminSources.drivers]);
  const vehicleMap = useMemo(() => buildVehicleLookup(adminSources.vehicles), [adminSources.vehicles]);
  const materialMap = useMemo(() => buildMaterialLookup(adminSources.materials), [adminSources.materials]);
  const vendorMap = useMemo(() => buildVendorLookup(adminSources.vendors), [adminSources.vendors]);

  if (!booking) {
    return (
      <TenantEmptyState
        title="LR not found"
        description="The selected booking or LR record is unavailable."
        action={
          <Button asChild>
            <Link to={`/tenant/${tenant.id}/bookings`}>Back to bookings</Link>
          </Button>
        }
      />
    );
  }

  const bookingRecord = booking;
  const shipmentDocuments = ensureShipmentDocuments(bookingRecord);
  const customer = customerMap.get(bookingRecord.customerId) ?? null;
  const source = addressMap.get(bookingRecord.sourceAddressId) ?? null;
  const destination = addressMap.get(bookingRecord.destinationAddressId) ?? null;
  const driver = bookingRecord.assignment?.driverId ? driverMap.get(bookingRecord.assignment.driverId) ?? null : null;
  const vehicle = bookingRecord.assignment?.vehicleId ? vehicleMap.get(bookingRecord.assignment.vehicleId) ?? null : null;
  const resolvedVendorId =
    bookingRecord.assignment?.vendorId
    ?? vehicle?.vendorId
    ?? driver?.vendorId
    ?? null;
  const assignedVendor = resolvedVendorId ? vendorMap.get(resolvedVendorId) ?? null : null;
  const lr = shipmentDocuments.lr;
  const bookingLrs = lrs.filter((item) => item.bookingId === bookingRecord.id);
  const lrByDeliveryId = new Map(bookingLrs.map((item) => [item.deliveryId, item] as const));
  const primaryGeneratedLr = bookingLrs[0] ?? null;
  const freightRate = shipmentDocuments.totalFreightRate ?? bookingRecord.pricing.calculatedFreight;

  const deliveryPreviews: DeliveryPreview[] = shipmentDocuments.deliveries.map((delivery, index) => {
    const deliveryRecord = bookingRecord.deliveries?.find((item) => item.id === delivery.deliveryId);
    const generatedLr = lrByDeliveryId.get(delivery.deliveryId) ?? null;
    const deliverySource = addressMap.get(deliveryRecord?.originAddressId ?? bookingRecord.sourceAddressId) ?? source;
    const deliveryDestination = addressMap.get(deliveryRecord?.destinationAddressId ?? bookingRecord.destinationAddressId) ?? destination;
    const invoiceTotals = sumDeliveryInvoiceTotals(delivery);
    const totalQuantity = getDeliveryActualQuantity(delivery);
    const totalWeight = getDeliveryActualWeight(delivery);
    const totalInvoiceValue = delivery.invoices.reduce((sum, invoice) => sum + (invoice.invoiceValue ?? 0), 0);
    const cleanOriginAddress = joinAddress([
      deliverySource?.addressLine1,
      deliverySource?.addressLine2,
      deliverySource?.city,
      deliverySource?.state,
      deliverySource?.pincode,
      deliverySource?.country,
    ]);
    const cleanDestinationAddress = joinAddress([
      deliveryDestination?.addressLine1,
      deliveryDestination?.addressLine2,
      deliveryDestination?.city,
      deliveryDestination?.state,
      deliveryDestination?.pincode,
      deliveryDestination?.country,
    ]);
    const rowMaterial =
      delivery.actuals.material ||
      delivery.invoices[0]?.material ||
      materialMap.get(deliveryRecord?.materialId ?? "")?.materialCode ||
      "Material";
    const firstInvoice = delivery.invoices[0] ?? null;
    const bookingDateSource = bookingRecord.createdAt || lr?.generatedAt || new Date().toISOString();
    const sourcePhone = cleanDisplayText((deliverySource as { phone?: string; contactNumber?: string } | null)?.phone || deliverySource?.contactNumber || customer?.primaryContactPhone || "");
    const consigneePhone = cleanDisplayText(firstInvoice?.consigneeName ? "" : (deliveryDestination as { phone?: string; contactNumber?: string } | null)?.phone || deliveryDestination?.contactNumber || "");
    const companyName = cleanDisplayText(assignedVendor?.name || bookingRecord.assignment?.vendorName || "Carrier");
    const companyPhone = cleanDisplayText((assignedVendor as { phone?: string; contactNumber?: string } | null)?.phone || assignedVendor?.contactNumber || "");
    const companyGstin = cleanDisplayText((assignedVendor as { gstin?: string; gstNumber?: string } | null)?.gstin || assignedVendor?.gstNumber || "");
    const companyAddressLines = [
      cleanDisplayText((assignedVendor as { contactPerson?: string } | null)?.contactPerson || ""),
      companyPhone ? `Phone: ${companyPhone}` : "",
      companyGstin ? `GSTIN: ${companyGstin}` : "",
    ].filter(Boolean);

    return {
      deliveryId: delivery.deliveryId,
      lrNumber: generatedLr?.lrNumber ?? deliveryRecord?.lrNumber ?? lr?.number ?? `ERD-A/${bookingRecord.bookingId.replace(/\D/g, "").slice(-6) || index + 1}`,
      fileName: `LR_${bookingRecord.bookingId}_${delivery.deliveryId}.pdf`,
      bookingCode: bookingRecord.bookingId,
      bookingDate: formatDateTime(bookingDateSource),
      bookingTime: formatTime24(bookingDateSource),
      bookingDateShort: formatShortDate(bookingDateSource),
      companyName,
      companyAddressLines,
      companyPhone,
      companyGstin,
      vehicleNumber: vehicle?.registrationNumber ?? bookingRecord.assignment?.vehicleLabel ?? "-",
      consignmentNumber: generatedLr?.lrNumber ?? deliveryRecord?.lrNumber ?? lr?.number ?? `ERD-A/${bookingRecord.bookingId.replace(/\D/g, "").slice(-6) || index + 1}`,
      fromLocation: resolveCity(deliverySource) || "-",
      fromCode: resolveCode(deliverySource),
      toLocation: resolveCity(deliveryDestination) || "-",
      toCode: resolveCode(deliveryDestination),
      serviceType: bookingRecord.serviceType,
      consignorCode: resolveCode(deliverySource, resolveCode(customer)),
      consigneeCode: resolveCode(deliveryDestination, resolveCode(customer)),
      consignorName: cleanDisplayText(deliverySource?.addressName || customer?.name || "-"),
      consignorAddress: cleanOriginAddress,
      consignorCity: resolveCity(deliverySource) || "-",
      consignorPincode: cleanDisplayText(deliverySource?.pincode || ""),
      consignorPhone: sourcePhone || "-",
      consignorGstin: cleanDisplayText(deliverySource?.gstin || customer?.gstin || customer?.gstNumber || ""),
      consigneeName: cleanDisplayText(firstInvoice?.consigneeName || deliveryDestination?.addressName || customer?.name || "-"),
      consigneeAddress: cleanDisplayText(firstInvoice?.consigneeAddress || cleanDestinationAddress),
      consigneeCity: cleanDisplayText(firstInvoice?.consigneeCity || resolveCity(deliveryDestination) || "-"),
      consigneePincode: cleanDisplayText(firstInvoice?.consigneePincode || deliveryDestination?.pincode || ""),
      consigneePhone: consigneePhone || "-",
      consigneeGstin: cleanDisplayText(firstInvoice?.consigneeGstin || deliveryDestination?.gstin || ""),
      paymentType: resolvePaymentType(customer?.defaultPaymentMode),
      declaredWeight: totalWeight > 0 ? `${totalWeight} ${delivery.actuals.weightUOM ?? firstInvoice?.weightUOM ?? "MT"}` : "-",
      truckNumber: vehicle?.registrationNumber ?? bookingRecord.assignment?.vehicleLabel ?? "-",
      invoiceNumber: delivery.invoices.map((invoice) => invoice.invoiceNumber).filter(Boolean).join(", ") || "-",
      invoiceDate: cleanDisplayText(firstInvoice?.invoiceDate || ""),
      invoiceValue: totalInvoiceValue > 0 ? formatLrCurrency(totalInvoiceValue) : "-",
      volume: "-",
      packageCount: totalQuantity > 0 ? `${totalQuantity} ${firstInvoice?.quantityUOM ?? delivery.actuals.quantityUOM ?? ""}`.trim() : "-",
      packageType: inferPackageType(firstInvoice?.quantityUOM ?? delivery.actuals.quantityUOM ?? ""),
      saidToContain: cleanDisplayText(rowMaterial),
      riskType: "UNKNOWN",
      policyNumber: "-",
      policyValidityDate: "-",
      interstateDocumentName: cleanDisplayText([delivery.ewayBill?.fileName, ...delivery.invoices.map((invoice) => invoice.fileName)].filter(Boolean).join(", ")) || "-",
      cNoteNumber: generatedLr?.lrNumber ?? deliveryRecord?.lrNumber ?? lr?.number ?? bookingRecord.bookingId,
      remarks: "",
      preparedBy: cleanDisplayText(bookingRecord.createdBy || "System"),
      preparerId: cleanDisplayText(bookingRecord.id),
      supportContact: companyPhone || sourcePhone || driver?.phone || "-",
    };
  });

  function downloadDeliveryPdf(preview: DeliveryPreview) {
    const pdf = new jsPDF({ unit: "pt", format: [595, 842] });
    drawReferencePdf(pdf, preview);
    pdf.save(preview.fileName);
  }

  return (
    <div className="space-y-3">
      <BookingPageHeader
        backTo={`/tenant/${tenant.id}/bookings/${bookingRecord.id}`}
        backLabel="Booking Details"
        title={primaryGeneratedLr?.lrNumber ?? lr?.number ?? "LR Preview"}
        subtitle={`Delivery-wise LR preview for booking ${bookingRecord.bookingId}.`}
        actions={
          <>
            {deliveryPreviews.length ? (
              <Button variant="outline" size="sm" onClick={() => deliveryPreviews.forEach((preview) => downloadDeliveryPdf(preview))}>
                Download PDF
              </Button>
            ) : null}
            <Button size="sm" onClick={() => window.print()}>Print</Button>
          </>
        }
      />

      {deliveryPreviews.map((preview) => (
        <TenantPanel key={preview.deliveryId} title={`LR - ${preview.lrNumber}`} description={preview.fileName}>
          <div className="mb-2 flex justify-end">
            <Button size="sm" variant="ghost" className="h-7" onClick={() => downloadDeliveryPdf(preview)}>
              Download PDF
            </Button>
          </div>

          <div className="overflow-x-auto rounded border bg-white text-black">
            <div className="mx-auto w-[1100px] bg-white p-5 text-[12px] leading-5">
              <div className="border">
                <div className="grid grid-cols-[190px_200px_1fr_120px_210px] border-b">
                  <div className="flex min-h-[166px] flex-col items-center justify-center border-r p-4 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-slate-900 text-xl font-bold tracking-[0.2em]">
                      {getCompanyInitials(preview.companyName)}
                    </div>
                    <div className="mt-4 space-y-2">
                      {renderCompanyNameLines(preview.companyName).map((line) => (
                        <p key={line} className="text-2xl font-bold tracking-wide">{line}</p>
                      ))}
                    </div>
                  </div>
                  <div className="border-r p-4 text-center">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em]">Company Details</p>
                    <div className="mt-4 space-y-1 text-[13px]">
                      {preview.companyAddressLines.length ? preview.companyAddressLines.map((line) => <p key={line}>{line}</p>) : <p>-</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 border-r">
                    <div className="border-r">
                      <div className="border-b p-2 text-center font-semibold">FROM</div>
                      <div className="space-y-3 p-3">
                        <div><p className="text-[10px] font-semibold">CITY</p><p>{preview.fromLocation}</p></div>
                        <div><p className="text-[10px] font-semibold">CODE</p><p>{preview.fromCode || "-"}</p></div>
                      </div>
                    </div>
                    <div className="border-r">
                      <div className="border-b p-2 text-center font-semibold">TO</div>
                      <div className="space-y-3 p-3">
                        <div><p className="text-[10px] font-semibold">CITY</p><p>{preview.toLocation}</p></div>
                        <div><p className="text-[10px] font-semibold">CODE</p><p>{preview.toCode || "-"}</p></div>
                      </div>
                    </div>
                    <div>
                      <div className="border-b p-2 text-center font-semibold">BOOKING DATE &amp; TIME</div>
                      <div className="space-y-4 p-3">
                        <div>
                          <p>{preview.bookingDateShort}</p>
                          <p className="mt-1 text-[10px] font-semibold">DD MM YY</p>
                        </div>
                        <div>
                          <p>{preview.bookingTime}</p>
                          <p className="mt-1 text-[10px] font-semibold">24hrs format</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border-r">
                    <div className="border-b p-2 text-center font-semibold">SERVICE</div>
                    <div className="space-y-4 p-4">
                      <CheckRow checked={preview.serviceType === "FTL"} label="FTL" />
                      <CheckRow checked={false} label="FTL EXPRESS" />
                      <CheckRow checked={preview.serviceType !== "FTL"} label="OTHERS" />
                    </div>
                  </div>
                  <div>
                    <div className="border-b p-2 text-center font-semibold">CONSIGNMENT NUMBER</div>
                    <div className="p-4 text-lg font-semibold">{preview.consignmentNumber}</div>
                  </div>
                </div>

                <div className="grid grid-cols-[24px_1fr_24px_1fr_220px] border-b">
                  <div className="flex items-center justify-center border-r text-[11px] font-semibold tracking-[0.35em] [writing-mode:vertical-rl] [text-orientation:mixed]">CONSIGNOR</div>
                  <div className="border-r p-3">
                    <div className="space-y-3">
                      <LrField label="Consignor Code" value={preview.consignorCode} />
                      <LrField label="Name" value={preview.consignorName} />
                      <LrField label="Address" value={preview.consignorAddress} />
                      <LrField label="City" value={preview.consignorCity} />
                      <div className="grid grid-cols-2 gap-3">
                        <LrField label="Pin Code" value={preview.consignorPincode} />
                        <LrField label="Phone Number" value={preview.consignorPhone} />
                      </div>
                      <LrField label="GSTIN" value={preview.consignorGstin} />
                    </div>
                  </div>
                  <div className="flex items-center justify-center border-r text-[11px] font-semibold tracking-[0.35em] [writing-mode:vertical-rl] [text-orientation:mixed]">CONSIGNEE</div>
                  <div className="border-r p-3">
                    <div className="space-y-3">
                      <LrField label="Consignee Code" value={preview.consigneeCode} />
                      <LrField label="Name" value={preview.consigneeName} />
                      <LrField label="Address" value={preview.consigneeAddress} />
                      <LrField label="City" value={preview.consigneeCity} />
                      <div className="grid grid-cols-2 gap-3">
                        <LrField label="Pin Code" value={preview.consigneePincode} />
                        <LrField label="Phone Number" value={preview.consigneePhone} />
                      </div>
                      <LrField label="GSTIN" value={preview.consigneeGstin} />
                    </div>
                  </div>
                  <div>
                    <div className="border-b p-2 text-center font-semibold">PAYMENT TYPE</div>
                    <div className="space-y-3 border-b p-3">
                      <CheckRow checked={preview.paymentType === "PAID"} label="PAID" />
                      <CheckRow checked={preview.paymentType === "TO_PAY"} label="TO PAY" />
                      <CheckRow checked={preview.paymentType === "CREDIT"} label="CREDIT" />
                    </div>
                    <div className="p-3">
                      <p className="border-b pb-2 text-center font-semibold">DECLARED WEIGHT</p>
                      <p className="pt-3">{preview.declaredWeight}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-[1.05fr_1fr_220px]">
                  <div className="border-r">
                    <div className="border-b p-2 text-center font-semibold">PACKAGE INFORMATION</div>
                    <div className="grid grid-cols-[130px_1fr]">
                      <LrCell label="Invoice No." value={preview.invoiceNumber} />
                      <LrCell label="Invoice Date" value={preview.invoiceDate} />
                      <LrCell label="Invoice Value (in Rs)" value={preview.invoiceValue} />
                      <LrCell label="Volume (inch x inch x inch)" value={preview.volume} />
                      <LrCell label="# of Pkgs" value={preview.packageCount} />
                    </div>
                  </div>
                  <div className="border-r">
                    <div className="grid grid-cols-[120px_1fr]">
                      <div className="border-b border-r p-3">
                        <p className="font-semibold">PACKING TYPE</p>
                        <div className="mt-3 space-y-2">
                          <CheckRow checked={preview.packageType === "CTN"} label="CTN" />
                          <CheckRow checked={preview.packageType === "G/B"} label="G/B" />
                          <CheckRow checked={preview.packageType === "W/B"} label="W/B" />
                          <CheckRow checked={preview.packageType === "BAG"} label="BAG" />
                          <CheckRow checked={preview.packageType === "PALLET"} label="PALLET" />
                          <CheckRow checked={preview.packageType === "OTHER"} label="OTHER" />
                        </div>
                      </div>
                      <div className="border-b p-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="font-semibold">Said to Contain</p>
                            <p className="mt-3">{preview.saidToContain}</p>
                          </div>
                          <div>
                            <p className="font-semibold">PAYMENT TYPE</p>
                            <div className="mt-3 space-y-2">
                              <CheckRow checked={preview.riskType === "CARRIER"} label="Carrier's Risk" />
                              <CheckRow checked={preview.riskType === "OWNER"} label="Owner's Risk" />
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                              <LrMiniField label="Policy Number" value={preview.policyNumber} />
                              <LrMiniField label="Validity" value={preview.policyValidityDate} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-[1fr_160px]">
                      <div className="border-r p-3">
                        <p className="text-2xl font-semibold">C/NO :</p>
                        <div className="mt-3 border-t border-black" />
                        <p className="mt-6 text-center text-[11px]">Please cross the box, if you had any issues with the delivery and then write your remarks below</p>
                        <div className="mt-6 min-h-[120px] border p-3">{preview.remarks || ""}</div>
                        <div className="mt-6 flex items-end justify-between">
                          <p className="font-semibold">Company Seal with Name &amp; Signature</p>
                          <p className="font-semibold">Date &amp; Time</p>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="font-semibold">Interstate Documents</p>
                        <p className="mt-3">{preview.interstateDocumentName}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="border-b p-2 text-center font-semibold">TRUCK NO.</div>
                    <div className="border-b p-3">{preview.truckNumber}</div>
                    <div className="min-h-[232px] border-b p-3 text-[11px] leading-5">
                      I/We have carefully checked and verified the contents of this consignee note and hereby agree the terms and conditions set out on the reverse.
                    </div>
                    <div className="p-3">
                      <p className="font-semibold">Consignor Signature with Seal</p>
                      <div className="mt-3 grid grid-cols-[1fr_70px] gap-3">
                        <LrMiniField label="Prepared By" value={preview.preparedBy} />
                        <LrMiniField label="ID" value={preview.preparerId} />
                      </div>
                      <div className="mt-3">
                        <LrMiniField label="Name / Sign" value="" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-[120px_1fr_320px] border-t text-center font-semibold">
                  <div className="border-r p-2">File Copy</div>
                  <div className="border-r p-2">GSTIN</div>
                  <div className="p-2 text-right">For any query, reach us at {preview.supportContact}</div>
                </div>
              </div>

              <div className="mt-6 border p-5">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-2xl font-semibold">{preview.companyName}</p>
                    <div className="mt-4 space-y-1 text-sm">
                      {preview.companyAddressLines.length ? preview.companyAddressLines.map((line) => <p key={`p2-${line}`}>{line}</p>) : <p>-</p>}
                    </div>
                    <p className="mt-10 text-base">THE CONSIGNMENT IS ENTRUSTED TO {preview.companyName} FOR SHIPMENT ON THE TERMS AND CONDITIONS SPECIFIED IN THIS CONSIGNMENT NOTE (C/NO):</p>
                    <div className="mt-12 space-y-6 text-sm leading-7">
                      <div>
                        <p className="font-semibold">DECLARATION-</p>
                        <p className="mt-2">1. The consignment entrusted by the consignor is strictly on a SAID TO CONTAIN BASIS.</p>
                        <p className="mt-2">2. The customer undertakes that the cargo contains none of the banned commodities.</p>
                        <p className="mt-2">3. Any weight discrepancy may lead to differential charges from the parties.</p>
                      </div>
                      <div>
                        <p className="font-semibold">STATUTORY PAYMENT-</p>
                        <p className="mt-2">1. The consignors are solely responsible for all payments, fees, or taxes levied by the government or statutory body.</p>
                        <p className="mt-2">2. If the consignment is held by statutory authority, the carrier is not responsible for consequential loss.</p>
                      </div>
                    </div>
                  </div>
                  <div className="border-l pl-8">
                    <div className="space-y-6 text-sm leading-7">
                      <div>
                        <p className="font-semibold">LIABILITIES:</p>
                        <p className="mt-2">1. No claim for loss or damage will be entertained until all charges and levies payable in respect of the consignment have been paid.</p>
                        <p className="mt-2">2. Any dispute arising between the parties shall be subject to the jurisdiction of the courts at Gurgaon.</p>
                        <p className="mt-2">3. {preview.companyName} shall not be liable for delay in pick-up, mis-delivery, non-delivery or loss/damage due to force majeure or similar causes beyond control.</p>
                        <p className="mt-2">4. {preview.companyName} will endeavor to exercise its best effort to provide expeditious delivery but does not guarantee strict delivery timing.</p>
                      </div>
                      <div>
                        <p className="font-semibold">LIABILITIES:</p>
                        <p className="mt-2">1. {preview.companyName} shall not be liable for any loss or damage if caused due to act of God, fraud of owner/consignor, defective packing, or government action.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TenantPanel>
      ))}

      {bookingLrs.length ? (
        <TenantPanel title="Generated LR Records" description="Persisted LR copies linked to this booking.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {bookingLrs.map((record) => (
              <div key={record.id} className="rounded-2xl border border-border/70 bg-white p-4">
                <p className="font-semibold text-slate-900">{record.lrNumber}</p>
                <p className="mt-1 text-sm text-slate-600">Delivery: {record.deliveryId}</p>
                <p className="text-sm text-slate-600">Status: {record.status}</p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link to={`/tenant/${tenant.id}/lr`}>View LR Register</Link>
                </Button>
              </div>
            ))}
          </div>
        </TenantPanel>
      ) : null}
    </div>
  );
}
