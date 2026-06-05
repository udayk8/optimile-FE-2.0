import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/shared/components/common/page-header";
import { TenantEmptyState, TenantPanel, TenantSummaryCard } from "@/modules/tenant-admin/components/tenant-primitives";
import { useTenantCustomers } from "@/modules/tenant-admin/hooks/useTenantCustomers";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { useBookingAdminSources } from "./hooks/useBookingAdminSources";
import { useTenantBookings } from "./hooks/useTenantBookings";
import { normalizeBookingId } from "@/modules/tms/booking/services/booking-engine";
import { BookingPageHeader, BookingSummaryStrip } from "./components/BookingPageHeader";
import { formatCurrency } from "@/shared/lib/format-currency";
import {
  buildAddressLookup,
  buildCustomerLookup,
  buildMaterialLookup,
  buildVehicleLookup,
} from "@/modules/tms/booking/services/booking-selectors";
import {
  aggregateDeliveryInvoiceActuals,
  buildInvoiceDocumentSnapshots,
  calculateShipmentDocumentFreight,
  compareAddressSimilarity,
  ensureShipmentDocuments,
  getLastDocumentParseDebug,
  parseEwayBill,
  parseInvoice,
  sumDeliveryInvoiceTotals,
} from "@/modules/tms/booking/services/shipment-documents";
import type {
  BookingAddressComparisonResult,
  BookingConsigneeSnapshot,
  BookingDeliveryRecord,
  BookingDeliveryShipmentDocuments,
  BookingInvoiceSnapshot,
  BookingShipmentDocuments,
} from "@/modules/tms/booking/types";
import type { CustomerAddressTag, TenantCustomerAddress, TenantCustomerAddressInput } from "@/types/customer";

const stepOrder = [
  { status: "VEHICLE_ASSIGNED", label: "Vehicle Assigned" },
  { status: "LOADING_STARTED", label: "Loading Started" },
  { status: "LOADING_COMPLETED", label: "Loading Completed" },
  { status: "DOCUMENT_PENDING", label: "Document Pending" },
  { status: "DOCUMENT_COMPLETED", label: "Document Completed" },
] as const;

/** Numbered, visually-distinct workflow section for the documents page. */
function WorkflowSection({ step, title, hint, children }: { step: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-1.5">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-[11px] font-bold text-white">{step}</span>
        <span className="text-[13px] font-semibold text-slate-900">{title}</span>
        {hint ? <span className="ml-auto text-[11px] text-slate-400">{hint}</span> : null}
      </div>
      <div className="px-3 py-2.5">{children}</div>
    </section>
  );
}

/** Large click/drag upload area. Reuses the caller's existing upload handler. */
function UploadDropzone({ label, accept, onFile }: { label: string; accept: string; onFile: (file: File | null) => void }) {
  return (
    <label
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => { event.preventDefault(); onFile(event.dataTransfer.files?.[0] ?? null); }}
      className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50/60 px-3 py-2.5 text-center transition hover:border-sky-400 hover:bg-sky-50/40"
    >
      <input type="file" accept={accept} className="hidden" onChange={(event) => { onFile(event.target.files?.[0] ?? null); event.target.value = ""; }} />
      <span className="text-[12px] font-semibold text-slate-700">{label}</span>
      <span className="text-[11px] text-slate-400">— drag &amp; drop or browse (PDF / TXT)</span>
    </label>
  );
}

export function BookingDocumentsPage() {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  const { tenant } = useTenantRouteContext();
  const { getBookingById, updateBooking, transitionBooking } = useTenantBookings(tenant.id);
  const { createAddress } = useTenantCustomers(tenant.id);
  const adminSources = useBookingAdminSources(tenant.id);
  const [documentDraft, setDocumentDraft] = useState<BookingShipmentDocuments | null>(null);
  const [freightPreview, setFreightPreview] = useState<ReturnType<typeof calculateShipmentDocumentFreight> | null>(null);
  const [expandedDeliveryId, setExpandedDeliveryId] = useState<string | null>(null);
  // `expandedDeliveryId` is repurposed as "selected delivery" in the new
  // 3-zone layout — the left list selects, the centre workspace renders
  // it. The setter name is kept to preserve all existing callers.
  const [error, setError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debugParseText, setDebugParseText] = useState("");

  const normalizedRouteBookingId = normalizeBookingId(bookingId);
  const routeBookingKey = normalizedRouteBookingId || bookingId || "";
  const booking = bookingId ? getBookingById(normalizedRouteBookingId) : null;
  const customerMap = useMemo(() => buildCustomerLookup(adminSources.customers), [adminSources.customers]);
  const addressMap = useMemo(
    () => buildAddressLookup(Array.from(adminSources.customerAddressMap.values()).flat()),
    [adminSources.customerAddressMap],
  );
  const materialMap = useMemo(() => buildMaterialLookup(adminSources.materials), [adminSources.materials]);
  const vehicleMap = useMemo(() => buildVehicleLookup(adminSources.vehicles), [adminSources.vehicles]);

  useEffect(() => {
    if (!booking) {
      return;
    }
    const nextDraft = ensureShipmentDocuments(booking);
    setDocumentDraft(nextDraft);
    setExpandedDeliveryId(nextDraft.deliveries[0]?.deliveryId ?? null);
    setError("");
  }, [booking]);

  useEffect(() => {
    console.log("[BookingDocuments] route bookingId:", bookingId, "normalized:", normalizedRouteBookingId);
    console.log("[BookingDocuments] store booking id:", booking?.id ?? null, "booking no:", booking?.bookingId ?? null, "status:", booking?.status ?? null);
  }, [booking?.bookingId, booking?.id, booking?.status, bookingId, normalizedRouteBookingId]);

  useEffect(() => {
    if (!booking || !documentDraft) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setFreightPreview(
        calculateShipmentDocumentFreight({
          booking,
          customer: customerMap.get(booking.customerId) ?? null,
          addressMap,
          rateCards: adminSources.rateCards,
          shipmentDocuments: documentDraft,
          vehicleTypeCode: booking.vehicleTypeId
            ? adminSources.vehicleTypes.find((item) => item.id === booking.vehicleTypeId)?.typeCode ?? null
            : null,
        }),
      );
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [addressMap, adminSources.rateCards, adminSources.vehicleTypes, booking, customerMap, documentDraft]);

  if (!booking) {
    return (
      <TenantEmptyState
        title="Booking not found"
        description="Selected booking is unavailable."
        action={
          <Button asChild>
            <Link to={`/tenant/${tenant.id}/bookings`}>Back to bookings</Link>
          </Button>
        }
      />
    );
  }

  const bookingRecord = booking;
  if (!["LOADING_COMPLETED", "DOCUMENT_PENDING", "DOCUMENT_COMPLETED"].includes(bookingRecord.status)) {
    return (
      <TenantEmptyState
        title="Documents stage locked"
        description="Invoice and E-Way Bill capture becomes available after loading is completed."
        action={
          <Button asChild>
            <Link to={`/tenant/${tenant.id}/bookings/${bookingRecord.id}`}>Back to booking</Link>
          </Button>
        }
      />
    );
  }

  const shipmentDocuments = documentDraft ?? ensureShipmentDocuments(bookingRecord);
  const assignedVehicle = bookingRecord.assignment?.vehicleId ? vehicleMap.get(bookingRecord.assignment.vehicleId) ?? null : null;
  const finalWeight = shipmentDocuments.deliveries.reduce((sum, delivery) => sum + sumDeliveryInvoiceTotals(delivery).weight, 0);
  const finalQuantity = shipmentDocuments.deliveries.reduce((sum, delivery) => sum + sumDeliveryInvoiceTotals(delivery).quantity, 0);

  function updateShipmentDocuments(updater: (current: BookingShipmentDocuments) => BookingShipmentDocuments) {
    setDocumentDraft((current) => updater(current ?? ensureShipmentDocuments(bookingRecord)));
    setError("");
    setSaveNotice("");
  }

  function updateDeliveryDocuments(
    deliveryId: string,
    updater: (current: BookingDeliveryShipmentDocuments) => BookingDeliveryShipmentDocuments,
  ) {
    updateShipmentDocuments((current) => ({
      ...current,
      deliveries: current.deliveries.map((delivery) =>
        delivery.deliveryId === deliveryId ? aggregateDeliveryInvoiceActuals(updater(delivery)) : delivery,
      ),
    }));
  }

  async function handleInvoiceUpload(deliveryId: string, file: File | null) {
    if (!file) {
      return;
    }
    let parsed: Awaited<ReturnType<typeof parseInvoice>>;
    try {
      parsed = await parseInvoice(file);
      setError("");
      const debugSnapshot = getLastDocumentParseDebug();
      setDebugParseText(debugSnapshot?.extractedText ?? "");
    } catch (parseError) {
      console.error("[BookingDocuments] invoice parse failed", parseError);
      setError("Unable to read PDF. Please enter details manually.");
      const debugSnapshot = getLastDocumentParseDebug();
      setDebugParseText(debugSnapshot?.extractedText ?? "");
      parsed = {
        fileName: file.name,
        invoiceNumber: "",
        invoiceValue: null,
        invoiceDate: null,
        material: "",
        subBrand: null,
        quantity: null,
        quantityUOM: null,
        weight: null,
        weightUOM: null,
        extractedAt: new Date().toISOString(),
      };
    }

    const invoice: BookingInvoiceSnapshot = {
      id: `invoice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      uploadedAt: new Date().toISOString(),
      ...parsed,
    };
    console.log("PARSED_DATA:", invoice);

    updateDeliveryDocuments(deliveryId, (current) => ({
      ...current,
      invoices: [...current.invoices, invoice],
      extractedConsignee: deriveExtractedConsigneeSnapshotFromInvoices([...current.invoices, invoice]),
    }));
  }

  async function handleEwayUpload(deliveryId: string, file: File | null) {
    if (!file) {
      return;
    }
    let parsed: Awaited<ReturnType<typeof parseEwayBill>>;
    try {
      parsed = await parseEwayBill(file);
      setError("");
      const debugSnapshot = getLastDocumentParseDebug();
      setDebugParseText(debugSnapshot?.extractedText ?? "");
    } catch (parseError) {
      console.error("[BookingDocuments] eway parse failed", parseError);
      setError("Unable to read PDF. Please enter details manually.");
      const debugSnapshot = getLastDocumentParseDebug();
      setDebugParseText(debugSnapshot?.extractedText ?? "");
      parsed = {
        fileName: file.name,
        ewayBillNumber: "",
        validFromDate: null,
        validFromTime: null,
        validToDate: null,
        validToTime: null,
      };
    }

    updateDeliveryDocuments(deliveryId, (current) => ({
      ...current,
      ewayBill: {
        fileName: parsed.fileName,
        ewayBillNumber: parsed.ewayBillNumber,
        validFromDate: parsed.validFromDate,
        validFromTime: parsed.validFromTime,
        validToDate: parsed.validToDate,
        validToTime: parsed.validToTime,
        uploadedAt: new Date().toISOString(),
      },
    }));
    console.log("PARSED_DATA:", parsed);
  }

  function updateInvoiceField(
    deliveryId: string,
    invoiceId: string,
    field: keyof BookingInvoiceSnapshot,
    value: string,
  ) {
    updateDeliveryDocuments(deliveryId, (current) => {
      const nextInvoices = current.invoices.map((invoice) =>
        invoice.id === invoiceId
          ? {
              ...invoice,
              [field]:
                field === "invoiceValue" || field === "quantity" || field === "weight"
                  ? Number(value) || null
                  : value,
            }
          : invoice,
      );
      return {
        ...current,
        invoices: nextInvoices,
        extractedConsignee: deriveExtractedConsigneeSnapshotFromInvoices(nextInvoices),
      };
    });
  }

  function updateEwayField(
    deliveryId: string,
    field: "fileName" | "ewayBillNumber" | "validFromDate" | "validFromTime" | "validToDate" | "validToTime",
    value: string,
  ) {
    updateDeliveryDocuments(deliveryId, (current) => ({
      ...current,
      ewayBill: {
        fileName: current.ewayBill?.fileName ?? "",
        ewayBillNumber: current.ewayBill?.ewayBillNumber ?? "",
        validFromDate: current.ewayBill?.validFromDate ?? null,
        validFromTime: current.ewayBill?.validFromTime ?? null,
        validToDate: current.ewayBill?.validToDate ?? null,
        validToTime: current.ewayBill?.validToTime ?? null,
        uploadedAt: current.ewayBill?.uploadedAt ?? new Date().toISOString(),
        [field]: value,
      },
    }));
  }

  function removeInvoice(deliveryId: string, invoiceId: string) {
    updateDeliveryDocuments(deliveryId, (current) => ({
      ...current,
      invoices: current.invoices.filter((invoice) => invoice.id !== invoiceId),
      extractedConsignee:
        deriveExtractedConsigneeSnapshotFromInvoices(
          current.invoices.filter((invoice) => invoice.id !== invoiceId),
        ),
    }));
  }

  function updateConsigneeChoice(
    deliveryId: string,
    updater: (
      current: BookingDeliveryShipmentDocuments,
      deliveryRecord: BookingDeliveryRecord | undefined,
    ) => BookingDeliveryShipmentDocuments,
  ) {
    updateShipmentDocuments((current) => ({
      ...current,
      deliveries: current.deliveries.map((deliveryDocuments) => {
        if (deliveryDocuments.deliveryId !== deliveryId) {
          return deliveryDocuments;
        }
        const deliveryRecord = bookingRecord.deliveries?.find((item) => item.id === deliveryId);
        return updater(deliveryDocuments, deliveryRecord);
      }),
    }));
  }

  function updateExtractedConsigneeField(
    deliveryId: string,
    field: keyof BookingConsigneeSnapshot,
    value: string,
  ) {
    updateDeliveryDocuments(deliveryId, (current) => ({
      ...current,
      extractedConsignee: {
        name: current.extractedConsignee?.name ?? "",
        addressLine: current.extractedConsignee?.addressLine ?? "",
        city: current.extractedConsignee?.city ?? "",
        pincode: current.extractedConsignee?.pincode ?? "",
        gstin: current.extractedConsignee?.gstin ?? null,
        [field]: value,
      },
    }));
  }

  function safeTransitionBooking(
    bookingKey: string,
    targetStatus: "DOCUMENT_COMPLETED" | "READY_FOR_DISPATCH" | "DISPATCHED" | "IN_TRANSIT",
    note: string,
  ) {
    const latestBooking = bookingKey ? getBookingById(bookingKey) : null;
    if (!latestBooking) {
      console.warn("[BookingDocuments] transition skipped; booking missing", {
        bookingKey,
        targetStatus,
      });
      return null;
    }
    if (latestBooking.status === targetStatus) {
      return latestBooking;
    }
    try {
      return transitionBooking(latestBooking.id, {
        status: targetStatus,
        actor: "System",
        note,
      });
    } catch (transitionError) {
      console.warn("[BookingDocuments] transition failed", {
        bookingKey,
        targetStatus,
        error: transitionError,
      });
      return null;
    }
  }

  // Save Draft — persist the in-progress documents without running the
  // submit validation or the status transition. Shallow-merges only the
  // shipmentDocuments field, so no booking lifecycle/logic is touched.
  function saveDocumentDraft() {
    if (isSubmitting || bookingRecord.status === "DOCUMENT_COMPLETED") {
      return;
    }
    const latestBooking = routeBookingKey ? getBookingById(routeBookingKey) : null;
    if (!latestBooking) {
      setError("Unable to save draft. Please retry.");
      return;
    }
    try {
      updateBooking(latestBooking.id, {
        shipmentDocuments: {
          ...shipmentDocuments,
          totalFreightRate: freightPreview?.totalFreightRate ?? shipmentDocuments.totalFreightRate ?? null,
          freightStatus: freightPreview?.freightStatus ?? shipmentDocuments.freightStatus,
          freightMessage: freightPreview?.freightMessage ?? shipmentDocuments.freightMessage ?? null,
        },
      });
      setError("");
      setSaveNotice("Draft saved");
    } catch (saveError) {
      console.error("[BookingDocuments] save draft failed", saveError);
      setError("Unable to save draft. Please retry.");
    }
  }

  function submitDocuments() {
    if (isSubmitting) {
      return;
    }

    const errors = shipmentDocuments.deliveries.flatMap((delivery) => {
      const deliveryErrors: string[] = [];
      if (!delivery.invoices.length) {
        deliveryErrors.push("Invoice upload is required for every delivery.");
      }
      if (!delivery.ewayBill?.fileName.trim() || !delivery.ewayBill?.ewayBillNumber.trim()) {
        deliveryErrors.push("EWB upload is required for every delivery.");
      }
      delivery.invoices.forEach((invoice) => {
        if (!invoice.fileName.trim() || !invoice.invoiceNumber.trim() || !invoice.invoiceDate || !invoice.material.trim()) {
          deliveryErrors.push("Complete all required invoice fields before submit.");
        }
        if ((Number(invoice.weight) || 0) <= 0) {
          deliveryErrors.push("Invoice weight is required.");
        }
      });
      return deliveryErrors;
    });

    if (errors.length) {
      setError(errors[0] ?? "Complete all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const latestBooking = routeBookingKey ? getBookingById(routeBookingKey) : null;
      if (!latestBooking) {
        console.warn("[BookingDocuments] submit skipped; booking missing", {
          routeBookingKey,
          bookingId,
        });
        setError("Unable to update booking. Please retry.");
        setIsSubmitting(false);
        return;
      }

      const timestamp = new Date().toISOString();
      const nextDocuments = [
        ...(latestBooking.documents ?? []).filter((document) => document.type !== "INVOICE" && document.type !== "EWAY_BILL"),
        ...shipmentDocuments.deliveries.flatMap((delivery) => {
          const deliveryRecord = latestBooking.deliveries?.find((item) => item.id === delivery.deliveryId);
          return deliveryRecord ? buildInvoiceDocumentSnapshots(latestBooking.bookingId, deliveryRecord, delivery) : [];
        }),
      ];
      const existingLrNumber =
        latestBooking.deliveries?.find((delivery) => delivery.lrNumber)?.lrNumber ??
        latestBooking.assignment?.lrNumber ??
        latestBooking.bookingId.replace("BKG", "LR");
      const nextDeliveries = (latestBooking.deliveries ?? []).map((delivery) => {
        const deliveryDocuments = shipmentDocuments.deliveries.find((item) => item.deliveryId === delivery.id);
        const totals = deliveryDocuments ? sumDeliveryInvoiceTotals(deliveryDocuments) : { quantity: delivery.quantity ?? 0, weight: delivery.weight ?? 0 };
        const resolvedDestination = resolveFinalDestinationAddress(
          latestBooking.customerId,
          delivery,
          deliveryDocuments,
          addressMap,
          createAddress,
        );
        return {
          ...delivery,
          destinationCity: resolvedDestination.city ?? delivery.destinationCity ?? null,
          destinationAddressId: resolvedDestination.addressId ?? delivery.destinationAddressId,
          destinationAddressSource:
            resolvedDestination.addressId || delivery.destinationAddressSource === "SAVED_ADDRESS"
              ? ("SAVED_ADDRESS" as const)
              : ("FROM_INVOICE_LATER" as const),
          consigneeFinalizationStatus:
            resolvedDestination.confirmed ? "CONFIRMED" : delivery.consigneeFinalizationStatus ?? "PENDING",
          quantity: totals.quantity || delivery.quantity,
          weight: totals.weight || delivery.weight,
          lrNumber: delivery.lrNumber ?? null,
          lrId: delivery.lrId ?? null,
        };
      });
      const nextShipmentDocuments: BookingShipmentDocuments = {
        ...shipmentDocuments,
        totalFreightRate: freightPreview?.totalFreightRate ?? latestBooking.pricing.calculatedFreight,
        freightStatus: freightPreview?.freightStatus ?? "READY",
        freightMessage: freightPreview?.freightMessage ?? null,
        submittedAt: timestamp,
        deliveries: shipmentDocuments.deliveries.map((delivery) => ({
          ...delivery,
          freightRate: freightPreview?.deliveryRates.get(delivery.deliveryId) ?? null,
        })),
        lr: {
          number: existingLrNumber,
          generatedAt: timestamp,
          viewMode: shipmentDocuments.lr?.viewMode ?? "COMBINED",
          extraCharges: shipmentDocuments.lr?.extraCharges ?? 0,
          advance: shipmentDocuments.lr?.advance ?? 0,
        },
      };

      const savedBooking = updateBooking(latestBooking.id, {
        status: "DOCUMENT_COMPLETED",
        documents: nextDocuments,
        shipmentDocuments: nextShipmentDocuments,
        quantity: finalQuantity || latestBooking.quantity,
        weight: finalWeight || latestBooking.weight,
        destinationAddressId:
          nextDeliveries[nextDeliveries.length - 1]?.destinationAddressId || latestBooking.destinationAddressId,
        consigneeAddressId:
          nextDeliveries[nextDeliveries.length - 1]?.destinationAddressId || latestBooking.consigneeAddressId,
        pricing: {
          ...latestBooking.pricing,
          calculatedFreight: nextShipmentDocuments.totalFreightRate ?? latestBooking.pricing.calculatedFreight,
        },
        assignment: latestBooking.assignment
          ? {
              ...latestBooking.assignment,
              lrNumber: existingLrNumber,
            }
          : latestBooking.assignment,
        lrIds: latestBooking.lrIds ?? [],
        deliveries: nextDeliveries,
      });

      const transitionKey = savedBooking.id || latestBooking.id || routeBookingKey;
      console.log("[BookingDocuments] submit transition", {
        bookingKey: transitionKey,
        currentStatus: latestBooking.status,
        targetStatus: "IN_TRANSIT",
      });

      safeTransitionBooking(transitionKey, "DOCUMENT_COMPLETED", "Invoice and E-Way Bill submitted. LR generated.");
      safeTransitionBooking(transitionKey, "READY_FOR_DISPATCH", "All required execution checkpoints completed.");
      safeTransitionBooking(transitionKey, "DISPATCHED", "Dispatch flow advanced automatically.");
      safeTransitionBooking(transitionKey, "IN_TRANSIT", "Auto moved to transit after loading, invoice, E-Way Bill, and LR completion.");

      setIsSubmitting(false);
      navigate(`/tenant/${tenant.id}/bookings/${savedBooking.id}/lr`);
    } catch (submitError) {
      console.error("[BookingDocuments] submit failed", submitError);
      setError("Unable to update booking. Please retry.");
      setIsSubmitting(false);
    }
  }

  const customerName = customerMap.get(bookingRecord.customerId)?.name ?? "—";
  const driverName = bookingRecord.assignment?.driverName ?? "—";
  const selectedDeliveryId = expandedDeliveryId ?? bookingRecord.deliveries?.[0]?.id ?? null;
  const selectedDelivery = bookingRecord.deliveries?.find((d) => d.id === selectedDeliveryId) ?? null;
  const selectedDeliveryDocuments = selectedDelivery
    ? shipmentDocuments.deliveries.find((item) => item.deliveryId === selectedDelivery.id) ?? null
    : null;
  const selectedCustomerAddresses = adminSources.customerAddressMap.get(bookingRecord.customerId) ?? [];
  const selectedDestinationAddress = selectedDelivery?.destinationAddressId
    ? addressMap.get(selectedDelivery.destinationAddressId) ?? null
    : null;
  const selectedExtractedConsignee = selectedDeliveryDocuments
    ? selectedDeliveryDocuments.extractedConsignee ?? deriveExtractedConsigneeSnapshotFromInvoices(selectedDeliveryDocuments.invoices)
    : null;
  const selectedComparison =
    selectedDestinationAddress && selectedExtractedConsignee
      ? compareAddressSimilarity(selectedDestinationAddress, selectedExtractedConsignee)
      : null;
  const selectedDeliveryTotals = selectedDeliveryDocuments
    ? sumDeliveryInvoiceTotals(selectedDeliveryDocuments)
    : { quantity: 0, weight: 0, invoiceValue: 0 };

  // Per-delivery completion check — drives the left list's status badge and
  // the bottom action bar's roll-up.
  function isDeliveryComplete(d: BookingDeliveryRecord): boolean {
    const docs = shipmentDocuments.deliveries.find((item) => item.deliveryId === d.id);
    if (!docs) return false;
    if (!docs.invoices.length) return false;
    if (!docs.ewayBill?.fileName?.trim() || !docs.ewayBill?.ewayBillNumber?.trim()) return false;
    return docs.invoices.every(
      (invoice) => invoice.fileName.trim() && invoice.invoiceNumber.trim() && invoice.invoiceDate && invoice.material.trim() && (Number(invoice.weight) || 0) > 0,
    );
  }
  const completedDeliveries = (bookingRecord.deliveries ?? []).filter(isDeliveryComplete).length;
  const totalInvoices = shipmentDocuments.deliveries.reduce((sum, d) => sum + d.invoices.length, 0);
  const totalEwayBills = shipmentDocuments.deliveries.filter((d) => d.ewayBill?.ewayBillNumber?.trim()).length;

  return (
    <div className="flex h-full flex-col gap-2">
      {/* ── ZONE 1 — TOP COMPACT BOOKING HEADER (shared design) ───────── */}
      <BookingPageHeader
        backTo={`/tenant/${tenant.id}/bookings/${bookingRecord.id}`}
        backLabel="Booking Details"
        title={`Documents · ${bookingRecord.bookingId}`}
        subtitle={`${customerName} · ${bookingRecord.deliveries?.length ?? 0} ${(bookingRecord.deliveries?.length ?? 0) === 1 ? "delivery" : "deliveries"}`}
        actions={
          bookingRecord.shipmentDocuments?.lr?.number ? (
            <Button asChild variant="outline" size="sm">
              <Link to={`/tenant/${tenant.id}/bookings/${bookingRecord.id}/lr`}>Open LR</Link>
            </Button>
          ) : null
        }
      />

      {error ? (
        <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</div>
      ) : null}

      {import.meta.env.DEV && debugParseText ? (
        <details className="rounded-md border bg-slate-50/80 text-[11px]">
          <summary className="cursor-pointer px-3 py-1.5 font-medium text-slate-600">PDF Debug (dev only)</summary>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap px-3 py-2 text-slate-700">{debugParseText}</pre>
        </details>
      ) : null}

      {/* ── ZONE 2 — LEFT LIST · ZONE 3 — MAIN WORKSPACE (full width) ── */}
      <div className="grid flex-1 min-h-0 gap-2.5 lg:grid-cols-[210px_minmax(0,1fr)]">

        {/* ── ZONE 2 — LEFT DELIVERY LIST ───────────────────────────── */}
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-md border bg-white">
          <div className="border-b px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Deliveries ({bookingRecord.deliveries?.length ?? 0})
          </div>
          <div className="flex-1 overflow-y-auto">
            {(bookingRecord.deliveries ?? []).map((delivery, index) => {
              const docs = shipmentDocuments.deliveries.find((item) => item.deliveryId === delivery.id);
              const isSelected = selectedDeliveryId === delivery.id;
              const totals = docs ? sumDeliveryInvoiceTotals(docs) : { quantity: 0, weight: 0, invoiceValue: 0 };
              const complete = isDeliveryComplete(delivery);
              const consignee = docs?.extractedConsignee?.name
                ?? customerMap.get(bookingRecord.customerId)?.name
                ?? delivery.destinationCity
                ?? "Consignee";
              return (
                <button
                  key={delivery.id}
                  type="button"
                  onClick={() => setExpandedDeliveryId(delivery.id)}
                  className={`block w-full border-b px-3 py-2 text-left text-[12px] transition last:border-b-0 ${
                    isSelected ? "bg-sky-50/80 ring-1 ring-inset ring-sky-300" : "hover:bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">Delivery {index + 1}</span>
                    <span className={`text-[10px] font-semibold uppercase ${complete ? "text-emerald-600" : "text-amber-600"}`}>{complete ? "Done" : "Pending"}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">{delivery.trackingId || "Tracking pending"}</p>
                  <div className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px]">
                    <span className={(docs?.invoices.length ?? 0) > 0 ? "font-medium text-emerald-600" : "text-slate-400"}>{(docs?.invoices.length ?? 0) > 0 ? "✓" : "✗"} Invoice</span>
                    <span className={docs?.ewayBill?.ewayBillNumber ? "font-medium text-emerald-600" : "text-slate-400"}>{docs?.ewayBill?.ewayBillNumber ? "✓" : "✗"} EWB</span>
                    <span className={delivery.consigneeFinalizationStatus === "CONFIRMED" ? "font-medium text-emerald-600" : "text-slate-400"}>{delivery.consigneeFinalizationStatus === "CONFIRMED" ? "✓" : "✗"} Consignee</span>
                  </div>
                </button>
              );
            })}
            {!bookingRecord.deliveries?.length ? (
              <p className="px-3 py-4 text-[12px] text-slate-500">No deliveries on this booking.</p>
            ) : null}
          </div>
        </aside>

        {/* ── ZONE 3 — MAIN WORKSPACE (full remaining width, breathing) ── */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-md border bg-white">
          {selectedDelivery && selectedDeliveryDocuments ? (() => {
            const delivery = selectedDelivery;
            const deliveryDocuments = selectedDeliveryDocuments;
            const extractedConsignee = selectedExtractedConsignee;
            const comparison = selectedComparison;
            return (
              <>
                {/* Compact workspace header — identity + totals on one row. */}
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b px-4 py-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900">Delivery {delivery.deliveryNo} · {delivery.trackingId || "Tracking pending"}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      {addressMap.get(delivery.originAddressId)?.addressName ?? delivery.originCity ?? "—"}
                      {" → "}
                      {addressMap.get(delivery.destinationAddressId)?.addressName ?? delivery.destinationCity ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-600">
                    <span className="text-slate-500">Qty <span className="font-medium text-slate-900">{selectedDeliveryTotals.quantity || 0}</span></span>
                    <span className="text-slate-500">Wt <span className="font-medium text-slate-900">{selectedDeliveryTotals.weight || 0}</span></span>
                    <span className="text-slate-500">Value <span className="font-medium text-slate-900">{selectedDeliveryTotals.invoiceValue ? formatCurrency(selectedDeliveryTotals.invoiceValue) : "—"}</span></span>
                  </div>
                </div>

                <div className="flex-1 space-y-2.5 overflow-y-auto bg-slate-50/40 px-4 py-3">
                  <WorkflowSection step={1} title="Upload Invoice" hint={`${deliveryDocuments.invoices.length} uploaded`}>
                    <div className="space-y-3">
                      <UploadDropzone label="Upload Invoice" accept=".pdf,.txt" onFile={(file) => void handleInvoiceUpload(delivery.id, file)} />

                      {deliveryDocuments.invoices.length ? (
                        <div className="overflow-x-auto rounded-md border">
                          <table className="w-full text-[12px]">
                            <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.06em] text-slate-500">
                              <tr>
                                <th className="px-2 py-2 text-left">File</th>
                                <th className="px-2 py-2 text-left">Invoice #</th>
                                <th className="px-2 py-2 text-left">Date</th>
                                <th className="px-2 py-2 text-right">Value</th>
                                <th className="px-2 py-2 text-left">Material</th>
                                <th className="px-2 py-2 text-right">Qty</th>
                                <th className="px-2 py-2 text-left">UOM</th>
                                <th className="px-2 py-2 text-right">Wt</th>
                                <th className="px-2 py-2 text-left">Wt UOM</th>
                                <th className="px-2 py-2 text-right"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {deliveryDocuments.invoices.map((invoice) => (
                                <tr key={invoice.id} className="border-t">
                                  <td className="px-2 py-1.5">
                                    <Input className="h-7 text-[12px]" value={invoice.fileName} onChange={(event) => updateInvoiceField(delivery.id, invoice.id, "fileName", event.target.value)} />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <Input className="h-7 text-[12px]" value={invoice.invoiceNumber} onChange={(event) => updateInvoiceField(delivery.id, invoice.id, "invoiceNumber", event.target.value)} />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <Input className="h-7 text-[12px]" type="date" value={invoice.invoiceDate ?? ""} onChange={(event) => updateInvoiceField(delivery.id, invoice.id, "invoiceDate", event.target.value)} />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <Input className="h-7 text-right text-[12px]" type="number" value={invoice.invoiceValue ?? ""} onChange={(event) => updateInvoiceField(delivery.id, invoice.id, "invoiceValue", event.target.value)} />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <Input className="h-7 text-[12px]" value={invoice.material} onChange={(event) => updateInvoiceField(delivery.id, invoice.id, "material", event.target.value)} />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <Input className="h-7 text-right text-[12px]" type="number" value={invoice.quantity ?? ""} onChange={(event) => updateInvoiceField(delivery.id, invoice.id, "quantity", event.target.value)} />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <Input className="h-7 text-[12px]" value={invoice.quantityUOM ?? ""} onChange={(event) => updateInvoiceField(delivery.id, invoice.id, "quantityUOM", event.target.value)} />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <Input className="h-7 text-right text-[12px]" type="number" value={invoice.weight ?? ""} onChange={(event) => updateInvoiceField(delivery.id, invoice.id, "weight", event.target.value)} />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <Input className="h-7 text-[12px]" value={invoice.weightUOM ?? ""} onChange={(event) => updateInvoiceField(delivery.id, invoice.id, "weightUOM", event.target.value)} />
                                  </td>
                                  <td className="px-2 py-1.5 text-right">
                                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => removeInvoice(delivery.id, invoice.id)}>Remove</Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="rounded-md border border-dashed bg-white px-3 py-4 text-center text-[12px] text-slate-500">
                          No invoices yet — upload above to extract details.
                        </div>
                      )}
                    </div>
                  </WorkflowSection>

                  <WorkflowSection step={2} title="Upload E-Way Bill" hint={deliveryDocuments.ewayBill?.ewayBillNumber ? "attached" : "none yet"}>
                    <div className="space-y-3">
                      <UploadDropzone label="Upload E-Way Bill" accept=".pdf,.txt" onFile={(file) => void handleEwayUpload(delivery.id, file)} />
                      <div className="grid gap-2 md:grid-cols-2">
                        <Field label="EWB File*"><Input value={deliveryDocuments.ewayBill?.fileName ?? ""} onChange={(event) => updateEwayField(delivery.id, "fileName", event.target.value)} /></Field>
                        <Field label="EWB Number*"><Input value={deliveryDocuments.ewayBill?.ewayBillNumber ?? ""} onChange={(event) => updateEwayField(delivery.id, "ewayBillNumber", event.target.value)} /></Field>
                        <Field label="Valid From"><Input type="date" value={deliveryDocuments.ewayBill?.validFromDate ?? ""} onChange={(event) => updateEwayField(delivery.id, "validFromDate", event.target.value)} /></Field>
                        <Field label="Valid To"><Input type="date" value={deliveryDocuments.ewayBill?.validToDate ?? ""} onChange={(event) => updateEwayField(delivery.id, "validToDate", event.target.value)} /></Field>
                      </div>
                    </div>
                  </WorkflowSection>

                  <WorkflowSection step={3} title="Package / Material">
                    {(() => {
                    // Display-only comparison of booking vs invoice (extracted) values.
                    const totals = sumDeliveryInvoiceTotals(deliveryDocuments);
                    const bookingMaterialRecord = materialMap.get(delivery.materialId);
                    const bookingMaterial = bookingMaterialRecord?.description ?? bookingMaterialRecord?.materialCode ?? deliveryDocuments.actuals.material ?? "—";
                    const invoiceMaterial = deliveryDocuments.actuals.material || "—";
                    const bookingQty = Number(delivery.quantity ?? 0);
                    const invoiceQty = Number(totals.quantity ?? 0);
                    const bookingWeight = Number(delivery.weight ?? 0);
                    const invoiceWeight = Number(totals.weight ?? 0);
                    const qtyMismatch = invoiceQty > 0 && bookingQty > 0 && Math.abs(invoiceQty - bookingQty) > 0.001;
                    const weightMismatch = invoiceWeight > 0 && bookingWeight > 0 && Math.abs(invoiceWeight - bookingWeight) > 0.001;
                    const matchRows = [
                      { label: "Material", ok: true, value: invoiceMaterial !== "—" ? invoiceMaterial : bookingMaterial },
                      { label: "Quantity", ok: !qtyMismatch, value: `${(invoiceQty || bookingQty) || "—"} ${(delivery.uom ?? deliveryDocuments.actuals.quantityUOM ?? "")}`.trim() },
                      { label: "Weight", ok: !weightMismatch, value: `${(invoiceWeight || bookingWeight) || "—"} ${(delivery.weightUom ?? deliveryDocuments.actuals.weightUOM ?? "")}`.trim() },
                    ];
                    return (
                      <div className="flex flex-wrap gap-2">
                        {matchRows.map((row) => (
                          <div key={row.label} className={`flex min-w-[150px] flex-1 items-center gap-2 rounded-md border px-3 py-2 text-[12px] ${row.ok ? "border-emerald-200 bg-emerald-50/60" : "border-amber-300 bg-amber-50"}`}>
                            <span className={`text-[13px] font-bold ${row.ok ? "text-emerald-600" : "text-amber-600"}`}>{row.ok ? "✓" : "✗"}</span>
                            <span className="text-slate-500">{row.label}:</span>
                            <span className="font-medium text-slate-900">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  </WorkflowSection>

                  <WorkflowSection step={4} title="Verify Consignee" hint={delivery.consigneeFinalizationStatus === "CONFIRMED" ? "Confirmed" : "Pending"}>
                    {(delivery.destinationAddressSource === "FROM_INVOICE_LATER" || extractedConsignee || comparison) ? (
                      <div className="space-y-2">
                        {extractedConsignee ? (
                          <div className="grid gap-2 sm:grid-cols-3">
                            <Field label="Consignee Name"><Input value={extractedConsignee.name} onChange={(event) => updateExtractedConsigneeField(delivery.id, "name", event.target.value)} /></Field>
                            <Field label="GSTIN"><Input value={extractedConsignee.gstin ?? ""} onChange={(event) => updateExtractedConsigneeField(delivery.id, "gstin", event.target.value)} /></Field>
                            <Field label="City"><Input value={extractedConsignee.city} onChange={(event) => updateExtractedConsigneeField(delivery.id, "city", event.target.value)} /></Field>
                          </div>
                        ) : (
                          <p className="text-[12px] text-slate-500">No invoice consignee extracted — choose the final address below.</p>
                        )}
                        <details className="rounded-md border border-slate-200 bg-slate-50/50 text-[12px]">
                          <summary className="cursor-pointer px-3 py-1.5 font-medium text-slate-600">
                            View full address &amp; options{comparison && comparison.matchStatus !== "MATCH" ? ` · ⚠ address ${Math.round(comparison.confidence * 100)}%` : ""}
                          </summary>
                          <div className="space-y-2 border-t border-slate-100 px-3 py-2.5">
                            {extractedConsignee ? (
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="sm:col-span-2"><Field label="Address"><Input value={extractedConsignee.addressLine} onChange={(event) => updateExtractedConsigneeField(delivery.id, "addressLine", event.target.value)} /></Field></div>
                                <Field label="Pincode"><Input value={extractedConsignee.pincode} onChange={(event) => updateExtractedConsigneeField(delivery.id, "pincode", event.target.value)} /></Field>
                              </div>
                            ) : null}
                            <div className="grid gap-2 sm:grid-cols-2">
                              <Field label="Final Address Action">
                                <Select
                                  value={deliveryDocuments.finalConsigneeChoice?.mode ?? defaultConsigneeChoiceMode(delivery, extractedConsignee)}
                                  onChange={(event) =>
                                    updateConsigneeChoice(delivery.id, (current) => ({
                                      ...current,
                                      finalConsigneeChoice: {
                                        mode: event.target.value as NonNullable<typeof current.finalConsigneeChoice>["mode"],
                                        selectedAddressId: current.finalConsigneeChoice?.selectedAddressId ?? delivery.destinationAddressId ?? null,
                                        comparison: comparison ?? null,
                                      },
                                    }))
                                  }
                                >
                                  {selectedDestinationAddress ? <option value="KEEP_SELECTED_ADDRESS">Keep selected address</option> : null}
                                  {extractedConsignee ? <option value="USE_INVOICE_ADDRESS">Use invoice address</option> : null}
                                  {extractedConsignee ? <option value="SAVE_INVOICE_ADDRESS_AND_USE_IT">Save invoice address as new customer address</option> : null}
                                  <option value="USE_SAVED_ADDRESS">Select different saved address</option>
                                </Select>
                              </Field>
                              {(
                                (deliveryDocuments.finalConsigneeChoice?.mode ?? defaultConsigneeChoiceMode(delivery, extractedConsignee)) ===
                                "USE_SAVED_ADDRESS"
                              ) ? (
                                <Field label="Saved Address">
                                  <Select
                                    value={deliveryDocuments.finalConsigneeChoice?.selectedAddressId ?? delivery.destinationAddressId ?? ""}
                                    onChange={(event) =>
                                      updateConsigneeChoice(delivery.id, (current) => ({
                                        ...current,
                                        finalConsigneeChoice: {
                                          mode: "USE_SAVED_ADDRESS",
                                          selectedAddressId: event.target.value,
                                          comparison: comparison ?? null,
                                        },
                                      }))
                                    }
                                  >
                                    <option value="">Select saved address</option>
                                    {selectedCustomerAddresses.map((address) => (
                                      <option key={address.id} value={address.id}>{address.addressName}</option>
                                    ))}
                                  </Select>
                                </Field>
                              ) : null}
                            </div>
                            {comparison && comparison.matchStatus !== "MATCH" ? (
                              <p className="text-[11px] text-amber-700">Confidence {Math.round(comparison.confidence * 100)}% — {comparison.reasons.join(" ")}</p>
                            ) : null}
                          </div>
                        </details>
                      </div>
                    ) : (
                      <p className="text-[12px] text-slate-500">Destination pre-confirmed for this delivery — no reconciliation needed.</p>
                    )}
                  </WorkflowSection>

                  <WorkflowSection step={5} title="Review & Submit">
                    {(() => {
                    const totals = sumDeliveryInvoiceTotals(deliveryDocuments);
                    const invoiceReady =
                      deliveryDocuments.invoices.length > 0 &&
                      deliveryDocuments.invoices.every(
                        (invoice) => invoice.fileName.trim() && invoice.invoiceNumber.trim() && invoice.invoiceDate && invoice.material.trim() && (Number(invoice.weight) || 0) > 0,
                      );
                    const ewbReady = Boolean(deliveryDocuments.ewayBill?.fileName?.trim() && deliveryDocuments.ewayBill?.ewayBillNumber?.trim());
                    const consigneeConfirmed = delivery.consigneeFinalizationStatus === "CONFIRMED";
                    const bookingQty = Number(delivery.quantity ?? 0);
                    const invoiceQty = Number(totals.quantity ?? 0);
                    const bookingWeight = Number(delivery.weight ?? 0);
                    const invoiceWeight = Number(totals.weight ?? 0);
                    const qtyWeightMatched = !(
                      (invoiceQty > 0 && bookingQty > 0 && Math.abs(invoiceQty - bookingQty) > 0.001) ||
                      (invoiceWeight > 0 && bookingWeight > 0 && Math.abs(invoiceWeight - bookingWeight) > 0.001)
                    );
                    // Submit requires invoice + EWB per existing validation; consignee /
                    // qty-weight are surfaced for review but are not submit blockers.
                    const deliveryReady = invoiceReady && ewbReady;
                    const rows = [
                      { label: "Invoice", ok: invoiceReady, good: "Uploaded", bad: "Missing" },
                      { label: "E-Way Bill", ok: ewbReady, good: "Uploaded", bad: "Missing" },
                      { label: "Consignee", ok: consigneeConfirmed, good: "Confirmed", bad: "Pending" },
                      { label: "Qty / Weight", ok: qtyWeightMatched, good: "Matched", bad: "Mismatch" },
                    ];
                    void deliveryReady;
                    return (
                      <div className="flex flex-wrap items-center gap-2">
                        {rows.map((row) => (
                          <span key={row.label} className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] ${row.ok ? "border-emerald-200 bg-emerald-50/60 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                            <span className={`font-bold ${row.ok ? "text-emerald-600" : "text-slate-400"}`}>{row.ok ? "✓" : "✗"}</span>
                            {row.label}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                  </WorkflowSection>
                </div>
              </>
            );
          })() : (
            <p className="m-3 rounded-md border border-dashed px-3 py-6 text-center text-[12px] text-slate-500">
              Select a delivery on the left to upload documents.
            </p>
          )}
        </section>

      </div>

      {/* ── BOTTOM STICKY ACTION BAR ─────────────────────────────────── */}
      <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 rounded-md border bg-white/95 px-3 py-2 text-[12px] backdrop-blur">
        <span className="text-slate-600">
          <span className="font-medium text-slate-900">{completedDeliveries} of {bookingRecord.deliveries?.length ?? 0}</span> deliveries completed · {totalInvoices} invoice{totalInvoices === 1 ? "" : "s"} · {totalEwayBills} e-way bill{totalEwayBills === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          {saveNotice ? (
            <span className="text-[11px] font-medium text-emerald-600">{saveNotice}</span>
          ) : (
            <span className="hidden text-[11px] text-slate-500 md:inline">{freightPreview?.freightMessage ?? "Freight updates in real time."}</span>
          )}
          <Button asChild size="sm" variant="outline">
            <Link to={`/tenant/${tenant.id}/bookings/${bookingRecord.id}`}>← Booking Details</Link>
          </Button>
          <Button size="sm" variant="outline" onClick={saveDocumentDraft} disabled={isSubmitting || bookingRecord.status === "DOCUMENT_COMPLETED"}>
            Save Draft
          </Button>
          <Button size="sm" onClick={submitDocuments} disabled={isSubmitting || bookingRecord.status === "DOCUMENT_COMPLETED"}>
            {isSubmitting || bookingRecord.status === "DOCUMENT_COMPLETED" ? "Documents Submitted" : "Submit Documents"}
          </Button>
        </div>
      </div>
    </div>
  );

}

function StepTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIndex = stepOrder.findIndex((step) => step.status === currentStatus);

  return (
    <div className="grid gap-3 md:grid-cols-5">
      {stepOrder.map((step, index) => (
        <div key={step.status} className={`rounded-2xl border px-4 py-3 ${index <= currentIndex ? "border-emerald-300 bg-emerald-50" : "border-border/70 bg-white"}`}>
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Step {index + 1}</p>
          <p className="mt-1 text-sm font-medium">{step.label}</p>
        </div>
      ))}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 p-3">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function deriveExtractedConsigneeSnapshot(invoice: BookingInvoiceSnapshot): BookingConsigneeSnapshot | null {
  if (
    !invoice.consigneeName?.trim() &&
    !invoice.consigneeAddress?.trim() &&
    !invoice.consigneeCity?.trim() &&
    !invoice.consigneePincode?.trim()
  ) {
    return null;
  }
  return {
    name: invoice.consigneeName?.trim() ?? "",
    addressLine: invoice.consigneeAddress?.trim() ?? "",
    city: invoice.consigneeCity?.trim() ?? "",
    pincode: invoice.consigneePincode?.trim() ?? "",
    gstin: invoice.consigneeGstin?.trim() ?? null,
  };
}

function deriveExtractedConsigneeSnapshotFromInvoices(invoices: BookingInvoiceSnapshot[]) {
  for (const invoice of invoices) {
    const snapshot = deriveExtractedConsigneeSnapshot(invoice);
    if (snapshot) {
      return snapshot;
    }
  }
  return null;
}

function defaultConsigneeChoiceMode(
  delivery: BookingDeliveryRecord,
  extractedConsignee: BookingConsigneeSnapshot | null,
) {
  if (extractedConsignee) {
    return "USE_INVOICE_ADDRESS" as const;
  }
  if (delivery.destinationAddressId) {
    return "KEEP_SELECTED_ADDRESS" as const;
  }
  return extractedConsignee ? "USE_INVOICE_ADDRESS" as const : "USE_SAVED_ADDRESS" as const;
}

function resolveFinalDestinationAddress(
  customerId: string,
  delivery: BookingDeliveryRecord,
  deliveryDocuments: BookingDeliveryShipmentDocuments | undefined,
  addressMap: Map<string, TenantCustomerAddress>,
  createAddress: ReturnType<typeof useTenantCustomers>["createAddress"],
) {
  const choiceMode = deliveryDocuments?.finalConsigneeChoice?.mode ?? defaultConsigneeChoiceMode(delivery, deliveryDocuments?.extractedConsignee ?? null);
  const extracted = deliveryDocuments?.extractedConsignee ?? null;

  if (choiceMode === "USE_SAVED_ADDRESS") {
    const selectedAddressId = deliveryDocuments?.finalConsigneeChoice?.selectedAddressId ?? delivery.destinationAddressId;
    const selectedAddress = selectedAddressId ? addressMap.get(selectedAddressId) ?? null : null;
    return {
      addressId: selectedAddress?.id ?? selectedAddressId ?? "",
      city: selectedAddress?.city ?? delivery.destinationCity ?? "",
      confirmed: Boolean(selectedAddressId),
    };
  }

  if (choiceMode === "KEEP_SELECTED_ADDRESS") {
    const currentAddress = delivery.destinationAddressId ? addressMap.get(delivery.destinationAddressId) ?? null : null;
    return {
      addressId: delivery.destinationAddressId,
      city: currentAddress?.city ?? delivery.destinationCity ?? "",
      confirmed: Boolean(delivery.destinationAddressId),
    };
  }

  if (choiceMode === "SAVE_INVOICE_ADDRESS_AND_USE_IT" && extracted) {
    const created = createAddress(customerId, buildCustomerAddressFromInvoice(extracted));
    return {
      addressId: created.id,
      city: created.city,
      confirmed: true,
    };
  }

  if (choiceMode === "USE_INVOICE_ADDRESS" && extracted) {
    return {
      addressId: "",
      city: extracted.city || delivery.destinationCity || "",
      confirmed: true,
    };
  }

  return {
    addressId: delivery.destinationAddressId,
    city: delivery.destinationCity ?? "",
    confirmed: delivery.consigneeFinalizationStatus === "CONFIRMED",
  };
}

function buildCustomerAddressFromInvoice(extracted: BookingConsigneeSnapshot): TenantCustomerAddressInput {
  const addressTypes: CustomerAddressTag[] = ["Consignee"];
  return {
    addressType: "consignee" as const,
    addressTypes,
    addressUsage: "DESTINATION" as const,
    addressName: extracted.name || `${extracted.city || "Customer"} Destination`,
    contactCode: undefined,
    gstin: extracted.gstin ?? undefined,
    contactPersonName: extracted.name || "Consignee",
    contactPerson: extracted.name || "Consignee",
    phone: "9876543210",
    contactNumber: "9876543210",
    email: undefined,
    emailId: undefined,
    addressLine1: extracted.addressLine || extracted.city || "Invoice extracted address",
    addressLine2: undefined,
    city: extracted.city || "Pending",
    state: "Pending",
    country: "India",
    pincode: extracted.pincode || "000000",
    isDefault: false,
    status: "active" as const,
  };
}
